// src/pages/Notifications.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
/* eslint-disable react/set-state-in-effect, react/immutability */

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  // ==============================
  // CHECK USER LOGIN
  // ==============================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      fetchNotifications(userData.id);
    } catch (error) {
      console.error("Error parsing user data:", error);
      navigate("/login");
    }
  }, [navigate]);

  // ==============================
  // FETCH NOTIFICATIONS
  // ==============================

  const fetchNotifications = async (userId) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to load notifications");
      }

      const data = await response.json();
      console.log("📦 Notifications data:", data);

      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications([]);
        setError(data.message || "No notifications found");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError(error.message || "Unable to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // MARK NOTIFICATION AS READ
  // ==============================

  const markAsRead = async (notificationId) => {
    if (!user) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: 1 } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification:", error);
      setError(error.message || "Unable to mark notification as read");
    } finally {
      setActionLoading(false);
    }
  };

  // ==============================
  // MARK ALL AS READ
  // ==============================

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/read-all/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: 1 }))
      );
    } catch (error) {
      console.error("Error marking notifications:", error);
      setError(error.message || "Unable to mark all as read");
    } finally {
      setActionLoading(false);
    }
  };

  // ==============================
  // DELETE NOTIFICATION
  // ==============================

  const deleteNotification = async (notificationId) => {
    if (!user) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmDelete) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Update local state
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
      setError(error.message || "Unable to delete notification");
    } finally {
      setActionLoading(false);
    }
  };

  // ==============================
  // CLEAR ALL NOTIFICATIONS
  // ==============================

  const clearAllNotifications = async () => {
    if (!user) return;

    const confirmClear = window.confirm(
      "Are you sure you want to delete all notifications?"
    );

    if (!confirmClear) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/clear-all/${user.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to clear notifications");
      }

      // Update local state
      setNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications:", error);
      setError(error.message || "Unable to clear notifications");
    } finally {
      setActionLoading(false);
    }
  };

  // ==============================
  // GET NOTIFICATION ICON
  // ==============================

  const getNotificationIcon = (type) => {
    switch (type) {
      case "booking":
        return "📋";
      case "welcome":
        return "👋";
      case "info":
        return "ℹ️";
      case "alert":
        return "⚠️";
      default:
        return "🔔";
    }
  };

  // ==============================
  // GET TIME AGO
  // ==============================

  const getTimeAgo = (dateString) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ==============================
  // RENDER
  // ==============================

  const unreadCount = notifications.filter(
    (notification) => notification.is_read === 0
  ).length;

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* ============================== */}
        {/* HEADER */}
        {/* ============================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#1e293b" }}>
              🔔 Notifications
            </h1>

            <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
              {unreadCount} unread notification
              {unreadCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "#6b7280",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.background = "#4b5563"}
              onMouseLeave={(e) => e.target.style.background = "#6b7280"}
            >
              📊 Dashboard
            </button>
          </div>
        </div>

        {/* ============================== */}
        {/* ERROR MESSAGE */}
        {/* ============================== */}

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              borderLeft: "4px solid #dc2626",
            }}
          >
            <strong>❌ Error:</strong> {error}
            <button
              onClick={() => user && fetchNotifications(user.id)}
              style={{
                marginLeft: "12px",
                padding: "4px 12px",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================== */}
        {/* ACTION BUTTONS */}
        {/* ============================== */}

        {!loading && notifications.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={actionLoading}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: actionLoading ? "#9ca3af" : "#2563eb",
                  color: "white",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!actionLoading) e.target.style.background = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  if (!actionLoading) e.target.style.background = "#2563eb";
                }}
              >
                {actionLoading ? "⏳ Processing..." : "📖 Mark All as Read"}
              </button>
            )}

            <button
              onClick={clearAllNotifications}
              disabled={actionLoading || notifications.length === 0}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: actionLoading || notifications.length === 0 ? "#9ca3af" : "#dc2626",
                color: "white",
                cursor: actionLoading || notifications.length === 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!actionLoading && notifications.length > 0) e.target.style.background = "#b91c1c";
              }}
              onMouseLeave={(e) => {
                if (!actionLoading && notifications.length > 0) e.target.style.background = "#dc2626";
              }}
            >
              🗑️ Clear All
            </button>
          </div>
        )}

        {/* ============================== */}
        {/* LOADING */}
        {/* ============================== */}

        {loading && (
          <div
            style={{
              backgroundColor: "white",
              padding: "60px 20px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <div className="spinner" style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}></div>
            <p style={{ color: "#6b7280" }}>Loading notifications...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* ============================== */}
        {/* EMPTY STATE */}
        {/* ============================== */}

        {!loading && notifications.length === 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "60px 20px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>
              🔔
            </div>

            <h2 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>
              No Notifications
            </h2>

            <p style={{ color: "#6b7280", margin: "0 0 20px 0" }}>
              You don't have any notifications yet. Check back later!
            </p>

            <button
              onClick={() => navigate("/services")}
              style={{
                padding: "10px 24px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Browse Services →
            </button>
          </div>
        )}

        {/* ============================== */}
        {/* NOTIFICATIONS LIST */}
        {/* ============================== */}

        {!loading && notifications.length > 0 && (
          <div>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Showing <strong>{notifications.length}</strong> notification
              {notifications.length !== 1 ? "s" : ""}
            </p>

            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  backgroundColor: notification.is_read === 0 ? "#eff6ff" : "white",
                  border: notification.is_read === 0 ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
                  padding: "20px",
                  borderRadius: "10px",
                  marginBottom: "15px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.01)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>
                        {getNotificationIcon(notification.type)}
                      </span>
                      <h3
                        style={{
                          margin: 0,
                          fontWeight: notification.is_read === 0 ? "bold" : "normal",
                        }}
                      >
                        {notification.title}
                      </h3>
                      {notification.is_read === 0 && (
                        <span
                          style={{
                            backgroundColor: "#2563eb",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: "bold",
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: "4px 0",
                        color: "#555",
                        lineHeight: "1.5",
                      }}
                    >
                      {notification.message}
                    </p>

                    <p
                      style={{
                        margin: "8px 0 0 0",
                        color: "#9ca3af",
                        fontSize: "12px",
                      }}
                    >
                      {getTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    {notification.is_read === 0 && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: "6px",
                          backgroundColor: actionLoading ? "#9ca3af" : "#2563eb",
                          color: "white",
                          cursor: actionLoading ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                          whiteSpace: "nowrap",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!actionLoading) e.target.style.background = "#1d4ed8";
                        }}
                        onMouseLeave={(e) => {
                          if (!actionLoading) e.target.style.background = "#2563eb";
                        }}
                      >
                        ✓ Mark Read
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(notification.id)}
                      disabled={actionLoading}
                      style={{
                        padding: "6px 12px",
                        border: "none",
                        borderRadius: "6px",
                        backgroundColor: actionLoading ? "#9ca3af" : "#dc2626",
                        color: "white",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!actionLoading) e.target.style.background = "#b91c1c";
                      }}
                      onMouseLeave={(e) => {
                        if (!actionLoading) e.target.style.background = "#dc2626";
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;