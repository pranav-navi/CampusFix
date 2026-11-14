const mongoose = require('mongoose');
const { HISTORY_ACTIONS, STATUSES, ROLES } = require('../utils/constants');

// Append-only audit trail: every lifecycle event on a complaint lands here
const historySchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    action: { type: String, enum: HISTORY_ACTIONS, required: true },
    fromStatus: { type: String, enum: [...STATUSES, null] },
    toStatus: { type: String, enum: [...STATUSES, null] },
    note: { type: String, trim: true, maxlength: 2000 },
    meta: { type: mongoose.Schema.Types.Mixed },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

historySchema.index({ complaint: 1, createdAt: 1 });

module.exports = mongoose.model('ComplaintHistory', historySchema);
