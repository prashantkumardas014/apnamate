// src/components/common/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, user, allowedRoles = [] }) {
  // Get user from localStorage if not passed
  const getUser = () => {
    if (user) return user;
    
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  };

  const currentUser = getUser();

  console.log("🔒 ProtectedRoute - User:", currentUser);
  console.log("🔒 ProtectedRoute - Allowed roles:", allowedRoles);

  // If no user, redirect to login
  if (!currentUser) {
    console.log("🔒 No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check if user has allowed role
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    console.log(`🔒 User role "${currentUser.role}" not allowed. Redirecting...`);
    
    // Redirect based on user role
    if (currentUser.role === "admin") {
      return <Navigate to="/admin-dashboard" replace />;
    } else if (currentUser.role === "provider") {
      return <Navigate to="/provider-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required role
  return children;
}

export default ProtectedRoute;