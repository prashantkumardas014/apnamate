// frontend/src/pages/LoginPhone.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../styles/PhoneAuth.css";

export default function LoginPhone() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/phone/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");

      navigate("/verify-otp", {
        state: { phone: data.phone, dev_code: data.dev_code || "" },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-auth-root">
      <div className="phone-auth-card">
        <div className="phone-auth-brand">🔧 ApnaMate</div>
        <h1>Login with Phone</h1>
        <p className="phone-auth-sub">
          We'll text you a 6-digit verification code
        </p>

        <form onSubmit={submit}>
          <div className="phone-input-wrap">
            <span className="phone-prefix">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              disabled={loading}
              autoFocus
              maxLength={10}
            />
          </div>

          {error && <div className="phone-auth-error">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="phone-auth-primary"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>

        <p className="phone-auth-foot">
          Prefer email? <Link to="/login">Sign in with email</Link>
        </p>
      </div>
    </div>
  );
}
