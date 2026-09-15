// src/components/auth/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import { API_BASE_URL } from "../../config";

function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    console.log("🔐 Login attempt started...");
    setMessage("");

    if (!email || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setMessage("Logging in...");

    try {
      const loginData = {
        email: email.trim(),
        password: password,
      };

      console.log("📤 Sending login request:", loginData);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      console.log("📥 Backend response:", data);

      // ✅ Check if login was successful
      if (response.ok && data.success === true) {
        const user = {
          id: data.user_id,
          name: data.name,
          email: email.trim(),
          role: data.role,
          is_active: data.is_active !== undefined ? data.is_active : true,
        };

        // Save user data
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("isLoggedIn", "true");
        if (data.token) {
          localStorage.setItem("accessToken", data.token);
        }
        if (rememberMe) {
          localStorage.setItem("rememberEmail", email);
        } else {
          localStorage.removeItem("rememberEmail");
        }

        // Update App state
        if (setUser) {
          setUser(user);
        }

        console.log("💾 User saved:", user);
        console.log("👤 User role:", user.role);

        setMessage(`✅ Welcome, ${data.name}!`);

        // Determine redirect path
        let redirectPath = "/dashboard";
        if (user.role === "admin") {
          redirectPath = "/admin-dashboard";
        } else if (user.role === "provider") {
          redirectPath = "/provider-dashboard";
        }

        console.log(`➡️ Redirecting to: ${redirectPath}`);

        setTimeout(() => {
          window.location.href = redirectPath;
        }, 800);

      } else {
        // ❌ Login failed - show error
        const errorMessage = data.detail || data.message || "Invalid email or password";
        console.log("❌ Login failed:", errorMessage);
        setMessage(`❌ ${errorMessage}`);
        localStorage.removeItem("user");
        localStorage.removeItem("isLoggedIn");
        if (setUser) {
          setUser(null);
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setMessage("❌ Unable to connect to backend. Please check if the server is running.");
      setIsLoading(false);
    }
  };

  // ==============================
  // PHONE LOGIN
  // ==============================
  const handlePhoneLogin = () => {
    navigate("/login-phone");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          {/* HEADER WITH CENTERED LOGO */}
          <div className="login-header">
            <div className="logo">
              <img
                src="/logo.svg"
                alt="ApnaMate"
                width="52"
                height="52"
                style={{ display: "block" }}
              />
              <h1 className="logo-text">ApnaMate</h1>
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to continue to your account</p>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
              className={`form-input ${isLoading ? 'form-input-disabled' : ''}`}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className={`form-input ${isLoading ? 'form-input-disabled' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75C20.27 7.61 16 4.5 12 4.5c-1.6 0-3.14.39-4.54 1.08l2.62 2.62C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.73 10.39 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L21.73 23 23 21.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="forgot-link"
            >
              Forgot Password?
            </button>
          </div>

          {message && (
            <div className={`message ${message.includes("Welcome") || message.includes("✅") ? 'message-success' : 'message-error'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`login-button ${isLoading ? 'login-button-loading' : ''}`}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-login">
            <button
              type="button"
              className="social-btn phone"
              onClick={handlePhoneLogin}
            >
              <svg
                className="icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.21 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.46a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.57 1 1 0 0 1-.21 1.11l-2.2 2.11z"/>
              </svg>
              Continue with Phone
            </button>
          </div>

          <p className="register-link">
            Don't have an account? <Link to="/register">Sign up free</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;