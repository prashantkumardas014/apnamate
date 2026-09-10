// src/components/auth/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import { API_BASE_URL } from "../../config";

function Login({ setUser }) {
  const [email, setEmail] = useState("admin@apnamate.com");
  const [password, setPassword] = useState("Admin@123");
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

        // Redirect after a short delay
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

  return (
    <div className="login-page">
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          {/* ============================== */}
          {/* HEADER WITH CENTERED LOGO */}
          {/* ============================== */}
          <div className="login-header">
            <div className="logo">
              <svg className="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
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
            <button type="button" className="social-btn google">
              <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C14.5,4.73 15.92,5.59 16.8,6.47L18.83,4.59C17.02,2.98 14.86,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,12.13 21.48,11.5 21.35,11.1Z"/>
              </svg>
              Google
            </button>
            <button type="button" className="social-btn github">
              <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.83,16.41C14.16,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
              GitHub
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