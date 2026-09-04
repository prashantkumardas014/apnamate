import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProviderDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState("Available");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Load provider information
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "provider") {
      navigate("/dashboard");
      return;
    }

    setUser(parsedUser);

    fetchBookings(parsedUser.id);
    fetchProfile(parsedUser.id);
  }, [navigate]);

  // Get provider bookings
  const fetchBookings = async (providerId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/provider/${providerId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load bookings");
      }

      const data = await response.json();

      setBookings(data);
    } catch (error) {
      console.error("Booking error:", error);
      setMessage("Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  // Get provider profile and availability
  const fetchProfile = async (providerId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/profile/${providerId}`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.availability) {
        setAvailability(data.availability);
      }
    } catch (error) {
      console.error("Profile error:", error);
    }
  };

  // Change availability
  const handleAvailabilityChange = async (newAvailability) => {
    if (!user) return;

    try {
      setMessage("Updating availability...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/availability/${user.id}?availability=${encodeURIComponent(
          newAvailability
        )}`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Failed to update availability");
        return;
      }

      setAvailability(data.availability);

      setMessage(
        `Availability changed to ${data.availability}`
      );
    } catch (error) {
      console.error("Availability error:", error);
      setMessage("Unable to update availability");
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId, action) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/${bookingId}/${action}`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Unable to update booking");
        return;
      }

      setMessage("Booking updated successfully");

      fetchBookings(user.id);
    } catch (error) {
      console.error("Booking status error:", error);
      setMessage("Unable to update booking");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Statistics
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "Pending"
  ).length;

  const acceptedBookings = bookings.filter(
    (booking) => booking.status === "Accepted"
  ).length;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "Completed"
  ).length;

  const rejectedBookings = bookings.filter(
    (booking) => booking.status === "Rejected"
  ).length;

  // Availability styling
  const getAvailabilityColor = () => {
    if (availability === "Available") {
      return "#16a34a";
    }

    if (availability === "Busy") {
      return "#ca8a04";
    }

    return "#dc2626";
  };

  const getAvailabilityIcon = () => {
    if (availability === "Available") {
      return "🟢";
    }

    if (availability === "Busy") {
      return "🟡";
    }

    return "🔴";
  };

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#1e293b",
            }}
          >
            Welcome, {user.name} 👋
          </h1>

          <p
            style={{
              color: "#64748b",
              marginTop: "8px",
            }}
          >
            Manage your bookings and service requests.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            style={{
              padding: "10px 18px",
              backgroundColor: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔔 Notifications
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate("/provider-profile")}
            style={{
              padding: "10px 18px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            My Profile
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 18px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* AVAILABILITY */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 25px",
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#1e293b",
          }}
        >
          Service Availability
        </h2>

        <p
          style={{
            color: "#64748b",
          }}
        >
          Control whether customers can book your services.
        </p>

        {/* CURRENT STATUS */}
        <div
          style={{
            margin: "20px 0",
            padding: "15px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          <strong>Current Status: </strong>

          <span
            style={{
              color: getAvailabilityColor(),
              fontWeight: "bold",
              marginLeft: "5px",
            }}
          >
            {getAvailabilityIcon()} {availability}
          </span>
        </div>

        {/* AVAILABILITY BUTTONS */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              handleAvailabilityChange("Available")
            }
            style={{
              padding: "12px 20px",
              border:
                availability === "Available"
                  ? "2px solid #16a34a"
                  : "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor:
                availability === "Available"
                  ? "#dcfce7"
                  : "white",
              color: "#166534",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🟢 Available
          </button>

          <button
            onClick={() =>
              handleAvailabilityChange("Busy")
            }
            style={{
              padding: "12px 20px",
              border:
                availability === "Busy"
                  ? "2px solid #ca8a04"
                  : "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor:
                availability === "Busy"
                  ? "#fef9c3"
                  : "white",
              color: "#854d0e",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🟡 Busy
          </button>

          <button
            onClick={() =>
              handleAvailabilityChange("Offline")
            }
            style={{
              padding: "12px 20px",
              border:
                availability === "Offline"
                  ? "2px solid #dc2626"
                  : "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor:
                availability === "Offline"
                  ? "#fee2e2"
                  : "white",
              color: "#991b1b",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔴 Offline
          </button>
        </div>

        {message && (
          <p
            style={{
              marginTop: "15px",
              color: "#475569",
            }}
          >
            {message}
          </p>
        )}
      </div>

      {/* STATISTICS */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 25px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
        }}
      >
        <div style={statCardStyle}>
          <h3>Pending</h3>
          <p>{pendingBookings}</p>
        </div>

        <div style={statCardStyle}>
          <h3>Accepted</h3>
          <p>{acceptedBookings}</p>
        </div>

        <div style={statCardStyle}>
          <h3>Completed</h3>
          <p>{completedBookings}</p>
        </div>

        <div style={statCardStyle}>
          <h3>Rejected</h3>
          <p>{rejectedBookings}</p>
        </div>
      </div>

      {/* BOOKINGS */}
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            color: "#1e293b",
          }}
        >
          Service Requests
        </h2>

        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <p>No service requests yet.</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                backgroundColor: "white",
                padding: "20px",
                marginBottom: "15px",
                borderRadius: "10px",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#2563eb",
                }}
              >
                {booking.service}
              </h3>

              <p>
                <strong>Customer ID:</strong>{" "}
                {booking.customer_id}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {booking.date}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {booking.time}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {booking.address}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {booking.description}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    fontWeight: "bold",
                  }}
                >
                  {booking.status}
                </span>
              </p>

              {/* ACTION BUTTONS */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "15px",
                }}
              >
                {booking.status === "Pending" && (
                  <>
                    <button
                      onClick={() =>
                        updateBookingStatus(
                          booking.id,
                          "accept"
                        )
                      }
                      style={{
                        padding: "10px 18px",
                        backgroundColor: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Accept
                    </button>

                    <button
                      onClick={() =>
                        updateBookingStatus(
                          booking.id,
                          "reject"
                        )
                      }
                      style={{
                        padding: "10px 18px",
                        backgroundColor: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}

                {booking.status === "Accepted" && (
                  <button
                    onClick={() =>
                      updateBookingStatus(
                        booking.id,
                        "complete"
                      )
                    }
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const statCardStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

export default ProviderDashboard;