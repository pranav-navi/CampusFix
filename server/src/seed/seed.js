/**
 * Demo data seeder.
 *   npm run seed            -> wipes CampusFix collections and loads demo data
 *
 * Creates departments, 3 demo login accounts (student / admin / staff) plus extra
 * students and staff, and ~60 complaints spread over the last 8 months with a
 * full, consistent history trail, remarks, updates and feedback — so every
 * dashboard and chart shows real database-backed numbers from the first login.
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const {
  User,
  Department,
  Complaint,
  ComplaintHistory,
  Feedback,
  Notification,
  Counter,
} = require('../models');
const { ROLES, STATUS } = require('../utils/constants');

// Deterministic PRNG so every seed run produces the same dataset
let seed = 42;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const addHours = (d, h) => new Date(d.getTime() + h * 36e5);

const DEMO_PASSWORDS = { student: 'Student@123', admin: 'Admin@123', staff: 'Staff@123' };

const DEPARTMENTS = [
  { name: 'Electrical Maintenance', code: 'ELEC', categories: ['Electrical'], description: 'Wiring, lighting, fans, power backup and electrical safety across campus.' },
  { name: 'Plumbing & Sanitation', code: 'PLMB', categories: ['Plumbing'], description: 'Water supply, leakages, washrooms and drainage.' },
  { name: 'IT Services', code: 'ITS', categories: ['IT & Network'], description: 'Wi-Fi, LAN, computer labs, projectors and campus software.' },
  { name: 'Hostel Administration', code: 'HOST', categories: ['Hostel'], description: 'Hostel rooms, furniture, mess coordination and warden office.' },
  { name: 'Housekeeping', code: 'HSKP', categories: ['Cleanliness', 'Classroom'], description: 'Cleaning of classrooms, corridors, washrooms and common areas.' },
  { name: 'Campus Security', code: 'SEC', categories: ['Security'], description: 'Gates, CCTV, ID checks, lost & found and safety incidents.' },
  { name: 'Estate & Civil Works', code: 'EST', categories: ['Classroom', 'Library', 'Other'], description: 'Buildings, furniture, doors, windows and civil repairs.' },
  { name: 'Transport Office', code: 'TRNS', categories: ['Transport'], description: 'College buses, routes, timings and parking.' },
  { name: 'Canteen Committee', code: 'CANT', categories: ['Canteen'], description: 'Food quality, hygiene and pricing at campus canteens.' },
];

const STAFF = [
  { name: 'Rajesh Kumar', email: 'staff@campusfix.edu', dept: 'ELEC', designation: 'Senior Electrician', demo: true },
  { name: 'Gurpreet Singh', email: 'gurpreet.singh@campusfix.edu', dept: 'ELEC', designation: 'Electrician' },
  { name: 'Sunil Verma', email: 'sunil.verma@campusfix.edu', dept: 'PLMB', designation: 'Plumbing Supervisor' },
  { name: 'Anita Sharma', email: 'anita.sharma@campusfix.edu', dept: 'ITS', designation: 'Network Engineer' },
  { name: 'Vikram Mehta', email: 'vikram.mehta@campusfix.edu', dept: 'ITS', designation: 'IT Support Executive' },
  { name: 'Harjit Kaur', email: 'harjit.kaur@campusfix.edu', dept: 'HOST', designation: 'Hostel Warden' },
  { name: 'Ramesh Yadav', email: 'ramesh.yadav@campusfix.edu', dept: 'HSKP', designation: 'Housekeeping Lead' },
  { name: 'Balwinder Singh', email: 'balwinder.singh@campusfix.edu', dept: 'SEC', designation: 'Security Officer' },
  { name: 'Manoj Tiwari', email: 'manoj.tiwari@campusfix.edu', dept: 'EST', designation: 'Civil Engineer' },
  { name: 'Deepak Arora', email: 'deepak.arora@campusfix.edu', dept: 'TRNS', designation: 'Transport Coordinator' },
  { name: 'Neha Gupta', email: 'neha.gupta@campusfix.edu', dept: 'CANT', designation: 'Canteen Supervisor' },
];

const STUDENTS = [
  { name: 'Aarav Sharma', email: 'student@campusfix.edu', studentId: 'MCA2025-014', course: 'MCA (AI & DS)', demo: true },
  { name: 'Simran Kaur', email: 'simran.kaur@campusfix.edu', studentId: 'BCA2024-102', course: 'BCA' },
  { name: 'Rohan Gupta', email: 'rohan.gupta@campusfix.edu', studentId: 'BTECH2023-221', course: 'B.Tech CSE' },
  { name: 'Priya Malhotra', email: 'priya.malhotra@campusfix.edu', studentId: 'MBA2025-031', course: 'MBA' },
  { name: 'Karan Bedi', email: 'karan.bedi@campusfix.edu', studentId: 'BTECH2024-118', course: 'B.Tech ECE' },
  { name: 'Ishita Bansal', email: 'ishita.bansal@campusfix.edu', studentId: 'BSC2024-077', course: 'B.Sc Data Science' },
];

// [category, title, description, location]
const TEMPLATES = [
  ['Electrical', 'Tube lights not working in Room 204', 'Three tube lights at the back of the classroom have stopped working, making it hard to read the board during evening lectures.', 'Academic Block B, Room 204'],
  ['Electrical', 'Ceiling fan making loud noise', 'The ceiling fan near the window wobbles and makes a grinding noise at high speed. It looks unsafe.', 'Hostel A, Room 112'],
  ['Electrical', 'Frequent power cuts in computer lab', 'The lab loses power several times a day and systems shut down without warning, losing unsaved work.', 'Computer Lab 3, IT Block'],
  ['Electrical', 'Sparking from switchboard', 'The switchboard near the entrance sparks whenever the AC is turned on. Please check urgently.', 'Library, Ground Floor'],
  ['Plumbing', 'Water leakage in washroom', 'Continuous water leakage from the pipe under the wash basin has flooded the washroom floor.', 'Academic Block A, 2nd Floor Washroom'],
  ['Plumbing', 'No water supply in hostel bathroom', 'There has been no water supply in the bathrooms since yesterday morning.', 'Girls Hostel, Wing C'],
  ['Plumbing', 'Water cooler not dispensing cold water', 'The water cooler only dispenses warm water and the tap leaks.', 'Main Corridor, Admin Block'],
  ['IT & Network', 'Wi-Fi not working in hostel', 'The campus Wi-Fi keeps disconnecting every few minutes and speeds are extremely slow at night.', 'Boys Hostel, Block 2'],
  ['IT & Network', 'Projector not connecting to laptop', 'The HDMI port of the classroom projector is loose; the display flickers and disconnects.', 'Seminar Hall 1'],
  ['IT & Network', 'Unable to log in to student portal', 'The student portal shows an error after login and I cannot download my admit card.', 'Online / Student Portal'],
  ['IT & Network', 'Lab computers running very slow', 'Most systems in the lab take more than 10 minutes to boot and Python IDEs freeze.', 'Computer Lab 1, IT Block'],
  ['Hostel', 'Broken bed frame', 'The wooden bed frame has cracked and the bed tilts to one side.', 'Hostel B, Room 305'],
  ['Hostel', 'Room door lock jammed', 'The room door lock is jammed and the key does not turn properly; we are unable to lock the room.', 'Girls Hostel, Room 018'],
  ['Hostel', 'Mess timings not followed', 'Dinner is served 30-40 minutes late almost every day this week.', 'Hostel Mess'],
  ['Cleanliness', 'Garbage not collected near canteen', 'Dustbins near the canteen are overflowing and have not been cleared for two days.', 'Canteen Backyard'],
  ['Cleanliness', 'Washrooms not cleaned regularly', 'The washrooms on the third floor are not being cleaned and there is a bad smell.', 'Academic Block C, 3rd Floor'],
  ['Classroom', 'Broken benches in classroom', 'Four benches in the last row are broken and students have to stand during lectures.', 'Academic Block A, Room 108'],
  ['Classroom', 'Whiteboard surface damaged', 'The whiteboard is stained and markers do not erase properly.', 'Academic Block B, Room 210'],
  ['Library', 'Reading room AC not cooling', 'The AC in the reading room is running but not cooling at all.', 'Central Library, Reading Room'],
  ['Library', 'Insufficient charging points', 'Most charging sockets near study desks are not working.', 'Central Library, 1st Floor'],
  ['Security', 'CCTV camera not working at gate 2', 'The CCTV camera at gate 2 appears to be switched off for the past week.', 'Gate 2'],
  ['Security', 'Street lights off near parking', 'The parking area is completely dark after 7 pm, which feels unsafe.', 'Student Parking Area'],
  ['Transport', 'College bus arriving late', 'Route 7 bus has been arriving 25 minutes late every morning, causing us to miss first lectures.', 'Bus Route 7 (Jalandhar Bypass)'],
  ['Transport', 'Bus overcrowded on evening route', 'The 5:30 pm bus on Route 3 is overcrowded and students have to stand for an hour.', 'Bus Route 3'],
  ['Canteen', 'Food quality issue in canteen', 'The food served today was stale and a few students felt unwell after lunch.', 'Main Canteen'],
  ['Canteen', 'Drinking water not available in canteen', 'The RO water dispenser in the canteen has been empty since morning.', 'Main Canteen'],
  ['Other', 'Lift not working in Admin Block', 'The lift is stuck on the 2nd floor and has an out-of-order sign since Monday.', 'Admin Block'],
];

const DEPT_FOR_CATEGORY = {
  Electrical: 'ELEC',
  Plumbing: 'PLMB',
  'IT & Network': 'ITS',
  Hostel: 'HOST',
  Cleanliness: 'HSKP',
  Classroom: 'EST',
  Library: 'EST',
  Security: 'SEC',
  Transport: 'TRNS',
  Canteen: 'CANT',
  Other: 'EST',
};

const ADMIN_REMARKS = [
  'Verified with the block supervisor. Forwarding to the concerned department.',
  'Marked as priority since it affects classes.',
  'Please share photos if the issue persists after the fix.',
  'Duplicate reports received; tracking all of them under this complaint.',
];
const STAFF_NOTES = [
  'Inspected the site and identified the faulty component.',
  'Spare parts requested from the store; work will continue tomorrow.',
  'Repair work started; area temporarily cordoned off.',
  'Issue fixed and tested. Please confirm.',
];
const FEEDBACK = [
  [5, 'Fixed quickly. Thank you!'],
  [4, 'Resolved well, took a little longer than expected.'],
  [5, 'Very prompt response from the team.'],
  [3, 'Resolved, but had to follow up twice.'],
  [4, 'Good work, issue has not come back.'],
  [2, 'Took almost a week to fix.'],
];

// Target end state -> path the complaint travels through
const PATHS = {
  [STATUS.SUBMITTED]: [STATUS.SUBMITTED],
  [STATUS.UNDER_REVIEW]: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW],
  [STATUS.ASSIGNED]: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.ASSIGNED],
  [STATUS.IN_PROGRESS]: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.ASSIGNED, STATUS.IN_PROGRESS],
  [STATUS.RESOLVED]: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.RESOLVED],
  [STATUS.REOPENED]: [STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.RESOLVED, STATUS.REOPENED],
};

async function buildComplaint({ template, student, admin, depts, staffByDept, finalStatus, createdAt, priority }) {
  const [category, title, description, location] = template;
  const dept = depts[DEPT_FOR_CATEGORY[category]];
  const staffPool = staffByDept[dept.code];
  const staff = pick(staffPool);
  const path = PATHS[finalStatus];

  const complaint = new Complaint({
    title,
    description,
    category,
    location,
    priority,
    status: finalStatus,
    student: student._id,
    createdAt,
  });

  const history = [
    { action: 'created', toStatus: STATUS.SUBMITTED, note: 'Complaint submitted', performedBy: student._id, role: ROLES.STUDENT, createdAt },
  ];
  let t = createdAt;
  for (let i = 1; i < path.length; i += 1) {
    const step = path[i];
    t = addHours(t, 2 + rand() * (priority === 'Urgent' ? 6 : 30));
    if (step === STATUS.UNDER_REVIEW) {
      history.push({ action: 'status_change', fromStatus: path[i - 1], toStatus: step, note: 'Complaint is being reviewed by administration', performedBy: admin._id, role: ROLES.ADMIN, createdAt: t });
      if (rand() > 0.5) {
        const text = pick(ADMIN_REMARKS);
        complaint.adminRemarks.push({ text, author: admin._id, createdAt: t });
        history.push({ action: 'remark', note: text, performedBy: admin._id, role: ROLES.ADMIN, createdAt: addHours(t, 0.1) });
      }
    } else if (step === STATUS.ASSIGNED) {
      complaint.department = dept._id;
      complaint.assignedTo = staff._id;
      complaint.assignedAt = t;
      history.push({
        action: 'assigned',
        fromStatus: path[i - 1],
        toStatus: step,
        note: `Assigned to ${dept.name} — ${staff.name}`,
        meta: { department: dept.name, staff: staff.name },
        performedBy: admin._id,
        role: ROLES.ADMIN,
        createdAt: t,
      });
    } else if (step === STATUS.IN_PROGRESS) {
      const text = STAFF_NOTES[0];
      complaint.staffUpdates.push({ text, author: staff._id, createdAt: t });
      history.push({ action: 'status_change', fromStatus: path[i - 1], toStatus: step, note: text, performedBy: staff._id, role: ROLES.STAFF, createdAt: t });
      if (rand() > 0.4) {
        const t2 = addHours(t, 3);
        const note = pick(STAFF_NOTES.slice(1, 3));
        complaint.staffUpdates.push({ text: note, author: staff._id, createdAt: t2 });
        history.push({ action: 'progress_update', note, performedBy: staff._id, role: ROLES.STAFF, createdAt: t2 });
        t = t2;
      }
    } else if (step === STATUS.RESOLVED) {
      const text = STAFF_NOTES[3];
      complaint.staffUpdates.push({ text, author: staff._id, createdAt: t });
      complaint.resolvedAt = t;
      history.push({ action: 'status_change', fromStatus: path[i - 1], toStatus: step, note: text, performedBy: staff._id, role: ROLES.STAFF, createdAt: t });
    } else if (step === STATUS.REOPENED) {
      complaint.resolvedAt = undefined;
      complaint.reopenCount = 1;
      history.push({ action: 'reopened', fromStatus: path[i - 1], toStatus: step, note: 'The issue has started again after the repair.', performedBy: student._id, role: ROLES.STUDENT, createdAt: t });
    }
  }

  const now = new Date();
  if (t > now) t = now;
  complaint.updatedAt = t;
  await complaint.save({ timestamps: false });

  // Feedback on most resolved complaints (some left un-rated so the student can demo it)
  let feedback = null;
  if (finalStatus === STATUS.RESOLVED && rand() > 0.3) {
    const [rating, comment] = pick(FEEDBACK);
    const fbAt = addHours(complaint.resolvedAt, 5);
    feedback = await Feedback.create({
      complaint: complaint._id,
      student: student._id,
      department: dept._id,
      staff: staff._id,
      rating,
      comment,
      createdAt: fbAt,
    });
    complaint.feedback = feedback._id;
    await complaint.save({ timestamps: false });
    history.push({ action: 'feedback', note: `Rated ${rating}/5 — ${comment}`, meta: { rating }, performedBy: student._id, role: ROLES.STUDENT, createdAt: fbAt });
  }

  await ComplaintHistory.insertMany(
    history.map((h) => ({ ...h, complaint: complaint._id })),
    { timestamps: false }
  );
  return complaint;
}

async function run() {
  await connectDB();
  console.log('Clearing existing CampusFix data...');
  await Promise.all(
    [User, Department, Complaint, ComplaintHistory, Feedback, Notification, Counter].map((M) => M.deleteMany({}))
  );

  // Departments
  const deptDocs = await Department.insertMany(
    DEPARTMENTS.map((d) => ({ ...d, contactEmail: `${d.code.toLowerCase()}@campusfix.edu` }))
  );
  const depts = Object.fromEntries(deptDocs.map((d) => [d.code, d]));

  // Users (create() so the bcrypt pre-save hook runs)
  const admin = await User.create({
    name: 'Dr. Meera Kapoor',
    email: 'admin@campusfix.edu',
    password: DEMO_PASSWORDS.admin,
    role: ROLES.ADMIN,
    phone: '9876500001',
    designation: 'Dean, Student Welfare',
  });
  await User.create({
    name: 'Amit Khanna',
    email: 'amit.khanna@campusfix.edu',
    password: DEMO_PASSWORDS.admin,
    role: ROLES.ADMIN,
    designation: 'Campus Operations Manager',
  });

  const staffDocs = [];
  for (const s of STAFF) {
    staffDocs.push(
      await User.create({
        name: s.name,
        email: s.email,
        password: DEMO_PASSWORDS.staff,
        role: ROLES.STAFF,
        department: depts[s.dept]._id,
        designation: s.designation,
        phone: `98765${String(10000 + staffDocs.length).slice(-5)}`,
      })
    );
  }
  const staffByDept = {};
  staffDocs.forEach((s, i) => {
    const code = STAFF[i].dept;
    (staffByDept[code] = staffByDept[code] || []).push(s);
  });
  // The demo staff account takes all Electrical work so its dashboard is full
  staffByDept.ELEC = [staffDocs[0]];

  const studentDocs = [];
  for (const s of STUDENTS) {
    studentDocs.push(
      await User.create({ ...s, password: DEMO_PASSWORDS.student, role: ROLES.STUDENT, phone: '9876543210' })
    );
  }
  const demoStudent = studentDocs[0];

  // ---- Complaints ----
  console.log('Generating complaints with full history...');
  const now = new Date();
  const weighted = [
    STATUS.RESOLVED, STATUS.RESOLVED, STATUS.RESOLVED, STATUS.RESOLVED, STATUS.RESOLVED,
    STATUS.IN_PROGRESS, STATUS.IN_PROGRESS, STATUS.ASSIGNED, STATUS.ASSIGNED,
    STATUS.UNDER_REVIEW, STATUS.SUBMITTED, STATUS.REOPENED,
  ];
  const priorities = ['Low', 'Medium', 'Medium', 'Medium', 'High', 'High', 'Urgent'];
  const created = [];

  // Build every complaint spec first, then insert oldest-first so CF-IDs follow submission order
  const specs = [];
  for (let i = 0; i < 52; i += 1) {
    const daysAgo = Math.floor(rand() * 240) + 1;
    const createdAt = new Date(now.getTime() - daysAgo * 864e5 - rand() * 864e5);
    // older complaints are mostly resolved; recent ones are still open
    const finalStatus = daysAgo > 45 ? (rand() > 0.12 ? STATUS.RESOLVED : pick(weighted)) : pick(weighted);
    specs.push({
      template: pick(TEMPLATES),
      student: pick(studentDocs.slice(1)),
      finalStatus,
      createdAt,
      priority: pick(priorities),
    });
  }

  // Hand-picked complaints for the demo accounts (one in every lifecycle stage)
  const elec = TEMPLATES.filter((t) => t[0] === 'Electrical');
  const demoSet = [
    [TEMPLATES[7], STATUS.RESOLVED, 'High', 20], // Wi-Fi — left un-rated for the feedback demo
    [elec[0], STATUS.IN_PROGRESS, 'Medium', 4],
    [elec[1], STATUS.ASSIGNED, 'High', 2],
    [TEMPLATES[4], STATUS.UNDER_REVIEW, 'Medium', 1],
    [TEMPLATES[18], STATUS.SUBMITTED, 'Low', 0.2],
    [elec[2], STATUS.RESOLVED, 'Urgent', 35],
    [TEMPLATES[16], STATUS.REOPENED, 'Medium', 12],
  ];
  for (const [template, finalStatus, priority, daysAgo] of demoSet) {
    specs.push({
      template,
      student: demoStudent,
      finalStatus,
      priority,
      createdAt: new Date(now.getTime() - daysAgo * 864e5),
    });
  }

  specs.sort((a, b) => a.createdAt - b.createdAt);
  for (const spec of specs) {
    created.push(await buildComplaint({ ...spec, admin, depts, staffByDept }));
  }

  // Make sure the demo student has one resolved complaint without feedback to rate
  const toRate = await Complaint.findOne({ student: demoStudent._id, status: STATUS.RESOLVED }).sort({ createdAt: -1 });
  if (toRate?.feedback) {
    await Feedback.deleteOne({ _id: toRate.feedback });
    await ComplaintHistory.deleteMany({ complaint: toRate._id, action: 'feedback' });
    toRate.feedback = undefined;
    await toRate.save({ timestamps: false });
  }

  // A few unread notifications so the bell shows activity on first login
  const demoStaff = staffDocs[0];
  const assignedToDemoStaff = await Complaint.findOne({ assignedTo: demoStaff._id, status: STATUS.ASSIGNED });
  await Notification.insertMany([
    { user: demoStudent._id, title: 'Complaint resolved', message: `${toRate.complaintId} has been resolved. Please rate the resolution.`, complaint: toRate._id, type: 'status' },
    { user: admin._id, title: 'New complaint submitted', message: 'A new complaint is waiting for review.', type: 'status' },
    ...(assignedToDemoStaff
      ? [{ user: demoStaff._id, title: 'New complaint assigned to you', message: `${assignedToDemoStaff.complaintId}: ${assignedToDemoStaff.title}`, complaint: assignedToDemoStaff._id, type: 'assignment' }]
      : []),
  ]);

  const counts = await Complaint.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  console.log(`\nSeeded ${deptDocs.length} departments, ${await User.countDocuments()} users, ${created.length} complaints.`);
  console.table(Object.fromEntries(counts.map((c) => [c._id, c.n])));
  console.log('\nDemo accounts');
  console.table([
    { role: 'Student', email: 'student@campusfix.edu', password: DEMO_PASSWORDS.student },
    { role: 'Administrator', email: 'admin@campusfix.edu', password: DEMO_PASSWORDS.admin },
    { role: 'Department Staff', email: 'staff@campusfix.edu', password: DEMO_PASSWORDS.staff },
  ]);
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });
