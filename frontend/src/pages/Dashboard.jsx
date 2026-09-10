import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./Dashboard.css";

// SVG Icons as components for reusability
const Icon = ({ path, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d={path} />
  </svg>
);

const ICONS = {
  dashboard: "M13 3V9H21V3M13 21H21V11H13M3 21H11V15H3M3 13H11V3H3V13Z",
  wave: "M19.5,7.32c-2.5,0-4.63,1.63-5.42,3.89c-0.34-0.2-0.72-0.32-1.12-0.32c-0.83,0-1.59,0.34-2.12,0.88C10.26,9.84,8.28,8.5,6,8.5c-3.31,0-6,2.69-6,6s2.69,6,6,6c2.5,0,4.63-1.63,5.42-3.89c0.34,0.2,0.72,0.32,1.12,0.32c0.83,0,1.59-0.34,2.12-0.88c0.58,1.95,2.56,3.27,4.84,3.27c3.31,0,6-2.69,6-6S22.81,7.32,19.5,7.32z",
  refresh: "M17.65,6.35C16.2,4.9,14.21,4,12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8,7.99,8c3.73,0,6.84-2.55,7.73-6h-2.08c-0.82,2.33-3.04,4-5.65,4-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.22,1.78L13,11h7V4L17.65,6.35z",
  browse: "M15.5,14h-.79l-.28-.27c.98-1.14,1.57-2.62,1.57-4.23c0-3.59-2.91-6.5-6.5-6.5S3,5.91,3,9.5s2.91,6.5,6.5,6.5c1.61,0,3.09-.59,4.23-1.57l.27,.28v.79l5,5l1.41-1.41l-5-5zm-6,0C7.01,14,5,11.99,5,9.5S7.01,5,9.5,5S14,7.01,14,9.5S11.99,14,9.5,14z",
  logout: "M17,8l-1.41,1.41L17.17,11H9v2h8.17l-1.58,1.58L17,16l4-4l-4-4zM5,5h7V3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h7v-2H5V5z",
  error: "M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2zM13,17h-2v-2h2V17zM13,13h-2V7h2V13z",
  user: "M12,12c2.21,0,4-1.79,4-4s-1.79-4-4-4S8,5.79,8,8S9.79,12,12,12zM12,14c-2.67,0-8,1.34-8,4v2h16v-2C20,15.34,14.67,14,12,14z",
  calendar: "M17,12h-5v5h5V12zM16,1v2H8V1H6v2H5C3.89,3,3,3.89,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V5c0-1.11-0.89-2-2-2h-1V1H16zM19,19H5V8h14V19z",
  bookings: "M19,3h-1V1h-2v2H8V1H6v2H5C3.89,3,3,3.9,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3zM19,19H5V8h14V19zM7,10h5v5H7V10z",
  notifications: "M12,22c1.1,0,2-0.9,2-2h-4C10,21.1,10.9,22,12,22zM18,16v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-0.83-0.67-1.5-1.5-1.5S10.5,3.17,10.5,4v.68C7.63,5.36,6,7.92,6,11v5l-2,2v1h16v-1L18,16z",
  providers: "M16,11c1.66,0,2.99-1.34,2.99-3S17.66,5,16,5c-1.66,0-3,1.34-3,3S14.34,11,16,11zM8,11c1.66,0,2.99-1.34,2.99-3S9.66,5,8,5C6.34,5,5,6.34,5,8S6.34,11,8,11zM8,13c-2.33,0-7,1.17-7,3.5V19h14v-2.5C15,14.17,10.33,13,8,13zM16,13c-0.29,0-0.62,0.02-0.97,0.05c1.16,0.84,1.97,1.97,1.97,3.45V19h6v-2.5C23,14.17,18.33,13,16,13z",
  empty: "M20,2H4C2.9,2,2,2.9,2,4v16l4-4h14c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2zM20,16H5.17l-0.59,0.59L4,17.17V4h16V16z",
  total: "M3,13h8V3H3V13zM3,21h8v-6H3V21zM13,21h8V11h-8V21zM13,3v6h8V3H13z",
  pending: "M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2zM12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8S16.41,20,12,20zM12.5,7H11v6l5.25,3.15l0.75-1.23l-4.5-2.67V7z",
  confirmed: "M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2zM12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8S16.41,20,12,20zM16.59,7.58L10,14.17l-3.59-3.58L5,12l5,5l8-8L16.59,7.58z",
  completed: "M19,3h-4.18C14.4,1.84,13.3,1,12,1S9.6,1.84,9.18,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3zM12,3c0.55,0,1,0.45,1,1s-0.45,1-1,1s-1-0.45-1-1S11.45,3,12,3zM10.41,16.41l-3.41-3.41L8.41,11.59L10.41,13.59l5.18-5.18L17,9.82L10.41,16.41z",
  cancelled: "M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2zM17,13H7v-2h10V13z",
  arrowRight: "M10,17l5-5l-5-5v10z",
  active: "M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2zM10,17l5-5l-5-5V17z",
};


function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      if (userData.role === "admin") {
        navigate("/admin-dashboard", { replace: true });
        return;
      }
      fetchBookings(userData.id);
    } catch (e) {
      console.error("Error parsing user data:", e);
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchBookings = async (userId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/my-bookings/${userId}`,
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
        throw new Error(errorData?.detail || "Failed to load bookings");
      }

      const data = await response.json();
      if (data.success) {
        const bookingsList = data.bookings || [];
        setBookings(bookingsList);
        calculateStats(bookingsList);
      } else {
        setBookings([]);
        setError(data.message || "No bookings found");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.message || "Unable to load bookings");
    }
  };

  const calculateStats = (bookingsList) => {
    setStats({
      total: bookingsList.length,
      pending: bookingsList.filter(b => b.status === "Pending").length,
      confirmed: bookingsList.filter(b => b.status === "Confirmed" || b.status === "Accepted").length,
      completed: bookingsList.filter(b => b.status === "Completed").length,
      cancelled: bookingsList.filter(b => b.status === "Cancelled").length,
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleRefresh = () => {
    if (user) {
      setError("");
      fetchBookings(user.id);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Or a redirect, though useEffect should handle it
  }

  const StatCard = ({ icon, label, value, color }) => (
    <div className="stat-card" style={{ '--stat-color': `var(--${color})` }}>
      <div className="stat-icon">
        <Icon path={ICONS[icon]} />
      </div>
      <div className="stat-value">{value}</div>
      <p className="stat-label">{label}</p>
    </div>
  );

  const QuickActionButton = ({ icon, label, to }) => (
    <button className="quick-action-btn" onClick={() => navigate(to)}>
      <Icon path={ICONS[icon]} className="quick-action-icon" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>
            <Icon path={ICONS.dashboard} className="header-icon" />
            Dashboard
          </h1>
          <p>
            Welcome back, {user.name}! 
            <Icon path={ICONS.wave} className="wave-icon" />
          </p>
        </div>
        <div className="header-right">
          <button onClick={handleRefresh} className="header-btn refresh-btn">
            <Icon path={ICONS.refresh} />
          </button>
          <button onClick={() => navigate("/services")} className="header-btn browse-btn">
            <Icon path={ICONS.browse} />
          </button>
          <button onClick={handleLogout} className="header-btn logout-btn">
            <Icon path={ICONS.logout} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main>
        {error && (
          <div className="error-banner">
            <Icon path={ICONS.error} className="error-icon" />
            <p>{error}</p>
            <button onClick={() => setError("")} className="close-btn">&times;</button>
          </div>
        )}

        <div className="user-info-card">
          <div className="user-avatar">{user.name?.charAt(0) || "U"}</div>
          <div className="user-details">
            <h2>{user.name}</h2>
            <p className="user-email">{user.email}</p>
            <div className="user-tags">
              <span className={`user-tag role-${user.role}`}>{user.role}</span>
              <span className="user-tag status-active">
                <Icon path={ICONS.active} className="tag-icon" />
                Active
              </span>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard icon="total" label="Total Bookings" value={stats.total} color="primary-color" />
          <StatCard icon="pending" label="Pending" value={stats.pending} color="warning-color" />
          <StatCard icon="confirmed" label="Confirmed" value={stats.confirmed} color="info-color" />
          <StatCard icon="completed" label="Completed" value={stats.completed} color="success-color" />
          <StatCard icon="cancelled" label="Cancelled" value={stats.cancelled} color="error-color" />
        </div>

        <div className="quick-actions-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <QuickActionButton icon="browse" label="Browse Services" to="/services" />
            <QuickActionButton icon="providers" label="Find Providers" to="/providers" />
            <QuickActionButton icon="bookings" label="My Bookings" to="/my-bookings" />
            <QuickActionButton icon="notifications" label="Notifications" to="/notifications" />
          </div>
        </div>

        <div className="recent-bookings-card">
          <div className="card-header">
            <h3>Recent Bookings</h3>
            {bookings.length > 0 && (
              <button onClick={() => navigate("/my-bookings")} className="view-all-btn">
                View All <Icon path={ICONS.arrowRight} className="arrow-icon" />
              </button>
            )}
          </div>
          <div className="bookings-list">
            {bookings.length === 0 ? (
              <div className="empty-state">
                <Icon path={ICONS.empty} className="empty-icon" />
                <h4>No bookings yet</h4>
                <p>You haven't booked any services. Time to explore!</p>
                <button onClick={() => navigate("/services")} className="btn-primary">
                  Browse Services
                </button>
              </div>
            ) : (
              bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="booking-item" onClick={() => navigate("/my-bookings")}>
                  <div className="booking-info">
                    <p className="booking-service">{booking.service}</p>
                    <div className="booking-meta">
                      <span><Icon path={ICONS.calendar} className="meta-icon" /> {booking.date} at {booking.time}</span>
                      <span><Icon path={ICONS.user} className="meta-icon" /> {booking.provider_name}</span>
                    </div>
                  </div>
                  <div className={`booking-status status-${booking.status.toLowerCase()}`}>
                    {booking.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;