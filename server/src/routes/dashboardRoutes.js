const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

router.use(protect);
router.get('/stats', ctrl.getStats);
router.get('/analytics', authorize(ROLES.ADMIN), ctrl.getAnalytics);

module.exports = router;
