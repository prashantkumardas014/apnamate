// frontend/src/pages/VerifyOtp.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../styles/PhoneAuth.css";

export default function VerifyOtp({ setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, dev_code } = location.state || {};

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    if (!phone) navigate("/login-phone", { replace: true });
  }, [phone, navigate]);

  useEffect(() => {
    if (dev_code && /^\d{6}$/.test(dev_code)) {
      setDigits(dev_code.split(""));
      setInfo(`Dev mode: OTP pre-filled (${dev_code})`);
    }
  }, [dev_code]);

  useEffect(() => {
    if (!dev_code) inputs.current[0]?.focus();
  }, [dev_code]);

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (pasted.length) {
      e.preventDefault();
      setDigits(pasted.padEnd(6, " ").split("").slice(0, 6).map((c) => (c === " " ? "" : c)));
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/phone/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed");

      const user = {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
      };
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isLoggedIn", "true");
      if (data.token) localStorage.setItem("accessToken", data.token);
      if (typeof setUser === "function") setUser(user);

      let to = "/dashboard";
      if (user.role === "admin") to = "/admin-dashboard";
      else if (user.role === "provider") to = "/provider-dashboard";
      window.location.href = to;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/phone/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to resend");
      if (data.dev_code) {
        setDigits(data.dev_code.split(""));
        setInfo(`Dev mode: new OTP (${data.dev_code})`);
      } else {
        setInfo("New OTP sent!");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="phone-auth-root">
      <div className="phone-auth-card">
        <div className="phone-auth-brand">🔧 ApnaMate</div>
        <h1>Verify your phone</h1>
        <p className="phone-auth-sub">
          Enter the 6-digit code sent to <b>{phone}</b>
        </p>

        <form onSubmit={submit}>
          <div className="otp-inputs" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
              />
            ))}
          </div>

          {error && <div className="phone-auth-error">{error}</div>}
          {info && <div className="phone-auth-info">{info}</div>}

          <button type="submit" disabled={loading} className="phone-auth-primary">
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>
        </form>

        <p className="phone-auth-foot">
          Didn't get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              font: "inherit",
            }}
          >
            {resending ? "Sending..." : "Resend OTP"}
          </button>
          {" · "}
          <Link to="/login-phone">Change number</Link>
        </p>
      </div>
    </div>
  );
}
