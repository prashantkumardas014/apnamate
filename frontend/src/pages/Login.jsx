import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("Logging in...");

    try {
      const url =
        "http://127.0.0.1:8000/login?email=" +
        encodeURIComponent(email) +
        "&password=" +
        encodeURIComponent(password);

      const response = await fetch(url, {
        method: "POST",
      });

      const data = await response.json();

      console.log("Backend response:", data);

      if (data.message === "Login successful") {
        // Save logged-in user
        const user = {
          id: data.user_id,
          name: data.name,
          email: email,
          role: data.role,
        };

        localStorage.setItem("user", JSON.stringify(user));

        setMessage(`Welcome, ${data.name}!`);

        // ADMIN
        if (data.role === "admin") {
          navigate("/admin-dashboard");
        }

        // PROVIDER
        else if (data.role === "provider") {
          navigate("/provider-dashboard");
        }

        // CUSTOMER
        else {
          navigate("/dashboard");
        }
      } else {
        setMessage(data.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Unable to connect to backend");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "10px",
          width: "350px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#2563eb",
            marginBottom: "25px",
          }}
        >
          ApnaMate Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Login
        </button>

        {message && (
          <p
            style={{
              textAlign: "center",
              marginTop: "15px",
            }}
          >
            {message}
          </p>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            style={{
              color: "#2563eb",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Register
          </span>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  boxSizing: "border-box",
  border: "1px solid #ccc",
  borderRadius: "6px",
};

export default Login;