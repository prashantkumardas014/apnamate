import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Providers() {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedService =
    location.state?.selectedService || "Service";

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==============================
  // SEARCH & FILTER STATES
  // ==============================

  const [searchName, setSearchName] = useState("");
  const [serviceFilter, setServiceFilter] =
    useState(selectedService !== "Service"
      ? selectedService
      : "All");

  const [locationFilter, setLocationFilter] =
    useState("All");

  const [sortBy, setSortBy] = useState("rating");

  // ==============================
  // LOAD PROVIDERS
  // ==============================

  useEffect(() => {
    fetch("http://127.0.0.1:8000/bookings/providers")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load providers");
        }

        return response.json();
      })
      .then((data) => {
        setProviders(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Provider error:", error);
        setError("Unable to load providers.");
        setLoading(false);
      });
  }, []);

  // ==============================
  // SERVICE OPTIONS
  // ==============================

  const serviceOptions = [
    "All",
    ...new Set(
      providers
        .map((provider) => provider.service)
        .filter(Boolean)
    ),
  ];

  // ==============================
  // LOCATION OPTIONS
  // ==============================

  const locationOptions = [
    "All",
    ...new Set(
      providers
        .map((provider) => provider.location)
        .filter(Boolean)
    ),
  ];

  // ==============================
  // SEARCH + FILTER + SORT
  // ==============================

  const filteredProviders = providers
    .filter((provider) => {
      // Search by provider name
      const matchesName =
        provider.name
          ?.toLowerCase()
          .includes(searchName.toLowerCase());

      // Filter by service
      const matchesService =
        serviceFilter === "All" ||
        provider.service === serviceFilter;

      // Filter by location
      const matchesLocation =
        locationFilter === "All" ||
        provider.location === locationFilter;

      return (
        matchesName &&
        matchesService &&
        matchesLocation
      );
    })
    .sort((a, b) => {
      // ==============================
      // SORT BY RATING
      // ==============================

      if (sortBy === "rating-high") {
        const ratingA =
          parseFloat(a.rating) || 0;

        const ratingB =
          parseFloat(b.rating) || 0;

        return ratingB - ratingA;
      }

      if (sortBy === "rating-low") {
        const ratingA =
          parseFloat(a.rating) || 0;

        const ratingB =
          parseFloat(b.rating) || 0;

        return ratingA - ratingB;
      }

      // Alphabetical
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      return 0;
    });

  // ==============================
  // RESET FILTERS
  // ==============================

  const handleResetFilters = () => {
    setSearchName("");

    setServiceFilter(
      selectedService !== "Service"
        ? selectedService
        : "All"
    );

    setLocationFilter("All");

    setSortBy("rating");
  };

  // ==============================
  // SELECT PROVIDER
  // ==============================

  const handleSelectProvider = (provider) => {
    // Prevent booking unavailable provider
    if (provider.availability === "Unavailable") {
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
          availability: provider.availability,
        },
        service:
          serviceFilter !== "All"
            ? serviceFilter
            : provider.service,
      },
    });
  };

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
        <h2 style={{ margin: 0 }}>
          ApnaMate
        </h2>

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
          Dashboard
        </button>
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
          }}
        >
          ← Back to Services
        </button>

        <h1>{selectedService} Providers</h1>

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

        {!loading && !error && (
          <div
            style={{
              backgroundColor: "white",
              padding: "25px",
              borderRadius: "12px",
              marginBottom: "30px",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08)",
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
              <label>
                <strong>Search Provider</strong>
              </label>

              <input
                type="text"
                placeholder="Search by provider name..."
                value={searchName}
                onChange={(e) =>
                  setSearchName(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* FILTER ROW */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
              }}
            >
              {/* SERVICE FILTER */}

              <div>
                <label>
                  <strong>Service</strong>
                </label>

                <select
                  value={serviceFilter}
                  onChange={(e) =>
                    setServiceFilter(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  {serviceOptions.map((service) => (
                    <option
                      key={service}
                      value={service}
                    >
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              {/* LOCATION FILTER */}

              <div>
                <label>
                  <strong>Location</strong>
                </label>

                <select
                  value={locationFilter}
                  onChange={(e) =>
                    setLocationFilter(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  {locationOptions.map((location) => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* SORT */}

              <div>
                <label>
                  <strong>Sort By</strong>
                </label>

                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="rating">
                    Default
                  </option>

                  <option value="rating-high">
                    ⭐ Rating: High to Low
                  </option>

                  <option value="rating-low">
                    ⭐ Rating: Low to High
                  </option>

                  <option value="name">
                    Name: A to Z
                  </option>
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
            <h2>Loading providers...</h2>
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
            }}
          >
            {error}
          </div>
        )}

        {/* ============================== */}
        {/* RESULTS COUNT */}
        {/* ============================== */}

        {!loading && !error && (
          <p
            style={{
              color: "#555",
              marginBottom: "20px",
            }}
          >
            Showing{" "}
            <strong>
              {filteredProviders.length}
            </strong>{" "}
            provider
            {filteredProviders.length !== 1
              ? "s"
              : ""}
          </p>
        )}

        {/* ============================== */}
        {/* PROVIDERS */}
        {/* ============================== */}

        {!loading &&
          !error &&
          filteredProviders.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {filteredProviders.map((provider) => {
                const isAvailable =
                  provider.availability !==
                  "Unavailable";

                const providerRating =
                  parseFloat(provider.rating);

                return (
                  <div
                    key={provider.id}
                    style={{
                      backgroundColor: "white",
                      padding: "25px",
                      borderRadius: "12px",
                      boxShadow:
                        "0 4px 12px rgba(0,0,0,0.08)",
                      opacity: isAvailable
                        ? 1
                        : 0.75,
                    }}
                  >
                    {/* PROFILE ICON */}

                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "#dbeafe",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "28px",
                        marginBottom: "15px",
                      }}
                    >
                      👨‍🔧
                    </div>

                    {/* NAME */}

                    <h2
                      style={{
                        marginBottom: "8px",
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
                        backgroundColor:
                          isAvailable
                            ? "#dcfce7"
                            : "#fee2e2",
                        color: isAvailable
                          ? "#166534"
                          : "#991b1b",
                      }}
                    >
                      {isAvailable
                        ? "🟢 Available"
                        : "🔴 Currently Unavailable"}
                    </div>

                    {/* SERVICE */}

                    <p>
                      <strong>Service:</strong>{" "}
                      {provider.service}
                    </p>

                    {/* RATING */}

                    <p>
                      <strong>Average Rating:</strong>{" "}
                      {providerRating
                        ? `⭐ ${providerRating.toFixed(
                            1
                          )} / 5`
                        : "⭐ New Provider"}
                    </p>

                    {/* LOCATION */}

                    <p>
                      <strong>Location:</strong>{" "}
                      📍 {provider.location}
                    </p>

                    {/* EXPERIENCE */}

                    <p>
                      <strong>Experience:</strong>{" "}
                      {provider.experience ||
                        "Not specified"}
                    </p>

                    {/* PRICE */}

                    <p>
                      <strong>Price:</strong>{" "}
                      {provider.price ||
                        "Contact provider"}
                    </p>

                    {/* SELECT BUTTON */}

                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() =>
                        handleSelectProvider(
                          provider
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor:
                          isAvailable
                            ? "#2563eb"
                            : "#9ca3af",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: isAvailable
                          ? "pointer"
                          : "not-allowed",
                        fontWeight: "bold",
                        marginTop: "10px",
                      }}
                    >
                      {isAvailable
                        ? "Select Provider"
                        : "Currently Unavailable"}
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
          filteredProviders.length === 0 && (
            <div
              style={{
                backgroundColor: "white",
                padding: "40px",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <h2>
                No providers found
              </h2>

              <p>
                Try changing your search or filters.
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
    </div>
  );
}

export default Providers;