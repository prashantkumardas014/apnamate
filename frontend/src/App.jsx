import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Services from "./pages/Services";
import Providers from "./pages/Providers";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderProfile from "./pages/ProviderProfile";
import CustomerProfile from "./pages/CustomerProfile";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import MyBookings from "./pages/MyBookings";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Routes>
      {/* ==============================
          HOME
      ============================== */}

      <Route
        path="/"
        element={<Home />}
      />

      {/* ==============================
          AUTHENTICATION
      ============================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* ==============================
          CUSTOMER
      ============================== */}

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/customer-profile"
        element={<CustomerProfile />}
      />

      <Route
        path="/services"
        element={<Services />}
      />

      <Route
        path="/providers"
        element={<Providers />}
      />

      <Route
        path="/booking"
        element={<Booking />}
      />

      <Route
        path="/my-bookings"
        element={<MyBookings />}
      />

      {/* ==============================
          NOTIFICATIONS
      ============================== */}

      <Route
        path="/notifications"
        element={<Notifications />}
      />

      {/* ==============================
          PROVIDER
      ============================== */}

      <Route
        path="/provider-dashboard"
        element={<ProviderDashboard />}
      />

      <Route
        path="/provider-profile"
        element={<ProviderProfile />}
      />

      {/* ==============================
          ADMIN
      ============================== */}

      <Route
        path="/admin-dashboard"
        element={<AdminDashboard />}
      />
    </Routes>
  );
}

export default App;