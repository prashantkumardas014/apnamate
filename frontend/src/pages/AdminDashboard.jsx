import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  // Notification count
  const [notificationCount, setNotificationCount] = useState(0);

  // User Search and Filter states
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("All");

  // Booking Search and Filter states
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // =========================================================
  // CHECK ADMIN LOGIN
  // =========================================================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "admin") {
        navigate("/dashboard");
        return;
      }

      setUser(parsedUser);

      fetchUsers(parsedUser.id);
      fetchBookings(parsedUser.id);
      fetchNotificationCount(parsedUser.id);

    } catch (error) {
      console.error("Invalid user data:", error);

      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);


  // =========================================================
  // FETCH NOTIFICATION COUNT
  // =========================================================

  const fetchNotificationCount = async (userId) => {
    if (!userId) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/notifications/${userId}`,
        {
          headers: {
            "X-User-ID": String(userId),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const unreadCount = data.filter(n => n.is_read === 0).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };


  // =========================================================
  // FETCH USERS
  // =========================================================

  const fetchUsers = async (adminId) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "http://127.0.0.1:8000/bookings/admin/users",
        {
          method: "GET",
          headers: {
            "X-User-ID": String(adminId),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to load users"
        );
      }

      const data = await response.json();

      setUsers(data);

    } catch (error) {
      console.error("Users error:", error);

      setMessage(
        error.message || "Unable to load users"
      );

    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // FETCH BOOKINGS
  // =========================================================

  const fetchBookings = async (adminId) => {
    try {
      setBookingsLoading(true);
      setBookingMessage("");

      const response = await fetch(
        "http://127.0.0.1:8000/bookings/admin/bookings",
        {
          method: "GET",
          headers: {
            "X-User-ID": String(adminId),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to load bookings"
        );
      }

      const data = await response.json();

      setBookings(data);

    } catch (error) {
      console.error("Bookings error:", error);

      setBookingMessage(
        error.message || "Unable to load bookings"
      );

    } finally {
      setBookingsLoading(false);
    }
  };


  // =========================================================
  // EXPORT CSV
  // =========================================================

  const exportCSV = (data, filename, headers) => {
    const csvRows = [];
    csvRows.push(headers.join(","));

    data.forEach((item) => {
      const values = headers.map((header) => {
        const value = item[header] || "";
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportUsersCSV = () => {
    const headers = ["id", "name", "email", "role", "service", "location", "is_active"];
    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      service: u.service || "",
      location: u.location || "",
      is_active: u.is_active === 1 ? "Active" : "Blocked",
    }));
    exportCSV(data, "users_export", headers);
    setMessage("Users exported successfully! ✅");
  };

  const exportBookingsCSV = () => {
    const headers = ["id", "customer", "provider", "service", "date", "time", "address", "status"];
    const data = bookings.map((b) => ({
      id: b.id,
      customer: b.customer_name,
      provider: b.provider_name,
      service: b.service,
      date: b.date,
      time: b.time,
      address: b.address,
      status: b.status,
    }));
    exportCSV(data, "bookings_export", headers);
    setBookingMessage("Bookings exported successfully! ✅");
  };


  // =========================================================
  // ADMIN DELETE BOOKING
  // =========================================================

  const handleDeleteBooking = async (bookingId) => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE Booking #${bookingId}?\n\nThis action cannot be undone!`
    );

    if (!confirmDelete) {
      return;
    }

    if (!user) {
      setBookingMessage("Admin user not found.");
      return;
    }

    try {
      setBookingMessage("Deleting booking...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/bookings/${bookingId}`,
        {
          method: "DELETE",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to delete booking"
        );
      }

      setBookingMessage(
        `Booking #${bookingId} deleted successfully.`
      );

      await fetchBookings(user.id);

    } catch (error) {
      console.error("Delete booking error:", error);

      setBookingMessage(
        error.message || "Unable to delete booking"
      );
    }
  };


  // =========================================================
  // BLOCK USER
  // =========================================================

  const handleBlockUser = async (userId, userName) => {
    if (!user) {
      setMessage("Admin user not found.");
      return;
    }

    if (Number(userId) === Number(user.id)) {
      setMessage("You cannot block your own admin account.");
      return;
    }

    const confirmBlock = window.confirm(
      `Are you sure you want to block ${userName}?`
    );

    if (!confirmBlock) {
      return;
    }

    try {
      setMessage("Blocking user...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/users/${userId}/block`,
        {
          method: "PUT",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to block user"
        );
      }

      setMessage(
        `${userName} has been blocked successfully.`
      );

      await fetchUsers(user.id);

    } catch (error) {
      console.error("Block user error:", error);

      setMessage(
        error.message || "Unable to block user"
      );
    }
  };


  // =========================================================
  // UNBLOCK USER
  // =========================================================

  const handleUnblockUser = async (userId, userName) => {
    if (!user) {
      setMessage("Admin user not found.");
      return;
    }

    const confirmUnblock = window.confirm(
      `Are you sure you want to unblock ${userName}?`
    );

    if (!confirmUnblock) {
      return;
    }

    try {
      setMessage("Unblocking user...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/users/${userId}/unblock`,
        {
          method: "PUT",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to unblock user"
        );
      }

      setMessage(
        `${userName} has been unblocked successfully.`
      );

      await fetchUsers(user.id);

    } catch (error) {
      console.error("Unblock user error:", error);

      setMessage(
        error.message || "Unable to unblock user"
      );
    }
  };


  // =========================================================
  // DELETE USER
  // =========================================================

  const handleDeleteUser = async (userId, userName) => {
    if (!user) {
      setMessage("Admin user not found.");
      return;
    }

    if (Number(userId) === Number(user.id)) {
      setMessage("You cannot delete your own admin account.");
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE ${userName}?\n\nThis action cannot be undone! All data associated with this user will be permanently removed.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setMessage("Deleting user...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to delete user"
        );
      }

      setMessage(
        `${userName} has been deleted successfully.`
      );

      await fetchUsers(user.id);

    } catch (error) {
      console.error("Delete user error:", error);

      setMessage(
        error.message || "Unable to delete user"
      );
    }
  };


  // =========================================================
  // ADMIN ACCEPT BOOKING
  // =========================================================

  const handleAcceptBooking = async (bookingId) => {
    const confirmAccept = window.confirm(
      `Are you sure you want to accept Booking #${bookingId}?`
    );

    if (!confirmAccept) {
      return;
    }

    if (!user) {
      setBookingMessage("Admin user not found.");
      return;
    }

    try {
      setBookingMessage("Accepting booking...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/bookings/${bookingId}/accept`,
        {
          method: "PUT",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to accept booking"
        );
      }

      setBookingMessage(
        `Booking #${bookingId} accepted successfully.`
      );

      await fetchBookings(user.id);

    } catch (error) {
      console.error("Accept booking error:", error);

      setBookingMessage(
        error.message || "Unable to accept booking"
      );
    }
  };


  // =========================================================
  // ADMIN REJECT BOOKING
  // =========================================================

  const handleRejectBooking = async (bookingId) => {
    const confirmReject = window.confirm(
      `Are you sure you want to reject Booking #${bookingId}?`
    );

    if (!confirmReject) {
      return;
    }

    if (!user) {
      setBookingMessage("Admin user not found.");
      return;
    }

    try {
      setBookingMessage("Rejecting booking...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/bookings/${bookingId}/reject`,
        {
          method: "PUT",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to reject booking"
        );
      }

      setBookingMessage(
        `Booking #${bookingId} rejected successfully.`
      );

      await fetchBookings(user.id);

    } catch (error) {
      console.error("Reject booking error:", error);

      setBookingMessage(
        error.message || "Unable to reject booking"
      );
    }
  };


  // =========================================================
  // ADMIN CANCEL BOOKING
  // =========================================================

  const handleCancelBooking = async (bookingId) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Booking #${bookingId}?`
    );

    if (!confirmCancel) {
      return;
    }

    if (!user) {
      setBookingMessage("Admin user not found.");
      return;
    }

    try {
      setBookingMessage("Cancelling booking...");

      const response = await fetch(
        `http://127.0.0.1:8000/bookings/admin/bookings/${bookingId}/cancel`,
        {
          method: "PUT",
          headers: {
            "X-User-ID": String(user.id),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to cancel booking"
        );
      }

      setBookingMessage(
        `Booking #${bookingId} cancelled successfully.`
      );

      await fetchBookings(user.id);

    } catch (error) {
      console.error("Cancel booking error:", error);

      setBookingMessage(
        error.message || "Unable to cancel booking"
      );
    }
  };


  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = () => {
    if (!user) return;

    fetchUsers(user.id);
    fetchBookings(user.id);
    fetchNotificationCount(user.id);
  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };


  // =========================================================
  // STATISTICS
  // =========================================================

  const totalUsers = users.length;

  const totalCustomers = users.filter(
    (item) => item.role === "customer"
  ).length;

  const totalProviders = users.filter(
    (item) => item.role === "provider"
  ).length;

  const totalAdmins = users.filter(
    (item) => item.role === "admin"
  ).length;

  const totalBookings = bookings.length;

  const pendingBookings = bookings.filter(
    (item) => item.status === "Pending"
  ).length;

  const acceptedBookings = bookings.filter(
    (item) => item.status === "Accepted"
  ).length;

  const completedBookings = bookings.filter(
    (item) => item.status === "Completed"
  ).length;

  const rejectedBookings = bookings.filter(
    (item) => item.status === "Rejected"
  ).length;

  const cancelledBookings = bookings.filter(
    (item) => item.status === "Cancelled"
  ).length;


  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers = users.filter((userItem) => {
    const search = userSearchTerm.toLowerCase().trim();
    const matchesSearch = !search || (
      userItem.name?.toLowerCase().includes(search) ||
      userItem.email?.toLowerCase().includes(search) ||
      userItem.id.toString().includes(search)
    );

    const matchesStatus = userStatusFilter === "All" || 
      (userStatusFilter === "Active" && userItem.is_active === 1) ||
      (userStatusFilter === "Blocked" && userItem.is_active === 0);

    return matchesSearch && matchesStatus;
  });


  // =========================================================
  // FILTER BOOKINGS
  // =========================================================

  const filteredBookings = bookings.filter((booking) => {
    const search = bookingSearchTerm.toLowerCase().trim();
    const matchesSearch = !search || (
      booking.customer_name?.toLowerCase().includes(search) ||
      booking.provider_name?.toLowerCase().includes(search) ||
      booking.service?.toLowerCase().includes(search) ||
      booking.id.toString().includes(search)
    );

    const matchesStatus = bookingStatusFilter === "All" || booking.status === bookingStatusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && booking.date >= dateFrom;
    }
    if (dateTo) {
      matchesDate = matchesDate && booking.date <= dateTo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });


  // =========================================================
  // CHART DATA
  // =========================================================

  const pieChartData = {
    labels: ["Pending", "Accepted", "Completed", "Rejected", "Cancelled"],
    datasets: [
      {
        label: "Booking Status",
        data: [pendingBookings, acceptedBookings, completedBookings, rejectedBookings, cancelledBookings],
        backgroundColor: [
          "#fef3c7", // Pending - yellow
          "#dbeafe", // Accepted - blue
          "#dcfce7", // Completed - green
          "#ffedd5", // Rejected - orange
          "#fee2e2", // Cancelled - red
        ],
        borderColor: [
          "#92400e",
          "#1e40af",
          "#166534",
          "#c2410c",
          "#b91c1c",
        ],
        borderWidth: 2,
      },
    ],
  };

  const barChartData = {
    labels: ["Total", "Pending", "Accepted", "Completed", "Rejected", "Cancelled"],
    datasets: [
      {
        label: "Bookings",
        data: [totalBookings, pendingBookings, acceptedBookings, completedBookings, rejectedBookings, cancelledBookings],
        backgroundColor: [
          "#2563eb",
          "#fef3c7",
          "#dbeafe",
          "#dcfce7",
          "#ffedd5",
          "#fee2e2",
        ],
        borderColor: [
          "#1e3a8a",
          "#92400e",
          "#1e40af",
          "#166534",
          "#c2410c",
          "#b91c1c",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };


  // =========================================================
  // LOADING
  // =========================================================

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }


  // =========================================================
  // UI
  // =========================================================

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
          margin: "0 auto 30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            Admin Dashboard 🛡️
          </h1>

          <p
            style={{
              color: "#64748b",
              marginTop: "8px",
            }}
          >
            Manage ApnaMate users and platform activity.
          </p>

          <p
            style={{
              color: "#2563eb",
              marginTop: "5px",
              fontWeight: "bold",
            }}
          >
            Welcome, {user.name}
          </p>

        </div>


        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >

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
              position: "relative",
            }}
          >
            🔔 Notifications
            {notificationCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-8px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  borderRadius: "50%",
                  padding: "4px 8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {notificationCount}
              </span>
            )}
          </button>

          <button
            onClick={handleRefresh}
            style={headerButtonStyle("#2563eb")}
          >
            🔄 Refresh
          </button>

          <button
            onClick={handleLogout}
            style={headerButtonStyle("#dc2626")}
          >
            Logout
          </button>

        </div>
      </div>


      {/* USER STATISTICS */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 30px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >

        <div style={statCardStyle}>
          <h3>Total Users</h3>
          <p style={statNumberStyle}>{totalUsers}</p>
        </div>

        <div style={statCardStyle}>
          <h3>Customers</h3>
          <p style={statNumberStyle}>{totalCustomers}</p>
        </div>

        <div style={statCardStyle}>
          <h3>Providers</h3>
          <p style={statNumberStyle}>{totalProviders}</p>
        </div>

        <div style={statCardStyle}>
          <h3>Admins</h3>
          <p style={statNumberStyle}>{totalAdmins}</p>
        </div>

      </div>


      {/* BOOKING STATISTICS + CHARTS */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 30px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
        }}
      >

        <div style={bookingStatCardStyle}>
          <h3>Total Bookings</h3>
          <p style={statNumberStyle}>{totalBookings}</p>
        </div>

        <div style={bookingStatCardStyle}>
          <h3>Pending</h3>
          <p style={{ ...statNumberStyle, color: "#d97706" }}>
            {pendingBookings}
          </p>
        </div>

        <div style={bookingStatCardStyle}>
          <h3>Accepted</h3>
          <p style={{ ...statNumberStyle, color: "#2563eb" }}>
            {acceptedBookings}
          </p>
        </div>

        <div style={bookingStatCardStyle}>
          <h3>Completed</h3>
          <p style={{ ...statNumberStyle, color: "#16a34a" }}>
            {completedBookings}
          </p>
        </div>

        <div style={bookingStatCardStyle}>
          <h3>Rejected</h3>
          <p style={{ ...statNumberStyle, color: "#ea580c" }}>
            {rejectedBookings}
          </p>
        </div>

        <div style={bookingStatCardStyle}>
          <h3>Cancelled</h3>
          <p style={{ ...statNumberStyle, color: "#dc2626" }}>
            {cancelledBookings}
          </p>
        </div>

      </div>


      {/* CHARTS SECTION */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 30px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            height: "350px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#1e293b" }}>
            Booking Status Distribution
          </h3>
          <div style={{ height: "280px" }}>
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            height: "350px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#1e293b" }}>
            Booking Overview
          </h3>
          <div style={{ height: "280px" }}>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>


      {/* =====================================================
          ALL BOOKINGS WITH SEARCH, FILTER, AND EXPORT
      ===================================================== */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 40px",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h2 style={{ color: "#1e293b", margin: 0 }}>
            All Bookings 📋
          </h2>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={exportBookingsCSV}
              style={{
                padding: "8px 16px",
                backgroundColor: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              📤 Export Bookings
            </button>

            <span
              style={{
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
                padding: "8px 12px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              {totalBookings} Bookings
            </span>
          </div>
        </div>

        {/* BOOKING SEARCH AND FILTER */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search bookings by customer, provider, service, or ID..."
            value={bookingSearchTerm}
            onChange={(e) => setBookingSearchTerm(e.target.value)}
            style={{
              flex: 2,
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
              minWidth: "200px",
            }}
          />

          <select
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
              minWidth: "150px",
            }}
          >
            <option value="All">All Status</option>
            <option value="Pending">🟡 Pending</option>
            <option value="Accepted">🔵 Accepted</option>
            <option value="Completed">🟢 Completed</option>
            <option value="Rejected">🟠 Rejected</option>
            <option value="Cancelled">🔴 Cancelled</option>
          </select>

          <input
            type="date"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
              minWidth: "150px",
            }}
          />

          <input
            type="date"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
              minWidth: "150px",
            }}
          />

          {(bookingSearchTerm || bookingStatusFilter !== "All" || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setBookingSearchTerm("");
                setBookingStatusFilter("All");
                setDateFrom("");
                setDateTo("");
              }}
              style={{
                padding: "12px 18px",
                backgroundColor: "#e5e7eb",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* SHOWING COUNT */}

        {!bookingsLoading && bookings.length > 0 && (
          <p
            style={{
              marginBottom: "15px",
              color: "#64748b",
            }}
          >
            Showing <strong>{filteredBookings.length}</strong> booking
            {filteredBookings.length !== 1 ? "s" : ""}
            {filteredBookings.length !== bookings.length && (
              <span> (filtered from {bookings.length} total)</span>
            )}
          </p>
        )}

        {bookingMessage && (
          <div
            style={{
              backgroundColor:
                bookingMessage.includes("successfully")
                  ? "#dcfce7"
                  : "#fee2e2",
              color:
                bookingMessage.includes("successfully")
                  ? "#166534"
                  : "#b91c1c",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontWeight: "bold",
            }}
          >
            {bookingMessage}
          </div>
        )}


        {bookingsLoading ? (
          <div style={emptyCardStyle}>
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={emptyCardStyle}>
            <p>No bookings found matching your criteria.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                backgroundColor: "white",
                padding: "20px",
                marginBottom: "15px",
                borderRadius: "10px",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onClick={() => {
                setSelectedBooking(booking);
                setShowModal(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.01)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >

                <h3
                  style={{
                    margin: 0,
                    color: "#2563eb",
                  }}
                >
                  Booking #{booking.id}
                </h3>

                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontWeight: "bold",

                    backgroundColor:
                      booking.status === "Pending"
                        ? "#fef3c7"
                        : booking.status === "Accepted"
                        ? "#dbeafe"
                        : booking.status === "Completed"
                        ? "#dcfce7"
                        : booking.status === "Rejected"
                        ? "#ffedd5"
                        : booking.status === "Cancelled"
                        ? "#fee2e2"
                        : "#f1f5f9",

                    color:
                      booking.status === "Pending"
                        ? "#92400e"
                        : booking.status === "Accepted"
                        ? "#1e40af"
                        : booking.status === "Completed"
                        ? "#166534"
                        : booking.status === "Rejected"
                        ? "#c2410c"
                        : booking.status === "Cancelled"
                        ? "#b91c1c"
                        : "#475569",
                  }}
                >
                  {booking.status}
                </span>

              </div>


              <div
                style={{
                  marginTop: "15px",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "10px",
                }}
              >

                <p>
                  <strong>👤 Customer:</strong>{" "}
                  {booking.customer_name}
                </p>

                <p>
                  <strong>🔧 Provider:</strong>{" "}
                  {booking.provider_name}
                </p>

                <p>
                  <strong>🛠️ Service:</strong>{" "}
                  {booking.service}
                </p>

                <p>
                  <strong>📅 Date:</strong>{" "}
                  {booking.date}
                </p>

                <p>
                  <strong>⏰ Time:</strong>{" "}
                  {booking.time}
                </p>

                <p>
                  <strong>📍 Address:</strong>{" "}
                  {booking.address}
                </p>

              </div>


              <div
                style={{
                  marginTop: "10px",
                  padding: "15px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <strong>📝 Description:</strong>

                <p
                  style={{
                    marginBottom: 0,
                    color: "#475569",
                  }}
                >
                  {booking.description}
                </p>
              </div>


              {/* ADMIN CONTROLS */}

              <div
                style={{
                  marginTop: "15px",
                  paddingTop: "15px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
                onClick={(e) => e.stopPropagation()}
              >

                {/* DELETE BOOKING - Always visible */}

                <button
                  onClick={() =>
                    handleDeleteBooking(booking.id)
                  }
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#7f1d1d",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  🗑️ Delete Booking
                </button>

                {/* STATUS ACTIONS */}

                {booking.status === "Pending" && (

                  <>
                    <button
                      onClick={() =>
                        handleAcceptBooking(booking.id)
                      }
                      style={controlButtonStyle("#16a34a")}
                    >
                      ✅ Accept
                    </button>

                    <button
                      onClick={() =>
                        handleRejectBooking(booking.id)
                      }
                      style={controlButtonStyle("#f97316")}
                    >
                      ❌ Reject
                    </button>

                    <button
                      onClick={() =>
                        handleCancelBooking(booking.id)
                      }
                      style={controlButtonStyle("#dc2626")}
                    >
                      🚫 Cancel
                    </button>

                  </>
                )}


                {booking.status === "Accepted" && (

                  <button
                    onClick={() =>
                      handleCancelBooking(booking.id)
                    }
                    style={controlButtonStyle("#dc2626")}
                  >
                    🚫 Cancel Booking
                  </button>

                )}


                {booking.status === "Completed" && (
                  <div style={statusMessageStyle("#f0fdf4", "#166534")}>
                    ✅ Completed
                  </div>
                )}


                {booking.status === "Rejected" && (
                  <div style={statusMessageStyle("#fff7ed", "#c2410c")}>
                    ❌ Rejected
                  </div>
                )}


                {booking.status === "Cancelled" && (
                  <div style={statusMessageStyle("#fef2f2", "#b91c1c")}>
                    🚫 Cancelled
                  </div>
                )}

              </div>

            </div>
          ))
        )}

      </div>


      {/* =====================================================
          ALL USERS WITH SEARCH, FILTER, AND EXPORT
      ===================================================== */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h2 style={{ color: "#1e293b" }}>
            All Users 👥
          </h2>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={exportUsersCSV}
              style={{
                padding: "8px 16px",
                backgroundColor: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              📤 Export Users
            </button>

            <span
              style={{
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
                padding: "8px 12px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              {totalUsers} Users
            </span>
          </div>
        </div>

        {/* USER SEARCH AND FILTER */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="🔍 Search users by name, email, or ID..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            style={{
              flex: 2,
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
              minWidth: "200px",
            }}
          />

          <select
            value={userStatusFilter}
            onChange={(e) => setUserStatusFilter(e.target.value)}
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
              minWidth: "150px",
            }}
          >
            <option value="All">All Status</option>
            <option value="Active">🟢 Active</option>
            <option value="Blocked">🔴 Blocked</option>
          </select>

          {(userSearchTerm || userStatusFilter !== "All") && (
            <button
              onClick={() => {
                setUserSearchTerm("");
                setUserStatusFilter("All");
              }}
              style={{
                padding: "12px 18px",
                backgroundColor: "#e5e7eb",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* SHOWING COUNT */}

        {!loading && users.length > 0 && (
          <p
            style={{
              marginBottom: "15px",
              color: "#64748b",
            }}
          >
            Showing <strong>{filteredUsers.length}</strong> user
            {filteredUsers.length !== 1 ? "s" : ""}
            {filteredUsers.length !== users.length && (
              <span> (filtered from {users.length} total)</span>
            )}
          </p>
        )}

        {/* USER MESSAGE */}

        {message && (
          <div
            style={{
              backgroundColor:
                message.includes("successfully")
                  ? "#dcfce7"
                  : "#fee2e2",

              color:
                message.includes("successfully")
                  ? "#166534"
                  : "#b91c1c",

              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontWeight: "bold",
            }}
          >
            {message}
          </div>
        )}


        {loading ? (

          <div style={emptyCardStyle}>
            <p>Loading users...</p>
          </div>

        ) : filteredUsers.length === 0 ? (

          <div style={emptyCardStyle}>
            <p>No users found matching your criteria.</p>
          </div>

        ) : (

          filteredUsers.map((item) => (

            <div
              key={item.id}
              style={{
                backgroundColor: "white",
                padding: "20px",
                marginBottom: "15px",
                borderRadius: "10px",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >

                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: "10px",
                    color: "#2563eb",
                  }}
                >
                  {item.name}
                </h3>


                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >

                  {/* ROLE */}

                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",

                      backgroundColor:
                        item.role === "provider"
                          ? "#dcfce7"
                          : item.role === "admin"
                          ? "#fef3c7"
                          : "#dbeafe",

                      color:
                        item.role === "provider"
                          ? "#166534"
                          : item.role === "admin"
                          ? "#92400e"
                          : "#1e40af",

                      fontWeight: "bold",
                      textTransform: "capitalize",
                    }}
                  >
                    {item.role}
                  </span>


                  {/* ACCOUNT STATUS */}

                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      backgroundColor:
                        item.is_active === 0
                          ? "#fee2e2"
                          : "#dcfce7",
                      color:
                        item.is_active === 0
                          ? "#b91c1c"
                          : "#166534",
                      fontWeight: "bold",
                    }}
                  >
                    {item.is_active === 0
                      ? "Blocked"
                      : "Active"}
                  </span>

                </div>

              </div>


              <p>
                <strong>Email:</strong>{" "}
                {item.email}
              </p>


              <p>
                <strong>User ID:</strong>{" "}
                {item.id}
              </p>


              {/* PROVIDER DETAILS */}

              {item.role === "provider" && (

                <div
                  style={{
                    marginTop: "15px",
                    padding: "15px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                  }}
                >

                  <h4
                    style={{
                      marginTop: 0,
                      color: "#334155",
                    }}
                  >
                    Provider Details
                  </h4>


                  <p>
                    <strong>Service:</strong>{" "}
                    {item.service || "Not specified"}
                  </p>


                  <p>
                    <strong>Location:</strong>{" "}
                    {item.location || "Not specified"}
                  </p>


                  <p>
                    <strong>Experience:</strong>{" "}
                    {item.experience || "Not specified"}
                  </p>


                  <p>
                    <strong>Price:</strong>{" "}
                    {item.price || "Not specified"}
                  </p>


                  <p>
                    <strong>Availability:</strong>{" "}
                    {item.availability || "Available"}
                  </p>

                </div>
              )}


              {/* =================================================
                  BLOCK / UNBLOCK / DELETE BUTTONS
              ================================================= */}

              {item.role !== "admin" && (

                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "15px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >

                  {/* DELETE USER */}

                  <button
                    onClick={() =>
                      handleDeleteUser(
                        item.id,
                        item.name
                      )
                    }
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "#7f1d1d",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    🗑️ Delete User
                  </button>

                  {/* BLOCK / UNBLOCK */}

                  {item.is_active === 0 ? (

                    <button
                      onClick={() =>
                        handleUnblockUser(
                          item.id,
                          item.name
                        )
                      }
                      style={controlButtonStyle("#16a34a")}
                    >
                      🔓 Unblock User
                    </button>

                  ) : (

                    <button
                      onClick={() =>
                        handleBlockUser(
                          item.id,
                          item.name
                        )
                      }
                      style={controlButtonStyle("#dc2626")}
                    >
                      🔒 Block User
                    </button>

                  )}

                </div>

              )}

            </div>

          ))
        )}

      </div>


      {/* =====================================================
          BOOKING DETAILS MODAL
      ===================================================== */}

      {showModal && selectedBooking && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => {
            setShowModal(false);
            setSelectedBooking(null);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "12px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0, color: "#2563eb" }}>
                Booking Details
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedBooking(null);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <p><strong>Booking ID:</strong> #{selectedBooking.id}</p>
              <p><strong>Service:</strong> {selectedBooking.service}</p>
              <p><strong>Status:</strong> {selectedBooking.status}</p>
            </div>

            <hr style={{ margin: "15px 0" }} />

            <div style={{ marginBottom: "15px" }}>
              <h4 style={{ color: "#334155" }}>Customer Information</h4>
              <p><strong>Name:</strong> {selectedBooking.customer_name}</p>
              <p><strong>Customer ID:</strong> {selectedBooking.customer_id}</p>
            </div>

            <hr style={{ margin: "15px 0" }} />

            <div style={{ marginBottom: "15px" }}>
              <h4 style={{ color: "#334155" }}>Provider Information</h4>
              <p><strong>Name:</strong> {selectedBooking.provider_name}</p>
              <p><strong>Provider ID:</strong> {selectedBooking.provider_id}</p>
            </div>

            <hr style={{ margin: "15px 0" }} />

            <div style={{ marginBottom: "15px" }}>
              <h4 style={{ color: "#334155" }}>Booking Details</h4>
              <p><strong>Date:</strong> {selectedBooking.date}</p>
              <p><strong>Time:</strong> {selectedBooking.time}</p>
              <p><strong>Address:</strong> {selectedBooking.address}</p>
            </div>

            <hr style={{ margin: "15px 0" }} />

            <div>
              <h4 style={{ color: "#334155" }}>Description</h4>
              <p>{selectedBooking.description}</p>
            </div>

            <div
              style={{
                marginTop: "20px",
                paddingTop: "15px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {selectedBooking.status === "Pending" && (
                <>
                  <button
                    onClick={() => {
                      handleAcceptBooking(selectedBooking.id);
                      setShowModal(false);
                    }}
                    style={controlButtonStyle("#16a34a")}
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={() => {
                      handleRejectBooking(selectedBooking.id);
                      setShowModal(false);
                    }}
                    style={controlButtonStyle("#f97316")}
                  >
                    ❌ Reject
                  </button>
                </>
              )}
              {(selectedBooking.status === "Pending" || selectedBooking.status === "Accepted") && (
                <button
                  onClick={() => {
                    handleCancelBooking(selectedBooking.id);
                    setShowModal(false);
                  }}
                  style={controlButtonStyle("#dc2626")}
                >
                  🚫 Cancel
                </button>
              )}
              <button
                onClick={() => {
                  handleDeleteBooking(selectedBooking.id);
                  setShowModal(false);
                }}
                style={{
                  padding: "10px 18px",
                  backgroundColor: "#7f1d1d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const headerButtonStyle = (backgroundColor) => ({
  padding: "10px 18px",
  backgroundColor,
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
});


const controlButtonStyle = (backgroundColor) => ({
  padding: "10px 18px",
  backgroundColor,
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
});


const statusMessageStyle = (
  backgroundColor,
  color
) => ({
  marginTop: "15px",
  padding: "10px",
  backgroundColor,
  color,
  borderRadius: "6px",
  textAlign: "center",
  fontWeight: "bold",
});


const emptyCardStyle = {
  backgroundColor: "white",
  padding: "30px",
  borderRadius: "10px",
  textAlign: "center",
};


const statCardStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};


const bookingStatCardStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "10px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  borderTop: "4px solid #2563eb",
};


const statNumberStyle = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#2563eb",
  margin: "10px 0 0",
};


export default AdminDashboard;