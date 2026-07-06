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
 * Logic mirrors exactly what the attendance app shows employees on their own
 * History page: a day counts as absent unless it has a fully-completed
 * present/late record (both check-in AND check-out). Approved leave
 * (`on_leave`) has no check-in/check-out, so it counts as absent too —
 * same as it does in the employee's own app.
 *
 * If it's missing/unreachable/misconfigured, this fails soft — callers get back
 * { synced: false, error } instead of a thrown exception, so a down/misconfigured
 * attendance DB never breaks the Salaries page itself.
 */

const mongoose = require('mongoose');

const ATTENDANCE_MONGODB_URI = process.env.ATTENDANCE_MONGODB_URI;

// The attendance app stores `date` as an IST wall-clock YYYY-MM-DD string
// (see its own attendanceService.js). We need "today" in that same
// timezone/format so we don't accidentally count IST-today as absent just
// because the accountant server itself runs in UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30
function getTodayDateString() {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return istNow.toISOString().split('T')[0];
}

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
 * Fetches the count of absent days for a given month/year, per employee
 * email, from the Attendance App's DB — using the EXACT same formula the
 * attendance app's own admin "Employee Attendance" page uses:
 *
 *     absent = workingDaysElapsed - daysWithACheckIn
 *
 * where:
 *   - workingDaysElapsed = Mon–Sat days from the 1st of the month through
 *     today (inclusive), clamped to the app's data-start date (2026-04-01).
 *     Sundays never count.
 *   - daysWithACheckIn = records that have a checkInTime at all — checkout
 *     does NOT matter for this count (unlike the employee's own History
 *     page, which is stricter). This is the admin-facing definition, and
 *     the one the "Employee Attendance" detail screen displays.
 *   - Approved leave (`on_leave`) records have no checkInTime (set to null
 *     when a leave is approved), so they land on the absent side here too —
 *     same as the admin page shows.
 *
 * Returns:
 *   {
 *     synced: boolean,         // false if the attendance DB couldn't be reached/isn't configured
 *     error: string|null,
 *     emails: Set<string>,     // lower-cased emails of every attendance-app user that has one
 *     leavesByEmail: { [lowerCasedEmail]: numberOfAbsentDaysInMonth }
 *   }
 */
const DATA_START = '2026-04-01'; // matches the attendance app's own data-retention start date

function pad(n) { return String(n).padStart(2, '0'); }

// Mon–Sat working days from the 1st of the month through today (inclusive),
// clamped to DATA_START — computed with UTC date math (not local Date
// arithmetic) so the result doesn't depend on the accountant server's own
// timezone, only on the IST calendar date strings already stored.
function countWorkingDaysElapsed(month, year) {
  const lastDay = new Date(year, month, 0).getDate();
  const monthStartStr = `${year}-${pad(month)}-01`;
  const monthEndStr = `${year}-${pad(month)}-${pad(lastDay)}`;
  const effectiveStart = monthStartStr < DATA_START ? DATA_START : monthStartStr;
  const todayStr = getTodayDateString();
  const effectiveEnd = monthEndStr < todayStr ? monthEndStr : todayStr;
  if (effectiveStart > effectiveEnd) return 0;

  let count = 0;
  const cur = new Date(`${effectiveStart}T00:00:00Z`);
  const end = new Date(`${effectiveEnd}T00:00:00Z`);
  while (cur <= end) {
    if (cur.getUTCDay() !== 0) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

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
    const monthStart = `${year}-${pad(month)}-01`;
    const monthEndStr = `${year}-${pad(month)}-${pad(lastDay)}`;

    const records = await AttendanceRecord.find(
      { date: { $gte: monthStart, $lte: monthEndStr } },
      { userId: 1, checkInTime: 1 }
    ).lean();

    const checkedInByEmail = {};
    for (const record of records) {
      if (!record.checkInTime) continue; // no check-in = doesn't count as attended
      const uid = record.userId?.toString();
      const email = uid && emailByUserId[uid];
      if (!email) continue;
      checkedInByEmail[email] = (checkedInByEmail[email] || 0) + 1;
    }

    const workingDaysElapsed = countWorkingDaysElapsed(month, year);

    const leavesByEmail = {};
    for (const email of emails) {
      const attended = checkedInByEmail[email] || 0;
      const absentDays = Math.max(0, workingDaysElapsed - attended);
      if (absentDays > 0) leavesByEmail[email] = absentDays;
    }

    return { synced: true, error: null, emails, leavesByEmail };
  } catch (err) {
    return { synced: false, error: err.message, emails: new Set(), leavesByEmail: {} };
  }
}

module.exports = { getLeaveSummaryForMonth };