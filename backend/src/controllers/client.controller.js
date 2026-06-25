const Client = require('../models/Client');
const Payment = require('../models/Payment');

// Build month-by-month ledger from contract start to today
const buildMonthLedger = (startDate, contractValue, payments) => {
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
    let status = 'Unpaid';
    if (totalPaid >= contractValue) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    months.push({ month: m, year: y, contractValue, totalPaid, remaining: Math.max(0, contractValue - totalPaid), status, payments: monthPayments });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months.reverse();
};

// month/year: which month to report status for (defaults to current)
const getClientWithStats = async (client, targetMonth, targetYear) => {
  const payments = await Payment.find({ clientId: client._id }).sort({ year: -1, month: -1, paymentDate: -1 });

  const now = new Date();
  const curMonth = targetMonth || (now.getMonth() + 1);
  const curYear  = targetYear  || now.getFullYear();

  // Selected month stats
  const selPayments = payments.filter(p => p.month === curMonth && p.year === curYear);
  const selPaid     = selPayments.reduce((s, p) => s + p.amount, 0);
  const selRemaining = Math.max(0, client.contractValue - selPaid);
  let status = 'Unpaid';
  if (selPaid >= client.contractValue) status = 'Paid';
  else if (selPaid > 0) status = 'Partial';

  // All-time totals (for detail page)
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  const ledger = buildMonthLedger(client.startDate, client.contractValue, payments);
  const totalDue = ledger.length * client.contractValue;

  return {
    ...client.toObject(),
    // Selected-month fields (used in list/table)
    selPaid,
    selRemaining,
    selPayment: selPayments[0] || null,
    status,
    // All-time fields (used in detail page)
    receivedAmount: totalReceived,
    totalDue,
    pendingAmount: Math.max(0, totalDue - totalReceived),
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
    const filtered  = status ? withStats.filter(c => c.status === status) : withStats;
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
    const monthLedger = buildMonthLedger(client.startDate, client.contractValue, payments);
    res.json({ ...stats, payments, monthLedger });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
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