/**
 * Pulls leave data straight out of the Attendance App's MongoDB database, so the
 * Salaries page can factor unpaid leave into the salary calc.
 *
 * This connects directly to the attendance app's own database (a separate
 * connection from the accountant app's main one) and only ever reads from it
 * (find/lean) — never writes.
 *
 * Requires this env var (see .env.example):
 *   ATTENDANCE_MONGODB_URI   connection string for the attendance app's database
 *
 * Employees are matched by email (Employee.email <-> attendance app User.email).
 * If it's missing/unreachable/misconfigured, this fails soft — callers get back
 * { synced: false, error } instead of a thrown exception, so a down/misconfigured
 * attendance DB never breaks the Salaries page itself.
 */

const mongoose = require('mongoose');

const ATTENDANCE_MONGODB_URI = process.env.ATTENDANCE_MONGODB_URI;

// Cache the connection + models across requests (this is a long-running Node
// process, not serverless, so one connection for the app's lifetime is fine).
let attendanceConnection = null;
let AttendanceUser = null;
let AttendanceLeaveRequest = null;

function getModels() {
  if (!attendanceConnection) {
    attendanceConnection = mongoose.createConnection(ATTENDANCE_MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });

    // Minimal, read-only schemas — `strict: false` so we don't need to mirror
    // every field from the attendance app's real models, just the ones we read.
    const userSchema = new mongoose.Schema(
      { name: String, email: String },
      { strict: false, collection: 'users' }
    );
    const leaveSchema = new mongoose.Schema(
      {
        userId: mongoose.Schema.Types.ObjectId,
        leaveType: String,
        startDate: String,
        endDate: String,
        totalDays: Number,
        status: String,
      },
      { strict: false, collection: 'leaverequests' }
    );

    AttendanceUser = attendanceConnection.model('AttendanceUser', userSchema);
    AttendanceLeaveRequest = attendanceConnection.model('AttendanceLeaveRequest', leaveSchema);
  }
  return { AttendanceUser, AttendanceLeaveRequest };
}

// Counts Mon-Sat days shared between [leaveStart, leaveEnd] and [rangeStart, rangeEnd].
// Sundays are excluded to match the attendance app's own working-day convention
// (see countWorkingDays in its leaveController.js).
function countOverlapDays(leaveStart, leaveEnd, rangeStart, rangeEnd) {
  const start = leaveStart > rangeStart ? leaveStart : rangeStart;
  const end = leaveEnd < rangeEnd ? leaveEnd : rangeEnd;
  if (start > end) return 0;
  let count = 0;
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Fetches approved leave for a given month/year from the Attendance App's DB.
 *
 * Returns:
 *   {
 *     synced: boolean,              // false if the attendance DB couldn't be reached/isn't configured
 *     error: string|null,
 *     emails: Set<string>,          // lower-cased emails of every attendance-app user that has one
 *     leavesByEmail: { [lowerCasedEmail]: numberOfLeaveDaysInMonth }
 *   }
 */
async function getLeaveSummaryForMonth(month, year) {
  if (!ATTENDANCE_MONGODB_URI) {
    return {
      synced: false,
      error: 'ATTENDANCE_MONGODB_URI is not configured',
      emails: new Set(),
      leavesByEmail: {},
    };
  }

  try {
    const { AttendanceUser, AttendanceLeaveRequest } = getModels();

    const lastDay = new Date(year, month, 0).getDate();
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const users = await AttendanceUser.find({}, { name: 1, email: 1 }).lean();
    const emailByUserId = {};
    const emails = new Set();
    for (const user of users) {
      const email = (user.email || '').trim().toLowerCase();
      if (!email) continue;
      emailByUserId[user._id.toString()] = email;
      emails.add(email);
    }

    // Only pull leave requests that could possibly overlap this month — cheaper
    // than fetching a whole year and filtering in JS.
    const leaves = await AttendanceLeaveRequest.find({
      status: 'approved',
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart },
    }).lean();

    const leavesByEmail = {};
    for (const leave of leaves) {
      const email = emailByUserId[leave.userId?.toString()];
      if (!email) continue;
      const overlapDays = countOverlapDays(leave.startDate, leave.endDate, monthStart, monthEnd);
      if (overlapDays <= 0) continue;
      leavesByEmail[email] = (leavesByEmail[email] || 0) + overlapDays;
    }

    return { synced: true, error: null, emails, leavesByEmail };
  } catch (err) {
    return { synced: false, error: err.message, emails: new Set(), leavesByEmail: {} };
  }
}

module.exports = { getLeaveSummaryForMonth };