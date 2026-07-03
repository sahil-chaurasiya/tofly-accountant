const Client = require('../models/Client');
const Payment = require('../models/Payment');

// ─── Billing-cycle helpers ─────────────────────────────────────────────────
// Every client is billed monthly on the same day-of-month as their start date
// (clamped to the last day of shorter months — e.g. a client who starts on the
// 31st is billed on the 30th in a 30-day month). A month's due date is the
// FIRST day that month's charge becomes "owed" — nothing should be flagged as
// pending before that date arrives, even if the calendar month has already begun.
const billingDateFor = (startDate, year, month /* 1-12 */) => {
  const day = new Date(startDate).getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, daysInMonth));
};

// Was `date` inside a paused interval? An open interval (no resumedAt yet) is
// still ongoing.
const isPausedOn = (date, pauseHistory) => {
  return (pauseHistory || []).some(p => {
    const from = new Date(p.pausedAt);
    const to = p.resumedAt ? new Date(p.resumedAt) : null;
    return date >= from && (!to || date < to);
  });
};

// Build month-by-month ledger from contract start to today.
// Each month's status is decided by, in priority order:
//   1. Was it actually paid (fully/partially)? Money collected always counts,
//      regardless of due date or pause state.
//   2. Was the client paused on that month's due date? -> 'Paused', not billed.
//   3. Has that month's due date not arrived yet? -> 'Upcoming', not billed.
//   4. Otherwise it's genuinely owed and unpaid -> 'Unpaid'.
// "billable" months (Paid/Partial/Unpaid) are the ones that count toward
// total revenue/dues; 'Paused' and 'Upcoming' months are excluded until they
// resolve into one of the billable states.
const buildMonthLedger = (startDate, contractValue, payments, pauseHistory) => {
  const start = new Date(startDate);
  const now = new Date();
  const payMap = {};
  payments.forEach(p => {
    const key = `${p.year}-${p.month}`;
    if (!payMap[key]) payMap[key] = [];
    payMap[key].push(p);
  });

  const months = [];
  let y = start.getFullYear();
  let m = start.getMonth() + 1;

  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const key = `${y}-${m}`;
    const monthPayments = payMap[key] || [];
    const totalPaid = monthPayments.reduce((s, p) => s + p.amount, 0);
    const dueDate = billingDateFor(start, y, m);
    const notDueYet = now < dueDate;
    const paused = isPausedOn(dueDate, pauseHistory);

    let status;
    if (totalPaid >= contractValue) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    else if (paused) status = 'Paused';
    else if (notDueYet) status = 'Upcoming';
    else status = 'Unpaid';

    const billable = status !== 'Paused' && status !== 'Upcoming';
    const remaining = (status === 'Unpaid' || status === 'Partial') ? Math.max(0, contractValue - totalPaid) : 0;

    months.push({ month: m, year: y, contractValue, totalPaid, remaining, status, dueDate, billable, payments: monthPayments });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months.reverse();
};

// Totals used by the dashboard/detail views — pause- and due-date-aware.
const computeClientTotals = (client, payments) => {
  const ledger = buildMonthLedger(client.startDate, client.contractValue, payments, client.pauseHistory);
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  const totalDue = ledger.filter(m => m.billable).reduce((s, m) => s + m.contractValue, 0);
  return { ledger, totalReceived, totalDue, pendingAmount: Math.max(0, totalDue - totalReceived) };
};

// month/year: which month to report status for (defaults to current)
const getClientWithStats = async (client, targetMonth, targetYear) => {
  const payments = await Payment.find({ clientId: client._id }).sort({ year: -1, month: -1, paymentDate: -1 });

  const now = new Date();
  const curMonth = targetMonth || (now.getMonth() + 1);
  const curYear  = targetYear  || now.getFullYear();

  // Has the contract started by the selected month? (compare year-month, not exact date)
  const start = new Date(client.startDate);
  const startMonth = start.getMonth() + 1;
  const startYear  = start.getFullYear();
  const hasStarted = curYear > startYear || (curYear === startYear && curMonth >= startMonth);

  const dueDate   = hasStarted ? billingDateFor(start, curYear, curMonth) : null;
  const notDueYet = hasStarted && now < dueDate;
  const paused    = hasStarted && isPausedOn(dueDate, client.pauseHistory);

  // Selected month stats — clients that hadn't started yet in the selected month
  // have no obligation for that month, so they should not show as Pending/owing anything.
  const selPayments = hasStarted ? payments.filter(p => p.month === curMonth && p.year === curYear) : [];
  const selPaid      = selPayments.reduce((s, p) => s + p.amount, 0);

  let status = 'Unpaid';
  if (!hasStarted) status = 'NotStarted';
  else if (selPaid >= client.contractValue) status = 'Paid';
  else if (selPaid > 0) status = 'Partial';
  else if (paused) status = 'Paused';
  else if (notDueYet) status = 'Upcoming';
  else status = 'Unpaid';

  const selRemaining = (status === 'Unpaid' || status === 'Partial') ? Math.max(0, client.contractValue - selPaid) : 0;

  // All-time totals (for detail page) — pause/due-date aware via buildMonthLedger,
  // which only builds months from client.startDate onward.
  const { ledger, totalReceived, totalDue, pendingAmount } = computeClientTotals(client, payments);

  return {
    ...client.toObject(),
    // Selected-month fields (used in list/table)
    hasStarted,
    dueDate,
    selPaid,
    selRemaining,
    selPayment: selPayments[0] || null,
    status,
    // All-time fields (used in detail page)
    receivedAmount: totalReceived,
    totalDue,
    pendingAmount,
    monthLedger: ledger,
  };
};

exports.getClients = async (req, res) => {
  try {
    const { search, status, month, year } = req.query;
    const tMonth = month ? parseInt(month) : null;
    const tYear  = year  ? parseInt(year)  : null;

    let clients = await Client.find(
      search ? { name: { $regex: search, $options: 'i' } } : {}
    ).sort({ createdAt: -1 });

    const withStats = await Promise.all(clients.map(c => getClientWithStats(c, tMonth, tYear)));
    // A client shouldn't appear at all for months before their contract started.
    const started   = (tMonth && tYear) ? withStats.filter(c => c.hasStarted) : withStats;
    const filtered  = status ? started.filter(c => c.status === status) : started;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const payments    = await Payment.find({ clientId: client._id }).sort({ year: -1, month: -1, paymentDate: -1 });
    const stats       = await getClientWithStats(client);
    res.json({ ...stats, payments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createClient = async (req, res) => {
  try {
    const body = { ...req.body };
    // isActive/pauseHistory are managed exclusively through the pause/resume
    // endpoints so history entries can't get out of sync.
    delete body.isActive;
    delete body.pauseHistory;
    const client = await Client.create(body);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.isActive;
    delete body.pauseHistory;
    const client = await Client.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Pause a client: stops the client from accruing any new monthly dues from
// this point forward. Everything billed while they were active is untouched.
exports.pauseClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (client.isActive === false) return res.status(400).json({ message: 'Client is already paused' });

    const pausedAt = req.body.pausedAt ? new Date(req.body.pausedAt) : new Date();
    client.isActive = false;
    client.pauseHistory.push({ pausedAt, resumedAt: null });
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Resume a paused client: dues start accruing again from the next billing
// date after resumption.
exports.resumeClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (client.isActive !== false) return res.status(400).json({ message: 'Client is not currently paused' });

    const resumedAt = req.body.resumedAt ? new Date(req.body.resumedAt) : new Date();
    const openPause = [...client.pauseHistory].reverse().find(p => !p.resumedAt);
    if (openPause) openPause.resumedAt = resumedAt;
    client.isActive = true;
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    await Payment.deleteMany({ clientId: req.params.id });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Exposed for other controllers (dashboard) that need pause/due-aware totals
// without duplicating the billing-cycle logic.
exports.computeClientTotals = computeClientTotals;
exports.buildMonthLedger = buildMonthLedger;