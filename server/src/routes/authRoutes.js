const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');

// Slow down brute-force attempts on credentials
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes' },
});

router.post('/register', authLimiter, validate(v.register), ctrl.register);
router.post('/login', authLimiter, validate(v.login), ctrl.login);

router.get('/me', protect, ctrl.me);
router.patch('/me', protect, validate(v.updateProfile), ctrl.updateMe);
router.patch('/me/password', protect, validate(v.changePassword), ctrl.changePassword);

module.exports = router;
