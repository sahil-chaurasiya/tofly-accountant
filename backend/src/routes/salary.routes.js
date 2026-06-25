const router = require('express').Router();
const { getSalaries, getMonthlySummary, createSalaryPayment, updateSalaryPayment } = require('../controllers/salary.controller');
const { protect } = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', getSalaries);
router.get('/summary/:month/:year', getMonthlySummary);
router.post('/', createSalaryPayment);
router.put('/:id', updateSalaryPayment);
module.exports = router;
