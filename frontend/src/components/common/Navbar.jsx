// frontend/src/components/common/Navbar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import "./Navbar.css";

function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // ==============================
  // FETCH UNREAD NOTIFICATION COUNT
  // ==============================

  const fetchUnreadCount = async () => {
    if (!user || !user.id) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${user.id}?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // ==============================
  // POLL FOR NEW NOTIFICATIONS
  // ==============================

  useEffect(() => {
    if (!user) return;

    // Fetch immediately
    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Refresh count when route changes
  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  // ==============================
  // HANDLE LOGOUT
  // ==============================

  const handleLogout = () => {
    console.log("🚪 Logging out...");

    // Clear ALL localStorage items immediately
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");

    // Clear sessionStorage
    sessionStorage.clear();

    // Redirect immediately to login
    window.location.href = "/login";
  };

  // ==============================
  // CHECK IF ROUTE IS ACTIVE
  // ==============================

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // ==============================
  // ROLE-BASED MENU ITEMS
  // ==============================

  const getMenuItems = () => {
    if (!user) return [];

    const baseItems = [{ label: "🏠 Home", path: "/" }];

    // ==============================
    // ADMIN MENU
    // ==============================
    if (user.role === "admin") {
      return [
        ...baseItems,
        { label: "📊 Admin Dashboard", path: "/admin-dashboard" },
        { label: "👥 Manage Users", path: "/admin/users" },
        { label: "📋 All Bookings", path: "/admin/bookings" },
        { label: "⭐ Reviews", path: "/admin/reviews" },
        {
          label: "🔔 Notifications",
          path: "/notifications",
          badge: unreadCount,
        },
      ];
    }

    // ==============================
    // PROVIDER MENU
    // ==============================
    if (user.role === "provider") {
      return [
        ...baseItems,
        { label: "📊 Dashboard", path: "/provider-dashboard" },
        { label: "📋 My Bookings", path: "/my-bookings" },
        { label: "👤 Profile", path: "/provider-profile" },
        { label: "📊 Analytics", path: "/provider-analytics" },
        {
          label: "🔔 Notifications",
          path: "/notifications",
          badge: unreadCount,
        },
      ];
    }

    // ==============================
    // CUSTOMER MENU
    // ==============================
    return [
      ...baseItems,
      { label: "📊 Dashboard", path: "/dashboard" },
      { label: "🔧 Services", path: "/services" },
      { label: "👨‍🔧 Providers", path: "/providers" },
      { label: "📋 My Bookings", path: "/my-bookings" },
      { label: "⭐ My Reviews", path: "/my-reviews" },
      { label: "💳 My Payments", path: "/my-payments" },
      { label: "👤 Profile", path: "/customer-profile" },
      {
        label: "🔔 Notifications",
        path: "/notifications",
        badge: unreadCount,
      },
    ];
  };

  const menuItems = getMenuItems();

  // ==============================
  // RENDER
  // ==============================

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => navigate("/")}>
        🔧 ApnaMate
      </div>

      {/* Menu Items */}
      <div className="navbar-menu">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nav-item ${isActive(item.path) ? "active" : ""}`}
          >
            <span className="nav-label">{item.label}</span>

            {/* ✅ Notification Badge */}
            {item.badge > 0 && (
              <span className="notification-badge">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* User Info & Logout */}
      <div className="navbar-user">
        <span className={`user-role role-${user?.role}`}>
          {user?.role}
        </span>
        <span className="user-name">{user?.name}</span>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;