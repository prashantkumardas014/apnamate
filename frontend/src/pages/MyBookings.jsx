// src/pages/MyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import PaymentModal from "../components/Payment/PaymentModal";
/* eslint-disable react/set-state-in-effect, react/immutability */

function MyBookings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // Payment states
  const [showPayment, setShowPayment] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentStatuses, setPaymentStatuses] = useState({});

  // ✅ Quote action state
  const [quoteActionId, setQuoteActionId] = useState(null);

  // Booking history filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Review states
  const [reviewStates, setReviewStates] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewedBookings, setReviewedBookings] = useState({});

  // ==============================
  // LOAD BOOKINGS
  // ==============================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const loggedInUser = JSON.parse(storedUser);
      setUser(loggedInUser);
      fetchBookings(loggedInUser.id);
    } catch (error) {
      console.error("Error parsing user:", error);
      navigate("/login");
    }
  }, [navigate]);

  const fetchBookings = async (userId) => {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("accessToken");

      if (!token) {
        setMessage("Please login again.");
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/bookings/my-bookings/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to load bookings");
      }

      const data = await response.json();
      console.log("📦 Bookings data:", data);

      if (data.success) {
        const bookingsData = data.bookings || [];
        setBookings(bookingsData);

        await checkPaymentStatus(bookingsData);

        const initialReviewStates = {};
        bookingsData.forEach(booking => {
          initialReviewStates[booking.id] = {
            rating: "",
            comment: ""
          };
        });
        setReviewStates(initialReviewStates);

        await checkReviewStatus(bookingsData);
      } else {
        setBookings([]);
        setMessage(data.message || "No bookings found");
      }

    } catch (error) {
      console.error("Booking error:", error);
      setMessage(error.message || "Unable to load bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // CHECK PAYMENT STATUS
  // ==============================

  const checkPaymentStatus = async (bookingsList) => {
    const paymentStatus = {};
    const token = localStorage.getItem("accessToken");

    if (!token) {
      console.warn("No access token found");
      return;
    }

    for (const booking of bookingsList) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/bookings/payments/booking/${booking.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          paymentStatus[booking.id] = data.has_payment && data.payment?.status === "completed";
          console.log(`Booking ${booking.id} has payment: ${paymentStatus[booking.id]}`);
        } else {
          paymentStatus[booking.id] = false;
        }
      } catch (error) {
        console.error(`Error checking payment for booking ${booking.id}:`, error);
        paymentStatus[booking.id] = false;
      }
    }

    setPaymentStatuses(paymentStatus);
  };

  // ==============================
  // CHECK REVIEW STATUS
  // ==============================

  const checkReviewStatus = async (bookingsList) => {
    const reviewed = {};
    const token = localStorage.getItem("accessToken");

    if (!token) {
      console.warn("No access token found");
      return;
    }

    for (const booking of bookingsList) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/bookings/reviews/booking/${booking.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          reviewed[booking.id] = data.has_reviewed || false;
        } else {
          reviewed[booking.id] = false;
        }
      } catch (error) {
        console.error(`Error checking review for booking ${booking.id}:`, error);
        reviewed[booking.id] = false;
      }
    }

    setReviewedBookings(reviewed);
  };

  // ==============================
  // ✅ NEW: ACCEPT QUOTE (then open payment)
  // ==============================

  const acceptQuote = async (booking) => {
    if (!booking?.quoted_amount) {
      setMessage("No quote to accept.");
      return;
    }

    setQuoteActionId(booking.id);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        `${API_BASE_URL}/bookings/${booking.id}/quote/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to accept quote");
      }

      setMessage(`✅ Quote of ₹${booking.quoted_amount} accepted! Proceeding to payment...`);

      // Open payment modal with the quoted amount
      setSelectedBooking({
        ...booking,
        price: String(booking.quoted_amount),
        quoted_amount: booking.quoted_amount,
      });
      setShowPayment(true);

      // Refresh in background so card updates to "accepted"
      fetchBookings(user.id);
    } catch (error) {
      console.error("Accept quote error:", error);
      setMessage(error.message || "Unable to accept quote.");
    } finally {
      setQuoteActionId(null);
    }
  };

  // ==============================
  // ✅ NEW: REJECT QUOTE
  // ==============================

  const rejectQuote = async (booking) => {
    const reason = window.prompt(
      "Reason for rejecting this quote (optional):",
      ""
    );

    // User clicked cancel
    if (reason === null) return;

    setQuoteActionId(booking.id);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");

      const url = new URL(
        `${API_BASE_URL}/bookings/${booking.id}/quote/reject`
      );
      if (reason.trim()) {
        url.searchParams.set("reason", reason.trim());
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to reject quote");
      }

      setMessage("❌ Quote rejected. The provider has been notified.");
      await fetchBookings(user.id);
    } catch (error) {
      console.error("Reject quote error:", error);
      setMessage(error.message || "Unable to reject quote.");
    } finally {
      setQuoteActionId(null);
    }
  };

  // ==============================
  // HANDLE RATING CHANGE
  // ==============================

  const handleRatingChange = (bookingId, value) => {
    setReviewStates(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        rating: value
      }
    }));
  };

  // ==============================
  // HANDLE COMMENT CHANGE
  // ==============================

  const handleCommentChange = (bookingId, value) => {
    setReviewStates(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        comment: value
      }
    }));
  };

  // ==============================
  // CANCEL BOOKING
  // ==============================

  const handleCancelBooking = async (bookingId) => {
    if (!user) {
      setMessage("Please login to cancel bookings.");
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmCancel) return;

    setCancellingId(bookingId);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to cancel booking");
      }

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: "cancelled" }
            : booking
        )
      );

      setMessage("Booking cancelled successfully! ✅");

      setTimeout(() => {
        fetchBookings(user.id);
      }, 1000);

    } catch (error) {
      console.error("Cancellation error:", error);
      setMessage(error.message || "Unable to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  // ==============================
  // SUBMIT REVIEW
  // ==============================

  const submitReview = async (bookingId) => {
    const reviewState = reviewStates[bookingId] || { rating: "", comment: "" };
    const rating = reviewState.rating;
    const comment = reviewState.comment;

    if (!user) {
      setMessage("Please login to submit a review.");
      return;
    }

    if (!rating) {
      setMessage("Please select a rating.");
      return;
    }

    if (!comment || !comment.trim()) {
      setMessage("Please write a review comment.");
      return;
    }

    setReviewingId(bookingId);
    setMessage("");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found. Please login again.");

      const requestBody = {
        booking_id: bookingId,
        rating: parseInt(rating),
        comment: comment.trim(),
      };

      const response = await fetch(
        `${API_BASE_URL}/bookings/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = "Unable to submit review.";
        if (response.status === 403) {
          errorMsg = data.detail || "You don't have permission to review this booking.";
        } else if (response.status === 404) {
          errorMsg = "Booking not found.";
        } else if (response.status === 400) {
          errorMsg = data.detail || "Invalid review data.";
        } else if (response.status === 401) {
          errorMsg = "Your session has expired. Please login again.";
          localStorage.removeItem("accessToken");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          errorMsg = data.detail || data.message || "Unable to submit review.";
        }
        throw new Error(errorMsg);
      }

      setMessage("✅ Review submitted successfully! ⭐");

      setReviewStates(prev => ({
        ...prev,
        [bookingId]: { rating: "", comment: "" }
      }));

      setReviewedBookings(prev => ({
        ...prev,
        [bookingId]: true
      }));

      await fetchBookings(user.id);
    } catch (error) {
      console.error("❌ Review error:", error);
      setMessage(error.message || "Unable to submit review.");
    } finally {
      setReviewingId(null);
    }
  };

  // ==============================
  // STATUS HELPERS (support both new + legacy)
  // ==============================

  const normalizeStatus = (s) => (s || "pending_quote").toLowerCase().replace(/\s+/g, "_");

  const isPendingQuoteStatus = (s) => {
    const n = normalizeStatus(s);
    return n === "pending_quote" || n === "pending";
  };

  const isQuotedStatus = (s) => normalizeStatus(s) === "quoted";

  const isAcceptedStatus = (s) => {
    const n = normalizeStatus(s);
    return n === "accepted" || n === "confirmed";
  };

  const isPaidStatus = (s) => normalizeStatus(s) === "paid";

  const isCompletedStatus = (s) => {
    const n = normalizeStatus(s);
    return n === "completed";
  };

  const isRejectedStatus = (s) => normalizeStatus(s) === "rejected";

  const isCancelledStatus = (s) => normalizeStatus(s) === "cancelled";

  const getStatusStyle = (status) => {
    const n = normalizeStatus(status);
    const styles = {
      "pending_quote": { backgroundColor: "#fef3c7", color: "#92400e" },
      "pending": { backgroundColor: "#fef3c7", color: "#92400e" },
      "quoted": { backgroundColor: "#e0e7ff", color: "#3730a3" },
      "accepted": { backgroundColor: "#dbeafe", color: "#1e40af" },
      "confirmed": { backgroundColor: "#dbeafe", color: "#1e40af" },
      "paid": { backgroundColor: "#dcfce7", color: "#166534" },
      "completed": { backgroundColor: "#dcfce7", color: "#166534" },
      "rejected": { backgroundColor: "#fee2e2", color: "#991b1b" },
      "cancelled": { backgroundColor: "#f3f4f6", color: "#4b5563" },
    };
    return styles[n] || styles["pending_quote"];
  };

  const getStatusIcon = (status) => {
    const n = normalizeStatus(status);
    const icons = {
      "pending_quote": "⏳",
      "pending": "🟡",
      "quoted": "💰",
      "accepted": "✅",
      "confirmed": "🔵",
      "paid": "💵",
      "completed": "🟢",
      "rejected": "🔴",
      "cancelled": "⚫",
    };
    return icons[n] || "🟡";
  };

  const getStatusLabel = (status) => {
    const n = normalizeStatus(status);
    const labels = {
      "pending_quote": "Pending Quote",
      "pending": "Pending",
      "quoted": "Quoted",
      "accepted": "Accepted",
      "confirmed": "Confirmed",
      "paid": "Paid",
      "completed": "Completed",
      "rejected": "Rejected",
      "cancelled": "Cancelled",
    };
    return labels[n] || status;
  };

  // ==============================
  // BOOKING COUNTS
  // ==============================

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => isPendingQuoteStatus(b.status)).length;
  const quotedBookings = bookings.filter((b) => isQuotedStatus(b.status)).length;
  const acceptedBookings = bookings.filter((b) => isAcceptedStatus(b.status)).length;
  const paidBookings = bookings.filter((b) => isPaidStatus(b.status)).length;
  const completedBookings = bookings.filter((b) => isCompletedStatus(b.status)).length;
  const rejectedBookings = bookings.filter((b) => isRejectedStatus(b.status)).length;
  const cancelledBookings = bookings.filter((b) => isCancelledStatus(b.status)).length;

  // ==============================
  // FILTER BOOKINGS
  // ==============================

  const filteredBookings = bookings
    .filter((booking) => {
      if (statusFilter === "All") return true;
      const n = normalizeStatus(booking.status);
      if (statusFilter === "Pending") return n === "pending_quote" || n === "pending";
      if (statusFilter === "Quoted") return n === "quoted";
      if (statusFilter === "Accepted") return n === "accepted" || n === "confirmed";
      if (statusFilter === "Paid") return n === "paid";
      if (statusFilter === "Completed") return n === "completed";
      if (statusFilter === "Rejected") return n === "rejected";
      if (statusFilter === "Cancelled") return n === "cancelled";
      return n === statusFilter.toLowerCase();
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // ==============================
  // LOGOUT
  // ==============================

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  };

  // ==============================
  // RENDER
  // ==============================

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
          backgroundColor: "#2563eb",
          color: "white",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <h2 style={{ margin: 0, cursor: "pointer" }} onClick={() => window.location.href = "/"}>
          🔧 ApnaMate
        </h2>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => window.location.href = "/dashboard"}
            style={{
              padding: "10px 18px",
              backgroundColor: "white",
              color: "#2563eb",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📊 Dashboard
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "10px 18px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <button
          type="button"
          onClick={() => window.location.href = "/dashboard"}
          style={{
            padding: "10px 18px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
            fontWeight: "bold",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ marginBottom: "5px" }}>My Bookings</h1>
        <p style={{ color: "#666", marginTop: "5px" }}>
          View and manage your complete booking history.
        </p>

        {/* Message */}
        {message && (
          <div
            style={{
              padding: "12px",
              marginTop: "20px",
              backgroundColor:
                message.includes("Unable") || message.includes("failed") || message.includes("Please") || message.includes("permission")
                  ? "#fee2e2"
                  : "#dcfce7",
              color:
                message.includes("Unable") || message.includes("failed") || message.includes("Please") || message.includes("permission")
                  ? "#991b1b"
                  : "#166534",
              borderRadius: "6px",
              fontWeight: "bold",
              borderLeft: `4px solid ${
                message.includes("Unable") || message.includes("failed") || message.includes("Please") || message.includes("permission")
                  ? "#dc2626"
                  : "#22c55e"
              }`,
            }}
          >
            {message}
          </div>
        )}

        {/* Booking Summary */}
        {!loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
              marginTop: "25px",
            }}
          >
            <SummaryCard icon="📋" count={totalBookings} label="Total" />
            <SummaryCard icon="⏳" count={pendingBookings} label="Pending Quote" />
            <SummaryCard icon="💰" count={quotedBookings} label="Quoted" />
            <SummaryCard icon="✅" count={acceptedBookings} label="Accepted" />
            <SummaryCard icon="💵" count={paidBookings} label="Paid" />
            <SummaryCard icon="🟢" count={completedBookings} label="Completed" />
            <SummaryCard icon="🔴" count={rejectedBookings} label="Rejected" />
            <SummaryCard icon="⚫" count={cancelledBookings} label="Cancelled" />
          </div>
        )}

        {/* Filters */}
        {!loading && bookings.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              marginTop: "30px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label>
                  <strong>Filter by Status</strong>
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="All">All Bookings</option>
                  <option value="Pending">⏳ Pending Quote</option>
                  <option value="Quoted">💰 Quoted</option>
                  <option value="Accepted">✅ Accepted</option>
                  <option value="Paid">💵 Paid</option>
                  <option value="Completed">🟢 Completed</option>
                  <option value="Rejected">🔴 Rejected</option>
                  <option value="Cancelled">⚫ Cancelled</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "200px" }}>
                <label>
                  <strong>Sort Bookings</strong>
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "150px", paddingTop: "25px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("All");
                    setSortOrder("newest");
                  }}
                  style={{
                    width: "100%",
                    padding: "11px",
                    backgroundColor: "#e5e7eb",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <p style={{ marginBottom: 0, marginTop: "15px", color: "#666" }}>
              Showing <strong>{filteredBookings.length}</strong> booking
              {filteredBookings.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              marginTop: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div
              className="spinner"
              style={{
                width: "48px",
                height: "48px",
                border: "4px solid #e5e7eb",
                borderTopColor: "#2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            ></div>
            <h2>Loading bookings...</h2>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* No Bookings */}
        {!loading && bookings.length === 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              marginTop: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "50px" }}>📋</div>
            <h2>No bookings yet</h2>
            <p>You haven't booked any services yet.</p>
            <button
              type="button"
              onClick={() => window.location.href = "/services"}
              style={{
                padding: "12px 20px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Book a Service
            </button>
          </div>
        )}

        {/* No Filter Results */}
        {!loading && bookings.length > 0 && filteredBookings.length === 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              marginTop: "20px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "45px" }}>🔍</div>
            <h2>No matching bookings</h2>
            <p>There are no bookings with the selected status.</p>
            <button
              type="button"
              onClick={() => setStatusFilter("All")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Show All Bookings
            </button>
          </div>
        )}

        {/* Bookings List */}
        {!loading &&
          filteredBookings.length > 0 &&
          filteredBookings.map((booking) => {
            const isReviewed = reviewedBookings[booking.id] || false;
            const isCompleted = isCompletedStatus(booking.status);
            const isPendingQuote = isPendingQuoteStatus(booking.status);
            const isQuoted = isQuotedStatus(booking.status);
            const isAccepted = isAcceptedStatus(booking.status);
            const isPaid = isPaidStatus(booking.status);
            const isRejected = isRejectedStatus(booking.status);
            const isCancelled = isCancelledStatus(booking.status);
            const hasPayment = paymentStatuses[booking.id] || false;
            const reviewState = reviewStates[booking.id] || { rating: "", comment: "" };
            const isSubmitting = reviewingId === booking.id;
            const isQuoteBusy = quoteActionId === booking.id;

            return (
              <div
                key={booking.id}
                style={{
                  backgroundColor: "white",
                  padding: "25px",
                  marginTop: "20px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                {/* HEADER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, marginBottom: "8px" }}>{booking.service}</h2>
                    <span style={{ color: "#666", fontSize: "14px" }}>Booking #{booking.id}</span>
                  </div>

                  <span
                    style={{
                      ...getStatusStyle(booking.status),
                      padding: "7px 14px",
                      borderRadius: "20px",
                      fontWeight: "bold",
                    }}
                  >
                    {getStatusIcon(booking.status)} {getStatusLabel(booking.status)}
                  </span>
                </div>

                <hr
                  style={{
                    margin: "20px 0",
                    border: "none",
                    borderTop: "1px solid #eee",
                  }}
                />

                {/* BOOKING DETAILS */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>👨‍🔧 Provider:</strong> {booking.provider_name}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>📅 Date:</strong> {booking.date}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>🕐 Time:</strong> {booking.time}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>📍 Address:</strong> {booking.address}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    padding: "15px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                  }}
                >
                  <strong>Problem Description</strong>
                  <p style={{ marginBottom: 0, color: "#555" }}>{booking.description}</p>
                </div>

                {/* ✅ NEW: QUOTE CARD */}
                {isQuoted && booking.quoted_amount && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "20px",
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      borderRadius: "10px",
                      border: "2px solid #f59e0b",
                    }}
                  >
                    <h3 style={{ margin: "0 0 8px 0", color: "#92400e" }}>
                      💰 Provider Sent a Quote
                    </h3>
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                        color: "#78350f",
                        margin: "10px 0",
                      }}
                    >
                      ₹{booking.quoted_amount}
                    </div>
                    {booking.quote_note && (
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "#78350f",
                          fontStyle: "italic",
                          padding: "10px",
                          backgroundColor: "rgba(255,255,255,0.5)",
                          borderRadius: "6px",
                        }}
                      >
                        "{booking.quote_note}"
                      </p>
                    )}
                    <p style={{ color: "#92400e", fontSize: "13px", marginTop: "10px" }}>
                      Accept the quote to proceed to payment.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "15px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        disabled={isQuoteBusy}
                        onClick={() => acceptQuote(booking)}
                        style={{
                          flex: 1,
                          minWidth: "150px",
                          padding: "14px 20px",
                          backgroundColor: isQuoteBusy ? "#94a3b8" : "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: isQuoteBusy ? "not-allowed" : "pointer",
                          fontWeight: "bold",
                          fontSize: "16px",
                        }}
                      >
                        {isQuoteBusy ? "Processing..." : `✅ Accept & Pay ₹${booking.quoted_amount}`}
                      </button>

                      <button
                        type="button"
                        disabled={isQuoteBusy}
                        onClick={() => rejectQuote(booking)}
                        style={{
                          padding: "14px 20px",
                          backgroundColor: isQuoteBusy ? "#94a3b8" : "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: isQuoteBusy ? "not-allowed" : "pointer",
                          fontWeight: "bold",
                          fontSize: "16px",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* ✅ ACCEPTED — show quoted amount + Pay Now */}
                {isAccepted && booking.quoted_amount && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "16px",
                      backgroundColor: "#dbeafe",
                      borderRadius: "8px",
                      borderLeft: "4px solid #2563eb",
                    }}
                  >
                    <p style={{ margin: 0, color: "#1e40af", fontWeight: "bold" }}>
                      ✅ Quote accepted — ₹{booking.quoted_amount}
                    </p>
                    <p style={{ margin: "4px 0 0", color: "#1e40af", fontSize: "14px" }}>
                      Complete payment to confirm your booking.
                    </p>
                  </div>
                )}

                {/* ✅ PAYMENT BUTTON — only for accepted bookings without payment */}
                {isAccepted && !hasPayment && (
                  <div style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBooking({
                          ...booking,
                          price: String(booking.quoted_amount || 0),
                          quoted_amount: booking.quoted_amount,
                        });
                        setShowPayment(true);
                      }}
                      style={{
                        padding: "12px 20px",
                        backgroundColor: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      💳 Pay ₹{booking.quoted_amount}
                    </button>
                  </div>
                )}

                {/* ✅ PAYMENT COMPLETED */}
                {(hasPayment || isPaid) && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      backgroundColor: "#dbeafe",
                      color: "#1e40af",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ✅ Payment completed
                    {booking.quoted_amount ? ` — ₹${booking.quoted_amount}` : ""}
                  </div>
                )}

                {/* ✅ PENDING QUOTE MESSAGE */}
                {isPendingQuote && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ⏳ Waiting for provider to send a quote...
                  </div>
                )}

                {/* CANCEL BUTTON — hide once paid */}
                {(isPendingQuote || isAccepted) && (
                  <button
                    type="button"
                    disabled={cancellingId === booking.id}
                    onClick={() => handleCancelBooking(booking.id)}
                    style={{
                      padding: "12px 20px",
                      marginTop: "20px",
                      backgroundColor: cancellingId === booking.id ? "#9ca3af" : "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: cancellingId === booking.id ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {cancellingId === booking.id ? "Cancelling..." : "Cancel Booking"}
                  </button>
                )}

                {/* COMPLETED — Review Section */}
                {isCompleted && (
                  <>
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "12px",
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        borderRadius: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      ✓ Service completed
                    </div>

                    {!isReviewed ? (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "20px",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          backgroundColor: "#fafafa",
                        }}
                      >
                        <h3 style={{ marginTop: 0 }}>⭐ Rate Provider</h3>

                        <select
                          value={reviewState.rating}
                          onChange={(e) => handleRatingChange(booking.id, e.target.value)}
                          disabled={isSubmitting}
                          style={{
                            width: "100%",
                            padding: "10px",
                            marginBottom: "10px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="">Select Rating</option>
                          <option value="1">⭐ 1 Star</option>
                          <option value="2">⭐⭐ 2 Stars</option>
                          <option value="3">⭐⭐⭐ 3 Stars</option>
                          <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                          <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                        </select>

                        <textarea
                          placeholder="Write your review..."
                          value={reviewState.comment}
                          onChange={(e) => handleCommentChange(booking.id, e.target.value)}
                          disabled={isSubmitting}
                          rows="4"
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            resize: "vertical",
                            boxSizing: "border-box",
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => submitReview(booking.id)}
                          disabled={isSubmitting}
                          style={{
                            marginTop: "10px",
                            padding: "10px 20px",
                            backgroundColor: isSubmitting ? "#9ca3af" : "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "15px",
                          padding: "15px",
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                          borderRadius: "8px",
                          fontWeight: "bold",
                        }}
                      >
                        ⭐ You already reviewed this booking
                      </div>
                    )}
                  </>
                )}

                {/* REJECTED */}
                {isRejected && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      backgroundColor: "#fee2e2",
                      color: "#991b1b",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ✕ Booking rejected
                    {booking.rejection_reason ? ` — ${booking.rejection_reason}` : ""}
                  </div>
                )}

                {/* CANCELLED */}
                {isCancelled && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#4b5563",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ✓ Booking cancelled
                  </div>
                )}
              </div>
            );
          })}
      </main>

      {/* ✅ PAYMENT MODAL */}
      {showPayment && selectedBooking && (
        <PaymentModal
          booking={selectedBooking}
          onClose={() => {
            setShowPayment(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            setShowPayment(false);
            setSelectedBooking(null);
            fetchBookings(user?.id);
            setMessage("✅ Payment successful! Booking confirmed.");
          }}
        />
      )}
    </div>
  );
}

// =========================================================
// SMALL HELPER COMPONENT
// =========================================================

function SummaryCard({ icon, count, label }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "28px" }}>{icon}</div>
      <h2 style={{ margin: "8px 0" }}>{count}</h2>
      <p style={{ margin: 0, color: "#666" }}>{label}</p>
    </div>
  );
}

export default MyBookings;