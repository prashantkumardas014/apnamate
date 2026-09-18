// frontend/src/pages/EditProfile.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../styles/EditProfile.css";

export default function EditProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    location: "",
    service: "",
    experience: "",
    category: "",
    bio: "",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarStatus, setAadhaarStatus] = useState(null);   // {verified, last4}
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { navigate("/login"); return; }
    const u = JSON.parse(raw);
    setUser(u);

    // Fetch fresh data from backend
    const token = localStorage.getItem("accessToken");
    fetch(`${API_BASE_URL}/bookings/profile/${u.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) return;
        const p = data.user;
        setForm({
          name: p.name || "",
          phone: p.phone || "",
          location: p.location || "",
          service: p.service || "",
          experience: p.experience || "",
          category: p.category || "",
          bio: p.experience || "",
        });
        setAvatarPreview(p.avatar_url || p.profile_picture || "");
        setAadhaarStatus({
          verified: !!p.aadhaar_verified,
          last4: p.aadhaar_last4,
        });
      })
      .catch((e) => console.warn("Profile fetch failed:", e));
  }, [navigate]);

  const showMessage = (text, type = "info") => {
    if (type === "error") setError(text);
    else setMessage(text);
    setTimeout(() => { setMessage(""); setError(""); }, 4000);
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const pickAvatar = () => fileRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview while uploading
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);

    try {
      const token = localStorage.getItem("accessToken");
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE_URL}/profile/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      setAvatarPreview(data.avatar_url);
      showMessage("✅ Avatar updated!");
    } catch (err) {
      showMessage(err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("accessToken");

      // ---- 1. Update basic fields via /bookings/profile/{id} ----
      // This endpoint handles name, phone, location, service, experience, category
      // (Note: 'phone' is applied directly even though ProfileUpdate schema doesn't list it)
      const basicBody = {
        name: form.name,
        service: form.service,
        location: form.location,
        experience: form.experience,
        category: form.category,
      };

      const r1 = await fetch(`${API_BASE_URL}/bookings/profile/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(basicBody),
      });
      if (!r1.ok) {
        const err = await r1.json().catch(() => ({}));
        throw new Error(err.detail || "Update failed");
      }

      // ---- 2. Update phone via the /profile/me endpoint (custom route) ----
      if (form.phone) {
        const r2 = await fetch(`${API_BASE_URL}/profile/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phone: form.phone }),
        });
        // Don't hard-fail if phone wasn't accepted
        if (!r2.ok) {
          console.warn("Phone update skipped:", await r2.text());
        }
      }

      // ---- 3. Update localStorage so navbar reflects the new name ----
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: form.name }));

      showMessage("✅ Profile saved!");
      // ✅ Full reload so /profile re-fetches fresh data
      setTimeout(() => { window.location.hash = "#/profile"; }, 700);
    } catch (err) {
      showMessage(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const verifyAadhaar = async () => {
    const digits = aadhaar.replace(/\D/g, "");
    if (digits.length !== 12) {
      showMessage("Aadhaar must be 12 digits", "error");
      return;
    }

    setVerifyingAadhaar(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/profile/me/verify-aadhaar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aadhaar_number: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed");

      setAadhaarStatus({ verified: true, last4: data.aadhaar_last4 });
      setAadhaar("");
      showMessage("✅ Aadhaar verified!");
    } catch (err) {
      showMessage(err.message, "error");
    } finally {
      setVerifyingAadhaar(false);
    }
  };

  if (!user) return null;

  const isProvider = user.role === "provider";

  return (
    <div className="edit-profile-root">
      <div className="edit-profile-hero">
        <button className="back-btn" onClick={() => navigate("/profile")}>
          ← Back to Profile
        </button>
        <h1>Edit Profile</h1>
        <p>Keep your account details up to date</p>
      </div>

      <div className="edit-profile-body">
        {error && <div className="banner error">{error}</div>}
        {message && <div className="banner success">{message}</div>}

        {/* AVATAR */}
        <div className="card">
          <h2 className="card-title">Profile Photo</h2>
          <div className="avatar-row">
            <div className="avatar-box">
              {avatarPreview ? (
                <img
                  src={
                    avatarPreview.startsWith("blob:") ||
                    avatarPreview.startsWith("http")
                      ? avatarPreview
                      : `${API_BASE_URL}${avatarPreview}`
                  }
                  alt="avatar"
                />
              ) : (
                <span>{(form.name || "?").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                ref={fileRef}
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
              <button
                className="btn-primary"
                onClick={pickAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading…" : "📷 Upload New Photo"}
              </button>
              <p className="hint">PNG, JPG or WebP · max 5 MB</p>
            </div>
          </div>
        </div>

        {/* BASIC INFO */}
        <form onSubmit={submit} className="card">
          <h2 className="card-title">Basic Information</h2>

          <div className="field">
            <label>Full Name</label>
            <input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="field">
            <label>Location / City</label>
            <input
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g. Masat"
            />
          </div>

          {isProvider && (
            <>
              <div className="field">
                <label>Service</label>
                <input
                  value={form.service}
                  onChange={(e) => handleChange("service", e.target.value)}
                  placeholder="e.g. Appliance Repair"
                />
              </div>
              <div className="field">
                <label>Experience</label>
                <input
                  value={form.experience}
                  onChange={(e) => handleChange("experience", e.target.value)}
                  placeholder="e.g. 3 years"
                />
              </div>
              <div className="field">
                <label>Category</label>
                <input
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  placeholder="e.g. Home Services"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </form>

        {/* AADHAAR VERIFICATION */}
        <div className="card">
          <h2 className="card-title">🛡️ Identity Verification</h2>

          {aadhaarStatus?.verified ? (
            <div className="verified-badge">
              <span className="check">✅</span>
              <div>
                <strong>Aadhaar Verified</strong>
                <p>•••• •••• {aadhaarStatus.last4}</p>
              </div>
            </div>
          ) : (
            <>
              <p className="hint">
                Verifying your Aadhaar adds a <strong>Verified badge</strong> to your profile —
                customers trust verified providers up to 3× more.
              </p>
              <div className="field">
                <label>Aadhaar Number</label>
                <input
                  value={aadhaar}
                  onChange={(e) =>
                    setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))
                  }
                  placeholder="12-digit number"
                  inputMode="numeric"
                  maxLength={12}
                />
              </div>
              <button
                className="btn-primary"
                onClick={verifyAadhaar}
                disabled={verifyingAadhaar || aadhaar.length !== 12}
              >
                {verifyingAadhaar ? "Verifying…" : "Verify Aadhaar"}
              </button>
              <p className="hint small">
                We only store the last 4 digits. Your full Aadhaar number is never saved.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}