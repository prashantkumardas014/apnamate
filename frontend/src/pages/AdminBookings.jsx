// frontend/src/pages/AdminBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./AdminBookings.css";

function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/bookings/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      "Pending": { backgroundColor: "#fef3c7", color: "#92400e" },
      "Confirmed": { backgroundColor: "#dbeafe", color: "#1e40af" },
      "Accepted": { backgroundColor: "#dbeafe", color: "#1e40af" },
      "Completed": { backgroundColor: "#dcfce7", color: "#166534" },
      "Rejected": { backgroundColor: "#fee2e2", color: "#991b1b" },
      "Cancelled": { backgroundColor: "#f3f4f6", color: "#4b5563" },
    };
    return styles[status] || styles["Pending"];
  };

  if (loading) return <div className="loading">Loading bookings...</div>;

  return (
    <div className="admin-bookings">
      <div className="admin-header">
        <button onClick={() => navigate("/admin-dashboard")} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>📋 All Bookings</h1>
        <p>View and manage all bookings on the platform</p>
      </div>

      {message && (
        <div className={`message ${message.includes("✅") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <div className="booking-stats">
        <div className="stat-card">
          <h3>Total Bookings</h3>
          <p className="stat-number">{bookings.length}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-number">{bookings.filter(b => b.status === "Pending").length}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-number">{bookings.filter(b => b.status === "Completed").length}</p>
        </div>
        <div className="stat-card">
          <h3>Cancelled</h3>
          <p className="stat-number">{bookings.filter(b => b.status === "Cancelled").length}</p>
        </div>
      </div>

      <div className="booking-table-container">
        <table className="booking-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Provider</th>
              <th>Service</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>#{booking.id}</td>
                <td>{booking.customer_name || "Unknown"}</td>
                <td>{booking.provider_name}</td>
                <td>{booking.service}</td>
                <td>{booking.date}</td>
                <td>
                  <span style={{
                    ...getStatusStyle(booking.status),
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    fontSize: "12px"
                  }}>
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminBookings;