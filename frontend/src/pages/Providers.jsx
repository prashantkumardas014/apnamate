// src/pages/Providers.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
/* eslint-disable react/set-state-in-effect, react/immutability */

function Providers() {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedService = location.state?.selectedService || "Service";

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // ==============================
  // SEARCH & FILTER STATES
  // ==============================

  const [searchName, setSearchName] = useState("");
  const [serviceFilter, setServiceFilter] = useState(
    selectedService !== "Service" ? selectedService : "All"
  );
  const [locationFilter, setLocationFilter] = useState("All");
  const [sortBy, setSortBy] = useState("rating-high");

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
  // LOAD PROVIDERS
  // ==============================

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/bookings/providers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to load providers");
      }

      const data = await response.json();
      console.log("📦 Providers data:", data);
      
      // ✅ FIX: Extract providers array from response
      if (data.success && data.providers) {
        setProviders(data.providers);
      } else {
        setProviders([]);
        setError("No providers found");
      }
      
      setLoading(false);

    } catch (error) {
      console.error("Provider error:", error);
      setError(error.message || "Unable to load providers. Please try again later.");
      setLoading(false);
    }
  };

  // ==============================
  // SERVICE OPTIONS
  // ==============================

  const serviceOptions = [
    "All",
    ...new Set(
      providers
        .map((provider) => provider?.service)
        .filter((service) => service && service.trim() !== "")
    ),
  ];

  // ==============================
  // LOCATION OPTIONS
  // ==============================

  const locationOptions = [
    "All",
    ...new Set(
      providers
        .map((provider) => provider?.location)
        .filter((location) => location && location.trim() !== "")
    ),
  ];

  // ==============================
  // SEARCH + FILTER + SORT
  // ==============================

  const filteredProviders = providers
    .filter((provider) => {
      // Search by provider name
      const matchesName = provider?.name
        ?.toLowerCase()
        .includes(searchName.toLowerCase().trim()) ?? true;

      // Filter by service
      const matchesService =
        serviceFilter === "All" || provider?.service === serviceFilter;

      // Filter by location
      const matchesLocation =
        locationFilter === "All" || provider?.location === locationFilter;

      return matchesName && matchesService && matchesLocation;
    })
    .sort((a, b) => {
      // Sort by Rating: High to Low
      if (sortBy === "rating-high") {
        const ratingA = parseFloat(a?.rating) || 0;
        const ratingB = parseFloat(b?.rating) || 0;
        return ratingB - ratingA;
      }

      // Sort by Rating: Low to High
      if (sortBy === "rating-low") {
        const ratingA = parseFloat(a?.rating) || 0;
        const ratingB = parseFloat(b?.rating) || 0;
        return ratingA - ratingB;
      }

      // Sort Alphabetical by Name
      if (sortBy === "name") {
        return (a?.name || "").localeCompare(b?.name || "");
      }

      // Sort by Price (Low to High)
      if (sortBy === "price-low") {
        const priceA = parseFloat(a?.price?.replace(/[^0-9.]/g, "")) || 0;
        const priceB = parseFloat(b?.price?.replace(/[^0-9.]/g, "")) || 0;
        return priceA - priceB;
      }

      // Sort by Price (High to Low)
      if (sortBy === "price-high") {
        const priceA = parseFloat(a?.price?.replace(/[^0-9.]/g, "")) || 0;
        const priceB = parseFloat(b?.price?.replace(/[^0-9.]/g, "")) || 0;
        return priceB - priceA;
      }

      return 0;
    });

  // ==============================
  // RESET FILTERS
  // ==============================

  const handleResetFilters = () => {
    setSearchName("");
    setServiceFilter(selectedService !== "Service" ? selectedService : "All");
    setLocationFilter("All");
    setSortBy("rating-high");
  };

  // ==============================
  // SELECT PROVIDER
  // ==============================

  const handleSelectProvider = (provider) => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Prevent booking unavailable provider
    if (provider?.availability === "Unavailable") {
      return;
    }

    navigate("/booking", {
      state: {
        provider: {
          id: provider.id,
          name: provider.name,
          service: provider.service,
          rating: provider.rating,
          location: provider.location,
          price: provider.price,
          experience: provider.experience,
          availability: provider.availability || "Available",
          category: provider.category,
        },
        service: serviceFilter !== "All" ? serviceFilter : provider.service,
        user: user,
      },
    });
  };

  // ==============================
  // LOGOUT
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
        <h2 style={{ margin: 0, cursor: "pointer" }} onClick={() => navigate("/")}>
          🔧 ApnaMate
        </h2>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
        {/* BACK BUTTON */}

        <button
          type="button"
          onClick={() => navigate("/services")}
          style={{
            padding: "10px 18px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ← Back to Services
        </button>

        <h1 style={{ marginBottom: "8px" }}>{selectedService} Providers</h1>
        <p
          style={{
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Find the right professional for your service.
        </p>

        {/* ============================== */}
        {/* SEARCH & FILTER PANEL */}
        {/* ============================== */}

        {!loading && !error && providers.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "25px",
              borderRadius: "12px",
              marginBottom: "30px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "20px",
              }}
            >
              🔎 Find a Provider
            </h2>

            {/* SEARCH */}

            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <label style={{ display: "block", marginBottom: "5px" }}>
                <strong>Search Provider</strong>
              </label>

              <input
                type="text"
                placeholder="Search by provider name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                  fontSize: "15px",
                }}
              />
            </div>

            {/* FILTER ROW */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
              }}
            >
              {/* SERVICE FILTER */}

              <div>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  <strong>Service</strong>
                </label>

                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                    fontSize: "15px",
                  }}
                >
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOCATION FILTER */}

              <div>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  <strong>Location</strong>
                </label>

                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                    fontSize: "15px",
                  }}
                >
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* SORT */}

              <div>
                <label style={{ display: "block", marginBottom: "5px" }}>
                  <strong>Sort By</strong>
                </label>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                    fontSize: "15px",
                  }}
                >
                  <option value="rating-high">⭐ Rating: High to Low</option>
                  <option value="rating-low">⭐ Rating: Low to High</option>
                  <option value="name">📝 Name: A to Z</option>
                  <option value="price-low">💰 Price: Low to High</option>
                  <option value="price-high">💰 Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* RESET */}

            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                marginTop: "20px",
                padding: "10px 18px",
                backgroundColor: "#e5e7eb",
                color: "#374151",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔄 Reset Filters
            </button>
          </div>
        )}

        {/* ============================== */}
        {/* LOADING */}
        {/* ============================== */}

        {loading && (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div className="loading-spinner" style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}></div>
            <h3>Loading providers...</h3>
            <p style={{ color: "#666" }}>Please wait while we find the best professionals for you.</p>
          </div>
        )}

        {/* ============================== */}
        {/* ERROR */}
        {/* ============================== */}

        {!loading && error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "20px",
              borderRadius: "10px",
              borderLeft: "4px solid #dc2626",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0" }}>❌ Error</h3>
            <p style={{ margin: 0 }}>{error}</p>
            <button
              onClick={fetchProviders}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* ============================== */}
        {/* RESULTS COUNT */}
        {/* ============================== */}

        {!loading && !error && providers.length > 0 && (
          <p
            style={{
              color: "#555",
              marginBottom: "20px",
            }}
          >
            Showing <strong>{filteredProviders.length}</strong> provider
            {filteredProviders.length !== 1 ? "s" : ""}
            {filteredProviders.length !== providers.length && (
              <span style={{ color: "#999", marginLeft: "8px" }}>
                (filtered from {providers.length} total)
              </span>
            )}
          </p>
        )}

        {/* ============================== */}
        {/* PROVIDERS */}
        {/* ============================== */}

        {!loading && !error && filteredProviders.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredProviders.map((provider) => {
              const isAvailable = provider?.availability !== "Unavailable";
              const providerRating = parseFloat(provider?.rating) || 0;
              const initial = provider?.name?.charAt(0) || "P";

              return (
                <div
                  key={provider.id}
                  style={{
                    backgroundColor: "white",
                    padding: "25px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    opacity: isAvailable ? 1 : 0.6,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: isAvailable ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => {
                    if (isAvailable) {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  }}
                >
                  {/* PROFILE ICON */}
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: isAvailable ? "#dbeafe" : "#e5e7eb",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: "28px",
                      marginBottom: "15px",
                      fontWeight: "bold",
                      color: isAvailable ? "#1e40af" : "#6b7280",
                    }}
                  >
                    {initial}
                  </div>

                  {/* NAME */}
                  <h2
                    style={{
                      marginBottom: "8px",
                      fontSize: "22px",
                    }}
                  >
                    {provider.name}
                  </h2>

                  {/* AVAILABILITY */}
                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontWeight: "bold",
                      fontSize: "14px",
                      marginBottom: "15px",
                      backgroundColor: isAvailable ? "#dcfce7" : "#fee2e2",
                      color: isAvailable ? "#166534" : "#991b1b",
                    }}
                  >
                    {isAvailable ? "🟢 Available" : "🔴 Unavailable"}
                  </div>

                  {/* SERVICE */}
                  <p style={{ margin: "6px 0" }}>
                    <strong>Service:</strong> {provider.service || "Not specified"}
                  </p>

                  {/* RATING */}
                  <p style={{ margin: "6px 0" }}>
                    <strong>Rating:</strong>{" "}
                    {providerRating > 0
                      ? `⭐ ${providerRating.toFixed(1)} / 5`
                      : "⭐ New Provider"}
                  </p>

                  {/* LOCATION */}
                  <p style={{ margin: "6px 0" }}>
                    <strong>Location:</strong> 📍 {provider.location || "Not specified"}
                  </p>

                  {/* EXPERIENCE */}
                  <p style={{ margin: "6px 0" }}>
                    <strong>Experience:</strong> {provider.experience || "Not specified"}
                  </p>

                  {/* PRICE */}
                  <p style={{ margin: "6px 0" }}>
                    <strong>Price:</strong> {provider.price || "Contact provider"}
                  </p>

                  {/* TOTAL BOOKINGS */}
                  <p style={{ margin: "6px 0" }}>
                    <strong>Total Bookings:</strong> {provider.total_bookings || 0}
                  </p>

                  {/* SELECT BUTTON */}
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => handleSelectProvider(provider)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: isAvailable ? "#2563eb" : "#9ca3af",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: isAvailable ? "pointer" : "not-allowed",
                      fontWeight: "bold",
                      marginTop: "15px",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (isAvailable) {
                        e.target.style.backgroundColor = "#1d4ed8";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isAvailable) {
                        e.target.style.backgroundColor = "#2563eb";
                      }
                    }}
                  >
                    {isAvailable ? "📅 Select Provider" : "Currently Unavailable"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================== */}
        {/* NO RESULTS */}
        {/* ============================== */}

        {!loading &&
          !error &&
          providers.length === 0 && (
            <div
              style={{
                backgroundColor: "white",
                padding: "40px",
                borderRadius: "12px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
              <h2 style={{ marginBottom: "8px" }}>No Providers Found</h2>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                We couldn't find any providers. Please check back later.
              </p>
              <button
                type="button"
                onClick={fetchProviders}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🔄 Refresh
              </button>
            </div>
          )}

        {/* ============================== */}
        {/* NO FILTER RESULTS */}
        {/* ============================== */}

        {!loading &&
          !error &&
          providers.length > 0 &&
          filteredProviders.length === 0 && (
            <div
              style={{
                backgroundColor: "white",
                padding: "40px",
                borderRadius: "12px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
              <h2 style={{ marginBottom: "8px" }}>No Matching Providers</h2>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Try adjusting your search or filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
      </main>

      {/* ============================== */}
      {/* SPINNER ANIMATION */}
      {/* ============================== */}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Providers;