const router = require('express').Router();
const Joi = require('joi');
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');
const { ROLES } = require('../utils/constants');

const idParam = validate(Joi.object({ id: v.objectId.required() }), 'params');

router.use(protect, authorize(ROLES.ADMIN));
router.get('/', validate(v.userQuery, 'query'), ctrl.listUsers);
router.get('/staff', ctrl.listStaff);
router.post('/', validate(v.createUser), ctrl.createUser);
router.get('/:id', idParam, ctrl.getUser);
router.patch('/:id', idParam, validate(v.updateUser), ctrl.updateUser);
router.delete('/:id', idParam, ctrl.deleteUser);

module.exports = router;
