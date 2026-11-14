/**
 * Complaint lifecycle rules + audit logging.
 *
 *   Submitted ─► Under Review ─► Assigned ─► In Progress ─► Resolved
 *                                   ▲                          │
 *                                   └──────── Reopened ◄───────┘
 *
 * Admins may move a complaint along any edge in ADMIN_TRANSITIONS.
 * Staff may only work complaints assigned to them, along STAFF_TRANSITIONS.
 * Students may only reopen a Resolved complaint (handled in the controller).
 */
const ComplaintHistory = require('../models/ComplaintHistory');
const ApiError = require('../utils/ApiError');
const { STATUS, ROLES } = require('../utils/constants');

const S = STATUS;

const ADMIN_TRANSITIONS = {
  [S.SUBMITTED]: [S.UNDER_REVIEW, S.ASSIGNED],
  [S.UNDER_REVIEW]: [S.SUBMITTED, S.ASSIGNED],
  [S.ASSIGNED]: [S.UNDER_REVIEW, S.IN_PROGRESS, S.RESOLVED],
  [S.IN_PROGRESS]: [S.ASSIGNED, S.RESOLVED],
  [S.RESOLVED]: [S.REOPENED],
  [S.REOPENED]: [S.UNDER_REVIEW, S.ASSIGNED, S.IN_PROGRESS],
};

const STAFF_TRANSITIONS = {
  [S.ASSIGNED]: [S.IN_PROGRESS],
  [S.REOPENED]: [S.IN_PROGRESS],
  [S.IN_PROGRESS]: [S.RESOLVED],
};

const NEEDS_ASSIGNMENT = [S.ASSIGNED, S.IN_PROGRESS, S.RESOLVED];

function allowedNextStatuses(complaint, role) {
  const map = role === ROLES.ADMIN ? ADMIN_TRANSITIONS : role === ROLES.STAFF ? STAFF_TRANSITIONS : {};
  return map[complaint.status] || [];
}

function assertTransition(complaint, nextStatus, role) {
  if (complaint.status === nextStatus) {
    throw ApiError.badRequest(`Complaint is already "${nextStatus}"`);
  }
  const allowed = allowedNextStatuses(complaint, role);
  if (!allowed.includes(nextStatus)) {
    throw ApiError.badRequest(
      `Cannot move a complaint from "${complaint.status}" to "${nextStatus}"` +
        (allowed.length ? `. Allowed: ${allowed.join(', ')}` : '')
    );
  }
  if (NEEDS_ASSIGNMENT.includes(nextStatus) && !complaint.department) {
    throw ApiError.badRequest('Assign a department before moving this complaint forward');
  }
}

/** Mutates the complaint document's status and timestamps (caller saves). */
function applyStatus(complaint, nextStatus) {
  const from = complaint.status;
  complaint.status = nextStatus;
  if (nextStatus === S.RESOLVED) complaint.resolvedAt = new Date();
  if (nextStatus === S.REOPENED) {
    complaint.resolvedAt = undefined;
    complaint.reopenCount += 1;
  }
  return from;
}

function logHistory({ complaint, action, user, fromStatus = null, toStatus = null, note, meta }) {
  return ComplaintHistory.create({
    complaint: complaint._id || complaint,
    action,
    fromStatus,
    toStatus,
    note,
    meta,
    performedBy: user._id,
    role: user.role,
  });
}

module.exports = {
  ADMIN_TRANSITIONS,
  STAFF_TRANSITIONS,
  allowedNextStatuses,
  assertTransition,
  applyStatus,
  logHistory,
};
