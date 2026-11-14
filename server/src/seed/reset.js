/**
 * Fresh start: deletes ALL CampusFix data (users, departments, complaints,
 * history, feedback, notifications, uploaded images) and creates one
 * administrator account with the details you type in.
 *
 *   npm run reset
 *
 * Use this when you want to stop using the demo data and enter real data.
 * (npm run seed brings the demo data back at any time.)
 */
const fs = require('fs/promises');
const path = require('path');
const readline = require('readline/promises');
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
const { ROLES } = require('../utils/constants');
const { UPLOAD_DIR } = require('../utils/storage');

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ask(rl, question, validate) {
  for (;;) {
    const answer = (await rl.question(question)).trim();
    const error = validate(answer);
    if (!error) return answer;
    console.log(`  ${error}`);
  }
}

async function clearLocalUploads() {
  for (const sub of ['complaints', 'resolutions']) {
    await fs.rm(path.join(UPLOAD_DIR, sub), { recursive: true, force: true });
  }
}

async function run() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nCampusFix — fresh start');
  console.log('This deletes ALL users, departments, complaints, history, feedback and notifications,');
  console.log('then creates one administrator account.\n');

  const confirm = await rl.question('Type DELETE to continue: ');
  if (confirm.trim() !== 'DELETE') {
    console.log('Cancelled. Nothing was deleted.');
    rl.close();
    return;
  }

  console.log('\nDetails for the new administrator account:');
  const name = await ask(rl, '  Full name: ', (v) => (v.length >= 2 ? null : 'Enter at least 2 characters'));
  const email = (await ask(rl, '  Email: ', (v) => (EMAIL_RX.test(v) ? null : 'Enter a valid email address'))).toLowerCase();
  const password = await ask(rl, '  Password (min 6 characters): ', (v) =>
    v.length >= 6 ? null : 'Password must be at least 6 characters'
  );
  rl.close();

  await connectDB();
  console.log('\nDeleting existing data...');
  await Promise.all(
    [User, Department, Complaint, ComplaintHistory, Feedback, Notification, Counter].map((M) => M.deleteMany({}))
  );
  await clearLocalUploads();

  await User.create({ name, email, password, role: ROLES.ADMIN, designation: 'Administrator' });

  console.log('\nDone. The database is empty except for your administrator account:');
  console.log(`  Email:    ${email}`);
  console.log('  Password: (the one you just typed)');
  console.log('\nNext: npm run dev, log in, then create departments and staff accounts.');
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('\nReset failed:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
