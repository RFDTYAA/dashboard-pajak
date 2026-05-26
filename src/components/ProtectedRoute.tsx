import { Navigate } from "react-router-dom";
import { getUserRole, isAuthenticated } from "../lib/api";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const authed = isAuthenticated();
  const role = getUserRole();

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && role) {
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
