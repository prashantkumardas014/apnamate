// src/App.jsx
/* eslint-disable react/set-state-in-effect */
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// ==============================
// PAGE IMPORTS (static — required for WebView)
// ==============================
import Home from "./pages/Home";
import HomeFeed from "./pages/HomeFeed";
import Login from "./components/auth/Login";
import Register from "./pages/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import Services from "./pages/Services";
import Providers from "./pages/Providers";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderProfile from "./pages/ProviderProfile";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import MyBookings from "./pages/MyBookings";
import MyReviews from "./pages/MyReviews";
import MyPayments from "./pages/MyPayments";
import MyBills from "./pages/MyBills";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import LoginPhone from "./pages/LoginPhone";
import VerifyOtp from "./pages/VerifyOtp";
import AdminUsers from "./pages/AdminUsers";
import AdminBookings from "./pages/AdminBookings";
import AdminReviews from "./pages/AdminReviews";
import AdminPayments from "./pages/AdminPayments";
import ReviewAnalytics from "./components/ReviewAnalytics";

// ==============================
// SHARED COMPONENTS
// ==============================
import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/common/Navbar";
import ErrorBoundary from "./components/common/ErrorBoundary";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // ==============================
  // LOAD USER FROM LOCALSTORAGE
  // ==============================
  const loadUser = () => {
    const userData = localStorage.getItem("user");

    if (userData && userData !== "undefined") {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        return parsedUser;
      } catch (e) {
        console.error("❌ Error parsing user data:", e);
        localStorage.removeItem("user");
        setUser(null);
      }
    } else {
      setUser(null);
    }
    return null;
  };

  // ==============================
  // INITIAL LOAD
  // ==============================
  useEffect(() => {
    loadUser();
    setLoading(false);
  }, []);

  // ==============================
  // LISTEN FOR STORAGE CHANGES
  // ==============================
  useEffect(() => {
    const handleStorageChange = () => loadUser();

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ==============================
  // AUTH PAGE DETECTION
  // ==============================
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/login-phone",
    "/verify-otp",
  ].includes(location.pathname);

  // ==============================
  // HOME REDIRECT HELPER
  // ==============================
  const homeForRole = (role) => {
    if (role === "admin") return "/admin-dashboard";
    if (role === "provider") return "/provider-dashboard";
    return "/dashboard";
  };

  // ==============================
  // LOADING SCREEN
  // ==============================
  if (loading) {
    return (
      <div
        className="loading-screen"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f5f7fb",
        }}
      >
        <div
          className="loading-spinner"
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid #e5e7eb",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ marginTop: "16px", color: "#6b7280" }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className="app">
      {!isAuthPage && <Navbar user={user} setUser={setUser} />}

      <main className="main-content">
        <ErrorBoundary>
          <Routes>
            {/* PUBLIC — Home marketing page if logged out, HomeFeed if logged in */}
            <Route
              path="/"
              element={
                user ? (
                  <ProtectedRoute user={user}>
                    <HomeFeed user={user} />
                  </ProtectedRoute>
                ) : (
                  <Home />
                )
              }
            />

            {/* AUTH */}
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to={homeForRole(user.role)} replace />
                ) : (
                  <Login setUser={setUser} />
                )
              }
            />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to={homeForRole(user.role)} replace />
                ) : (
                  <Register />
                )
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ✅ Phone OTP login */}
            <Route
              path="/login-phone"
              element={
                user ? (
                  <Navigate to={homeForRole(user.role)} replace />
                ) : (
                  <LoginPhone />
                )
              }
            />
            <Route
              path="/verify-otp"
              element={
                user ? (
                  <Navigate to={homeForRole(user.role)} replace />
                ) : (
                  <VerifyOtp setUser={setUser} />
                )
              }
            />

            {/* PROTECTED — ALL USERS */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute user={user}>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute user={user}>
                  <EditProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer-profile"
              element={<Navigate to="/profile" replace />}
            />

            <Route
              path="/services"
              element={
                <ProtectedRoute user={user}>
                  <Services />
                </ProtectedRoute>
              }
            />

            <Route
              path="/providers"
              element={
                <ProtectedRoute user={user}>
                  <Providers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/booking"
              element={
                <ProtectedRoute user={user}>
                  <Booking />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute user={user}>
                  <MyBookings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-reviews"
              element={
                <ProtectedRoute user={user}>
                  <MyReviews />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-payments"
              element={
                <ProtectedRoute user={user}>
                  <MyPayments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-bills"
              element={
                <ProtectedRoute user={user}>
                  <MyBills />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute user={user}>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* PROVIDER */}
            <Route
              path="/provider-dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={["provider", "admin"]}>
                  <ProviderDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/provider-profile"
              element={
                <ProtectedRoute user={user} allowedRoles={["provider", "admin"]}>
                  <Navigate to="/profile" replace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/provider/:id"
              element={
                <ProtectedRoute user={user}>
                  <ProviderProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/provider-analytics"
              element={
                <ProtectedRoute user={user} allowedRoles={["provider", "admin"]}>
                  <ReviewAnalytics providerId={user?.id} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/provider-analytics/:providerId"
              element={
                <ProtectedRoute user={user} allowedRoles={["provider", "admin"]}>
                  <ReviewAnalytics />
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin"]}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin"]}>
                  <AdminBookings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin"]}>
                  <AdminReviews />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin"]}>
                  <AdminPayments />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

// ==============================
// 404 NOT FOUND
// ==============================
function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f7fb",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "80px",
          fontWeight: "bold",
          color: "#2563eb",
          marginBottom: "16px",
        }}
      >
        404
      </div>
      <h1 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>
        Page Not Found
      </h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px 0", maxWidth: "400px" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate("/")}
        style={{
          padding: "12px 24px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "16px",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.background = "#1d4ed8")}
        onMouseLeave={(e) => (e.target.style.background = "#2563eb")}
      >
        🏠 Go Home
      </button>
    </div>
  );
}

export default App;