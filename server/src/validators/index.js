const Joi = require('joi');
const { ROLES, STATUSES, PRIORITIES, CATEGORIES } = require('../utils/constants');

const objectId = Joi.string().hex().length(24).messages({ 'string.length': '{{#label}} must be a valid id' });
const password = Joi.string().min(6).max(64);
const listQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().max(30),
  order: Joi.string().valid('asc', 'desc', 'ascend', 'descend').default('desc'),
  search: Joi.string().trim().allow('').max(100),
};

// ---------- Auth ----------
const register = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().required(),
  password: password.required(),
  studentId: Joi.string().trim().max(30).required().label('Student ID / Roll No.'),
  course: Joi.string().trim().max(80).allow(''),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).allow('').messages({
    'string.pattern.base': 'Phone number is not valid',
  }),
});

const login = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

const updateProfile = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  phone: Joi.string().trim().pattern(/^[0-9+\-\s]{7,15}$/).allow(''),
  course: Joi.string().trim().max(80).allow(''),
}).min(1);

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password.required().invalid(Joi.ref('currentPassword')).messages({
    'any.invalid': 'New password must be different from the current one',
  }),
});

// ---------- Complaints ----------
const createComplaint = Joi.object({
  title: Joi.string().trim().min(5).max(120).required(),
  description: Joi.string().trim().min(10).max(3000).required(),
  category: Joi.string().valid(...CATEGORIES).required(),
  location: Joi.string().trim().min(2).max(150).required(),
  priority: Joi.string().valid(...PRIORITIES).default('Medium'),
});

const updateOwnComplaint = Joi.object({
  title: Joi.string().trim().min(5).max(120),
  description: Joi.string().trim().min(10).max(3000),
  category: Joi.string().valid(...CATEGORIES),
  location: Joi.string().trim().min(2).max(150),
  priority: Joi.string().valid(...PRIORITIES),
}).min(1);

const complaintQuery = Joi.object({
  ...listQuery,
  status: Joi.string().valid(...STATUSES, ''),
  priority: Joi.string().valid(...PRIORITIES, ''),
  category: Joi.string().valid(...CATEGORIES, ''),
  department: objectId.allow(''),
  assignedTo: objectId.allow(''),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

const updateStatus = Joi.object({
  status: Joi.string().valid(...STATUSES).required(),
  note: Joi.string().trim().max(2000).allow(''),
});

const updatePriority = Joi.object({
  priority: Joi.string().valid(...PRIORITIES).required(),
});

const assignComplaint = Joi.object({
  department: objectId.required(),
  assignedTo: objectId.allow(null, ''),
  note: Joi.string().trim().max(2000).allow(''),
});

const noteBody = Joi.object({
  text: Joi.string().trim().min(2).max(2000).required(),
});

const progressUpdate = Joi.object({
  text: Joi.string().trim().min(2).max(2000).required(),
  resolve: Joi.boolean().default(false),
});

const reopen = Joi.object({
  reason: Joi.string().trim().min(5).max(1000).required(),
});

// ---------- Feedback ----------
const feedback = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(1000).allow(''),
});

// ---------- Departments ----------
const department = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  code: Joi.string().trim().alphanum().min(2).max(10).required(),
  description: Joi.string().trim().max(500).allow(''),
  contactEmail: Joi.string().trim().email().allow(''),
  contactPhone: Joi.string().trim().max(20).allow(''),
  categories: Joi.array().items(Joi.string().valid(...CATEGORIES)).default([]),
  isActive: Joi.boolean(),
});
const departmentUpdate = department.fork(['name', 'code'], (s) => s.optional()).min(1);

// ---------- Users (admin) ----------
const createUser = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().required(),
  password: password.required(),
  role: Joi.string().valid(ROLES.STUDENT, ROLES.STAFF, ROLES.ADMIN).required(),
  phone: Joi.string().trim().max(20).allow(''),
  studentId: Joi.when('role', { is: ROLES.STUDENT, then: Joi.string().trim().max(30).required(), otherwise: Joi.forbidden() }),
  course: Joi.string().trim().max(80).allow(''),
  department: Joi.when('role', { is: ROLES.STAFF, then: objectId.required(), otherwise: Joi.forbidden() }),
  designation: Joi.string().trim().max(80).allow(''),
});

const updateUser = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  phone: Joi.string().trim().max(20).allow(''),
  studentId: Joi.string().trim().max(30),
  course: Joi.string().trim().max(80).allow(''),
  department: objectId,
  designation: Joi.string().trim().max(80).allow(''),
  isActive: Joi.boolean(),
  password: password,
}).min(1);

const userQuery = Joi.object({
  ...listQuery,
  role: Joi.string().valid(...Object.values(ROLES), ''),
  department: objectId.allow(''),
  isActive: Joi.string().valid('true', 'false', ''),
});

module.exports = {
  objectId,
  register,
  login,
  updateProfile,
  changePassword,
  createComplaint,
  updateOwnComplaint,
  complaintQuery,
  updateStatus,
  updatePriority,
  assignComplaint,
  noteBody,
  progressUpdate,
  reopen,
  feedback,
  department,
  departmentUpdate,
  createUser,
  updateUser,
  userQuery,
};
