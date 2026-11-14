const Complaint = require('../models/Complaint');
const ComplaintHistory = require('../models/ComplaintHistory');
const Department = require('../models/Department');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, STATUS, STATUSES, PENDING_STATUSES, PRIORITIES, CATEGORIES } = require('../utils/constants');

/* ---------- shared helpers ---------- */

async function statusCounts(match) {
  const rows = await Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  rows.forEach((r) => {
    byStatus[r._id] = r.count;
  });
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return {
    total,
    byStatus,
    pending: PENDING_STATUSES.reduce((sum, s) => sum + byStatus[s], 0),
    inProgress: byStatus[STATUS.IN_PROGRESS],
    resolved: byStatus[STATUS.RESOLVED],
    reopened: byStatus[STATUS.REOPENED],
  };
}

async function avgResolutionHours(match) {
  const [r] = await Complaint.aggregate([
    { $match: { ...match, status: STATUS.RESOLVED, resolvedAt: { $ne: null } } },
    { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
  ]);
  return r ? Math.round((r.avgMs / 36e5) * 10) / 10 : null;
}

async function avgRating(match) {
  const [r] = await Feedback.aggregate([
    { $match: match },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return r ? { average: Math.round(r.avg * 10) / 10, count: r.count } : { average: null, count: 0 };
}

const recentComplaints = (match, limit = 5) =>
  Complaint.find(match)
    .select('complaintId title status priority category location createdAt updatedAt department assignedTo student')
    .populate('department', 'name code')
    .populate('assignedTo', 'name')
    .populate('student', 'name studentId')
    .sort({ updatedAt: -1 })
    .limit(limit);

async function recentActivity(complaintMatch, limit = 8) {
  const ids = await Complaint.find(complaintMatch).distinct('_id');
  return ComplaintHistory.find({ complaint: { $in: ids } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('complaint', 'complaintId title')
    .populate('performedBy', 'name role');
}

/* ---------- GET /api/dashboard/stats (role-aware) ---------- */

exports.getStats = asyncHandler(async (req, res) => {
  const { user } = req;

  if (user.role === ROLES.STUDENT) {
    const match = { student: user._id };
    const [counts, recent, activity, awaitingFeedback] = await Promise.all([
      statusCounts(match),
      recentComplaints(match),
      recentActivity(match),
      Complaint.countDocuments({ ...match, status: STATUS.RESOLVED, feedback: null }),
    ]);
    return res.json({ success: true, role: user.role, counts, recent, activity, awaitingFeedback });
  }

  if (user.role === ROLES.STAFF) {
    const match = { assignedTo: user._id };
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [counts, recent, activity, urgentOpen, resolvedThisMonth, avgHours, rating] = await Promise.all([
      statusCounts(match),
      recentComplaints(match),
      recentActivity(match),
      Complaint.countDocuments({
        ...match,
        priority: { $in: ['High', 'Urgent'] },
        status: { $in: [STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.REOPENED] },
      }),
      Complaint.countDocuments({ ...match, status: STATUS.RESOLVED, resolvedAt: { $gte: monthStart } }),
      avgResolutionHours(match),
      avgRating({ staff: user._id }),
    ]);
    // For staff, "pending" means waiting for them to start work
    counts.pending = counts.byStatus[STATUS.ASSIGNED] + counts.byStatus[STATUS.REOPENED];
    return res.json({
      success: true,
      role: user.role,
      counts,
      recent,
      activity,
      urgentOpen,
      resolvedThisMonth,
      avgResolutionHours: avgHours,
      rating,
    });
  }

  // Admin
  const [counts, userRows, departments, rating, avgHours, recent, activity, unassignedUrgent] = await Promise.all([
    statusCounts({}),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Department.countDocuments({ isActive: true }),
    avgRating({}),
    avgResolutionHours({}),
    recentComplaints({}, 6),
    ComplaintHistory.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('complaint', 'complaintId title')
      .populate('performedBy', 'name role'),
    Complaint.find({ assignedTo: null, status: { $ne: STATUS.RESOLVED }, priority: { $in: ['High', 'Urgent'] } })
      .select('complaintId title priority status createdAt')
      .sort({ priorityRank: -1, createdAt: 1 })
      .limit(5),
  ]);
  const users = { student: 0, staff: 0, admin: 0 };
  userRows.forEach((r) => {
    users[r._id] = r.count;
  });

  res.json({
    success: true,
    role: user.role,
    counts,
    users,
    departments,
    rating,
    avgResolutionHours: avgHours,
    recent,
    activity,
    unassignedUrgent,
  });
});

/* ---------- GET /api/dashboard/analytics (admin) ---------- */

exports.getAnalytics = asyncHandler(async (req, res) => {
  const months = Math.min(24, Math.max(3, parseInt(req.query.months, 10) || 12));
  const tz = env.timezone;
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [category, department, submittedMonthly, resolvedMonthly, priority, status, deptRatings] =
    await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED] }, 1, 0] } },
          },
        },
      ]),
      Complaint.aggregate([
        { $match: { department: { $ne: null } } },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', STATUS.IN_PROGRESS] }, 1, 0] } },
            avgMs: {
              $avg: {
                $cond: [
                  { $and: [{ $eq: ['$status', STATUS.RESOLVED] }, { $ifNull: ['$resolvedAt', false] }] },
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  null,
                ],
              },
            },
          },
        },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $unwind: '$dept' },
        { $sort: { total: -1 } },
      ]),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: tz } }, count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { resolvedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$resolvedAt', timezone: tz } }, count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: '$department', avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);

  // Category-wise: include zero rows so the chart axis is stable
  const catMap = Object.fromEntries(category.map((c) => [c._id, c]));
  const categoryWise = CATEGORIES.map((name) => ({
    category: name,
    total: catMap[name]?.total || 0,
    resolved: catMap[name]?.resolved || 0,
    pending: (catMap[name]?.total || 0) - (catMap[name]?.resolved || 0),
  })).filter((c) => c.total > 0);

  const ratingMap = Object.fromEntries(deptRatings.map((r) => [String(r._id), r]));
  const departmentWise = department.map((d) => ({
    departmentId: d._id,
    department: d.dept.name,
    code: d.dept.code,
    total: d.total,
    resolved: d.resolved,
    inProgress: d.inProgress,
    pending: d.total - d.resolved - d.inProgress,
    resolutionRate: d.total ? Math.round((d.resolved / d.total) * 100) : 0,
    avgResolutionHours: d.avgMs ? Math.round((d.avgMs / 36e5) * 10) / 10 : null,
    avgRating: ratingMap[String(d._id)] ? Math.round(ratingMap[String(d._id)].avg * 10) / 10 : null,
  }));

  // Monthly trend: fill every month in the window, even with zero complaints
  const subMap = Object.fromEntries(submittedMonthly.map((m) => [m._id, m.count]));
  const resMap = Object.fromEntries(resolvedMonthly.map((m) => [m._id, m.count]));
  const monthlyTrend = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend.push({
      month: key,
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      submitted: subMap[key] || 0,
      resolved: resMap[key] || 0,
    });
  }

  const prMap = Object.fromEntries(priority.map((p) => [p._id, p.count]));
  const priorityWise = PRIORITIES.map((p) => ({ priority: p, count: prMap[p] || 0 }));

  const stMap = Object.fromEntries(status.map((s) => [s._id, s.count]));
  const statusWise = STATUSES.map((s) => ({ status: s, count: stMap[s] || 0 }));
  const resolvedVsPending = [
    { name: 'Resolved', value: stMap[STATUS.RESOLVED] || 0 },
    { name: 'In Progress', value: stMap[STATUS.IN_PROGRESS] || 0 },
    { name: 'Pending', value: PENDING_STATUSES.reduce((sum, s) => sum + (stMap[s] || 0), 0) },
  ];

  res.json({
    success: true,
    categoryWise,
    departmentWise,
    monthlyTrend,
    priorityWise,
    statusWise,
    resolvedVsPending,
  });
});
