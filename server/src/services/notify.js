/**
 * Notification service.
 * Today it writes in-app notifications to MongoDB. To add real-time delivery
 * later, register a Socket.IO emitter with setRealtimeEmitter(io-based fn) and
 * every existing caller starts pushing live updates with no other changes.
 * The same seam is where email notifications would be plugged in.
 */
const Notification = require('../models/Notification');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

let realtimeEmitter = null;
const setRealtimeEmitter = (fn) => {
  realtimeEmitter = fn;
};

async function notify(userIds, { title, message, complaint, type = 'status' }) {
  const ids = [...new Set([].concat(userIds).filter(Boolean).map(String))];
  if (!ids.length) return [];
  const docs = await Notification.insertMany(
    ids.map((user) => ({ user, title, message, complaint, type }))
  );
  if (realtimeEmitter) docs.forEach((d) => realtimeEmitter(String(d.user), d));
  return docs;
}

async function notifyAdmins(payload, exceptUserId) {
  const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id').lean();
  const ids = admins.map((a) => String(a._id)).filter((id) => id !== String(exceptUserId || ''));
  return notify(ids, payload);
}

module.exports = { notify, notifyAdmins, setRealtimeEmitter };
