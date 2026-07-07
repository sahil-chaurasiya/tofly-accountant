// One-time backfill: marks every client's monthly dues as fully "Paid" for
// every billable month from their contract start date through May 2026.
//
// - Skips months that were Paused (client was paused on that month's due date)
//   — those aren't owed, so nothing to mark paid.
// - Skips months already fully paid.
// - Tops up months that are Partial/Unpaid by inserting ONE extra payment for
//   the exact remaining shortfall, dated on that month's billing (due) date.
// - Never touches June 2026 or later — only backfills up to May 2026.
// - Safe to re-run: once a month is fully paid it's skipped on the next run,
//   so running this twice will not double-pay anyone.
//
// Usage (from the backend/ folder):
//   node src/utils/backfillPaidUntilMay2026.js
//
// Make sure your .env / MONGODB_URI points at the correct database before
// running this — it writes real Payment records.

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Payment = require('../models/Payment');

const CUTOFF_YEAR = 2026;
const CUTOFF_MONTH = 5; // May — inclusive

// Same billing-cycle rules used elsewhere in the app (client.controller.js):
// a client is billed monthly on the same day-of-month as their start date,
// clamped to the last day of shorter months.
const billingDateFor = (startDate, year, month) => {
  const day = new Date(startDate).getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, daysInMonth));
};

const isPausedOn = (date, pauseHistory) => {
  return (pauseHistory || []).some(p => {
    const from = new Date(p.pausedAt);
    const to = p.resumedAt ? new Date(p.resumedAt) : null;
    return date >= from && (!to || date < to);
  });
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/revenue-pwa');
  console.log('Connected to MongoDB');

  const clients = await Client.find();
  let paymentsCreated = 0;
  let monthsSkippedPaused = 0;
  let clientsTouched = 0;

  for (const client of clients) {
    const payments = await Payment.find({ clientId: client._id });
    const payMap = {};
    payments.forEach(p => {
      const key = `${p.year}-${p.month}`;
      payMap[key] = (payMap[key] || 0) + p.amount;
    });

    const start = new Date(client.startDate);
    let y = start.getFullYear();
    let m = start.getMonth() + 1;
    let touchedThisClient = false;

    while (y < CUTOFF_YEAR || (y === CUTOFF_YEAR && m <= CUTOFF_MONTH)) {
      const dueDate = billingDateFor(start, y, m);
      const paused = isPausedOn(dueDate, client.pauseHistory);
      const key = `${y}-${m}`;
      const alreadyPaid = payMap[key] || 0;

      if (paused) {
        monthsSkippedPaused++;
      } else if (alreadyPaid < client.contractValue) {
        const shortfall = client.contractValue - alreadyPaid;
        await Payment.create({
          clientId: client._id,
          amount: shortfall,
          paymentDate: dueDate,
          month: m,
          year: y,
          paymentMethod: 'Bank Transfer',
          remarks: 'Backfilled — bulk marked paid up to May 2026',
        });
        payMap[key] = client.contractValue;
        paymentsCreated++;
        touchedThisClient = true;
      }

      m++;
      if (m > 12) { m = 1; y++; }
    }

    if (touchedThisClient) clientsTouched++;
  }

  console.log(`Done. Created ${paymentsCreated} payment record(s) across ${clientsTouched} client(s).`);
  console.log(`Skipped ${monthsSkippedPaused} paused month(s) (correctly left untouched).`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});