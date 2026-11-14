const mongoose = require('mongoose');
const Counter = require('./Counter');
const { STATUSES, STATUS, PRIORITIES, CATEGORIES } = require('../utils/constants');

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    originalName: String,
    mimeType: String,
    size: Number,
    provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    category: { type: String, enum: CATEGORIES, required: true },
    location: { type: String, required: true, trim: true, maxlength: 150 },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    // Numeric mirror of priority so lists can sort Low < Medium < High < Urgent
    priorityRank: { type: Number, default: 2 },
    status: { type: String, enum: STATUSES, default: STATUS.SUBMITTED },

    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    attachments: [fileSchema],
    resolutionImages: [fileSchema],
    adminRemarks: [noteSchema],
    staffUpdates: [noteSchema],

    assignedAt: Date,
    resolvedAt: Date,
    reopenCount: { type: Number, default: 0 },
    feedback: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' },
  },
  { timestamps: true }
);

complaintSchema.index({ student: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1, category: 1 });
complaintSchema.index({ title: 'text', description: 'text', location: 'text' });

complaintSchema.pre('validate', function syncPriorityRank() {
  this.priorityRank = PRIORITIES.indexOf(this.priority) + 1;
});

complaintSchema.pre('validate', async function assignReadableId() {
  if (this.complaintId) return;
  const year = new Date().getFullYear();
  const seq = await Counter.next(`complaint-${year}`);
  this.complaintId = `CF-${year}-${String(seq).padStart(5, '0')}`;
});

complaintSchema.virtual('resolutionHours').get(function resolutionHours() {
  if (!this.resolvedAt) return null;
  return Math.round(((this.resolvedAt - this.createdAt) / 36e5) * 10) / 10;
});

complaintSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Complaint', complaintSchema);
