const router = require('express').Router();
const ctrl = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

// Submission lives at POST /api/complaints/:id/feedback; this lists feedback (scoped by role)
router.get('/', protect, ctrl.listFeedback);

module.exports = router;
