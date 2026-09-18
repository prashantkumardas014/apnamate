// frontend/src/components/common/Navbar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../../config";
import "./Navbar.css";

function Navbar({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // ==============================
  // FETCH UNREAD NOTIFICATION COUNT
  // ==============================
  const fetchUnreadCount = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${user.id}?limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (user) fetchUnreadCount();
  }, [location.pathname, user, fetchUnreadCount]);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // ==============================
  // HANDLE LOGOUT
  // ==============================
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    sessionStorage.clear();
    setUnreadCount(0);
    if (typeof setUser === "function") setUser(null);
    navigate("/login", { replace: true });   // ✅ FIXED
  };

  // ==============================
  // IS ROUTE ACTIVE
  // ==============================
  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const go = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  // ==============================
  // ROLE-BASED MENU ITEMS
  // ==============================
  const getMenuItems = () => {
    if (!user) return [];
    const baseItems = [{ label: "🏠 Overview", path: "/" }];

    if (user.role === "admin") {
      return [
        ...baseItems,
        { label: "📊 Admin Dashboard", path: "/admin-dashboard" },
        { label: "👥 Manage Users", path: "/admin/users" },
        { label: "📋 All Bookings", path: "/admin/bookings" },
        { label: "💳 Payments", path: "/admin/payments" },
        { label: "⭐ Reviews", path: "/admin/reviews" },
        { label: "👤 Profile", path: "/profile" },
        { label: "🔔 Notifications", path: "/notifications", badge: unreadCount },
      ];
    }

    if (user.role === "provider") {
      return [
        ...baseItems,
        { label: "📊 Dashboard", path: "/provider-dashboard" },
        { label: "📋 My Bookings", path: "/my-bookings" },
        { label: "👤 Profile", path: "/profile" },
        { label: "📊 Analytics", path: "/provider-analytics" },
        { label: "🧾 My Bills", path: "/my-bills" },
        { label: "🔔 Notifications", path: "/notifications", badge: unreadCount },
      ];
    }

    return [
      ...baseItems,
      { label: "📊 Dashboard", path: "/dashboard" },
      { label: "🔧 Services", path: "/services" },
      { label: "👨‍🔧 Providers", path: "/providers" },
      { label: "📋 My Bookings", path: "/my-bookings" },
      { label: "⭐ My Reviews", path: "/my-reviews" },
      { label: "💳 My Payments", path: "/my-payments" },
      { label: "🧾 My Bills", path: "/my-bills" },
      { label: "👤 Profile", path: "/profile" },
      { label: "🔔 Notifications", path: "/notifications", badge: unreadCount },
    ];
  };

  const menuItems = getMenuItems();

  // ==============================
  // RENDER
  // ==============================
  return (
    <>
      <nav className="navbar">
        {/* Mobile hamburger — appears LEFT of brand on mobile */}
        <button
          className="navbar-hamburger"
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <div
          className="navbar-brand"
          onClick={() => go("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <img
            src="./logo-white.svg"
            alt=""
            width="28"
            height="28"
            style={{ display: "block", flexShrink: 0 }}
          />
          <span>ApnaMate</span>
        </div>

        {/* Desktop menu */}
        <div className="navbar-menu">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
            >
              <span className="nav-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="notification-badge">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="navbar-user">
          <span className={`user-role role-${user?.role || "guest"}`}>
            {user?.role || "guest"}
          </span>
          <span className="user-name">{user?.name || ""}</span>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* ============================================================
          Mobile drawer — slides in from the LEFT side
          ============================================================ */}
      {menuOpen && user && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(86vw, 340px)",
              height: "100%",
              background: "white",
              display: "flex",
              flexDirection: "column",
              boxShadow: "8px 0 32px rgba(0, 0, 0, 0.25)",
              overflowY: "auto",
              animation: "slideIn 0.22s ease",
            }}
          >
            {/* Drawer header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "20px 20px 16px",
                background: "linear-gradient(135deg, #2563eb, #1e40af)",
                color: "white",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {user.name?.slice(0, 1).toUpperCase() || "?"}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    opacity: 0.85,
                    marginTop: 2,
                  }}
                >
                  {user.role}
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "8px 0",
                flex: 1,
              }}
            >
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => go(item.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      background: active ? "#eff6ff" : "transparent",
                      border: "none",
                      textAlign: "left",
                      fontSize: 15,
                      fontWeight: active ? 700 : 500,
                      color: active ? "#1d4ed8" : "#0f172a",
                      cursor: "pointer",
                      width: "100%",
                      fontFamily: "inherit",
                      borderLeft: active ? "4px solid #2563eb" : "4px solid transparent",
                    }}
                  >
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        style={{
                          background: "#ef4444",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          minWidth: 22,
                          textAlign: "center",
                        }}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                margin: "12px 20px 24px",
                padding: 14,
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                minHeight: 48,
                fontFamily: "inherit",
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          Mobile bottom tab bar
          ============================================================ */}
      {user && (
        <nav className="mobile-tabbar">
          <button
            className={`tab-item ${isActive("/") ? "active" : ""}`}
            onClick={() => go("/")}
          >
            <span className="tab-icon">🏠</span>
            <span className="tab-label">Home</span>
          </button>
          <button
            className={`tab-item ${isActive("/my-bookings") ? "active" : ""}`}
            onClick={() => go("/my-bookings")}
          >
            <span className="tab-icon">📋</span>
            <span className="tab-label">Bookings</span>
          </button>
          <button
            className={`tab-item ${isActive("/notifications") ? "active" : ""}`}
            onClick={() => go("/notifications")}
          >
            <span className="tab-icon">🔔</span>
            <span className="tab-label">Alerts</span>
            {unreadCount > 0 && (
              <span className="tab-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            className={`tab-item ${isActive("/profile") ? "active" : ""}`}
            onClick={() => go("/profile")}
          >
            <span className="tab-icon">👤</span>
            <span className="tab-label">Profile</span>
          </button>
          <button
            className="tab-item"
            onClick={() => setMenuOpen(true)}
          >
            <span className="tab-icon">☰</span>
            <span className="tab-label">More</span>
          </button>
        </nav>
      )}
    </>
  );
}

export default Navbar;