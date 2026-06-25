const router = require('express').Router();
const { getAccounting, getMonthSummary, upsertAccounting } = require('../controllers/accounting.controller');
const { protect } = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', getAccounting);
router.get('/:month/:year', getMonthSummary);
router.post('/', upsertAccounting);
module.exports = router;
