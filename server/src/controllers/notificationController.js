const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/notifications?limit=20&unread=true
exports.listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const filter = { user: req.user._id };
  if (req.query.unread === 'true') filter.read = false;

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit).populate('complaint', 'complaintId'),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, items, unreadCount });
});

// PATCH /api/notifications/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, notification: n });
});

// PATCH /api/notifications/read-all
exports.markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, updated: r.modifiedCount });
});
