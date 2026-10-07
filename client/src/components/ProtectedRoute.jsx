import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ roles, permission, children }) {
  const { user, status, can } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (permission && !can(permission)) return <Navigate to="/dashboard" replace />;
  return children;
}