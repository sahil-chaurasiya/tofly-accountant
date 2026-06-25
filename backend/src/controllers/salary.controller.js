const SalaryPayment = require('../models/SalaryPayment');
const Employee = require('../models/Employee');

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
    const employees = await Employee.find({ isActive: true });
    const salaries = await SalaryPayment.find({ month: parseInt(month), year: parseInt(year) }).populate('employeeId', 'name monthlySalary');

    const paidIds = new Set(salaries.map((s) => s.employeeId._id.toString()));
    const summary = employees.map((emp) => {
      const salaryRec = salaries.find((s) => s.employeeId._id.toString() === emp._id.toString());
      return {
        employee: emp,
        status: salaryRec ? salaryRec.status : 'Pending',
        amountPaid: salaryRec ? salaryRec.amountPaid : 0,
        salaryRecord: salaryRec || null,
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
