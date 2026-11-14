const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { ROLES } = require('../utils/constants');

const authResponse = async (res, user, status = 200) => {
  await user.populate('department', 'name code');
  res.status(status).json({ success: true, token: signToken(user), user });
};

// POST /api/auth/register  — public sign-up is for students only
exports.register = asyncHandler(async (req, res) => {
  const exists = await User.exists({ email: req.body.email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ ...req.body, role: ROLES.STUDENT });
  await authResponse(res, user, 201);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact the administrator');

  user.lastLogin = new Date();
  await user.save({ validateModifiedOnly: true });
  await authResponse(res, user);
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  await req.user.populate('department', 'name code');
  res.json({ success: true, user: req.user });
});

// PATCH /api/auth/me
exports.updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  await req.user.populate('department', 'name code');
  res.json({ success: true, message: 'Profile updated', user: req.user });
});

// PATCH /api/auth/me/password
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
});
