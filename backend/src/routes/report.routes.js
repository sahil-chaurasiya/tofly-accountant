const router = require('express').Router();
const { getReport } = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', getReport);
module.exports = router;
