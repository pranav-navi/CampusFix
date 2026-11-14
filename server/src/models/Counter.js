const mongoose = require('mongoose');

// Atomic sequence generator for human-readable complaint IDs (CF-2026-00001)
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(key) {
  const doc = await this.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
