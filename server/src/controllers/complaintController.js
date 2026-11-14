const Complaint = require('../models/Complaint');
const ComplaintHistory = require('../models/ComplaintHistory');
const Department = require('../models/Department');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { storeFiles, removeFiles } = require('../utils/storage');
const { escapeRegex, parsePagination, parseSort, paginated } = require('../utils/query');
const { ROLES, STATUS } = require('../utils/constants');
const lifecycle = require('../services/lifecycle');
const { notify, notifyAdmins } = require('../services/notify');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Row-level access: students see their own, staff see assigned, admins see all */
const scopeFor = (user) => {
  if (user.role === ROLES.STUDENT) return { student: user._id };
  if (user.role === ROLES.STAFF) return { assignedTo: user._id };
  return {};
};

const DETAIL_POPULATE = [
  { path: 'student', select: 'name email studentId course phone' },
  { path: 'department', select: 'name code contactEmail contactPhone' },
  { path: 'assignedTo', select: 'name email phone designation' },
  { path: 'adminRemarks.author', select: 'name role' },
  { path: 'staffUpdates.author', select: 'name role' },
  { path: 'feedback', select: 'rating comment createdAt' },
];

const LIST_POPULATE = [
  { path: 'student', select: 'name studentId' },
  { path: 'department', select: 'name code' },
  { path: 'assignedTo', select: 'name' },
];

/** Loads a complaint the current user is allowed to see, or 404s (never leaks existence). */
async function findScoped(id, user) {
  const complaint = await Complaint.findOne({ _id: id, ...scopeFor(user) });
  if (!complaint) throw ApiError.notFound('Complaint not found');
  return complaint;
}

const isOwner = (complaint, user) => String(complaint.student) === String(user._id);
const isAssignee = (complaint, user) => String(complaint.assignedTo || '') === String(user._id);

async function buildDetail(complaint, user) {
  await complaint.populate(DETAIL_POPULATE);
  const history = await ComplaintHistory.find({ complaint: complaint._id })
    .sort({ createdAt: 1 })
    .populate('performedBy', 'name role')
    .lean();

  const json = complaint.toJSON();
  const s = complaint.status;
  const permissions = {
    canEdit: user.role === ROLES.STUDENT && s === STATUS.SUBMITTED,
    canDelete: user.role === ROLES.ADMIN || (user.role === ROLES.STUDENT && s === STATUS.SUBMITTED),
    canReopen: user.role === ROLES.STUDENT && s === STATUS.RESOLVED,
    canGiveFeedback: user.role === ROLES.STUDENT && s === STATUS.RESOLVED && !complaint.feedback,
    canAddUpdate:
      (user.role === ROLES.STAFF || user.role === ROLES.ADMIN) &&
      [STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.REOPENED].includes(s),
    nextStatuses: lifecycle.allowedNextStatuses(complaint, user.role),
  };
  return { complaint: json, history, permissions };
}

/* ------------------------------------------------------------------ */
/* Queries                                                            */
/* ------------------------------------------------------------------ */

// GET /api/complaints  — server-side search, filters, sorting, pagination
exports.listComplaints = asyncHandler(async (req, res) => {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const filter = { ...scopeFor(req.user) };

  if (q.status) filter.status = q.status;
  if (q.priority) filter.priority = q.priority;
  if (q.category) filter.category = q.category;
  if (req.user.role === ROLES.ADMIN) {
    if (q.department) filter.department = q.department;
    if (q.assignedTo) filter.assignedTo = q.assignedTo;
  }
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(q.to);
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }, { complaintId: rx }];
  }

  const sortField = q.sortBy === 'priority' ? 'priorityRank' : q.sortBy;
  const sort = parseSort(
    { ...q, sortBy: sortField },
    ['createdAt', 'updatedAt', 'priorityRank', 'status', 'title', 'complaintId', 'category']
  );

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .select('-adminRemarks -staffUpdates -resolutionImages')
      .populate(LIST_POPULATE)
      .sort({ ...sort, _id: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginated(items, total, page, limit) });
});

// GET /api/complaints/:id
exports.getComplaint = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  res.json({ success: true, ...(await buildDetail(complaint, req.user)) });
});

// GET /api/complaints/:id/history
exports.getHistory = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  const history = await ComplaintHistory.find({ complaint: complaint._id })
    .sort({ createdAt: 1 })
    .populate('performedBy', 'name role');
  res.json({ success: true, history });
});

/* ------------------------------------------------------------------ */
/* Student actions                                                    */
/* ------------------------------------------------------------------ */

// POST /api/complaints  (multipart: fields + images[])
exports.createComplaint = asyncHandler(async (req, res) => {
  const attachments = (await storeFiles(req.files, 'complaints')).map((f) => ({
    ...f,
    uploadedBy: req.user._id,
  }));

  let complaint;
  try {
    complaint = await Complaint.create({ ...req.body, student: req.user._id, attachments });
  } catch (err) {
    await removeFiles(attachments); // don't orphan uploads if the DB write fails
    throw err;
  }

  await lifecycle.logHistory({
    complaint,
    action: 'created',
    user: req.user,
    toStatus: STATUS.SUBMITTED,
    note: 'Complaint submitted',
  });
  await notifyAdmins({
    title: 'New complaint submitted',
    message: `${complaint.complaintId}: ${complaint.title} (${complaint.priority} priority)`,
    complaint: complaint._id,
    type: 'status',
  });

  res.status(201).json({ success: true, message: 'Complaint submitted successfully', complaint });
});

// PATCH /api/complaints/:id  — student edits own complaint before review starts
exports.updateOwnComplaint = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  if (complaint.status !== STATUS.SUBMITTED) {
    throw ApiError.badRequest('A complaint can only be edited before it is reviewed');
  }
  Object.assign(complaint, req.body);
  await complaint.save();
  await lifecycle.logHistory({
    complaint,
    action: 'updated',
    user: req.user,
    note: `Updated: ${Object.keys(req.body).join(', ')}`,
  });
  res.json({ success: true, message: 'Complaint updated', ...(await buildDetail(complaint, req.user)) });
});

// POST /api/complaints/:id/reopen
exports.reopenComplaint = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  if (complaint.status !== STATUS.RESOLVED) {
    throw ApiError.badRequest('Only resolved complaints can be reopened');
  }
  const from = lifecycle.applyStatus(complaint, STATUS.REOPENED);
  await complaint.save();
  await lifecycle.logHistory({
    complaint,
    action: 'reopened',
    user: req.user,
    fromStatus: from,
    toStatus: STATUS.REOPENED,
    note: req.body.reason,
  });

  const payload = {
    title: 'Complaint reopened',
    message: `${complaint.complaintId} was reopened by the student: ${req.body.reason}`,
    complaint: complaint._id,
  };
  await Promise.all([notifyAdmins(payload), notify(complaint.assignedTo, payload)]);

  res.json({ success: true, message: 'Complaint reopened', ...(await buildDetail(complaint, req.user)) });
});

// POST /api/complaints/:id/feedback
exports.submitFeedback = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  if (complaint.status !== STATUS.RESOLVED) {
    throw ApiError.badRequest('Feedback can be given only after the complaint is resolved');
  }
  if (complaint.feedback || (await Feedback.exists({ complaint: complaint._id }))) {
    throw ApiError.conflict('You have already rated this complaint');
  }

  const feedback = await Feedback.create({
    complaint: complaint._id,
    student: req.user._id,
    department: complaint.department,
    staff: complaint.assignedTo,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  complaint.feedback = feedback._id;
  await complaint.save();

  await lifecycle.logHistory({
    complaint,
    action: 'feedback',
    user: req.user,
    note: `Rated ${req.body.rating}/5${req.body.comment ? ` — ${req.body.comment}` : ''}`,
    meta: { rating: req.body.rating },
  });
  const payload = {
    title: 'New feedback received',
    message: `${complaint.complaintId} was rated ${req.body.rating}/5`,
    complaint: complaint._id,
    type: 'feedback',
  };
  await Promise.all([notifyAdmins(payload), notify(complaint.assignedTo, payload)]);

  res.status(201).json({ success: true, message: 'Thank you for your feedback!', feedback });
});

/* ------------------------------------------------------------------ */
/* Admin / staff actions                                              */
/* ------------------------------------------------------------------ */

// DELETE /api/complaints/:id  — admin: any; student: own & still Submitted
exports.deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  if (req.user.role === ROLES.STUDENT && complaint.status !== STATUS.SUBMITTED) {
    throw ApiError.forbidden('You can only delete a complaint before it is reviewed');
  }
  if (req.user.role === ROLES.STAFF) throw ApiError.forbidden();

  await removeFiles([...complaint.attachments, ...complaint.resolutionImages]);
  await Promise.all([
    ComplaintHistory.deleteMany({ complaint: complaint._id }),
    Feedback.deleteMany({ complaint: complaint._id }),
    Notification.deleteMany({ complaint: complaint._id }),
    complaint.deleteOne(),
  ]);
  res.json({ success: true, message: 'Complaint deleted' });
});

// PATCH /api/complaints/:id/status  (admin, staff)
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const complaint = await findScoped(req.params.id, req.user);

  if (req.user.role === ROLES.STAFF && !isAssignee(complaint, req.user)) throw ApiError.forbidden();
  lifecycle.assertTransition(complaint, status, req.user.role);

  const from = lifecycle.applyStatus(complaint, status);
  if (note) {
    const list = req.user.role === ROLES.ADMIN ? complaint.adminRemarks : complaint.staffUpdates;
    list.push({ text: note, author: req.user._id });
  }
  await complaint.save();

  await lifecycle.logHistory({
    complaint,
    action: 'status_change',
    user: req.user,
    fromStatus: from,
    toStatus: status,
    note,
  });

  const payload = {
    title: `Status updated: ${status}`,
    message: `${complaint.complaintId} moved from "${from}" to "${status}"${note ? ` — ${note}` : ''}`,
    complaint: complaint._id,
  };
  const jobs = [notify(complaint.student, payload)];
  if (req.user.role === ROLES.ADMIN && complaint.assignedTo) jobs.push(notify(complaint.assignedTo, payload));
  if (req.user.role === ROLES.STAFF) jobs.push(notifyAdmins(payload));
  await Promise.all(jobs);

  res.json({ success: true, message: `Status changed to ${status}`, ...(await buildDetail(complaint, req.user)) });
});

// PATCH /api/complaints/:id/priority  (admin)
exports.updatePriority = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  const from = complaint.priority;
  if (from === req.body.priority) throw ApiError.badRequest(`Priority is already ${from}`);

  complaint.priority = req.body.priority;
  await complaint.save();
  await lifecycle.logHistory({
    complaint,
    action: 'priority_change',
    user: req.user,
    note: `Priority changed from ${from} to ${complaint.priority}`,
    meta: { from, to: complaint.priority },
  });
  await notify([complaint.student, complaint.assignedTo], {
    title: 'Priority updated',
    message: `${complaint.complaintId} priority is now ${complaint.priority}`,
    complaint: complaint._id,
  });

  res.json({ success: true, message: 'Priority updated', ...(await buildDetail(complaint, req.user)) });
});

// PATCH /api/complaints/:id/assign  (admin) — department + optional staff member
exports.assignComplaint = asyncHandler(async (req, res) => {
  const { department: deptId, assignedTo, note } = req.body;
  const complaint = await findScoped(req.params.id, req.user);

  if (complaint.status === STATUS.RESOLVED) {
    throw ApiError.badRequest('This complaint is resolved. Reopen it before reassigning');
  }

  const department = await Department.findById(deptId);
  if (!department || !department.isActive) throw ApiError.badRequest('Department not found or inactive');

  let staff = null;
  if (assignedTo) {
    staff = await User.findOne({ _id: assignedTo, role: ROLES.STAFF, isActive: true });
    if (!staff) throw ApiError.badRequest('Selected staff member not found or inactive');
    if (String(staff.department) !== String(department._id)) {
      throw ApiError.badRequest(`${staff.name} does not belong to ${department.name}`);
    }
  }

  const previousStaff = complaint.assignedTo;
  complaint.department = department._id;
  complaint.assignedTo = staff?._id;
  complaint.assignedAt = new Date();

  let from = null;
  if ([STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.REOPENED].includes(complaint.status)) {
    from = lifecycle.applyStatus(complaint, STATUS.ASSIGNED);
  }
  if (note) complaint.adminRemarks.push({ text: note, author: req.user._id });
  await complaint.save();

  const summary = `Assigned to ${department.name}${staff ? ` — ${staff.name}` : ''}`;
  await lifecycle.logHistory({
    complaint,
    action: 'assigned',
    user: req.user,
    fromStatus: from,
    toStatus: from ? STATUS.ASSIGNED : null,
    note: note ? `${summary}. ${note}` : summary,
    meta: { department: department.name, staff: staff?.name || null },
  });

  const jobs = [
    notify(complaint.student, {
      title: 'Complaint assigned',
      message: `${complaint.complaintId}: ${summary}`,
      complaint: complaint._id,
      type: 'assignment',
    }),
  ];
  if (staff) {
    jobs.push(
      notify(staff._id, {
        title: 'New complaint assigned to you',
        message: `${complaint.complaintId}: ${complaint.title} (${complaint.priority})`,
        complaint: complaint._id,
        type: 'assignment',
      })
    );
  }
  if (previousStaff && String(previousStaff) !== String(staff?._id || '')) {
    jobs.push(
      notify(previousStaff, {
        title: 'Complaint reassigned',
        message: `${complaint.complaintId} has been reassigned`,
        complaint: complaint._id,
        type: 'assignment',
      })
    );
  }
  await Promise.all(jobs);

  res.json({ success: true, message: summary, ...(await buildDetail(complaint, req.user)) });
});

// POST /api/complaints/:id/remarks  (admin)
exports.addRemark = asyncHandler(async (req, res) => {
  const complaint = await findScoped(req.params.id, req.user);
  complaint.adminRemarks.push({ text: req.body.text, author: req.user._id });
  await complaint.save();

  await lifecycle.logHistory({ complaint, action: 'remark', user: req.user, note: req.body.text });
  await notify(complaint.student, {
    title: 'New remark from administration',
    message: `${complaint.complaintId}: ${req.body.text}`,
    complaint: complaint._id,
    type: 'remark',
  });

  res.status(201).json({ success: true, message: 'Remark added', ...(await buildDetail(complaint, req.user)) });
});

// POST /api/complaints/:id/updates  (staff, admin) — progress note + optional images, optional resolve
exports.addProgressUpdate = asyncHandler(async (req, res) => {
  const { text, resolve } = req.body;
  const complaint = await findScoped(req.params.id, req.user);

  if (req.user.role === ROLES.STAFF && !isAssignee(complaint, req.user)) throw ApiError.forbidden();
  if (![STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.REOPENED].includes(complaint.status)) {
    throw ApiError.badRequest(`Updates cannot be added while the complaint is "${complaint.status}"`);
  }
  if (resolve) lifecycle.assertTransition(complaint, STATUS.RESOLVED, req.user.role);

  const images = (await storeFiles(req.files, 'resolutions')).map((f) => ({ ...f, uploadedBy: req.user._id }));
  complaint.staffUpdates.push({ text, author: req.user._id });
  complaint.resolutionImages.push(...images);

  let from = null;
  if (resolve) from = lifecycle.applyStatus(complaint, STATUS.RESOLVED);
  await complaint.save();

  await lifecycle.logHistory({
    complaint,
    action: resolve ? 'status_change' : 'progress_update',
    user: req.user,
    fromStatus: from,
    toStatus: resolve ? STATUS.RESOLVED : null,
    note: text,
    meta: images.length ? { images: images.length } : undefined,
  });

  const payload = resolve
    ? {
        title: 'Complaint resolved',
        message: `${complaint.complaintId} has been resolved. Please rate the resolution.`,
        complaint: complaint._id,
      }
    : {
        title: 'Progress update',
        message: `${complaint.complaintId}: ${text}`,
        complaint: complaint._id,
      };
  const jobs = [notify(complaint.student, payload)];
  if (req.user.role === ROLES.STAFF) jobs.push(notifyAdmins(payload));
  await Promise.all(jobs);

  res.status(201).json({
    success: true,
    message: resolve ? 'Complaint marked as resolved' : 'Progress update added',
    ...(await buildDetail(complaint, req.user)),
  });
});
