const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES, STATUS } = require('../utils/constants');

// GET /api/departments  — all roles (students see names on their complaints)
// ?withStats=true (admin) adds staff + complaint counts per department
exports.listDepartments = asyncHandler(async (req, res) => {
  // Admins can ask for inactive departments too (?all=true); everyone else sees active ones
  const filter = req.user.role === ROLES.ADMIN && req.query.all === 'true' ? {} : { isActive: true };

  const departments = await Department.find(filter).sort({ name: 1 }).lean();

  if (req.user.role === ROLES.ADMIN && req.query.withStats === 'true') {
    const ids = departments.map((d) => d._id);
    const [staffCounts, complaintCounts] = await Promise.all([
      User.aggregate([
        { $match: { role: ROLES.STAFF, department: { $in: ids } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { department: { $in: ids } } },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED] }, 1, 0] } },
          },
        },
      ]),
    ]);
    const staffMap = Object.fromEntries(staffCounts.map((s) => [String(s._id), s.count]));
    const cMap = Object.fromEntries(complaintCounts.map((c) => [String(c._id), c]));
    departments.forEach((d) => {
      const c = cMap[String(d._id)] || { total: 0, resolved: 0 };
      d.staffCount = staffMap[String(d._id)] || 0;
      d.complaintCount = c.total;
      d.resolvedCount = c.resolved;
      d.openCount = c.total - c.resolved;
    });
  }

  res.json({ success: true, departments });
});

// GET /api/departments/:id
exports.getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');
  const staff = await User.find({ role: ROLES.STAFF, department: department._id })
    .select('name email phone designation isActive')
    .sort({ name: 1 });
  res.json({ success: true, department, staff });
});

// POST /api/departments
exports.createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  res.status(201).json({ success: true, message: 'Department created', department });
});

// PATCH /api/departments/:id
exports.updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');
  Object.assign(department, req.body);
  await department.save();
  res.json({ success: true, message: 'Department updated', department });
});

// DELETE /api/departments/:id — refused while anything references it (deactivate instead)
exports.deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound('Department not found');
  const id = department._id;

  const [staff, complaints] = await Promise.all([
    User.countDocuments({ department: id }),
    Complaint.countDocuments({ department: id }),
  ]);
  if (staff || complaints) {
    throw ApiError.conflict(
      `Cannot delete: ${staff} staff and ${complaints} complaints are linked to this department. Deactivate it instead`
    );
  }
  await department.deleteOne();
  res.json({ success: true, message: 'Department deleted' });
});
