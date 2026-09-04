import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get logged-in user and bookings
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setLoading(false);
      return;
    }

    const loggedInUser = JSON.parse(storedUser);
    setUser(loggedInUser);

    // Get customer's bookings from database
    fetch(
      `http://127.0.0.1:8000/bookings/customer/${loggedInUser.id}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load bookings");
        }

        return response.json();
      })
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading bookings:", error);
        setLoading(false);
      });
  }, []);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("booking");
    navigate("/login");
  };

  // Latest booking
  const latestBooking =
    bookings.length > 0
      ? bookings[bookings.length - 1]
      : null;

  // Status color
  const getStatusStyle = (status) => {
    if (status === "Completed") {
      return {
        color: "#166534",
        backgroundColor: "#dcfce7",
      };
    }

    if (status === "Accepted") {
      return {
        color: "#1d4ed8",
        backgroundColor: "#dbeafe",
      };
    }

    if (status === "Rejected") {
      return {
        color: "#991b1b",
        backgroundColor: "#fee2e2",
      };
    }

    return {
      color: "#92400e",
      backgroundColor: "#fef3c7",
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          backgroundColor: "#2563eb",
          color: "white",
        }}
      >
        <h2 style={{ margin: 0 }}>ApnaMate</h2>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          {/* Notifications Button */}
          <button
            onClick={() => navigate("/notifications")}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "white",
              color: "#2563eb",
              fontWeight: "bold",
            }}
          >
            🔔 Notifications
          </button>

          {/* Profile Button */}
          <button
            onClick={() => navigate("/customer-profile")}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "white",
              color: "#2563eb",
              fontWeight: "bold",
            }}
          >
            👤 Profile
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "white",
              color: "#2563eb",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Dashboard */}
      <main
        style={{
          padding: "40px",
          maxWidth: "1100px",
          margin: "auto",
        }}
      >
        {/* Welcome Section */}
        <h1>Welcome to ApnaMate 👋</h1>

        {user ? (
          <div>
            <p>
              Hello, <strong>{user.name}</strong>
            </p>

            <p>Email: {user.email}</p>
          </div>
        ) : (
          <div>
            <p>Please login to continue.</p>

            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "10px 18px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </div>
        )}

        {/* Services Section */}
        <h2 style={{ marginTop: "40px" }}>
          Find a Service
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <div
            onClick={() => navigate("/services")}
            style={serviceCardStyle}
          >
            <h3>⚡ Electrician</h3>
            <p>Find trusted electricians</p>
          </div>

          <div
            onClick={() => navigate("/services")}
            style={serviceCardStyle}
          >
            <h3>🚰 Plumber</h3>
            <p>Find professional plumbers</p>
          </div>

          <div
            onClick={() => navigate("/services")}
            style={serviceCardStyle}
          >
            <h3>❄️ AC Repair</h3>
            <p>Get AC repair services</p>
          </div>

          <div
            onClick={() => navigate("/services")}
            style={serviceCardStyle}
          >
            <h3>🧹 Cleaning</h3>
            <p>Book cleaning services</p>
          </div>

          <div
            onClick={() => navigate("/services")}
            style={serviceCardStyle}
          >
            <h3>💻 Computer Repair</h3>
            <p>Get computer repair help</p>
          </div>

          <div
            onClick={() => navigate("/services")}
            style={serviceCardStyle}
          >
            <h3>🔌 Appliance Repair</h3>
            <p>Repair your home appliances</p>
          </div>
        </div>

        {/* My Bookings */}
        <h2 style={{ marginTop: "50px" }}>
          My Bookings
        </h2>

        <div
          style={{
            backgroundColor: "white",
            padding: "25px",
            border: "1px solid #ddd",
            borderRadius: "10px",
            marginTop: "20px",
          }}
        >
          {loading ? (
            <p>Loading bookings...</p>
          ) : latestBooking ? (
            <>
              <h3>{latestBooking.service}</h3>

              <p>
                <strong>Provider:</strong>{" "}
                {latestBooking.provider_name}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {latestBooking.date}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {latestBooking.time}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    ...getStatusStyle(latestBooking.status),
                    padding: "5px 10px",
                    borderRadius: "15px",
                    fontWeight: "bold",
                  }}
                >
                  {latestBooking.status}
                </span>
              </p>

              <button
                onClick={() => navigate("/my-bookings")}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  marginTop: "10px",
                }}
              >
                📋 View My Bookings
              </button>
            </>
          ) : (
            <>
              <p>
                You don't have any bookings yet.
              </p>

              <button
                onClick={() => navigate("/services")}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Find a Service
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const serviceCardStyle = {
  padding: "25px",
  backgroundColor: "white",
  border: "1px solid #ddd",
  borderRadius: "10px",
  cursor: "pointer",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

export default Dashboard;