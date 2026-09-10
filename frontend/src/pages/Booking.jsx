// src/pages/Booking.jsx
import { useLocation, useNavigate } from "react-router-dom";
/* eslint-disable react/set-state-in-effect, react/immutability, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

function Booking() {
  const location = useLocation();
  const navigate = useNavigate();

  const provider = location.state?.provider;
  const service = location.state?.service;

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
      const parsedUser = JSON.parse(storedUser);
      setCurrentUser(parsedUser);
    } catch (e) {
      console.error("Error parsing user:", e);
      navigate("/login");
    }
  }, [navigate]);

  // ==============================
  // FETCH AVAILABLE DATES
  // ==============================

  useEffect(() => {
    if (provider?.id) {
      fetchAvailableDates();
    }
  }, [provider]);

  const fetchAvailableDates = async () => {
    try {
      setLoadingSlots(true);
      const response = await fetch(
        `${API_BASE_URL}/bookings/available-dates/${provider.id}?days_ahead=30`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch available dates");
      }

      const data = await response.json();
      console.log("📅 Available dates:", data);

      if (data.success && data.available_dates) {
        // Filter only available dates
        const available = data.available_dates.filter(
          (d) => d.is_available === true
        );
        setAvailableDates(available);
      }
    } catch (error) {
      console.error("Error fetching dates:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  // ==============================
  // FETCH AVAILABLE TIME SLOTS
  // ==============================

  useEffect(() => {
    if (date && provider?.id) {
      fetchAvailableTimeSlots();
    }
  }, [date]);

  const fetchAvailableTimeSlots = async () => {
    try {
      setLoadingSlots(true);
      setTime(""); // Reset time when date changes

      const response = await fetch(
        `${API_BASE_URL}/bookings/time-slots/${provider.id}/${date}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch time slots");
      }

      const data = await response.json();
      console.log("🕐 Available time slots:", data);

      if (data.success) {
        setAvailableTimes(data.available_slots || []);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setAvailableTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // ==============================
  // VALIDATE DATE (Prevent past dates)
  // ==============================

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    const today = new Date().toISOString().split("T")[0];
    
    if (selectedDate < today) {
      setMessage("❌ Cannot book past dates. Please select a future date.");
      setDate("");
      return;
    }
    
    setDate(selectedDate);
    setMessage("");
  };

  // ==============================
  // HANDLE BOOKING SUBMISSION
  // ==============================

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Validate date
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      setMessage("❌ Cannot book past dates. Please select a future date.");
      return;
    }

    // Validate time
    if (!time) {
      setMessage("❌ Please select a time slot.");
      return;
    }

    setLoading(true);
    setMessage("Creating booking...");

    try {
      const bookingData = {
        customer_id: currentUser.id,
        provider_id: provider.id,
        provider_name: provider.name,
        service: service,
        date: date,
        time: time,
        address: address,
        description: description,
      };

      console.log("📝 Booking data:", bookingData);

      const response = await fetch(`${API_BASE_URL}/bookings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Booking failed");
      }

      console.log("✅ Booking response:", data);

      const booking = {
        id: data.booking_id,
        customer_id: currentUser.id,
        provider_id: provider.id,
        provider_name: provider.name,
        service: service,
        date: date,
        time: time,
        address: address,
        description: description,
        status: data.status || "Pending",
      };

      // Store booking in localStorage
      localStorage.setItem("booking", JSON.stringify(booking));

      setMessage("✅ Booking created successfully!");

      setTimeout(() => {
        navigate("/my-bookings");
      }, 1500);
    } catch (error) {
      console.error("Booking error:", error);
      setMessage(error.message || "❌ Unable to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // HANDLE LOGOUT
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

  if (!provider || !service) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f7fb",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <h2>Booking information not found</h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Please select a provider first.
        </p>
        <button
          type="button"
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
          Choose a Service
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
      }}
    >
      {/* ============================== */}
      {/* NAVBAR */}
      {/* ============================== */}

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
        <h2 style={{ margin: 0, cursor: "pointer" }} onClick={() => navigate("/")}>
          🔧 ApnaMate
        </h2>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
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

      {/* ============================== */}
      {/* MAIN CONTENT */}
      {/* ============================== */}

      <main
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/providers")}
          style={{
            padding: "10px 18px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ← Back to Providers
        </button>

        <h1 style={{ marginBottom: "8px" }}>Book a Service</h1>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          Complete the details below to book your service.
        </p>

        {/* ============================== */}
        {/* PROVIDER INFO */}
        {/* ============================== */}

        <div
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "12px",
            marginBottom: "25px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>{service}</h2>
          <p>
            <strong>Provider:</strong> {provider.name}
          </p>
          <p>
            <strong>Location:</strong> 📍 {provider.location || "Not specified"}
          </p>
          <p>
            <strong>Price:</strong> {provider.price || "Contact provider"}
          </p>
          <p>
            <strong>Experience:</strong> {provider.experience || "Not specified"}
          </p>
          <p>
            <strong>Rating:</strong> {provider.rating || "New Provider"}
          </p>
        </div>

        {/* ============================== */}
        {/* BOOKING FORM */}
        {/* ============================== */}

        <form
          onSubmit={handleBooking}
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* DATE SELECTION */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <strong>📅 Date</strong>
            </label>
            <input
              type="date"
              value={date}
              onChange={handleDateChange}
              min={getMinDate()}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
                fontSize: "15px",
              }}
            />
            {loadingSlots && (
              <p style={{ color: "#666", fontSize: "14px", marginTop: "8px" }}>
                ⏳ Loading available dates...
              </p>
            )}
            {availableDates.length === 0 && date && !loadingSlots && (
              <p style={{ color: "#dc2626", fontSize: "14px", marginTop: "8px" }}>
                ⚠️ No available dates for this provider. Please select another date.
              </p>
            )}
          </div>

          {/* TIME SELECTION */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <strong>🕐 Time</strong>
            </label>
            {date ? (
              loadingSlots ? (
                <p style={{ color: "#666" }}>⏳ Loading time slots...</p>
              ) : availableTimes.length > 0 ? (
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                    fontSize: "15px",
                  }}
                >
                  <option value="">Select a time slot</option>
                  {availableTimes.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ color: "#dc2626" }}>
                  ❌ No time slots available for this date. Please select another date.
                </p>
              )
            ) : (
              <p style={{ color: "#666" }}>Please select a date first</p>
            )}
          </div>

          {/* ADDRESS */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <strong>📍 Address</strong>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your complete address"
              required
              rows="3"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
                resize: "vertical",
                fontSize: "15px",
              }}
            />
          </div>

          {/* DESCRIPTION */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <strong>📝 Describe your problem</strong>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what service you need in detail"
              required
              rows="4"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
                resize: "vertical",
                fontSize: "15px",
              }}
            />
          </div>

          {/* MESSAGE */}
          {message && (
            <div
              style={{
                padding: "12px",
                marginBottom: "20px",
                backgroundColor: message.includes("✅") ? "#dcfce7" : "#fee2e2",
                color: message.includes("✅") ? "#166534" : "#991b1b",
                borderRadius: "6px",
                borderLeft: `4px solid ${message.includes("✅") ? "#22c55e" : "#dc2626"}`,
              }}
            >
              {message}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading || !date || !time || !address || !description}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor:
                loading || !date || !time || !address || !description
                  ? "#9ca3af"
                  : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor:
                loading || !date || !time || !address || !description
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading && date && time && address && description) {
                e.target.style.backgroundColor = "#1d4ed8";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && date && time && address && description) {
                e.target.style.backgroundColor = "#2563eb";
              }
            }}
          >
            {loading ? "⏳ Booking..." : "✅ Confirm Booking"}
          </button>

          {/* FORM VALIDATION HINTS */}
          <div
            style={{
              marginTop: "15px",
              fontSize: "13px",
              color: "#666",
              textAlign: "center",
            }}
          >
            {!date && <span>⚠️ Please select a date</span>}
            {date && !time && <span>⚠️ Please select a time</span>}
            {date && time && !address && <span>⚠️ Please enter your address</span>}
            {date && time && address && !description && (
              <span>⚠️ Please describe your problem</span>
            )}
            {date && time && address && description && (
              <span style={{ color: "#22c55e" }}>
                ✅ All fields filled. Ready to book!
              </span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

export default Booking;