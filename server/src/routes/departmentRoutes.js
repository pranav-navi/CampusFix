const router = require('express').Router();
const Joi = require('joi');
const ctrl = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');
const { ROLES } = require('../utils/constants');

const idParam = validate(Joi.object({ id: v.objectId.required() }), 'params');

router.use(protect);
router.get('/', ctrl.listDepartments);
router.post('/', authorize(ROLES.ADMIN), validate(v.department), ctrl.createDepartment);
router.get('/:id', idParam, authorize(ROLES.ADMIN), ctrl.getDepartment);
router.patch('/:id', idParam, authorize(ROLES.ADMIN), validate(v.departmentUpdate), ctrl.updateDepartment);
router.delete('/:id', idParam, authorize(ROLES.ADMIN), ctrl.deleteDepartment);

module.exports = router;
