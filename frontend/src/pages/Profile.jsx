// frontend/src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../styles/Profile.css";

const ROLE_META = {
  customer: { label: "Customer", emoji: "🙋", color: "#2563eb" },
  provider: { label: "Provider", emoji: "🔧", color: "#16a34a" },
  admin:    { label: "Admin",    emoji: "🛡️", color: "#7c3aed" },
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Stars({ value }) {
  const v = Math.round(value || 0);
  return <span className="stars">{"★".repeat(v)}{"☆".repeat(5 - v)}</span>;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Provider-only form state
  const [availability, setAvailability] = useState("Available");
  const [upiId, setUpiId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
    if (type !== "error") setTimeout(() => setMessage(""), 4000);
  };

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      loadProfile(u.id);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadProfile = async (userId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/bookings/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to load profile");
      const data = await res.json();
      const u = data.user || {};

      setProfile(u);
      setAvailability(u.availability || "Available");
      setUpiId(u.upi_id || "");
      setMinPrice(u.min_price ? String(u.min_price) : "");
      setMaxPrice(u.max_price ? String(u.max_price) : "");
    } catch (e) {
      showMessage(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const saveProviderSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");

      const aRes = await fetch(
        `${API_BASE_URL}/bookings/availability/${user.id}?availability=${encodeURIComponent(availability)}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!aRes.ok) throw new Error("Failed to save availability");

      const body = {};
      if (upiId.trim()) body.upi_id = upiId.trim();
      if (minPrice) body.min_price = Number(minPrice);
      if (maxPrice) body.max_price = Number(maxPrice);

      if (Object.keys(body).length) {
        const pRes = await fetch(`${API_BASE_URL}/bookings/profile/${user.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (!pRes.ok) throw new Error("Failed to save profile");
      }

      showMessage("✅ Profile updated", "success");
      loadProfile(user.id);
    } catch (e) {
      showMessage(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-root" style={{ padding: 40 }}>
        <div className="skeleton" style={{ height: 120, maxWidth: 1100, margin: "0 auto" }} />
      </div>
    );
  }

  if (!profile || !user) return null;

  const role = profile.role || user.role || "customer";
  const meta = ROLE_META[role] || ROLE_META.customer;

  const ps = profile.provider_stats || {};
  const stats = profile.stats || {};
  const totalReviews = ps.total_reviews || 0;
  const avgRating = ps.rating || 0;
  const dist = ps.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const recentReviews = ps.recent_reviews || [];

  // ✅ Avatar: prefer uploaded avatar_url, then profile_picture (OAuth), else initials
  const avatarSrc = profile.avatar_url
    ? (profile.avatar_url.startsWith("http")
        ? profile.avatar_url
        : `${API_BASE_URL}${profile.avatar_url}`)
    : profile.profile_picture || null;

  const aadhaarVerified = !!profile.aadhaar_verified;

  const providerIncomplete =
    role === "provider" && (!profile.service || !profile.location);

  return (
    <div className="profile-root">
      {/* HERO */}
      <div className="profile-hero">
        <div className="profile-hero-inner">
          {/* Avatar (image or initials) */}
          <div className="profile-avatar">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profile.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              initials(profile.name)
            )}
          </div>

          <div>
            <h1 className="profile-name">
              {profile.name || "Your Profile"}
              {aadhaarVerified && (
                <span
                  title="Aadhaar Verified"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    marginLeft: 10,
                    padding: "3px 10px",
                    background: "rgba(34,197,94,0.25)",
                    border: "1px solid rgba(34,197,94,0.55)",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#dcfce7",
                    verticalAlign: "middle",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  ✅ Verified
                </span>
              )}
            </h1>
            {profile.service && (
              <p className="profile-sub">{profile.service}</p>
            )}
            {profile.location && (
              <p className="profile-sub">📍 {profile.location}</p>
            )}
            <span className="profile-role-badge">
              {meta.emoji} {meta.label}
            </span>
          </div>

          <div className="profile-hero-actions">
            {/* ✅ Always-available Edit button */}
            <button
              className="btn-hero"
              onClick={() => navigate("/profile/edit")}
              title="Edit profile, avatar & verification"
            >
              ✏️ Edit Profile
            </button>

            {role === "customer" && (
              <>
                <button className="btn-hero" onClick={() => navigate("/my-bookings")}>
                  📋 My Bookings
                </button>
                <button className="btn-hero primary" onClick={() => navigate("/services")}>
                  ➕ Book a Service
                </button>
              </>
            )}
            {role === "provider" && (
              <>
                <button className="btn-hero" onClick={() => navigate("/provider-dashboard")}>
                  📊 Dashboard
                </button>
                <button className="btn-hero primary" onClick={() => navigate("/my-bookings")}>
                  📋 My Bookings
                </button>
              </>
            )}
            {role === "admin" && (
              <>
                <button className="btn-hero" onClick={() => navigate("/admin-dashboard")}>
                  🛡️ Admin Panel
                </button>
                <button className="btn-hero primary" onClick={() => navigate("/admin/payments")}>
                  💳 Payments
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="profile-body">
        {/* LEFT COLUMN */}
        <div>
          {message && (
            <div
              className="card"
              style={{
                borderLeft: `4px solid ${
                  messageType === "error" ? "#dc2626"
                    : messageType === "success" ? "#16a34a"
                    : "#2563eb"
                }`,
                color:
                  messageType === "error" ? "#991b1b"
                    : messageType === "success" ? "#166534"
                    : "#1e40af",
                fontWeight: 700,
                padding: "14px 18px",
              }}
            >
              {message}
            </div>
          )}

          {/* Stats */}
          <div className="card">
            <h2 className="card-title">📊 At a Glance</h2>

            {role === "provider" ? (
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <p className="stat-value">{avgRating || "—"}</p>
                  <p className="stat-label">Avg Rating</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💬</div>
                  <p className="stat-value">{totalReviews}</p>
                  <p className="stat-label">Reviews</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <p className="stat-value">{ps.total_bookings || 0}</p>
                  <p className="stat-label">Total Bookings</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <p className="stat-value">{ps.status_counts?.completed || 0}</p>
                  <p className="stat-label">Completed</p>
                </div>
              </div>
            ) : (
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <p className="stat-value">{stats.total || 0}</p>
                  <p className="stat-label">Bookings</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <p className="stat-value">{stats.completed || 0}</p>
                  <p className="stat-label">Completed</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💵</div>
                  <p className="stat-value">{stats.paid || 0}</p>
                  <p className="stat-label">Paid</p>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🔜</div>
                  <p className="stat-value">{stats.upcoming || 0}</p>
                  <p className="stat-label">Upcoming</p>
                </div>
              </div>
            )}
          </div>

          {/* Verification card */}
          <div className="card">
            <h2 className="card-title">🛡️ Identity Verification</h2>
            {aadhaarVerified ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>✅</span>
                <div>
                  <strong style={{ color: "#166534", display: "block", marginBottom: 2 }}>
                    Aadhaar Verified
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      color: "#15803d",
                      fontFamily: "monospace",
                      fontSize: 14,
                    }}
                  >
                    •••• •••• {profile.aadhaar_last4 || "----"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="card-subtle">
                  Verify your Aadhaar to unlock the <strong>✅ Verified</strong> badge.
                  Verified profiles get up to <b>3× more trust</b>.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/profile/edit")}
                >
                  🛡️ Verify Aadhaar
                </button>
              </>
            )}
          </div>

          {/* Provider: Availability + Pricing */}
          {role === "provider" && (
            <div className="card">
              <h2 className="card-title">⚙️ Availability & Payouts</h2>
              <p className="card-subtle">
                Set your current status, hourly range, and UPI ID for payouts.
              </p>

              <div style={{ marginBottom: 18 }}>
                <p className="field-label" style={{ marginBottom: 8 }}>Current Status</p>
                <div className="pill-group">
                  <button
                    className={`pill ${availability === "Available" ? "active-available" : ""}`}
                    onClick={() => setAvailability("Available")}
                  >🟢 Available</button>
                  <button
                    className={`pill ${availability === "Busy" ? "active-busy" : ""}`}
                    onClick={() => setAvailability("Busy")}
                  >🟡 Busy</button>
                  <button
                    className={`pill ${availability === "Offline" ? "active-offline" : ""}`}
                    onClick={() => setAvailability("Offline")}
                  >🔴 Offline</button>
                </div>
              </div>

              <div className="field-row" style={{ marginBottom: 14 }}>
                <div className="field">
                  <label className="field-label">Min Price (₹)</label>
                  <input
                    className="field-input"
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="e.g. 200"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Max Price (₹)</label>
                  <input
                    className="field-input"
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="e.g. 800"
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label className="field-label">UPI ID (for payouts)</label>
                <input
                  className="field-input"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                />
              </div>

              <button
                className="btn-primary"
                onClick={saveProviderSettings}
                disabled={saving}
              >
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          )}

          {/* Provider: About */}
          {role === "provider" && (
            <div className="card">
              <h2 className="card-title">📋 About This Provider</h2>
              <div className="info-row">
                <span className="info-label">Service</span>
                <span className="info-value">{profile.service || "—"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location</span>
                <span className="info-value">{profile.location || "—"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Experience</span>
                <span className="info-value">{profile.experience || "—"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Category</span>
                <span className="info-value">{profile.category || "General"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Price Range</span>
                <span className="info-value">
                  ₹{profile.min_price || 0} – ₹{profile.max_price || 0}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className="info-value">
                  {profile.availability === "Available" ? "🟢 Available"
                    : profile.availability === "Busy" ? "🟡 Busy"
                    : "🔴 Offline"}
                </span>
              </div>
            </div>
          )}

          {/* Provider: Reviews */}
          {role === "provider" && (
            <div className="card">
              <h2 className="card-title">
                ⭐ Reviews {totalReviews > 0 && `(${totalReviews})`}
              </h2>

              {recentReviews.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-emoji">💬</div>
                  <p className="empty-title">No reviews yet</p>
                  <p className="empty-body">
                    Complete bookings to receive customer reviews and build your reputation.
                  </p>
                </div>
              ) : (
                recentReviews.map((r) => (
                  <div className="review-item" key={r.id}>
                    <div className="review-head">
                      <span className="review-name">{r.customer_name || "Customer"}</span>
                      <Stars value={r.rating} />
                    </div>
                    <p className="review-text">{r.comment}</p>
                    <div className="review-date">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* New / incomplete profile prompt */}
          {providerIncomplete && (
            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h2 className="card-title">⚠️ Complete Your Profile</h2>
              <p className="card-subtle">
                Providers with a filled-out profile get up to <b>3× more bookings</b>.
                Add your service and location to appear in search results.
              </p>
              <button
                className="btn-primary"
                onClick={() => navigate("/profile/edit")}
              >
                ✏️ Complete Profile
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <div className="card">
            <h2 className="card-title">📇 Contact</h2>
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{profile.name || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value" style={{ wordBreak: "break-all" }}>
                {profile.email || "—"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone</span>
              <span className="info-value">{profile.phone || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className="info-value">{meta.label}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Member since</span>
              <span className="info-value">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>

          {/* Rating summary for provider */}
          {role === "provider" && totalReviews > 0 && (
            <div className="card">
              <h2 className="card-title">🏆 Rating Breakdown</h2>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span className="rating-big">{avgRating}</span>
                <Stars value={avgRating} />
              </div>
              <p className="rating-meta" style={{ marginBottom: 12 }}>
                Based on {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </p>

              {[5, 4, 3, 2, 1].map((n) => {
                const count = dist[n] || 0;
                const pct = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div className="rating-bar-row" key={n}>
                    <span>{n}★</span>
                    <div className="rating-bar">
                      <div className="rating-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span style={{ textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card">
            <h2 className="card-title">⚡ Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn-primary"
                onClick={() => navigate("/profile/edit")}
              >
                ✏️ Edit Profile
              </button>
              <button className="btn-ghost" onClick={() => navigate("/notifications")}>
                🔔 Notifications
              </button>
              <button className="btn-ghost" onClick={() => navigate("/my-bills")}>
                🧾 My Bills
              </button>
              <button
                className="btn-ghost"
                style={{ borderColor: "#fecaca", color: "#dc2626" }}
                onClick={() => {
                  localStorage.removeItem("user");
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("isLoggedIn");
                  window.location.href = "/login";
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}