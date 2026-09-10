// src/App.jsx
/* eslint-disable react/set-state-in-effect */
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

// Import Pages
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./components/auth/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./components/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./components/auth/ResetPassword"));
const Services = lazy(() => import("./pages/Services"));
const Providers = lazy(() => import("./pages/Providers"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Booking = lazy(() => import("./pages/Booking"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const MyReviews = lazy(() => import("./pages/MyReviews"));
const MyPayments = lazy(() => import("./pages/MyPayments"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Admin Pages
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminBookings = lazy(() => import("./pages/AdminBookings"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
// ✅ NEW: Admin Payments (quote-flow verification + payouts)
const AdminPayments = lazy(() => import("./pages/AdminPayments"));

// ✅ Analytics Component
const ReviewAnalytics = lazy(() => import("./components/ReviewAnalytics"));

import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/common/Navbar";

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
    console.log("🔍 Loading user from localStorage:", userData);

    if (userData && userData !== "undefined") {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log("✅ User loaded:", parsedUser);
        return parsedUser;
      } catch (e) {
        console.error("❌ Error parsing user data:", e);
        localStorage.removeItem("user");
        setUser(null);
      }
    } else {
      console.log("❌ No user found in localStorage");
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
    const handleStorageChange = () => {
      console.log("🔄 Storage changed, reloading user...");
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // ==============================
  // CHECK AUTH PAGES
  // ==============================

  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);

  console.log("📍 Current path:", location.pathname);
  console.log("👤 User state:", user);

  // ==============================
  // LOADING SCREEN
  // ==============================

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f7fb"
      }}>
        <div className="loading-spinner" style={{
          width: "48px",
          height: "48px",
          border: "4px solid #e5e7eb",
          borderTopColor: "#2563eb",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ marginTop: "16px", color: "#6b7280" }}>Loading...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ==============================
  // RENDER
  // ==============================

  return (
    <div className="app">
      {!isAuthPage && <Navbar user={user} />}

      <main className="main-content">
        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
          <Routes>
          {/* ============================== */}
          {/* PUBLIC ROUTES */}
          {/* ============================== */}

          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={
                    user.role === "admin"
                      ? "/admin-dashboard"
                      : user.role === "provider"
                        ? "/provider-dashboard"
                        : "/dashboard"
                  }
                  replace
                />
              ) : (
                <Home />
              )
            }
          />

          {/* ============================== */}
          {/* AUTH ROUTES */}
          {/* ============================== */}

          <Route
            path="/login"
            element={
              user ? (
                <Navigate
                  to={
                    user.role === "admin"
                      ? "/admin-dashboard"
                      : user.role === "provider"
                        ? "/provider-dashboard"
                        : "/dashboard"
                  }
                  replace
                />
              ) : (
                <Login setUser={setUser} />
              )
            }
          />

          <Route
            path="/register"
            element={
              user ? (
                <Navigate
                  to={user.role === "provider" ? "/provider-dashboard" : "/dashboard"}
                  replace
                />
              ) : (
                <Register />
              )
            }
          />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ============================== */}
          {/* PROTECTED ROUTES - ALL USERS */}
          {/* ============================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customer-profile"
            element={
              <ProtectedRoute user={user}>
                <CustomerProfile />
              </ProtectedRoute>
            }
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
            path="/notifications"
            element={
              <ProtectedRoute user={user}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* ============================== */}
          {/* PROTECTED ROUTES - PROVIDER ONLY */}
          {/* ============================== */}

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
                <ProviderProfile />
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

          {/* ============================== */}
          {/* PROTECTED ROUTES - ADMIN ONLY */}
          {/* ============================== */}

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

          {/* ✅ NEW: Admin Payments — verify customer payments & send provider payouts */}
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <AdminPayments />
              </ProtectedRoute>
            }
          />

          {/* ============================== */}
          {/* 404 NOT FOUND */}
          {/* ============================== */}

          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

// ==============================
// 404 NOT FOUND COMPONENT
// ==============================

function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f5f7fb",
      padding: "20px",
      textAlign: "center"
    }}>
      <div style={{
        fontSize: "80px",
        fontWeight: "bold",
        color: "#2563eb",
        marginBottom: "16px"
      }}>
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
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.target.style.background = "#1d4ed8"}
        onMouseLeave={(e) => e.target.style.background = "#2563eb"}
      >
        🏠 Go Home
      </button>
    </div>
  );
}

export default App;