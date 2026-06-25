const router = require('express').Router();
const { getEmployees, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employee.controller');
const { protect } = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);
module.exports = router;
