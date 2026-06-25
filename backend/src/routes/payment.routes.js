const router = require('express').Router();
const { getPayments, createPayment, updatePayment, deletePayment } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', getPayments);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);
module.exports = router;
