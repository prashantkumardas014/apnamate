import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

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

  const handleBooking = async (e) => {
    e.preventDefault();

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(storedUser);

    setLoading(true);
    setMessage("Creating booking...");

    try {
      const url =
        "http://127.0.0.1:8000/bookings/?" +
        "customer_id=" +
        encodeURIComponent(user.id) +
        "&provider_id=" +
        encodeURIComponent(provider.id) +
        "&provider_name=" +
        encodeURIComponent(provider.name) +
        "&service=" +
        encodeURIComponent(service) +
        "&date=" +
        encodeURIComponent(date) +
        "&time=" +
        encodeURIComponent(time) +
        "&address=" +
        encodeURIComponent(address) +
        "&description=" +
        encodeURIComponent(description);

      const response = await fetch(url, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Booking failed"
        );
      }

      const booking = {
        id: data.booking_id,
        customer_id: user.id,
        provider_id: provider.id,
        provider_name: provider.name,
        service: service,
        date: date,
        time: time,
        address: address,
        description: description,
        status: data.status,
      };

      localStorage.setItem(
        "booking",
        JSON.stringify(booking)
      );

      setMessage("Booking created successfully! ✅");

      setTimeout(() => {
        navigate("/my-bookings");
      }, 1000);
    } catch (error) {
      console.error("Booking error:", error);
      setMessage(
        error.message || "Unable to create booking."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
      }}
    >
      <nav
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>ApnaMate</h2>

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
          Dashboard
        </button>
      </nav>

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
          }}
        >
          ← Back to Providers
        </button>

        <h1>Book a Service</h1>

        <div
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "12px",
            marginTop: "20px",
            marginBottom: "25px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2>{service}</h2>

          <p>
            <strong>Provider:</strong>{" "}
            {provider.name}
          </p>

          <p>
            <strong>Provider ID:</strong>{" "}
            {provider.id}
          </p>

          <p>
            <strong>Location:</strong>{" "}
            {provider.location}
          </p>

          <p>
            <strong>Price:</strong>{" "}
            {provider.price}
          </p>
        </div>

        <form
          onSubmit={handleBooking}
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Date</strong>
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Time</strong>
            </label>

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Address</strong>
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
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Describe your problem</strong>
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe what service you need"
              required
              rows="4"
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {message && (
            <div
              style={{
                padding: "12px",
                marginBottom: "20px",
                backgroundColor:
                  message.includes("successfully")
                    ? "#dcfce7"
                    : "#fee2e2",
                color: message.includes("successfully")
                  ? "#166534"
                  : "#991b1b",
                borderRadius: "6px",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: loading
                ? "#9ca3af"
                : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            {loading ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Booking;