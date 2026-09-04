import { useNavigate } from "react-router-dom";

function Services() {
  const navigate = useNavigate();

  const services = [
    {
      id: 1,
      name: "Electrician",
      icon: "⚡",
      description: "Electrical repair and installation",
    },
    {
      id: 2,
      name: "Plumber",
      icon: "🚰",
      description: "Plumbing repair and maintenance",
    },
    {
      id: 3,
      name: "AC Repair",
      icon: "❄️",
      description: "AC repair and servicing",
    },
    {
      id: 4,
      name: "Cleaning",
      icon: "🧹",
      description: "Home and office cleaning",
    },
    {
      id: 5,
      name: "Computer Repair",
      icon: "💻",
      description: "Computer and laptop repair",
    },
    {
      id: 6,
      name: "Appliance Repair",
      icon: "🔌",
      description: "Home appliance repair",
    },
  ];

  // When user selects a service
  const handleServiceClick = (service) => {
    navigate("/providers", {
      state: {
        selectedService: service.name,
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
      {/* Navbar */}
      <nav
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>ApnaMate</h2>

        <button
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

      {/* Main Content */}
      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <h1 style={{ textAlign: "center" }}>
          Our Services
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "35px",
          }}
        >
          Choose a service you need
        </p>

        {/* Service Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                backgroundColor: "white",
                padding: "30px 20px",
                borderRadius: "12px",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            >
              <div
                style={{
                  fontSize: "50px",
                  marginBottom: "10px",
                }}
              >
                {service.icon}
              </div>

              <h2>{service.name}</h2>

              <p style={{ color: "#666" }}>
                {service.description}
              </p>

              <button
                onClick={() => handleServiceClick(service)}
                style={{
                  padding: "11px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Find Provider
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Services;