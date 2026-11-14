const ROLES = Object.freeze({
  STUDENT: 'student',
  ADMIN: 'admin',
  STAFF: 'staff',
});

const STATUS = Object.freeze({
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
});

const STATUSES = Object.values(STATUS);

// Statuses that count as "still open" for dashboard purposes
const PENDING_STATUSES = [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.ASSIGNED, STATUS.REOPENED];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'IT & Network',
  'Hostel',
  'Classroom',
  'Library',
  'Cleanliness',
  'Security',
  'Transport',
  'Canteen',
  'Other',
];

// Which status moves each role may make
const STAFF_ALLOWED_STATUSES = [STATUS.IN_PROGRESS, STATUS.RESOLVED];

const HISTORY_ACTIONS = [
  'created',
  'updated',
  'status_change',
  'assigned',
  'priority_change',
  'remark',
  'progress_update',
  'reopened',
  'feedback',
];

module.exports = {
  ROLES,
  STATUS,
  STATUSES,
  PENDING_STATUSES,
  PRIORITIES,
  CATEGORIES,
  STAFF_ALLOWED_STATUSES,
  HISTORY_ACTIONS,
};
