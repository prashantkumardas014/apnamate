// src/pages/MyBookings.jsx
import { useEffect, useState, useCallback } from "react";
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
  const [messageType, setMessageType] = useState("info");
  const [cancellingId, setCancellingId] = useState(null);
  const [downloadingBillId, setDownloadingBillId] = useState(null);

  // Payment states
  const [showPayment, setShowPayment] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentStatuses, setPaymentStatuses] = useState({});

  // Quote action state
  const [quoteActionId, setQuoteActionId] = useState(null);

  // Booking history filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Review states
  const [reviewStates, setReviewStates] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewedBookings, setReviewedBookings] = useState({});

  // ==============================
  // MESSAGE HELPER
  // ==============================
  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
    if (type !== "error") {
      setTimeout(() => setMessage(""), 5000);
    }
  };

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

  // ✅ Auto-refresh every 30s while page is visible
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchBookings(user.id, { silent: true });
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchBookings = useCallback(
    async (userId, opts = {}) => {
      const silent = opts.silent === true;
      try {
        if (!silent) setLoading(true);
        // ✅ CLEAR stale errors on every fetch
        if (!silent) {
          setMessage("");
        }

        const token = localStorage.getItem("accessToken");
        if (!token) {
          showMessage("Please login again.", "error");
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
        if (data.success) {
          // ✅ Defensive: filter out malformed bookings
          const rawList = data.bookings || [];
          const bookingsData = rawList.filter(
            (b) => b && typeof b.id !== "undefined" && b.id !== null
          );
          setBookings(bookingsData);
          await checkPaymentStatus(bookingsData);

          const initialReviewStates = {};
          bookingsData.forEach((booking) => {
            initialReviewStates[booking.id] = { rating: "", comment: "" };
          });
          setReviewStates(initialReviewStates);

          // ✅ Reset reviewedBookings BEFORE re-checking (fresh state)
          setReviewedBookings({});
          await checkReviewStatus(bookingsData);
        } else {
          setBookings([]);
          if (!silent) showMessage(data.message || "No bookings found", "info");
        }
      } catch (error) {
        console.error("Booking error:", error);
        if (!silent) showMessage(error.message || "Unable to load bookings.", "error");
        setBookings([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [navigate] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ==============================
  // CHECK PAYMENT STATUS
  // ==============================
  const checkPaymentStatus = async (bookingsList) => {
    const paymentStatus = {};
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    for (const booking of bookingsList) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/bookings/payments/booking/${booking.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          paymentStatus[booking.id] =
            data.has_payment && data.payment?.status === "completed";
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
    if (!token) return;
    for (const booking of bookingsList) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/bookings/reviews/booking/${booking.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
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
  // DOWNLOAD BILL (PDF)
  // ==============================
  const downloadBill = async (bookingId) => {
    setDownloadingBillId(bookingId);
    try {
      const token = localStorage.getItem("accessToken");

      const infoRes = await fetch(
        `${API_BASE_URL}/bookings/payments/bills/booking/${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!infoRes.ok) {
        if (infoRes.status === 404) {
          try {
            await fetch(`${API_BASE_URL}/bookings/payments/bills/all`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (bfErr) {
            console.warn("Auto-backfill attempt failed:", bfErr);
          }

          const retry = await fetch(
            `${API_BASE_URL}/bookings/payments/bills/booking/${bookingId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!retry.ok) {
            showMessage(
              "Bill not available. Visit '🧾 My Bills' page to generate it.",
              "info"
            );
            return;
          }
          const retryData = await retry.json();
          await streamBillPdf(retryData, token);
          return;
        } else {
          showMessage("Unable to fetch bill.", "error");
          return;
        }
      }

      const infoData = await infoRes.json();
      await streamBillPdf(infoData, token);
    } catch (err) {
      console.error("Bill download error:", err);
      showMessage("Unable to download bill: " + err.message, "error");
    } finally {
      setDownloadingBillId(null);
    }
  };

  const streamBillPdf = async (infoData, token) => {
    const billId = infoData.bill?.bill_id;
    const billNumber = infoData.bill?.bill_number || "bill";
    if (!billId) throw new Error("Bill ID missing");

    const pdfRes = await fetch(
      `${API_BASE_URL}/bookings/payments/bills/${billId}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!pdfRes.ok) throw new Error("Download failed");

    const blob = await pdfRes.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ApnaMate-Bill-${billNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showMessage("📄 Bill downloaded!", "success");
  };

  // ==============================
  // ACCEPT QUOTE
  // ==============================
  const acceptQuote = async (booking) => {
    if (!booking?.quoted_amount) {
      showMessage("No quote to accept.", "error");
      return;
    }
    setQuoteActionId(booking.id);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/bookings/${booking.id}/quote/accept`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to accept quote");
      }
      showMessage(
        `✅ Quote of ₹${booking.quoted_amount} accepted! Proceeding to payment...`,
        "success"
      );
      setSelectedBooking({
        ...booking,
        price: String(booking.quoted_amount),
        quoted_amount: booking.quoted_amount,
      });
      setShowPayment(true);
      // ✅ silent refresh
      fetchBookings(user.id, { silent: true });
    } catch (error) {
      console.error("Accept quote error:", error);
      showMessage(error.message || "Unable to accept quote.", "error");
    } finally {
      setQuoteActionId(null);
    }
  };

  // ==============================
  // REJECT QUOTE
  // ==============================
  const rejectQuote = async (booking) => {
    const reason = window.prompt(
      "Reason for rejecting this quote (optional):",
      ""
    );
    if (reason === null) return;

    setQuoteActionId(booking.id);
    try {
      const token = localStorage.getItem("accessToken");
      const url = new URL(`${API_BASE_URL}/bookings/${booking.id}/quote/reject`);
      if (reason.trim()) {
        url.searchParams.set("reason", reason.trim());
      }
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to reject quote");
      }
      showMessage("❌ Quote rejected. The provider will send a new quote.", "info");
      await fetchBookings(user.id);
    } catch (error) {
      console.error("Reject quote error:", error);
      showMessage(error.message || "Unable to reject quote.", "error");
    } finally {
      setQuoteActionId(null);
    }
  };

  // ==============================
  // RATING / COMMENT
  // ==============================
  const handleRatingChange = (bookingId, value) => {
    setReviewStates((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], rating: value },
    }));
  };

  const handleCommentChange = (bookingId, value) => {
    setReviewStates((prev) => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], comment: value },
    }));
  };

  // ==============================
  // CANCEL BOOKING
  // ==============================
  const handleCancelBooking = async (bookingId) => {
    if (!user) {
      showMessage("Please login to cancel bookings.", "error");
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(bookingId);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to cancel booking");
      }
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
        )
      );
      showMessage("Booking cancelled successfully! ✅", "success");
      setTimeout(() => fetchBookings(user.id, { silent: true }), 800);
    } catch (error) {
      console.error("Cancellation error:", error);
      showMessage(error.message || "Unable to cancel booking.", "error");
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
      showMessage("Please login to submit a review.", "error");
      return;
    }

    // ✅ CLEAR old messages before starting
    setMessage("");

    // ✅ GUARD 1: Check against current bookings state
    const booking = bookings.find((b) => b.id === bookingId);
    const currentStatus = (booking?.status || "").toLowerCase().replace(/\s+/g, "_");
    if (currentStatus !== "completed") {
      showMessage(
        `❌ Can only review completed bookings. This one is "${booking?.status || "unknown"}".`,
        "error"
      );
      fetchBookings(user.id, { silent: true });
      return;
    }

    // ✅ GUARD 2: Check if already reviewed
    if (reviewedBookings[bookingId]) {
      showMessage("You've already reviewed this booking.", "info");
      return;
    }

    if (!rating) {
      showMessage("Please select a rating.", "error");
      return;
    }
    if (!comment || !comment.trim()) {
      showMessage("Please write a review comment.", "error");
      return;
    }

    setReviewingId(bookingId);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found. Please login again.");
      const requestBody = {
        booking_id: bookingId,
        rating: parseInt(rating),
        comment: comment.trim(),
      };
      const response = await fetch(`${API_BASE_URL}/bookings/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
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

      showMessage("✅ Review submitted successfully! ⭐", "success");

      // Clear form
      setReviewStates((prev) => ({
        ...prev,
        [bookingId]: { rating: "", comment: "" },
      }));

      // Mark locally as reviewed
      setReviewedBookings((prev) => ({ ...prev, [bookingId]: true }));

      // Confirm with server
      try {
        const r = await fetch(
          `${API_BASE_URL}/bookings/reviews/booking/${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.ok) {
          const d = await r.json();
          setReviewedBookings((prev) => ({
            ...prev,
            [bookingId]: d.has_reviewed || true,
          }));
        }
      } catch (checkErr) {
        console.warn("Post-submit review check failed:", checkErr);
      }

      // Background refresh
      setTimeout(() => fetchBookings(user.id, { silent: true }), 800);
    } catch (error) {
      console.error("❌ Review error:", error);
      showMessage(error.message || "Unable to submit review.", "error");
    } finally {
      setReviewingId(null);
    }
  };

  // ==============================
  // STATUS HELPERS
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
  const isPaymentPendingStatus = (s) => {
    const n = normalizeStatus(s);
    return n === "payment_pending" || n === "pending_verification";
  };
  const isPaidStatus = (s) => normalizeStatus(s) === "paid";
  const isCompletedStatus = (s) => normalizeStatus(s) === "completed";
  const isRejectedStatus = (s) => normalizeStatus(s) === "rejected";
  const isCancelledStatus = (s) => normalizeStatus(s) === "cancelled";

  const getStatusStyle = (status) => {
    const n = normalizeStatus(status);
    const styles = {
      pending_quote: { backgroundColor: "#fef3c7", color: "#92400e" },
      pending: { backgroundColor: "#fef3c7", color: "#92400e" },
      quoted: { backgroundColor: "#e0e7ff", color: "#3730a3" },
      accepted: { backgroundColor: "#dbeafe", color: "#1e40af" },
      confirmed: { backgroundColor: "#dbeafe", color: "#1e40af" },
      payment_pending: { backgroundColor: "#fef9c3", color: "#854d0e" },
      pending_verification: { backgroundColor: "#fef9c3", color: "#854d0e" },
      paid: { backgroundColor: "#dcfce7", color: "#166534" },
      completed: { backgroundColor: "#dcfce7", color: "#166534" },
      rejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
      cancelled: { backgroundColor: "#f3f4f6", color: "#4b5563" },
    };
    return styles[n] || styles["pending_quote"];
  };

  const getStatusIcon = (status) => {
    const n = normalizeStatus(status);
    const icons = {
      pending_quote: "⏳",
      pending: "🟡",
      quoted: "💰",
      accepted: "✅",
      confirmed: "🔵",
      payment_pending: "⏳",
      pending_verification: "⏳",
      paid: "💵",
      completed: "🟢",
      rejected: "🔴",
      cancelled: "⚫",
    };
    return icons[n] || "🟡";
  };

  const getStatusLabel = (status) => {
    const n = normalizeStatus(status);
    const labels = {
      pending_quote: "Pending Quote",
      pending: "Pending",
      quoted: "Quoted",
      accepted: "Accepted",
      confirmed: "Confirmed",
      payment_pending: "Payment Pending",
      pending_verification: "Awaiting Verification",
      paid: "Paid",
      completed: "Completed",
      rejected: "Rejected",
      cancelled: "Cancelled",
    };
    return labels[n] || status;
  };

  // ==============================
  // COUNTS
  // ==============================
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => isPendingQuoteStatus(b.status)).length;
  const quotedBookings = bookings.filter((b) => isQuotedStatus(b.status)).length;
  const acceptedBookings = bookings.filter((b) => isAcceptedStatus(b.status)).length;
  const paymentPendingBookings = bookings.filter((b) => isPaymentPendingStatus(b.status)).length;
  const paidBookings = bookings.filter((b) => isPaidStatus(b.status)).length;
  const completedBookings = bookings.filter((b) => isCompletedStatus(b.status)).length;
  const rejectedBookings = bookings.filter((b) => isRejectedStatus(b.status)).length;
  const cancelledBookings = bookings.filter((b) => isCancelledStatus(b.status)).length;

  // ==============================
  // FILTER
  // ==============================
  const filteredBookings = bookings
    .filter((booking) => {
      if (statusFilter === "All") return true;
      const n = normalizeStatus(booking.status);
      if (statusFilter === "Pending") return n === "pending_quote" || n === "pending";
      if (statusFilter === "Quoted") return n === "quoted";
      if (statusFilter === "Accepted") return n === "accepted" || n === "confirmed";
      if (statusFilter === "PaymentPending") return n === "payment_pending" || n === "pending_verification";
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
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f7fb" }}>
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
        <h2
          style={{ margin: 0, cursor: "pointer" }}
          onClick={() => (window.location.href = "/")}
        >
          🔧 ApnaMate
        </h2>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => (window.location.href = "/dashboard")}
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
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px" }}>
        <button
          type="button"
          onClick={() => (window.location.href = "/dashboard")}
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
                messageType === "error"
                  ? "#fee2e2"
                  : messageType === "success"
                    ? "#dcfce7"
                    : "#dbeafe",
              color:
                messageType === "error"
                  ? "#991b1b"
                  : messageType === "success"
                    ? "#166534"
                    : "#1e40af",
              borderRadius: "6px",
              fontWeight: "bold",
              borderLeft: `4px solid ${
                messageType === "error"
                  ? "#dc2626"
                  : messageType === "success"
                    ? "#22c55e"
                    : "#2563eb"
              }`,
            }}
          >
            {message}
          </div>
        )}

        {/* Summary */}
        {!loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginTop: "25px",
            }}
          >
            <SummaryCard icon="📋" count={totalBookings} label="Total" />
            <SummaryCard icon="⏳" count={pendingBookings} label="Pending Quote" />
            <SummaryCard icon="💰" count={quotedBookings} label="Quoted" />
            <SummaryCard icon="✅" count={acceptedBookings} label="Accepted" />
            <SummaryCard icon="⌛" count={paymentPendingBookings} label="Payment Pending" />
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
            <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label><strong>Filter by Status</strong></label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: "100%", padding: "11px", marginTop: "8px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }}
                >
                  <option value="All">All Bookings</option>
                  <option value="Pending">⏳ Pending Quote</option>
                  <option value="Quoted">💰 Quoted</option>
                  <option value="Accepted">✅ Accepted</option>
                  <option value="PaymentPending">⌛ Payment Pending</option>
                  <option value="Paid">💵 Paid</option>
                  <option value="Completed">🟢 Completed</option>
                  <option value="Rejected">🔴 Rejected</option>
                  <option value="Cancelled">⚫ Cancelled</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "200px" }}>
                <label><strong>Sort Bookings</strong></label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{ width: "100%", padding: "11px", marginTop: "8px", border: "1px solid #ccc", borderRadius: "6px", boxSizing: "border-box" }}
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
                  style={{ width: "100%", padding: "11px", backgroundColor: "#e5e7eb", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
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
          <div style={{ backgroundColor: "white", padding: "40px", marginTop: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <div
              className="spinner"
              style={{ width: "48px", height: "48px", border: "4px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}
            ></div>
            <h2>Loading bookings...</h2>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* No Bookings */}
        {!loading && bookings.length === 0 && (
          <div style={{ backgroundColor: "white", padding: "40px", marginTop: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "50px" }}>📋</div>
            <h2>No bookings yet</h2>
            <p>You haven't booked any services yet.</p>
            <button
              type="button"
              onClick={() => (window.location.href = "/services")}
              style={{ padding: "12px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              Book a Service
            </button>
          </div>
        )}

        {/* No Filter Results */}
        {!loading && bookings.length > 0 && filteredBookings.length === 0 && (
          <div style={{ backgroundColor: "white", padding: "40px", marginTop: "20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "45px" }}>🔍</div>
            <h2>No matching bookings</h2>
            <p>There are no bookings with the selected status.</p>
            <button
              type="button"
              onClick={() => setStatusFilter("All")}
              style={{ padding: "10px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
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
            const isPaymentPending = isPaymentPendingStatus(booking.status);
            const isPaid = isPaidStatus(booking.status);
            const isRejected = isRejectedStatus(booking.status);
            const isCancelled = isCancelledStatus(booking.status);
            const hasPayment = paymentStatuses[booking.id] || false;
            const reviewState = reviewStates[booking.id] || { rating: "", comment: "" };
            const isSubmitting = reviewingId === booking.id;
            const isQuoteBusy = quoteActionId === booking.id;
            const isDownloading = downloadingBillId === booking.id;

            const finalAmount = booking.paid_amount || booking.quoted_amount;

            const showBillCard =
              !isPaymentPending && (hasPayment || isPaid || isCompleted) && finalAmount;

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0, marginBottom: "8px" }}>{booking.service}</h2>
                    <span style={{ color: "#666", fontSize: "14px" }}>Booking #{booking.id}</span>
                  </div>

                  <span style={{ ...getStatusStyle(booking.status), padding: "7px 14px", borderRadius: "20px", fontWeight: "bold" }}>
                    {getStatusIcon(booking.status)} {getStatusLabel(booking.status)}
                  </span>
                </div>

                <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />

                {/* DETAILS */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                  <p style={{ margin: 0 }}><strong>👨‍🔧 Provider:</strong> {booking.provider_name || "Awaiting assignment"}</p>
                  <p style={{ margin: 0 }}><strong>📅 Date:</strong> {booking.date}</p>
                  <p style={{ margin: 0 }}><strong>🕐 Time:</strong> {booking.time}</p>
                  <p style={{ margin: 0 }}><strong>📍 Address:</strong> {booking.address}</p>
                </div>

                <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                  <strong>Problem Description</strong>
                  <p style={{ marginBottom: 0, color: "#555" }}>{booking.description}</p>
                </div>

                {/* QUOTE CARD */}
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
                    <h3 style={{ margin: "0 0 8px 0", color: "#92400e" }}>💰 Provider Sent a Quote</h3>
                    <div style={{ fontSize: "32px", fontWeight: "bold", color: "#78350f", margin: "10px 0" }}>
                      ₹{booking.quoted_amount}
                    </div>
                    {booking.quote_note && (
                      <p style={{ margin: "8px 0 0", color: "#78350f", fontStyle: "italic", padding: "10px", backgroundColor: "rgba(255,255,255,0.5)", borderRadius: "6px" }}>
                        "{booking.quote_note}"
                      </p>
                    )}
                    <p style={{ color: "#92400e", fontSize: "13px", marginTop: "10px" }}>
                      Accept the quote to proceed to payment.
                    </p>

                    <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
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

                {/* ACCEPTED */}
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
                      {hasPayment
                        ? "Payment received."
                        : "Complete payment to confirm your booking."}
                    </p>
                  </div>
                )}

                {/* PAY NOW */}
                {isAccepted && !hasPayment && !isPaymentPending && (
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

                {/* PAYMENT PENDING */}
                {isPaymentPending && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "16px",
                      backgroundColor: "#fef9c3",
                      color: "#854d0e",
                      borderRadius: "8px",
                      borderLeft: "4px solid #ca8a04",
                      fontWeight: "bold",
                    }}
                  >
                    ⏳ Payment submitted — awaiting admin verification
                    <p style={{ margin: "6px 0 0", fontWeight: "normal", fontSize: "14px" }}>
                      You'll be notified once the admin confirms your payment. This usually takes a few hours.
                    </p>
                  </div>
                )}

                {/* PAYMENT COMPLETED + DOWNLOAD BILL */}
                {showBillCard && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "16px",
                      backgroundColor: "#dbeafe",
                      color: "#1e40af",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>✅ Payment completed — ₹{finalAmount}</span>

                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => downloadBill(booking.id)}
                      style={{
                        padding: "10px 18px",
                        backgroundColor: isDownloading ? "#94a3b8" : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isDownloading ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      {isDownloading ? "Downloading..." : "📄 Download Bill (PDF)"}
                    </button>
                  </div>
                )}

                {/* PENDING QUOTE */}
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
                    ✕ Quote rejected — awaiting a new quote from provider
                    {booking.rejection_reason ? ` (${booking.rejection_reason})` : ""}
                  </div>
                )}

                {/* CANCEL */}
                {(isPendingQuote || isQuoted) && (
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

                {/* COMPLETED */}
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
                          style={{ width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
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
                          style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", boxSizing: "border-box" }}
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

      {/* PAYMENT MODAL */}
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
            fetchBookings(user?.id, { silent: true });
            showMessage("✅ Payment successful! Booking confirmed.", "success");
          }}
          onPendingVerification={() => {
            setShowPayment(false);
            setSelectedBooking(null);
            fetchBookings(user?.id, { silent: true });
            showMessage(
              "⏳ Payment submitted! Admin will verify and confirm your booking shortly.",
              "info"
            );
          }}
        />
      )}
    </div>
  );
}

// =========================================================
// HELPER COMPONENT
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