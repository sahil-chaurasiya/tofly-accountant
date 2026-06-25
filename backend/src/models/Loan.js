const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  originalAmount: { type: Number, required: true, min: 0 },
  monthlyEMI: { type: Number, required: true, min: 0 },
  remainingAmount: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Closed'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
