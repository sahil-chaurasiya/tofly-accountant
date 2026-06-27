const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/companySettings.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', ctrl.get);
router.put('/', ctrl.update);

module.exports = router;