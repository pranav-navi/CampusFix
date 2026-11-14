const router = require('express').Router();
const Joi = require('joi');
const ctrl = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadImages } = require('../middleware/upload');
const v = require('../validators');
const { ROLES } = require('../utils/constants');

const { STUDENT, ADMIN, STAFF } = ROLES;
const idParam = validate(Joi.object({ id: v.objectId.required() }), 'params');

router.use(protect);

router
  .route('/')
  .get(validate(v.complaintQuery, 'query'), ctrl.listComplaints)
  // multer runs first so Joi can validate the multipart text fields
  .post(authorize(STUDENT), uploadImages('images'), validate(v.createComplaint), ctrl.createComplaint);

router
  .route('/:id')
  .all(idParam)
  .get(ctrl.getComplaint)
  .patch(authorize(STUDENT), validate(v.updateOwnComplaint), ctrl.updateOwnComplaint)
  .delete(authorize(STUDENT, ADMIN), ctrl.deleteComplaint);

router.get('/:id/history', idParam, ctrl.getHistory);

// Student
router.post('/:id/reopen', idParam, authorize(STUDENT), validate(v.reopen), ctrl.reopenComplaint);
router.post('/:id/feedback', idParam, authorize(STUDENT), validate(v.feedback), ctrl.submitFeedback);

// Admin
router.patch('/:id/priority', idParam, authorize(ADMIN), validate(v.updatePriority), ctrl.updatePriority);
router.patch('/:id/assign', idParam, authorize(ADMIN), validate(v.assignComplaint), ctrl.assignComplaint);
router.post('/:id/remarks', idParam, authorize(ADMIN), validate(v.noteBody), ctrl.addRemark);

// Admin + assigned staff
router.patch('/:id/status', idParam, authorize(ADMIN, STAFF), validate(v.updateStatus), ctrl.updateStatus);
router.post(
  '/:id/updates',
  idParam,
  authorize(ADMIN, STAFF),
  uploadImages('images'),
  validate(v.progressUpdate),
  ctrl.addProgressUpdate
);

module.exports = router;
