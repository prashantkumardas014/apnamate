import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProviderProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");

  const [availability, setAvailability] = useState("Available");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ==============================
  // LOAD PROVIDER PROFILE
  // ==============================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(storedUser);

    if (user.role !== "provider") {
      navigate("/dashboard");
      return;
    }

    fetch(`http://127.0.0.1:8000/bookings/profile/${user.id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        return response.json();
      })
      .then((data) => {
        setProfile(data);

        setService(data.service || "");
        setLocation(data.location || "");
        setExperience(data.experience || "");
        setPrice(data.price || "");

        setAvailability(data.availability || "Available");

        setLoading(false);
      })
      .catch((error) => {
        console.error("Profile error:", error);
        setMessage("Unable to load profile.");
        setLoading(false);
      });
  }, [navigate]);

  // ==============================
  // UPDATE PROFILE
  // ==============================

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profile) {
      return;
    }

    setSaving(true);
    setMessage("Saving profile...");

    try {
      const url =
        "http://127.0.0.1:8000/bookings/profile/" +
        `${profile.id}?` +
        "service=" +
        encodeURIComponent(service) +
        "&location=" +
        encodeURIComponent(location) +
        "&experience=" +
        encodeURIComponent(experience) +
        "&price=" +
        encodeURIComponent(price);

      const response = await fetch(url, {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update profile");
      }

      setProfile(data.provider);

      setService(data.provider.service || "");
      setLocation(data.provider.location || "");
      setExperience(data.provider.experience || "");
      setPrice(data.provider.price || "");

      setAvailability(data.provider.availability || "Available");

      setMessage("Profile updated successfully! ✅");
    } catch (error) {
      console.error("Update profile error:", error);

      setMessage(error.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ==============================
  // UPDATE AVAILABILITY
  // ==============================

  const handleAvailabilityChange = async (newAvailability) => {
    if (!profile) {
      return;
    }

    setAvailability(newAvailability);
    setMessage("Updating availability...");

    try {
      const url =
        `http://127.0.0.1:8000/bookings/availability/${profile.id}` +
        `?availability=${encodeURIComponent(newAvailability)}`;

      const response = await fetch(url, {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update availability");
      }

      setAvailability(data.availability);

      setProfile((previous) => ({
        ...previous,
        availability: data.availability,
      }));

      setMessage(`Availability changed to ${data.availability} ✅`);
    } catch (error) {
      console.error("Availability error:", error);

      setMessage(error.message || "Unable to update availability.");
    }
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f7fb",
        }}
      >
        <h2>Loading profile...</h2>
      </div>
    );
  }

  // ==============================
  // PAGE
  // ==============================

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
        }}
      >
        <h2 style={{ margin: 0 }}>ApnaMate</h2>

        <button
          type="button"
          onClick={() => navigate("/provider-dashboard")}
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

      {/* ============================== */}
      {/* MAIN */}
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
          onClick={() => navigate("/provider-dashboard")}
          style={{
            padding: "10px 18px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1>Provider Profile</h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Manage your professional information and availability.
        </p>

        {/* ============================== */}
        {/* AVAILABILITY */}
        {/* ============================== */}

        <div
          style={{
            backgroundColor: "white",
            padding: "25px",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2>Availability</h2>

          <p
            style={{
              color: "#666",
            }}
          >
            Let customers know whether you are currently available for bookings.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            {/* AVAILABLE */}

            <button
              type="button"
              onClick={() => handleAvailabilityChange("Available")}
              style={{
                padding: "15px",
                borderRadius: "8px",
                border: availability === "Available" ? "3px solid #16a34a" : "1px solid #ccc",
                backgroundColor: "#dcfce7",
                color: "#166534",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🟢
              <br />
              Available
            </button>

            {/* BUSY */}

            <button
              type="button"
              onClick={() => handleAvailabilityChange("Busy")}
              style={{
                padding: "15px",
                borderRadius: "8px",
                border: availability === "Busy" ? "3px solid #ca8a04" : "1px solid #ccc",
                backgroundColor: "#fef9c3",
                color: "#854d0e",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🟡
              <br />
              Busy
            </button>

            {/* OFFLINE */}

            <button
              type="button"
              onClick={() => handleAvailabilityChange("Offline")}
              style={{
                padding: "15px",
                borderRadius: "8px",
                border: availability === "Offline" ? "3px solid #dc2626" : "1px solid #ccc",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔴
              <br />
              Offline
            </button>
          </div>

          <p
            style={{
              marginTop: "20px",
              fontWeight: "bold",
            }}
          >
            Current Status:{" "}
            {availability === "Available" && "🟢 Available"}
            {availability === "Busy" && "🟡 Busy"}
            {availability === "Offline" && "🔴 Offline"}
          </p>
        </div>

        {/* ============================== */}
        {/* PROFILE FORM */}
        {/* ============================== */}

        <form
          onSubmit={handleSaveProfile}
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2>Professional Information</h2>

          {/* NAME */}

          <label>
            <strong>Name</strong>
          </label>

          <input
            type="text"
            value={profile?.name || ""}
            disabled
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "15px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
              backgroundColor: "#f3f4f6",
            }}
          />

          {/* EMAIL */}

          <label>
            <strong>Email</strong>
          </label>

          <input
            type="email"
            value={profile?.email || ""}
            disabled
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "15px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
              backgroundColor: "#f3f4f6",
            }}
          />

          {/* SERVICE */}

          <label>
            <strong>Service</strong>
          </label>

          <input
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Example: Electrician"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "15px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />

          {/* LOCATION */}

          <label>
            <strong>Location</strong>
          </label>

          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Example: Silvassa"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "15px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />

          {/* EXPERIENCE */}

          <label>
            <strong>Experience</strong>
          </label>

          <input
            type="text"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Example: 5 years"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "15px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />

          {/* PRICE */}

          <label>
            <strong>Price</strong>
          </label>

          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Example: ₹300 - ₹500"
            required
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              marginBottom: "20px",
              boxSizing: "border-box",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />

          {/* SAVE */}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "13px",
              backgroundColor: saving ? "#9ca3af" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

          {/* MESSAGE */}

          {message && (
            <p
              style={{
                textAlign: "center",
                marginTop: "20px",
                fontWeight: "bold",
              }}
            >
              {message}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}

export default ProviderProfile;