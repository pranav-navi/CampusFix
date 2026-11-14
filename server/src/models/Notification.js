const mongoose = require('mongoose');

// In-app notifications (bell icon). Designed so a Socket.IO emitter can be
// attached later in utils/notify.js without changing callers.
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    type: {
      type: String,
      enum: ['status', 'assignment', 'remark', 'feedback', 'system'],
      default: 'status',
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
