const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  contractValue: { type: Number, required: true, min: 0 },
  notes: { type: String, default: '' },
  accountManager: { type: String, default: '' },
  workStatus: { type: String, enum: ['On Time', 'Delayed', ''], default: '' },
  paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Paid', ''], default: 'Pending' },
  // Pause/deactivate support — a paused client stops accruing new monthly dues
  // from the moment it's paused, but everything billed while it was active stays intact.
  isActive: { type: Boolean, default: true },
  pauseHistory: [{
    pausedAt: { type: Date, required: true },
    resumedAt: { type: Date, default: null },
    _id: false,
  }],
  // Contract-completion support — a completed client stops being billed and
  // stops showing up in any month AFTER the month `endDate` falls in. Unlike
  // pause, this is meant to be permanent: if the client comes back, they're
  // re-added as a brand new client rather than reactivated.
  endDate: { type: Date, default: null },
  // Manual drag-and-drop position on the Clients page (lower = earlier).
  // New clients are appended to the end (see createClient).
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);