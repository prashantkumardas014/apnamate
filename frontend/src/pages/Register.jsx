import { useState } from "react";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  // Provider fields
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");

  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            role: role,

            // Provider information
            service: role === "provider" ? service : null,
            location: role === "provider" ? location : null,
            experience:
              role === "provider" ? experience : null,

            // Automatically add ₹ symbol
            price:
              role === "provider" && price
                ? `₹${price}`
                : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail || "Registration failed"
        );
        return;
      }

      setMessage(data.message);

      // Clear form after successful registration
      if (data.user_id) {
        setName("");
        setEmail("");
        setPassword("");
        setRole("customer");
        setService("");
        setLocation("");
        setExperience("");
        setPrice("");
      }
    } catch (error) {
      console.error(error);
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
        padding: "30px 0",
      }}
    >
      <form
        onSubmit={handleRegister}
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "10px",
          width: "350px",
          boxShadow:
            "0 4px 15px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#2563eb",
          }}
        >
          Create Account
        </h1>

        {/* Name */}
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {/* Role */}
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={inputStyle}
        >
          <option value="customer">Customer</option>
          <option value="provider">
            Service Provider
          </option>
        </select>

        {/* Provider fields */}
        {role === "provider" && (
          <div>
            <h3
              style={{
                marginTop: "5px",
                marginBottom: "15px",
                color: "#333",
              }}
            >
              Provider Details
            </h3>

            {/* Service */}
            <select
              value={service}
              onChange={(e) =>
                setService(e.target.value)
              }
              required
              style={inputStyle}
            >
              <option value="">
                Select Service
              </option>

              <option value="Electrician">
                Electrician
              </option>

              <option value="Plumber">
                Plumber
              </option>

              <option value="AC Repair">
                AC Repair
              </option>

              <option value="Cleaning">
                Cleaning
              </option>

              <option value="Computer Repair">
                Computer Repair
              </option>

              <option value="Appliance Repair">
                Appliance Repair
              </option>
            </select>

            {/* Location */}
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
              required
              style={inputStyle}
            />

            {/* Experience */}
            <input
              type="text"
              placeholder="Experience (e.g. 5 years)"
              value={experience}
              onChange={(e) =>
                setExperience(e.target.value)
              }
              required
              style={inputStyle}
            />

            {/* Price */}
            <input
              type="text"
              placeholder="Price (e.g. 800 - 1000)"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
              required
              style={inputStyle}
            />
          </div>
        )}

        {/* Register button */}
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
            fontWeight: "bold",
          }}
        >
          Register
        </button>

        {/* Message */}
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
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "15px",
  boxSizing: "border-box",
};

export default Register;