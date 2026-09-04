import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CustomerProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load customer
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "customer") {
      navigate("/provider-dashboard");
      return;
    }

    setUser(parsedUser);
    loadProfile(parsedUser.id);
  }, [navigate]);

  // Get profile from backend
  const loadProfile = async (customerId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/customer-profile/${customerId}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Unable to load profile");
        return;
      }

      setName(data.name);
      setEmail(data.email);
    } catch (error) {
      console.error("Profile loading error:", error);
      setMessage("Unable to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  // Save profile
  const handleSave = async (e) => {
    e.preventDefault();

    if (!user) return;

    setSaving(true);
    setMessage("");

    try {
      const url =
        `http://127.0.0.1:8000/bookings/customer-profile/${user.id}` +
        `?name=${encodeURIComponent(name)}` +
        `&email=${encodeURIComponent(email)}`;

      const response = await fetch(url, {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail || "Unable to update profile"
        );
        return;
      }

      // Update localStorage
      const updatedUser = {
        ...user,
        name: data.customer.name,
        email: data.customer.email,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setName(data.customer.name);
      setEmail(data.customer.email);

      setMessage("Profile updated successfully! ✅");
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage("Unable to connect to backend");
    } finally {
      setSaving(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h2>Loading profile...</h2>
      </div>
    );
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
          maxWidth: "700px",
          margin: "0 auto 25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#64748b",
            color: "white",
            cursor: "pointer",
          }}
        >
          ← Dashboard
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#dc2626",
            color: "white",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* PROFILE CARD */}

      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#2563eb",
            marginBottom: "10px",
          }}
        >
          My Profile 👤
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            marginBottom: "30px",
          }}
        >
          Manage your ApnaMate account information.
        </p>

        <form onSubmit={handleSave}>

          {/* NAME */}

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Full Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />

          {/* EMAIL */}

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          {/* ROLE */}

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Account Type
          </label>

          <input
            type="text"
            value="Customer"
            disabled
            style={{
              ...inputStyle,
              backgroundColor: "#f1f5f9",
              color: "#64748b",
            }}
          />

          {/* SAVE */}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "13px",
              marginTop: "10px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "7px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {/* MESSAGE */}

        {message && (
          <p
            style={{
              textAlign: "center",
              marginTop: "20px",
              color: message.includes("successfully")
                ? "#16a34a"
                : "#dc2626",
              fontWeight: "bold",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "20px",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  fontSize: "15px",
};

export default CustomerProfile;