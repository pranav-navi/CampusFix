const router = require('express').Router();
const { CATEGORIES, PRIORITIES, STATUSES } = require('../utils/constants');

router.use('/auth', require('./authRoutes'));
router.use('/complaints', require('./complaintRoutes'));
router.use('/departments', require('./departmentRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/feedback', require('./feedbackRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

// Public lookup values so the frontend never hardcodes enums
router.get('/meta', (_req, res) => {
  res.json({ success: true, categories: CATEGORIES, priorities: PRIORITIES, statuses: STATUSES });
});

module.exports = router;
