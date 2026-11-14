# CampusFix – Smart Campus Complaint & Issue Management System

A full-stack MERN application that replaces paper registers and WhatsApp messages with one trackable
complaint system for a college or university. Students report issues, administrators route them to the
right department, staff fix them, and every step is recorded.

| Layer    | Stack |
|----------|-------|
| Frontend | React 19 + Vite, React Router 7, Context API, Axios, Ant Design 6, Tailwind CSS 4, Recharts 3 |
| Backend  | Node.js, Express 4 (MVC), Mongoose 8, JWT, bcrypt, Joi, Multer 2, Cloudinary |
| Database | MongoDB (local or Atlas) |

Screenshots of every role's main screens are in [`docs/screenshots/`](docs/screenshots).

---

## 1. Quick start

**Prerequisites:** Node.js 18+ and a MongoDB database (local `mongod` or a free MongoDB Atlas cluster).

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. Configure the API
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
#    then edit server/.env — at minimum set MONGO_URI and JWT_SECRET

# 3. Load demo data (departments, users, ~60 complaints with full history)
npm run seed

# 4. Run API (http://localhost:5000) and web app (http://localhost:5173) together
npm run dev
```

Open http://localhost:5173 and use the **Demo accounts** buttons on the login page.

### Demo accounts (created by `npm run seed`)

| Role             | Email                   | Password      |
|------------------|-------------------------|---------------|
| Student          | `student@campusfix.edu` | `Student@123` |
| Administrator    | `admin@campusfix.edu`   | `Admin@123`   |
| Department staff | `staff@campusfix.edu`   | `Staff@123`   |

All other seeded users share the password of their role (e.g. every staff member uses `Staff@123`).

> `npm run seed` **wipes** the CampusFix collections before inserting demo data. Don't run it against a
> database you want to keep.

### Cloudinary (optional)

Fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `server/.env` to store
images on Cloudinary. If they are blank, uploads are saved to `server/uploads/` and served by Express, so the
demo works offline. `GET /api/health` reports which storage is active.

---

## 2. End-to-end demo script

1. **Student** (`student@campusfix.edu`) → *Report an issue* → fill title, category, location, priority, add a
   photo → *Submit complaint*. You land on the complaint page with its ID (e.g. `CF-2026-00060`) at stage
   *Submitted*.
2. **Admin** (`admin@campusfix.edu`) → the bell shows "New complaint submitted" → open it →
   *Change status* → *Under Review* → *Assign*: the department matching the category is pre-selected; choose
   **Rajesh Kumar** (staff). Optionally *Add remark* or change priority from the ⋮ menu.
3. **Staff** (`staff@campusfix.edu`) → *Assigned to me* → open the complaint → *Start work* → *Post update*
   (with a photo) → *Mark as resolved* with a resolution note and photo.
4. **Student** → the dashboard shows "waiting for your rating" → open the complaint → *Rate the fix*
   (or *Reopen* if the problem is back — it returns to the staff member's queue).
5. **Admin** → *Analytics* and *Feedback* reflect the new numbers; the complaint's *History* panel shows
   every step with who did it and when.

---

## 3. Features by role

**Student** — register/login; dashboard with total / pending / in-progress / resolved counts, recent
complaints and activity; submit complaints with up to 5 images; edit or delete while still *Submitted*;
searchable, filterable, paginated complaint history; see assigned department, staff, admin remarks, staff
updates and the full timeline; notifications on every change; rate resolved complaints or reopen them.

**Administrator** — campus overview (status counts, users, satisfaction, average resolution time, urgent
unassigned list, 6-month trend, live activity); all complaints with server-side search, filters (status,
priority, category, department, date range), sorting and pagination; assign department + staff (with each
staff member's open workload); change status along valid transitions; change priority; add remarks; delete;
manage departments (create, edit, activate/deactivate, delete when unused) and users (create staff, admin or
student accounts, edit, reset password, deactivate, delete when unused); analytics (monthly trend, resolved vs
pending, category-wise, priority-wise, department performance table with resolution rate, average time and
rating); feedback list with filters.

**Department staff** — dashboard for their own queue (not started, in progress, resolved this month, average
resolution time, rating, urgent alert); list of complaints assigned to them only; start work, post progress
updates with images, mark resolved with resolution notes and photos; view their ratings.

---

## 4. Complaint lifecycle

```
Submitted ─► Under Review ─► Assigned ─► In Progress ─► Resolved
                               ▲                          │
                               └──────── Reopened ◄───────┘
```

| Actor   | Allowed moves |
|---------|---------------|
| Admin   | Submitted → Under Review / Assigned · Under Review → Submitted / Assigned · Assigned → Under Review / In Progress / Resolved · In Progress → Assigned / Resolved · Resolved → Reopened · Reopened → Under Review / Assigned / In Progress |
| Staff   | Assigned or Reopened → In Progress · In Progress → Resolved (only on complaints assigned to them) |
| Student | Resolved → Reopened (own complaints) |

Rules live in `server/src/services/lifecycle.js`. Assigned / In Progress / Resolved require a department.
Every change writes a `ComplaintHistory` document (action, from → to, note, who, role, when) and sends
in-app notifications to the people involved.

---

## 5. Project structure

```
campusfix/
├── package.json              root scripts (install:all, dev, seed, build, test)
├── server/                   Express API (MVC)
│   ├── src/
│   │   ├── app.js            express app: security, CORS, routes, errors
│   │   ├── server.js         DB connect + listen
│   │   ├── config/           env, db, cloudinary
│   │   ├── models/           User, Department, Complaint, ComplaintHistory, Feedback, Notification, Counter
│   │   ├── controllers/      auth, complaint, department, user, feedback, notification, dashboard
│   │   ├── routes/           one router per resource + /api/meta
│   │   ├── middleware/       auth (protect/authorize), validate (Joi), upload (Multer), error
│   │   ├── validators/       Joi schemas
│   │   ├── services/         lifecycle rules + history, notifications
│   │   ├── utils/            ApiError, asyncHandler, token, storage, query helpers, constants
│   │   └── seed/seed.js      demo data
│   ├── tests/api.test.js     auth, RBAC, validation and lifecycle tests (no DB needed)
│   └── uploads/              local image storage when Cloudinary is not configured
└── client/                   React app (Vite)
    └── src/
        ├── api/              axios instance + one function per endpoint
        ├── context/          AuthContext (session), MetaContext (enums from API)
        ├── routes/           ProtectedRoute (role-aware), GuestRoute
        ├── components/       layout (sidebar, header, bell), common (tags, stage track, stat card),
        │                     complaints (server-side table, action modals, image picker), charts
        └── pages/            auth, student, admin, staff, shared (detail, profile, notifications)
```

### Data model

```
User ──< Complaint >── Department          Complaint ──< ComplaintHistory
 │  (student, assignedTo)                  Complaint ──1 Feedback ── (student, staff, department)
 └── department (staff only) ──> Department
User ──< Notification >── Complaint
```

`Complaint` embeds `attachments`, `resolutionImages`, `adminRemarks` and `staffUpdates`; history is a separate
append-only collection. A `Counter` collection issues readable IDs (`CF-2026-00042`) atomically.

---

## 6. API reference

All routes are under `/api`; everything except auth, `/meta` and `/health` needs `Authorization: Bearer <token>`.

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| POST | `/auth/register` | public | Student sign-up |
| POST | `/auth/login` | public | Login → `{ token, user }` |
| GET / PATCH | `/auth/me` | any | Current user / update profile |
| PATCH | `/auth/me/password` | any | Change password |
| GET | `/meta` | public | Categories, priorities, statuses |
| GET | `/complaints` | any (scoped) | List with `search, status, priority, category, department, assignedTo, from, to, page, limit, sortBy, order` |
| POST | `/complaints` | student | Create (multipart, `images[]`) |
| GET | `/complaints/:id` | any (scoped) | Detail + history + allowed actions |
| PATCH | `/complaints/:id` | student | Edit own while *Submitted* |
| DELETE | `/complaints/:id` | admin, student | Delete (student: own, *Submitted* only) |
| GET | `/complaints/:id/history` | any (scoped) | Audit trail |
| PATCH | `/complaints/:id/status` | admin, staff | Move along the lifecycle |
| PATCH | `/complaints/:id/priority` | admin | Change priority |
| PATCH | `/complaints/:id/assign` | admin | Assign department (+ staff) |
| POST | `/complaints/:id/remarks` | admin | Add remark |
| POST | `/complaints/:id/updates` | staff, admin | Progress update + images, `resolve=true` to resolve |
| POST | `/complaints/:id/reopen` | student | Reopen with reason |
| POST | `/complaints/:id/feedback` | student | Rate 1–5 + comment |
| GET / POST | `/departments` | any / admin | List (`withStats`, `all`) / create |
| GET / PATCH / DELETE | `/departments/:id` | admin | Detail / update / delete |
| GET / POST | `/users` | admin | List (`role, department, isActive, search`, paginated) / create |
| GET | `/users/staff?department=` | admin | Staff with open workload (assignment dropdown) |
| GET / PATCH / DELETE | `/users/:id` | admin | Detail / update / delete |
| GET | `/feedback` | any (scoped) | Feedback list + average |
| GET | `/notifications` | any | Latest + unread count |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | any | Mark read |
| GET | `/dashboard/stats` | any | Role-specific dashboard figures |
| GET | `/dashboard/analytics?months=` | admin | Chart data |

Errors always look like `{ success: false, message, errors?: [{ field, message }] }`.

---

## 7. Security

- Passwords hashed with bcrypt (12 rounds); never returned by the API.
- JWT auth; `protect` reloads the user on every request, so deactivated accounts are locked out immediately.
- Role-based access with `authorize(...)` on routes **and** row-level scoping in queries: students only see
  their own complaints, staff only those assigned to them. Out-of-scope IDs return 404, not 403, so
  complaint IDs can't be probed.
- Joi validation on every body and query (unknown fields stripped); Multer limits images to JPG/PNG/WEBP/GIF,
  5 MB each, 5 per request.
- Helmet headers with a CSP, CORS restricted to `CLIENT_URL`, rate limiting on login/register.

---

## 8. Tests

```bash
npm test
```

29 tests cover authentication, role-based access for each role, Joi validation, upload type filtering and
the lifecycle rules. They stub the user lookup, so they run without a database.

---

## 9. Production build

```bash
npm run build                 # builds client/dist
# in server/.env: NODE_ENV=production, a real JWT_SECRET, CLIENT_URL=<your site URL>
npm start                     # Express serves the API and the built React app on one port
```

To host frontend and backend separately (e.g. Vercel + Render), set `VITE_API_URL` in `client/.env` to the
API origin and `CLIENT_URL` in `server/.env` to the frontend origin.

---

## 10. Built for extension

| Planned feature | Where it plugs in |
|-----------------|-------------------|
| Real-time notifications (Socket.IO) | `services/notify.js` exposes `setRealtimeEmitter()`; every notification already flows through it. On the client, replace the poll in `NotificationBell.jsx`. |
| Email notifications | Same `notify()` seam — add a mail transport next to the DB insert. |
| AI complaint categorisation | `createComplaint` in `complaintController.js` — call a classifier before saving; departments already declare the `categories` they handle. |
| Duplicate detection | Text index on title/description/location already exists on `Complaint`. |
| QR-based submission | Encode `/student/complaints/new?location=...` in a QR code and pre-fill the form from the query string. |
| Predictive maintenance | `ComplaintHistory` + `resolvedAt` give per-location, per-category time series for forecasting. |
