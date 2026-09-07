import { Navigate } from 'react-router-dom';
import useAppContext from '../context/useAppContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAppContext();

  // Not logged in
  if (!user) return <Navigate to="/login" replace />;

  // Team members awaiting approval
  if (user.role === 'team' && user.teamStatus === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }

  // Team members who were rejected
  if (user.role === 'team' && user.teamStatus === 'rejected') {
    return <Navigate to="/rejected" replace />;
  }

  // Role-based access (superadmin and admin always have access, otherwise check roles)
  const isAllowed = !roles || roles.includes(user.role) || user.isSuperAdmin || user.role === 'superadmin' || user.role === 'admin';
  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
