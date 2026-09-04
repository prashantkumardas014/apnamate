import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/notifications/${user.id}`
      );

      const data = await response.json();

      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(
        `http://127.0.0.1:8000/bookings/notifications/${notificationId}/read?user_id=${user.id}`,
        {
          method: "PUT",
        }
      );

      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(
        `http://127.0.0.1:8000/bookings/notifications/${user.id}/read-all`,
        {
          method: "PUT",
        }
      );

      fetchNotifications();
    } catch (error) {
      console.error("Error marking notifications:", error);
    }
  };

  const unreadCount = notifications.filter(
    (notification) => notification.is_read === 0
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>
              🔔 Notifications
            </h1>

            <p style={{ color: "#666" }}>
              {unreadCount} unread notification
              {unreadCount !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#6b7280",
              color: "white",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>

        {/* Mark All Read */}
        {notifications.length > 0 && unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              marginBottom: "20px",
              padding: "10px 16px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#2563eb",
              color: "white",
              cursor: "pointer",
            }}
          >
            Mark All as Read
          </button>
        )}

        {/* Loading */}
        {loading && (
          <p style={{ textAlign: "center" }}>
            Loading notifications...
          </p>
        )}

        {/* Empty */}
        {!loading && notifications.length === 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "50px 20px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "50px" }}>
              🔔
            </div>

            <h2>No Notifications</h2>

            <p style={{ color: "#666" }}>
              You don't have any notifications yet.
            </p>
          </div>
        )}

        {/* Notifications */}
        {!loading &&
          notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                backgroundColor:
                  notification.is_read === 0
                    ? "#eff6ff"
                    : "white",

                border:
                  notification.is_read === 0
                    ? "1px solid #bfdbfe"
                    : "1px solid #e5e7eb",

                padding: "20px",
                borderRadius: "10px",
                marginBottom: "15px",

                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "15px",
                }}
              >
                <div>
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                    }}
                  >
                    {notification.is_read === 0 && "🔵 "}
                    {notification.title}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#555",
                      lineHeight: "1.5",
                    }}
                  >
                    {notification.message}
                  </p>
                </div>

                {notification.is_read === 0 && (
                  <button
                    onClick={() =>
                      markAsRead(notification.id)
                    }
                    style={{
                      height: "fit-content",
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Notifications;