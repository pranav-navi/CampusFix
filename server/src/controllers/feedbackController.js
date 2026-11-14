const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/query');
const { ROLES } = require('../utils/constants');

// GET /api/feedback  — admin: all; staff: feedback on their work; student: their own
exports.listFeedback = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.user.role === ROLES.STUDENT) filter.student = req.user._id;
  if (req.user.role === ROLES.STAFF) filter.staff = req.user._id;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.user.role === ROLES.ADMIN && mongoose.isValidObjectId(req.query.department)) {
    // cast explicitly: aggregate() does not auto-cast strings to ObjectIds
    filter.department = new mongoose.Types.ObjectId(String(req.query.department));
  }

  const [items, total, summary] = await Promise.all([
    Feedback.find(filter)
      .populate('complaint', 'complaintId title category')
      .populate('student', 'name studentId')
      .populate('staff', 'name')
      .populate('department', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Feedback.countDocuments(filter),
    Feedback.aggregate([
      { $match: filter },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    averageRating: summary[0] ? Math.round(summary[0].avg * 10) / 10 : null,
    ...paginated(items, total, page, limit),
  });
});
