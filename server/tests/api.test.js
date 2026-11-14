/**
 * Route-level tests that need no database: auth gate, role-based access,
 * Joi validation, upload filtering, lifecycle rules.
 * User.findById is stubbed so `protect` can resolve a user from a JWT.
 * Run: npm test
 */
process.env.NODE_ENV = 'test';
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');

mongoose.set('bufferCommands', false); // any unexpected DB call fails fast instead of hanging

const app = require('../src/app');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');
const lifecycle = require('../src/services/lifecycle');
const v = require('../src/validators');
const { STATUS, ROLES } = require('../src/utils/constants');

const fakeUsers = {};
const mkUser = (role) => {
  const _id = new mongoose.Types.ObjectId();
  const u = { _id, role, isActive: true, name: role };
  fakeUsers[String(_id)] = u;
  return { user: u, token: signToken(u) };
};

let student, staff, admin;
before(() => {
  User.findById = async (id) => fakeUsers[String(id)] || null;
  student = mkUser(ROLES.STUDENT);
  staff = mkUser(ROLES.STAFF);
  admin = mkUser(ROLES.ADMIN);
});

const oid = () => new mongoose.Types.ObjectId().toString();
const auth = (t) => ({ Authorization: `Bearer ${t.token}` });

describe('public endpoints', () => {
  test('health check', async () => {
    const r = await request(app).get('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
  });
  test('meta lists enums', async () => {
    const r = await request(app).get('/api/meta');
    assert.equal(r.status, 200);
    assert.ok(r.body.statuses.includes('Reopened'));
    assert.equal(r.body.statuses.length, 6);
  });
  test('unknown route -> 404 JSON', async () => {
    const r = await request(app).get('/api/nope');
    assert.equal(r.status, 404);
    assert.equal(r.body.success, false);
  });
});

describe('authentication', () => {
  test('no token -> 401', async () => {
    const r = await request(app).get('/api/complaints');
    assert.equal(r.status, 401);
  });
  test('tampered token -> 401', async () => {
    const r = await request(app).get('/api/complaints').set('Authorization', 'Bearer abc.def.ghi');
    assert.equal(r.status, 401);
  });
  test('login validation -> 400 with field errors', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(r.status, 400);
    assert.ok(r.body.errors.some((e) => e.field === 'email'));
    assert.ok(r.body.errors.some((e) => e.field === 'password'));
  });
  test('register requires student id and 6+ char password', async () => {
    const r = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A B', email: 'a@b.com', password: '123' });
    assert.equal(r.status, 400);
    const fields = r.body.errors.map((e) => e.field);
    assert.ok(fields.includes('password'));
    assert.ok(fields.includes('studentId'));
  });
});

describe('role-based access control', () => {
  test('student cannot list users', async () => {
    const r = await request(app).get('/api/users').set(auth(student));
    assert.equal(r.status, 403);
  });
  test('staff cannot list users', async () => {
    const r = await request(app).get('/api/users').set(auth(staff));
    assert.equal(r.status, 403);
  });
  test('student cannot view analytics', async () => {
    const r = await request(app).get('/api/dashboard/analytics').set(auth(student));
    assert.equal(r.status, 403);
  });
  test('staff cannot submit complaints', async () => {
    const r = await request(app).post('/api/complaints').set(auth(staff)).field('title', 'x');
    assert.equal(r.status, 403);
  });
  test('student cannot change priority / assign / remark', async () => {
    const id = oid();
    const a = await request(app).patch(`/api/complaints/${id}/priority`).set(auth(student)).send({ priority: 'High' });
    const b = await request(app).patch(`/api/complaints/${id}/assign`).set(auth(student)).send({ department: oid() });
    const c = await request(app).post(`/api/complaints/${id}/remarks`).set(auth(student)).send({ text: 'hello' });
    assert.deepEqual([a.status, b.status, c.status], [403, 403, 403]);
  });
  test('student cannot change status', async () => {
    const r = await request(app).patch(`/api/complaints/${oid()}/status`).set(auth(student)).send({ status: 'Resolved' });
    assert.equal(r.status, 403);
  });
  test('staff cannot reopen or give feedback', async () => {
    const a = await request(app).post(`/api/complaints/${oid()}/reopen`).set(auth(staff)).send({ reason: 'again broken' });
    const b = await request(app).post(`/api/complaints/${oid()}/feedback`).set(auth(staff)).send({ rating: 5 });
    assert.deepEqual([a.status, b.status], [403, 403]);
  });
  test('staff cannot delete complaints', async () => {
    const r = await request(app).delete(`/api/complaints/${oid()}`).set(auth(staff));
    assert.equal(r.status, 403);
  });
  test('admin cannot create departments with bad body', async () => {
    const r = await request(app).post('/api/departments').set(auth(admin)).send({ name: 'X' });
    assert.equal(r.status, 400);
  });
});

describe('validation', () => {
  test('invalid complaint id -> 400', async () => {
    const r = await request(app).get('/api/complaints/123').set(auth(admin));
    assert.equal(r.status, 400);
  });
  test('complaint with bad category / short title -> 400', async () => {
    const r = await request(app)
      .post('/api/complaints')
      .set(auth(student))
      .field('title', 'abc')
      .field('description', 'too short')
      .field('category', 'Aliens')
      .field('location', 'Block A');
    assert.equal(r.status, 400);
    const fields = r.body.errors.map((e) => e.field);
    assert.ok(fields.includes('title') && fields.includes('category') && fields.includes('description'));
  });
  test('non-image upload rejected', async () => {
    const r = await request(app)
      .post('/api/complaints')
      .set(auth(student))
      .field('title', 'Fan not working')
      .attach('images', Buffer.from('MZ fake exe'), { filename: 'virus.exe', contentType: 'application/octet-stream' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /Only JPG, PNG/);
  });
  test('invalid status value -> 400', async () => {
    const r = await request(app).patch(`/api/complaints/${oid()}/status`).set(auth(admin)).send({ status: 'Done' });
    assert.equal(r.status, 400);
  });
  test('feedback rating must be 1-5', async () => {
    const r = await request(app).post(`/api/complaints/${oid()}/feedback`).set(auth(student)).send({ rating: 9 });
    assert.equal(r.status, 400);
  });
  test('list query rejects unknown status filter', async () => {
    const r = await request(app).get('/api/complaints?status=Closed').set(auth(admin));
    assert.equal(r.status, 400);
  });
  test('createUser: staff needs department, student needs studentId', () => {
    const a = v.createUser.validate({ name: 'Sam', email: 's@x.com', password: 'secret1', role: 'staff' });
    const b = v.createUser.validate({ name: 'Sam', email: 's@x.com', password: 'secret1', role: 'student' });
    assert.match(a.error.message, /department/);
    assert.match(b.error.message, /studentId/);
  });
});

describe('complaint lifecycle rules', () => {
  const c = (status, withDept = true) => ({ status, department: withDept ? oid() : undefined });

  test('admin: Submitted -> Under Review ok, -> Resolved blocked', () => {
    assert.doesNotThrow(() => lifecycle.assertTransition(c(STATUS.SUBMITTED), STATUS.UNDER_REVIEW, ROLES.ADMIN));
    assert.throws(() => lifecycle.assertTransition(c(STATUS.SUBMITTED), STATUS.RESOLVED, ROLES.ADMIN));
  });
  test('staff: Assigned -> In Progress -> Resolved only', () => {
    assert.doesNotThrow(() => lifecycle.assertTransition(c(STATUS.ASSIGNED), STATUS.IN_PROGRESS, ROLES.STAFF));
    assert.doesNotThrow(() => lifecycle.assertTransition(c(STATUS.IN_PROGRESS), STATUS.RESOLVED, ROLES.STAFF));
    assert.throws(() => lifecycle.assertTransition(c(STATUS.SUBMITTED), STATUS.IN_PROGRESS, ROLES.STAFF));
    assert.throws(() => lifecycle.assertTransition(c(STATUS.RESOLVED), STATUS.REOPENED, ROLES.STAFF));
  });
  test('cannot move to In Progress without a department', () => {
    assert.throws(
      () => lifecycle.assertTransition(c(STATUS.REOPENED, false), STATUS.IN_PROGRESS, ROLES.ADMIN),
      /Assign a department/
    );
  });
  test('same status rejected', () => {
    assert.throws(() => lifecycle.assertTransition(c(STATUS.ASSIGNED), STATUS.ASSIGNED, ROLES.ADMIN), /already/);
  });
  test('applyStatus sets resolvedAt and reopenCount', () => {
    const doc = { status: STATUS.IN_PROGRESS, reopenCount: 0 };
    lifecycle.applyStatus(doc, STATUS.RESOLVED);
    assert.ok(doc.resolvedAt instanceof Date);
    lifecycle.applyStatus(doc, STATUS.REOPENED);
    assert.equal(doc.resolvedAt, undefined);
    assert.equal(doc.reopenCount, 1);
  });
  test('every status is reachable in the admin graph', () => {
    const reachable = new Set([STATUS.SUBMITTED]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const s of [...reachable]) {
        for (const n of lifecycle.ADMIN_TRANSITIONS[s] || []) {
          if (!reachable.has(n)) {
            reachable.add(n);
            grew = true;
          }
        }
      }
    }
    assert.equal(reachable.size, 6);
  });
});
