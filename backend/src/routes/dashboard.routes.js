const router = require('express').Router();
const { getDashboard } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', getDashboard);
module.exports = router;
