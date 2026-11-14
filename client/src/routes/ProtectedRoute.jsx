import { Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../utils/constants';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

/** Requires login; optionally restricts to roles. Wrong role -> that role's home. */
export function ProtectedRoute({ roles }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

/** Login/register pages: bounce signed-in users to their dashboard */
export function GuestRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />;
}
