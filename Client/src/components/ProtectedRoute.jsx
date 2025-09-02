import { Navigate } from "react-router-dom";
import useAppContext from "../context/useAppContext";


const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAppContext();

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // redirect unauthorized users
  }

  return children;
};

export default ProtectedRoute;
