import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { FullPageLoader, GuestRoute, HomeRedirect, ProtectedRoute } from './routes/ProtectedRoute';

// Route-level code splitting keeps the first load small
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const NewComplaint = lazy(() => import('./pages/student/NewComplaint'));
const MyComplaints = lazy(() => import('./pages/student/MyComplaints'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AllComplaints = lazy(() => import('./pages/admin/AllComplaints'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Departments = lazy(() => import('./pages/admin/Departments'));
const Users = lazy(() => import('./pages/admin/Users'));
const FeedbackPage = lazy(() => import('./pages/shared/FeedbackPage'));

const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const AssignedComplaints = lazy(() => import('./pages/staff/AssignedComplaints'));

const ComplaintDetail = lazy(() => import('./pages/shared/ComplaintDetail'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const Notifications = lazy(() => import('./pages/shared/Notifications'));
const NotFound = lazy(() => import('./pages/shared/NotFound'));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />

            <Route element={<ProtectedRoute roles={['student']} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/complaints" element={<MyComplaints />} />
              <Route path="/student/complaints/new" element={<NewComplaint />} />
              <Route path="/student/complaints/:id" element={<ComplaintDetail />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/complaints" element={<AllComplaints />} />
              <Route path="/admin/complaints/:id" element={<ComplaintDetail />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/departments" element={<Departments />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/feedback" element={<FeedbackPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['staff']} />}>
              <Route path="/staff" element={<StaffDashboard />} />
              <Route path="/staff/complaints" element={<AssignedComplaints />} />
              <Route path="/staff/complaints/:id" element={<ComplaintDetail />} />
              <Route path="/staff/feedback" element={<FeedbackPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
