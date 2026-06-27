const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  contractValue: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' },
  accountManager: { type: String, default: '' },
  workStatus: { type: String, enum: ['On Time', 'Delayed', ''], default: '' },
  paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Paid', ''], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);