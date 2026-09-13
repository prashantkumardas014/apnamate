// src/App.jsx
/* eslint-disable react/set-state-in-effect */
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

// ==============================
// PAGE IMPORTS (lazy-loaded)
// ==============================
const Home = lazy(() => import("./pages/Home"));
const HomeFeed = lazy(() => import("./pages/HomeFeed"));
const Login = lazy(() => import("./components/auth/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./components/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./components/auth/ResetPassword"));
const Services = lazy(() => import("./pages/Services"));
const Providers = lazy(() => import("./pages/Providers"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Booking = lazy(() => import("./pages/Booking"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const MyReviews = lazy(() => import("./pages/MyReviews"));
const MyPayments = lazy(() => import("./pages/MyPayments"));
const MyBills = lazy(() => import("./pages/MyBills"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// ✅ Unified profile page (role-aware)
const Profile = lazy(() => import("./pages/Profile"));

// ✅ NEW: Edit Profile page
const EditProfile = lazy(() => import("./pages/EditProfile"));

// ✅ Phone OTP auth pages
const LoginPhone = lazy(() => import("./pages/LoginPhone"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));

// ==============================
// ADMIN PAGES
// ==============================
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminBookings = lazy(() => import("./pages/AdminBookings"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));

// ==============================
// ANALYTICS
// ==============================
const ReviewAnalytics = lazy(() => import("./components/ReviewAnalytics"));

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
          <Suspense fallback={<div className="loading-screen">Loading...</div>}>
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

              {/* ✅ Unified profile page — any logged-in user */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute user={user}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* ✅ NEW: Edit profile with avatar upload + Aadhaar verify */}
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute user={user}>
                    <EditProfile />
                  </ProtectedRoute>
                }
              />

              {/* ✅ Backwards compat: old customer-profile redirects */}
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

              {/* ✅ My Bills — all logged-in users */}
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

              {/* PROVIDER (and admin override) */}
              <Route
                path="/provider-dashboard"
                element={
                  <ProtectedRoute user={user} allowedRoles={["provider", "admin"]}>
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ✅ Provider-profile redirects to the unified /profile */}
              <Route
                path="/provider-profile"
                element={
                  <ProtectedRoute user={user} allowedRoles={["provider", "admin"]}>
                    <Navigate to="/profile" replace />
                  </ProtectedRoute>
                }
              />

              {/* Public provider detail page */}
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
          </Suspense>
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