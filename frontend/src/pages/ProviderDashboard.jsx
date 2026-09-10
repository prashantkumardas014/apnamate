// src/pages/ProviderDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
/* eslint-disable react/set-state-in-effect, react/immutability */

function ProviderDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState("Available");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [savingRange, setSavingRange] = useState(false);

  const [quoteForms, setQuoteForms] = useState({});

  const [payoutInfo, setPayoutInfo] = useState({ owed_total: 0, paid_total: 0, payouts: [] });
  const [myUpi, setMyUpi] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);

  // =========================================================
  // MESSAGE HELPER — persistent errors (12s), success fades (3s)
  // =========================================================
  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
    const delay = type === "error" ? 12000 : 3000;
    setTimeout(() => setMessage(""), delay);
  };

  const authHeader = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("⚠️ No accessToken in localStorage");
    }
    return { Authorization: `Bearer ${token || ""}` };
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "provider") {
        navigate("/dashboard");
        return;
      }
      setUser(parsedUser);
      fetchBookings(parsedUser.id);
      fetchProfile(parsedUser.id);
      fetchNotificationCount(parsedUser.id);
      fetchPayouts();
    } catch (error) {
      console.error("Error parsing user:", error);
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // =========================================================
  // NOTIFICATION COUNT
  // =========================================================
  const fetchNotificationCount = async (userId) => {
    if (!userId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/notifications/${userId}`,
        { headers: authHeader() }
      );
      if (response.ok) {
        const data = await response.json();
        const notifications = Array.isArray(data)
          ? data
          : Array.isArray(data.notifications)
            ? data.notifications
            : [];
        setNotificationCount(notifications.filter((n) => n.is_read === 0).length);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // =========================================================
  // BOOKINGS
  // =========================================================
  const fetchBookings = async (providerId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/bookings/provider/${providerId}`,
        { headers: authHeader() }
      );
      if (!response.ok) throw new Error(`Bookings HTTP ${response.status}`);

      const data = await response.json();
      const providerBookings = Array.isArray(data)
        ? data
        : Array.isArray(data.bookings)
          ? data.bookings
          : [];
      setBookings(providerBookings);
    } catch (error) {
      console.error("Booking error:", error);
      showMessage(`Unable to load bookings: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // PROFILE
  // =========================================================
  const fetchProfile = async (providerId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/profile/${providerId}`,
        { headers: authHeader() }
      );
      if (!response.ok) {
        console.warn("Profile fetch failed:", response.status);
        return;
      }
      const data = await response.json();
      console.log("📥 Profile response:", data);

      if (data.availability) setAvailability(data.availability);

      const u = data.user || {};
      if (u.min_price !== undefined && u.min_price !== null) setMinPrice(String(u.min_price));
      if (u.max_price !== undefined && u.max_price !== null) setMaxPrice(String(u.max_price));
      if (u.upi_id) setMyUpi(u.upi_id);
    } catch (error) {
      console.error("Profile error:", error);
    }
  };

  // =========================================================
  // PAYOUTS
  // =========================================================
  const fetchPayouts = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/payments/provider/payouts`,
        { headers: authHeader() }
      );

      if (!response.ok) {
        const body = await response.text();
        console.warn(`⚠️ Payouts HTTP ${response.status}:`, body);
        // Don't spam the user for payout load errors — just log
        return;
      }

      const data = await response.json();
      console.log("📥 Payouts:", data);
      setPayoutInfo(data);
    } catch (error) {
      console.error("Payouts fetch error:", error);
    }
  };

  // =========================================================
  // SAVE UPI
  // =========================================================
  const saveMyUpi = async () => {
    const upi = myUpi.trim();
    if (!upi.includes("@")) {
      showMessage("❌ Enter a valid UPI ID (e.g. yourname@oksbi)", "error");
      return;
    }

    setSavingUpi(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/payments/provider/save-upi`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ upi_id: upi }),
        }
      );

      const rawText = await response.text();
      console.log(`📥 save-upi HTTP ${response.status}:`, rawText);

      if (!response.ok) {
        showMessage(`❌ Save failed (${response.status}): ${rawText.slice(0, 200)}`, "error");
        return;
      }

      let data = {};
      try { data = JSON.parse(rawText); } catch {}

      showMessage(`✅ UPI saved: ${data.upi_id || upi}`, "success");

      // Update local user object
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.upi_id = data.upi_id || upi;
      localStorage.setItem("user", JSON.stringify(stored));
      setUser((prev) => ({ ...prev, upi_id: data.upi_id || upi }));

      // Reload profile to verify persistence
      if (user?.id) await fetchProfile(user.id);

    } catch (error) {
      console.error("Save UPI error:", error);
      showMessage(`❌ Network error: ${error.message}`, "error");
    } finally {
      setSavingUpi(false);
    }
  };

  // =========================================================
  // SAVE PRICE RANGE
  // =========================================================
  const savePriceRange = async () => {
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);

    if (isNaN(min) || isNaN(max)) {
      showMessage("❌ Please enter both minimum and maximum prices", "error");
      return;
    }
    if (min < 0 || max < 0) {
      showMessage("❌ Prices must be positive", "error");
      return;
    }
    if (min > max) {
      showMessage("❌ Minimum price cannot exceed maximum price", "error");
      return;
    }

    setSavingRange(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/provider/price-range`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ min_price: min, max_price: max }),
        }
      );

      const rawText = await response.text();
      console.log(`📥 price-range HTTP ${response.status}:`, rawText);

      if (!response.ok) {
        showMessage(`❌ Save failed (${response.status}): ${rawText.slice(0, 200)}`, "error");
        return;
      }

      let data = {};
      try { data = JSON.parse(rawText); } catch {}

      showMessage(`✅ Price range updated: ₹${min} – ₹${max}`, "success");

      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      stored.min_price = min;
      stored.max_price = max;
      localStorage.setItem("user", JSON.stringify(stored));

      if (user?.id) await fetchProfile(user.id);

    } catch (error) {
      console.error("Price range error:", error);
      showMessage(`❌ Network error: ${error.message}`, "error");
    } finally {
      setSavingRange(false);
    }
  };

  // =========================================================
  // SEND QUOTE
  // =========================================================
  const updateQuoteForm = (bookingId, patch) => {
    setQuoteForms((prev) => ({
      ...prev,
      [bookingId]: {
        open: true,
        amount: "",
        note: "",
        sending: false,
        ...(prev[bookingId] || {}),
        ...patch,
      },
    }));
  };

  const sendQuote = async (bookingId) => {
    const form = quoteForms[bookingId] || {};
    const amount = parseFloat(form.amount);

    if (isNaN(amount) || amount <= 0) {
      showMessage("❌ Please enter a valid quote amount", "error");
      return;
    }

    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    const outsideRange =
      (!isNaN(min) && amount < min) || (!isNaN(max) && amount > max);

    if (
      outsideRange &&
      !window.confirm(
        `⚠️ ₹${amount} is outside your declared range (₹${min || 0} – ₹${max || 0}).\n\nSend anyway?`
      )
    ) return;

    try {
      updateQuoteForm(bookingId, { sending: true });

      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}/quote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({
            quoted_amount: amount,
            quote_note: form.note?.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(`❌ ${data.detail || "Failed to send quote"}`, "error");
        updateQuoteForm(bookingId, { sending: false });
        return;
      }

      showMessage(`✅ Quote of ₹${amount} sent to customer`, "success");
      updateQuoteForm(bookingId, { open: false, sending: false, amount: "", note: "" });
      fetchBookings(user.id);
      fetchNotificationCount(user.id);
    } catch (error) {
      console.error("Send quote error:", error);
      showMessage("❌ Unable to send quote", "error");
      updateQuoteForm(bookingId, { sending: false });
    }
  };

  // =========================================================
  // AVAILABILITY
  // =========================================================
  const handleAvailabilityChange = async (newAvailability) => {
    if (!user) return;
    try {
      showMessage("Updating availability...", "info");

      const response = await fetch(
        `${API_BASE_URL}/bookings/availability/${user.id}?availability=${encodeURIComponent(newAvailability)}`,
        { method: "PUT", headers: authHeader() }
      );
      const data = await response.json();

      if (!response.ok) {
        showMessage(data.detail || "Failed to update availability", "error");
        return;
      }

      setAvailability(data.availability);
      showMessage(`✅ Availability changed to ${data.availability}`, "success");
    } catch (error) {
      console.error("Availability error:", error);
      showMessage("Unable to update availability", "error");
    }
  };

  // =========================================================
  // CANCEL BOOKING
  // =========================================================
  const updateBookingStatus = async (bookingId, action) => {
    try {
      showMessage("Updating booking...", "info");

      const response = await fetch(
        `${API_BASE_URL}/bookings/${bookingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({
            status: action === "complete" ? "completed" : "cancelled",
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        showMessage(data.detail || "Unable to update booking", "error");
        return;
      }

      showMessage("✅ Booking updated", "success");
      fetchBookings(user.id);
      fetchNotificationCount(user.id);
    } catch (error) {
      console.error("Booking status error:", error);
      showMessage("Unable to update booking", "error");
    }
  };

  // =========================================================
  // LOGOUT / REFRESH
  // =========================================================
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("booking");
    window.location.href = "/login";
  };

  const handleRefresh = () => {
    if (!user) return;
    fetchBookings(user.id);
    fetchProfile(user.id);
    fetchNotificationCount(user.id);
    fetchPayouts();
    showMessage("🔄 Data refreshed!", "success");
  };

  // =========================================================
  // STATS / HELPERS (unchanged)
  // =========================================================
  const pendingBookings = bookings.filter(
    (b) => b.status === "pending_quote" || b.status === "Pending"
  ).length;
  const quotedBookings = bookings.filter((b) => b.status === "quoted").length;
  const acceptedBookings = bookings.filter(
    (b) => b.status === "accepted" || b.status === "Accepted" || b.status === "Confirmed"
  ).length;
  const completedBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "Completed" || b.status === "paid"
  ).length;
  const rejectedBookings = bookings.filter(
    (b) => b.status === "rejected" || b.status === "Rejected"
  ).length;
  const cancelledBookings = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "Cancelled"
  ).length;

  const getAvailabilityColor = () => {
    if (availability === "Available") return "#16a34a";
    if (availability === "Busy") return "#ca8a04";
    return "#dc2626";
  };
  const getAvailabilityIcon = () => {
    if (availability === "Available") return "🟢";
    if (availability === "Busy") return "🟡";
    return "🔴";
  };

  const getStatusBadge = (status) => {
    const s = status || "pending_quote";
    switch (s) {
      case "pending_quote":
      case "Pending":
        return { bg: "#fef3c7", color: "#92400e", label: "⏳ Pending Quote" };
      case "quoted":
        return { bg: "#e0e7ff", color: "#3730a3", label: "💰 Quoted" };
      case "accepted":
      case "Accepted":
      case "Confirmed":
        return { bg: "#dbeafe", color: "#1e40af", label: "✅ Accepted" };
      case "paid":
        return { bg: "#dcfce7", color: "#166534", label: "💵 Paid" };
      case "completed":
      case "Completed":
        return { bg: "#dcfce7", color: "#166534", label: "🎉 Completed" };
      case "rejected":
      case "Rejected":
        return { bg: "#ffedd5", color: "#c2410c", label: "❌ Rejected" };
      case "cancelled":
      case "Cancelled":
        return { bg: "#fee2e2", color: "#b91c1c", label: "🚫 Cancelled" };
      default:
        return { bg: "#f1f5f9", color: "#475569", label: status };
    }
  };

  const isPendingQuote = (s) => s === "pending_quote" || s === "Pending";
  const isAccepted = (s) => s === "accepted" || s === "Accepted" || s === "Confirmed";
  const isCompleted = (s) => s === "completed" || s === "Completed" || s === "paid";

  // =========================================================
  // LOADING
  // =========================================================
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "30px", boxSizing: "border-box" }}>
      {/* HEADER */}
      <div style={{ maxWidth: "1100px", margin: "0 auto 30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e293b" }}>🛠️ Welcome, {user.name}!</h1>
          <p style={{ color: "#64748b", marginTop: "8px" }}>Manage your bookings and service requests.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/notifications")} style={{ padding: "10px 18px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", position: "relative" }}>
            🔔 Notifications
            {notificationCount > 0 && (
              <span style={{ position: "absolute", top: "-8px", right: "-8px", backgroundColor: "#dc2626", color: "white", borderRadius: "50%", padding: "4px 8px", fontSize: "12px", fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>
                {notificationCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/provider-profile")} style={{ padding: "10px 18px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>👤 My Profile</button>
          <button onClick={handleRefresh} style={{ padding: "10px 18px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🔄 Refresh</button>
          <button onClick={handleLogout} style={{ padding: "10px 18px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🚪 Logout</button>
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto 20px",
            padding: "15px 20px",
            backgroundColor: messageType === "error" ? "#fee2e2" : "#dcfce7",
            color: messageType === "error" ? "#991b1b" : "#166534",
            borderRadius: "8px",
            borderLeft: `4px solid ${messageType === "error" ? "#dc2626" : "#16a34a"}`,
            fontWeight: "bold",
          }}
        >
          {message}
        </div>
      )}

      {/* PAYOUTS */}
      <div style={{ maxWidth: "1100px", margin: "0 auto 25px", backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 3px 12px rgba(0,0,0,0.08)" }}>
        <h2 style={{ marginTop: 0, color: "#1e293b" }}>💵 My Payouts</h2>
        <p style={{ color: "#64748b", marginTop: "-5px" }}>Customer payments go to the ApnaMate account. Your share is transferred within 3 business days.</p>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "16px" }}>
          <div style={{ flex: 1, minWidth: 180, padding: "20px", background: "#fef3c7", borderRadius: "10px", border: "1px solid #fcd34d" }}>
            <div style={{ fontSize: "13px", color: "#92400e", fontWeight: "bold" }}>OWED TO YOU</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#92400e", marginTop: "6px" }}>₹{payoutInfo.owed_total || 0}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, padding: "20px", background: "#dcfce7", borderRadius: "10px", border: "1px solid #86efac" }}>
            <div style={{ fontSize: "13px", color: "#166534", fontWeight: "bold" }}>PAID TO YOU</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#166534", marginTop: "6px" }}>₹{payoutInfo.paid_total || 0}</div>
          </div>
        </div>
        {payoutInfo.payouts?.length > 0 && (
          <details style={{ marginTop: "16px" }}>
            <summary style={{ cursor: "pointer", color: "#2563eb", fontWeight: "bold" }}>View payout history ({payoutInfo.payouts.length})</summary>
            <div style={{ marginTop: "12px" }}>
              {payoutInfo.payouts.map((p) => (
                <div key={p.payout_id} style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span><strong>Booking #{p.booking_id}</strong> — ₹{p.net_amount}</span>
                  <span style={{ color: p.status === "paid_out" ? "#16a34a" : "#d97706", fontWeight: "bold" }}>
                    {p.status === "paid_out" ? "✅ Paid" : "⏳ Owed"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* UPI */}
      <div style={{ maxWidth: "1100px", margin: "0 auto 25px", backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 3px 12px rgba(0,0,0,0.08)" }}>
        <h2 style={{ marginTop: 0, color: "#1e293b" }}>🏦 Your UPI ID (for receiving payouts)</h2>
        <p style={{ color: "#64748b", marginTop: "-5px" }}>Admin will send your earnings to this UPI ID. Make sure it's correct.</p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
          <input
            type="text"
            value={myUpi}
            onChange={(e) => setMyUpi(e.target.value)}
            placeholder="yourname@upi"
            style={{ flex: 1, minWidth: 220, padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px" }}
          />
          <button
            onClick={saveMyUpi}
            disabled={savingUpi}
            style={{ padding: "12px 24px", background: savingUpi ? "#94a3b8" : "#2563eb", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "15px", cursor: savingUpi ? "not-allowed" : "pointer" }}
          >
            {savingUpi ? "Saving..." : "💾 Save UPI"}
          </button>
        </div>
      </div>

      {/* PRICE RANGE */}
      <div style={{ maxWidth: "1100px", margin: "0 auto 25px", backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 3px 12px rgba(0,0,0,0.08)" }}>
        <h2 style={{ marginTop: 0, color: "#1e293b" }}>💰 Set Your Price Range</h2>
        <p style={{ color: "#64748b", marginTop: "-5px" }}>Customers see this range on your profile. Send a final quote per job after reviewing the problem.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
          <div>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", color: "#334155" }}>Minimum Price (₹)</label>
            <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="200" style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "6px", color: "#334155" }}>Maximum Price (₹)</label>
            <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="800" style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={savePriceRange} disabled={savingRange} style={{ padding: "12px 24px", backgroundColor: savingRange ? "#94a3b8" : "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: savingRange ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "15px" }}>
            {savingRange ? "Saving..." : "💾 Save Price Range"}
          </button>
          <span style={{ color: "#64748b" }}>
            {minPrice && maxPrice && Number(minPrice) <= Number(maxPrice)
              ? `Currently: ₹${minPrice} – ₹${maxPrice}`
              : "Set both fields to save"}
          </span>
        </div>
      </div>

      {/* AVAILABILITY */}
      <div style={{ maxWidth: "1100px", margin: "0 auto 25px", backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 3px 12px rgba(0,0,0,0.08)" }}>
        <h2 style={{ marginTop: 0, color: "#1e293b" }}>Service Availability</h2>
        <p style={{ color: "#64748b" }}>Control whether customers can book your services.</p>
        <div style={{ margin: "20px 0", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <strong>Current Status: </strong>
          <span style={{ color: getAvailabilityColor(), fontWeight: "bold", marginLeft: "5px" }}>{getAvailabilityIcon()} {availability}</span>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {["Available", "Busy", "Offline"].map((opt) => (
            <button key={opt} onClick={() => handleAvailabilityChange(opt)} style={{ padding: "12px 20px", border: availability === opt ? `2px solid ${opt === "Available" ? "#16a34a" : opt === "Busy" ? "#ca8a04" : "#dc2626"}` : "1px solid #ccc", borderRadius: "8px", backgroundColor: availability === opt ? (opt === "Available" ? "#dcfce7" : opt === "Busy" ? "#fef9c3" : "#fee2e2") : "white", color: opt === "Available" ? "#166534" : opt === "Busy" ? "#854d0e" : "#991b1b", cursor: "pointer", fontWeight: "bold" }}>
              {opt === "Available" ? "🟢" : opt === "Busy" ? "🟡" : "🔴"} {opt}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{ maxWidth: "1100px", margin: "0 auto 25px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "15px" }}>
        <div style={statCardStyle}><h3>⏳ Pending</h3><p style={{ color: "#d97706" }}>{pendingBookings}</p></div>
        <div style={statCardStyle}><h3>💰 Quoted</h3><p style={{ color: "#7c3aed" }}>{quotedBookings}</p></div>
        <div style={statCardStyle}><h3>✅ Accepted</h3><p style={{ color: "#2563eb" }}>{acceptedBookings}</p></div>
        <div style={statCardStyle}><h3>🎉 Completed</h3><p style={{ color: "#16a34a" }}>{completedBookings}</p></div>
        <div style={statCardStyle}><h3>❌ Rejected</h3><p style={{ color: "#ea580c" }}>{rejectedBookings}</p></div>
        <div style={statCardStyle}><h3>🚫 Cancelled</h3><p style={{ color: "#dc2626" }}>{cancelledBookings}</p></div>
      </div>

      {/* BOOKINGS */}
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ color: "#1e293b", margin: 0 }}>📋 Service Requests</h2>
          <span style={{ backgroundColor: "#e0e7ff", color: "#3730a3", padding: "6px 14px", borderRadius: "20px", fontWeight: "bold" }}>{bookings.length} Total</span>
        </div>

        {loading ? (
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "10px", textAlign: "center" }}>
            <div className="loading-spinner"></div>
            <p>Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "10px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
            <h3 style={{ color: "#1e293b" }}>No Service Requests</h3>
            <p style={{ color: "#64748b" }}>You don't have any service requests yet.</p>
          </div>
        ) : (
          bookings.map((booking) => {
            const badge = getStatusBadge(booking.status);
            const form = quoteForms[booking.id] || {};
            const canSendQuote = isPendingQuote(booking.status) && !booking.quoted_amount;

            return (
              <div key={booking.id} style={{ backgroundColor: "white", padding: "20px", marginBottom: "15px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <h3 style={{ margin: 0, color: "#2563eb" }}>{booking.service}</h3>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontWeight: "bold", fontSize: "13px", backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>

                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "6px" }}>
                  <p style={{ margin: "4px 0" }}><strong>Customer:</strong> {booking.customer_name || `ID: ${booking.customer_id}`}</p>
                  <p style={{ margin: "4px 0" }}><strong>Date:</strong> {booking.date}</p>
                  <p style={{ margin: "4px 0" }}><strong>Time:</strong> {booking.time}</p>
                  <p style={{ margin: "4px 0" }}><strong>Address:</strong> {booking.address}</p>
                </div>

                <div style={{ marginTop: "8px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}><strong>📝 Description:</strong> {booking.description || "No description provided."}</p>
                </div>

                {booking.quoted_amount && (
                  <div style={{ marginTop: "12px", padding: "12px 16px", backgroundColor: "#eef2ff", borderRadius: "8px", borderLeft: "4px solid #6366f1" }}>
                    <p style={{ margin: 0, fontWeight: "bold", color: "#3730a3" }}>💰 Your Quote: ₹{booking.quoted_amount}</p>
                    {booking.quote_note && <p style={{ margin: "6px 0 0", color: "#4338ca", fontStyle: "italic", fontSize: "14px" }}>"{booking.quote_note}"</p>}
                  </div>
                )}

                {canSendQuote && (
                  <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                    <p style={{ margin: "0 0 10px", fontWeight: "bold", color: "#075985" }}>💬 Send a Quote</p>
                    <input type="number" min="1" placeholder="Amount (₹)" value={form.amount || ""} onChange={(e) => updateQuoteForm(booking.id, { amount: e.target.value, open: true })} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px", marginBottom: "8px", boxSizing: "border-box" }} />
                    <textarea placeholder="Note (optional)" value={form.note || ""} onChange={(e) => updateQuoteForm(booking.id, { note: e.target.value, open: true })} rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", resize: "vertical", marginBottom: "10px", boxSizing: "border-box" }} />
                    <button onClick={() => sendQuote(booking.id)} disabled={form.sending} style={{ padding: "10px 20px", backgroundColor: form.sending ? "#94a3b8" : "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: form.sending ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                      {form.sending ? "Sending..." : "📤 Send Quote"}
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" }}>
                  {(isPendingQuote(booking.status) || isAccepted(booking.status)) && (
                    <button onClick={() => updateBookingStatus(booking.id, "cancel")} style={{ padding: "10px 18px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🚫 Cancel Booking</button>
                  )}
                  {isCompleted(booking.status) && (
                    <span style={{ color: "#16a34a", fontWeight: "bold", padding: "10px 0" }}>✓ Service completed</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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