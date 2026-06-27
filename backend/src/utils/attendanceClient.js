/**
 * Pulls attendance data straight out of the Attendance App's MongoDB database, so
 * the Salaries page can factor absences into the salary calc.
 *
 * This connects directly to the attendance app's own database (a separate
 * connection from the accountant app's main one) and only ever reads from it
 * (find/lean) — never writes.
 *
 * Requires this env var (see .env.example):
 *   ATTENDANCE_MONGODB_URI   connection string for the attendance app's database
 *
 * Employees are matched by email (Employee.email <-> attendance app User.email).
 *
 * Logic is deliberately simple: count attendance records explicitly marked
 * `absent` or `on_leave` in a given month, excluding Sundays. Nothing
 * inferred, nothing gap-filled — just what's actually in the database.
 *
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
let AttendanceRecord = null;

function getModels() {
  if (!attendanceConnection) {
    attendanceConnection = mongoose.createConnection(ATTENDANCE_MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });

    const userSchema = new mongoose.Schema(
      { name: String, email: String },
      { strict: false, collection: 'users' }
    );
    const attendanceSchema = new mongoose.Schema(
      { userId: mongoose.Schema.Types.ObjectId, date: String, status: String },
      { strict: false, collection: 'attendances' }
    );

    AttendanceUser = attendanceConnection.model('AttendanceUser', userSchema);
    AttendanceRecord = attendanceConnection.model('AttendanceRecord', attendanceSchema);
  }
  return { AttendanceUser, AttendanceRecord };
}

/**
 * Fetches the count of "absent" / "on_leave" days for a given month/year, per
 * employee email, from the Attendance App's DB. Sundays are excluded.
 *
 * Returns:
 *   {
 *     synced: boolean,         // false if the attendance DB couldn't be reached/isn't configured
 *     error: string|null,
 *     emails: Set<string>,     // lower-cased emails of every attendance-app user that has one
 *     leavesByEmail: { [lowerCasedEmail]: numberOfAbsentDaysInMonth }
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
    const { AttendanceUser, AttendanceRecord } = getModels();

    const users = await AttendanceUser.find({}, { email: 1 }).lean();
    const emailByUserId = {};
    const emails = new Set();
    for (const user of users) {
      const email = (user.email || '').trim().toLowerCase();
      if (!email) continue;
      emailByUserId[user._id.toString()] = email;
      emails.add(email);
    }

    const lastDay = new Date(year, month, 0).getDate();
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const records = await AttendanceRecord.find(
      { status: { $in: ['absent', 'on_leave'] }, date: { $gte: monthStart, $lte: monthEnd } },
      { userId: 1, date: 1 }
    ).lean();

    const leavesByEmail = {};
    for (const record of records) {
      const uid = record.userId?.toString();
      const email = uid && emailByUserId[uid];
      if (!email) continue;

      const day = new Date(`${record.date}T00:00:00`).getDay();
      if (day === 0) continue; // skip Sundays

      leavesByEmail[email] = (leavesByEmail[email] || 0) + 1;
    }

    return { synced: true, error: null, emails, leavesByEmail };
  } catch (err) {
    return { synced: false, error: err.message, emails: new Set(), leavesByEmail: {} };
  }
}

module.exports = { getLeaveSummaryForMonth };