const Payment = require('../models/Payment');
const Client = require('../models/Client');

exports.getPayments = async (req, res) => {
  try {
    const { clientId, month, year } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (month) filter.month = parseInt(month);
    if (year)  filter.year  = parseInt(year);
    const payments = await Payment.find(filter)
      .populate('clientId', 'name contractValue')
      .sort({ year: -1, month: -1, paymentDate: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const client = await Client.findById(req.body.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    // auto-derive month/year from paymentDate if not supplied
    const date = new Date(req.body.paymentDate);
    const month = req.body.month || (date.getMonth() + 1);
    const year  = req.body.year  || date.getFullYear();
    const payment = await Payment.create({ ...req.body, month, year });
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    if (req.body.paymentDate && !req.body.month) {
      const d = new Date(req.body.paymentDate);
      req.body.month = d.getMonth() + 1;
      req.body.year  = d.getFullYear();
    }
    const payment = await Payment.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};