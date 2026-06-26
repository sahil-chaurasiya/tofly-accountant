const SalaryPayment = require('../models/SalaryPayment');
const Employee = require('../models/Employee');
const { getLeaveSummaryForMonth } = require('../utils/attendanceClient');

// 1 CL (casual leave) per month is paid; every day beyond that is deducted.
const PAID_LEAVES_PER_MONTH = 1;

exports.getSalaries = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (employeeId) filter.employeeId = employeeId;
    const salaries = await SalaryPayment.find(filter).populate('employeeId', 'name monthlySalary').sort({ year: -1, month: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { month, year } = req.params;
    const m = parseInt(month);
    const y = parseInt(year);
    const employees = await Employee.find({ isActive: true });
    const salaries = await SalaryPayment.find({ month: m, year: y }).populate('employeeId', 'name monthlySalary');

    const leaveData = await getLeaveSummaryForMonth(m, y);
    const daysInMonth = new Date(y, m, 0).getDate();

    const paidIds = new Set(salaries.map((s) => s.employeeId._id.toString()));
    const summary = employees.map((emp) => {
      const salaryRec = salaries.find((s) => s.employeeId._id.toString() === emp._id.toString());
      const email = (emp.email || '').trim().toLowerCase();

      let leavesTaken = null;
      let calculatedSalary = emp.monthlySalary;
      let attendanceSynced = false;
      let attendanceNote = null;

      if (!email) {
        attendanceNote = 'No email set for this employee — add one to sync attendance';
      } else if (!leaveData.synced) {
        attendanceNote = leaveData.error || 'Could not reach the attendance database';
      } else if (!leaveData.emails.has(email)) {
        attendanceNote = 'No matching attendance app profile found for this email';
      } else {
        attendanceSynced = true;
        leavesTaken = leaveData.leavesByEmail[email] || 0;
        const deductibleDays = Math.max(0, leavesTaken - PAID_LEAVES_PER_MONTH);
        const perDaySalary = emp.monthlySalary / daysInMonth;
        const deduction = Math.round(deductibleDays * perDaySalary);
        calculatedSalary = Math.max(0, emp.monthlySalary - deduction);
      }

      return {
        employee: emp,
        status: salaryRec ? salaryRec.status : 'Pending',
        amountPaid: salaryRec ? salaryRec.amountPaid : 0,
        salaryRecord: salaryRec || null,
        leavesTaken,
        calculatedSalary,
        attendanceSynced,
        attendanceNote,
      };
    });

    const totalDue = employees.reduce((sum, e) => sum + e.monthlySalary, 0);
    const totalPaid = salaries.filter((s) => s.status === 'Paid').reduce((sum, s) => sum + s.amountPaid, 0);
    const totalPending = totalDue - totalPaid;

    res.json({ summary, totalDue, totalPaid, totalPending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSalaryPayment = async (req, res) => {
  try {
    const existing = await SalaryPayment.findOne({
      employeeId: req.body.employeeId,
      month: req.body.month,
      year: req.body.year,
    });
    if (existing) return res.status(400).json({ message: 'Salary already recorded for this month' });
    const salary = await SalaryPayment.create(req.body);
    res.status(201).json(salary);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateSalaryPayment = async (req, res) => {
  try {
    const salary = await SalaryPayment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });
    res.json(salary);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};