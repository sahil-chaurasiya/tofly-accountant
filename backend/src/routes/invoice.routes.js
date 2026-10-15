const router = require('express').Router();
const { getOrCreateMonthlyInvoice } = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/monthly', getOrCreateMonthlyInvoice);

module.exports = router;