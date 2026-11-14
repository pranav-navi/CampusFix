const mongoose = require('mongoose');
const { CATEGORIES } = require('../utils/constants');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 10 },
    description: { type: String, trim: true, maxlength: 500 },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    // Complaint categories this department normally handles (used to suggest assignment)
    categories: [{ type: String, enum: CATEGORIES }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
