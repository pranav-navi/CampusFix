export const ROLES = { STUDENT: 'student', ADMIN: 'admin', STAFF: 'staff' };

export const ROLE_LABEL = {
  student: 'Student',
  admin: 'Administrator',
  staff: 'Department staff',
};

export const ROLE_HOME = {
  student: '/student',
  admin: '/admin',
  staff: '/staff',
};

// Order matters: this is the lifecycle as students experience it
export const STAGES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

export const STATUS_META = {
  Submitted: { color: '#64748b', bg: '#f1f5f9', hint: 'Waiting for the admin team to review' },
  'Under Review': { color: '#7c5cc4', bg: '#f3effb', hint: 'Admin team is reviewing the details' },
  Assigned: { color: '#2563eb', bg: '#eaf1fe', hint: 'Sent to the department that will fix it' },
  'In Progress': { color: '#d97706', bg: '#fdf4e6', hint: 'Work on the issue has started' },
  Resolved: { color: '#15803d', bg: '#e9f6ee', hint: 'The issue has been fixed' },
  Reopened: { color: '#dc2626', bg: '#fdecec', hint: 'Reported as not fixed — back in the queue' },
};

export const PRIORITY_META = {
  Low: { color: '#64748b', bg: '#f1f5f9' },
  Medium: { color: '#2563eb', bg: '#eaf1fe' },
  High: { color: '#d97706', bg: '#fdf4e6' },
  Urgent: { color: '#dc2626', bg: '#fdecec' },
};

// Fallbacks; the live lists come from GET /api/meta
export const CATEGORIES = [
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
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const STATUSES = Object.keys(STATUS_META);

export const CHART_COLORS = ['#1f4e8c', '#4f86c6', '#93b5e1', '#13294b', '#6b8fbf', '#b9cdea', '#3a6aa8'];

export const MAX_IMAGES = 5;
export const MAX_IMAGE_MB = 5;
