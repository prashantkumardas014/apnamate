// src/pages/Services.jsx
import { useNavigate } from "react-router-dom";
/* eslint-disable react/set-state-in-effect */
import { useState, useEffect } from "react";

function Services() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ==============================
  // CHECK USER LOGIN
  // ==============================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch (e) {
      console.error("Error parsing user:", e);
      navigate("/login");
    }
  }, [navigate]);

  // ==============================
  // SERVICES DATA
  // ==============================

  const services = [
    {
      id: 1,
      name: "Electrician",
      icon: "⚡",
      description: "Electrical repair, wiring, and installation services",
      category: "Home Services",
      popular: true,
    },
    {
      id: 2,
      name: "Plumber",
      icon: "🚰",
      description: "Plumbing repair, pipe fitting, and maintenance",
      category: "Home Services",
      popular: true,
    },
    {
      id: 3,
      name: "AC Repair",
      icon: "❄️",
      description: "AC repair, servicing, and installation",
      category: "Home Services",
      popular: false,
    },
    {
      id: 4,
      name: "Cleaning",
      icon: "🧹",
      description: "Professional home and office cleaning services",
      category: "Home Services",
      popular: false,
    },
    {
      id: 5,
      name: "Computer Repair",
      icon: "💻",
      description: "Computer, laptop, and hardware repair",
      category: "Tech Services",
      popular: false,
    },
    {
      id: 6,
      name: "Appliance Repair",
      icon: "🔌",
      description: "Home appliance repair and maintenance",
      category: "Home Services",
      popular: false,
    },
    {
      id: 7,
      name: "Carpenter",
      icon: "🪚",
      description: "Woodwork, furniture repair, and installation",
      category: "Home Services",
      popular: false,
    },
    {
      id: 8,
      name: "Painter",
      icon: "🎨",
      description: "Interior and exterior painting services",
      category: "Home Services",
      popular: false,
    },
    {
      id: 9,
      name: "Mechanic",
      icon: "🔩",
      description: "Vehicle repair and maintenance services",
      category: "Auto Services",
      popular: false,
    },
  ];

  // ==============================
  // FILTER SERVICES
  // ==============================

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==============================
  // HANDLE SERVICE SELECTION
  // ==============================

  const handleServiceClick = (service) => {
    navigate("/providers", {
      state: {
        selectedService: service.name,
      },
    });
  };

  // ==============================
  // HANDLE LOGOUT
  // ==============================

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  };

  // ==============================
  // RENDER
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
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <h2
          style={{ margin: 0, cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          🔧 ApnaMate
        </h2>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "10px 18px",
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            👋 {user?.name || "User"}
          </span>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
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
            📊 Dashboard
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "10px 18px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* ============================== */}
      {/* MAIN CONTENT */}
      {/* ============================== */}

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ marginBottom: "10px", fontSize: "36px" }}>
            🛠️ Our Services
          </h1>
          <p
            style={{
              color: "#666",
              fontSize: "18px",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Choose a service you need and find the best professionals near you.
          </p>
        </div>

        {/* ============================== */}
        {/* SEARCH BAR */}
        {/* ============================== */}

        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "30px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "20px" }}>🔍</span>
            <input
              type="text"
              placeholder="Search services by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "15px",
                outline: "none",
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#e5e7eb",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* ============================== */}
        {/* RESULTS COUNT */}
        {/* ============================== */}

        <p
          style={{
            color: "#666",
            marginBottom: "20px",
          }}
        >
          Showing <strong>{filteredServices.length}</strong> service
          {filteredServices.length !== 1 ? "s" : ""}
          {searchTerm && filteredServices.length === 0 && (
            <span style={{ color: "#dc2626", marginLeft: "10px" }}>
              ❌ No services found for "{searchTerm}"
            </span>
          )}
        </p>

        {/* ============================== */}
        {/* SERVICE CARDS */}
        {/* ============================== */}

        {filteredServices.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "25px",
            }}
          >
            {filteredServices.map((service) => (
              <div
                key={service.id}
                style={{
                  backgroundColor: "white",
                  padding: "30px 25px",
                  borderRadius: "12px",
                  textAlign: "center",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "pointer",
                  position: "relative",
                  border: service.popular ? "2px solid #2563eb" : "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onClick={() => handleServiceClick(service)}
              >
                {/* POPULAR BADGE */}
                {service.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    ⭐ Popular
                  </div>
                )}

                {/* ICON */}
                <div
                  style={{
                    fontSize: "56px",
                    marginBottom: "15px",
                    display: "block",
                  }}
                >
                  {service.icon}
                </div>

                {/* NAME */}
                <h2
                  style={{
                    margin: "10px 0 8px 0",
                    fontSize: "22px",
                    color: "#1f2937",
                  }}
                >
                  {service.name}
                </h2>

                {/* CATEGORY */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "20px",
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "12px",
                  }}
                >
                  {service.category}
                </span>

                {/* DESCRIPTION */}
                <p
                  style={{
                    color: "#666",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    marginBottom: "20px",
                    minHeight: "45px",
                  }}
                >
                  {service.description}
                </p>

                {/* BUTTON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleServiceClick(service);
                  }}
                  style={{
                    padding: "12px 30px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "15px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#1d4ed8";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#2563eb";
                  }}
                >
                  Find Provider →
                </button>
              </div>
            ))}
          </div>
        ) : (
          // ==============================
          // NO RESULTS
          // ==============================

          <div
            style={{
              backgroundColor: "white",
              padding: "60px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>🔍</div>
            <h2 style={{ marginBottom: "10px" }}>No Services Found</h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              We couldn't find any services matching "{searchTerm}".
              <br />
              Try searching with a different keyword.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                padding: "12px 24px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* ============================== */}
        {/* QUICK STATS */}
        {/* ============================== */}

        {filteredServices.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
              marginTop: "40px",
              padding: "20px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2563eb" }}>
                {services.length}
              </div>
              <div style={{ color: "#666", fontSize: "14px" }}>Total Services</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>
                {services.filter(s => s.popular).length}
              </div>
              <div style={{ color: "#666", fontSize: "14px" }}>Popular Services</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
                {new Set(services.map(s => s.category)).size}
              </div>
              <div style={{ color: "#666", fontSize: "14px" }}>Categories</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Services;