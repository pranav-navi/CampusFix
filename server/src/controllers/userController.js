const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, parsePagination, parseSort, paginated } = require('../utils/query');
const { ROLES, STATUS } = require('../utils/constants');

// GET /api/users  (admin) — ?role=student|staff|admin&department=&isActive=&search=
exports.listUsers = asyncHandler(async (req, res) => {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.department) filter.department = q.department;
  if (q.isActive) filter.isActive = q.isActive === 'true';
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }];
  }
  const sort = parseSort(q, ['name', 'email', 'createdAt', 'lastLogin', 'role']);

  const [users, total] = await Promise.all([
    User.find(filter).populate('department', 'name code').sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // Attach complaint counts (submitted for students, assigned for staff)
  const ids = users.map((u) => u._id);
  const [byStudent, byStaff] = await Promise.all([
    Complaint.aggregate([
      { $match: { student: { $in: ids } } },
      { $group: { _id: '$student', total: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { assignedTo: { $in: ids } } },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const sMap = Object.fromEntries(byStudent.map((r) => [String(r._id), r]));
  const tMap = Object.fromEntries(byStaff.map((r) => [String(r._id), r]));
  users.forEach((u) => {
    delete u.password;
    if (u.role === ROLES.STUDENT) u.complaintCount = sMap[String(u._id)]?.total || 0;
    if (u.role === ROLES.STAFF) {
      u.assignedCount = tMap[String(u._id)]?.total || 0;
      u.resolvedCount = tMap[String(u._id)]?.resolved || 0;
    }
  });

  res.json({ success: true, ...paginated(users, total, page, limit) });
});

// GET /api/users/staff?department=  (admin) — lightweight list for assignment dropdowns
exports.listStaff = asyncHandler(async (req, res) => {
  const filter = { role: ROLES.STAFF, isActive: true };
  if (req.query.department) filter.department = req.query.department;
  const staff = await User.find(filter).select('name email designation department').sort({ name: 1 });

  const workload = await Complaint.aggregate([
    {
      $match: {
        assignedTo: { $in: staff.map((s) => s._id) },
        status: { $in: [STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.REOPENED] },
      },
    },
    { $group: { _id: '$assignedTo', open: { $sum: 1 } } },
  ]);
  const w = Object.fromEntries(workload.map((x) => [String(x._id), x.open]));
  res.json({
    success: true,
    staff: staff.map((s) => ({ ...s.toJSON(), openAssignments: w[String(s._id)] || 0 })),
  });
});

// GET /api/users/:id  (admin)
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('department', 'name code');
  if (!user) throw ApiError.notFound('User not found');

  const key = user.role === ROLES.STAFF ? 'assignedTo' : 'student';
  const recentComplaints =
    user.role === ROLES.ADMIN
      ? []
      : await Complaint.find({ [key]: user._id })
          .select('complaintId title status priority createdAt')
          .sort({ createdAt: -1 })
          .limit(10);
  res.json({ success: true, user, recentComplaints });
});

// POST /api/users  (admin) — create staff, admin or student accounts
exports.createUser = asyncHandler(async (req, res) => {
  if (req.body.department) {
    const dept = await Department.findById(req.body.department);
    if (!dept) throw ApiError.badRequest('Department not found');
  }
  if (await User.exists({ email: req.body.email.toLowerCase() })) {
    throw ApiError.conflict('An account with this email already exists');
  }
  const user = await User.create(req.body);
  await user.populate('department', 'name code');
  res.status(201).json({ success: true, message: `${user.role} account created`, user });
});

// PATCH /api/users/:id  (admin)
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  if (req.body.department) {
    if (user.role !== ROLES.STAFF) throw ApiError.badRequest('Only staff members belong to a department');
    if (!(await Department.exists({ _id: req.body.department }))) throw ApiError.badRequest('Department not found');
  }
  if (req.body.studentId && user.role !== ROLES.STUDENT) {
    throw ApiError.badRequest('Only students have a student ID');
  }

  Object.assign(user, req.body);
  await user.save();
  await user.populate('department', 'name code');
  res.json({ success: true, message: 'User updated', user });
});

// DELETE /api/users/:id  (admin) — only accounts with no linked complaints; otherwise deactivate
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');

  const linked = await Complaint.countDocuments({ $or: [{ student: user._id }, { assignedTo: user._id }] });
  if (linked) {
    throw ApiError.conflict(`This user is linked to ${linked} complaint(s). Deactivate the account instead`);
  }
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});
