const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  joiningDate: { type: Date, required: true },
  monthlySalary: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  // Tracks salary over time so a hike only applies going forward, not to
  // months that already happened. `monthlySalary` above always mirrors the
  // most recent (current) entry here for quick display in the register.
  salaryHistory: [{
    amount: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);