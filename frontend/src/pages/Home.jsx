import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f7fb",
      }}
    >
      <h1 style={{ color: "#2563eb", fontSize: "40px" }}>
        Welcome to ApnaMate
      </h1>

      <p style={{ fontSize: "18px", color: "#555" }}>
        Your local service platform
      </p>

      <button
        onClick={() => navigate("/login")}
        style={{
          padding: "12px 30px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px",
          marginTop: "20px",
        }}
      >
        Login
      </button>

      <button
        onClick={() => navigate("/register")}
        style={{
          padding: "12px 30px",
          backgroundColor: "white",
          color: "#2563eb",
          border: "1px solid #2563eb",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px",
          marginTop: "10px",
        }}
      >
        Register
      </button>
    </div>
  );
}

export default Home;