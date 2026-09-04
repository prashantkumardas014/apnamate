import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function MyBookings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // Booking history filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Review states
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  // ==============================
  // LOAD BOOKINGS
  // ==============================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const loggedInUser = JSON.parse(storedUser);
    setUser(loggedInUser);

    fetch(
      `http://127.0.0.1:8000/bookings/customer/${loggedInUser.id}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load bookings");
        }

        return response.json();
      })
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Booking error:", error);
        setMessage("Unable to load bookings.");
        setLoading(false);
      });
  }, [navigate]);

  // ==============================
  // CANCEL BOOKING
  // ==============================

  const handleCancelBooking = async (bookingId) => {
    if (!user) {
      return;
    }

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmCancel) {
      return;
    }

    setCancellingId(bookingId);
    setMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/${bookingId}/cancel?customer_id=${user.id}`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to cancel booking"
        );
      }

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: data.status,
              }
            : booking
        )
      );

      setMessage(
        "Booking cancelled successfully! ✅"
      );
    } catch (error) {
      console.error("Cancellation error:", error);

      setMessage(
        error.message ||
          "Unable to cancel booking."
      );
    } finally {
      setCancellingId(null);
    }
  };

  // ==============================
  // SUBMIT REVIEW
  // ==============================

  const submitReview = async (bookingId) => {
    if (!user) {
      setMessage("Please login to submit a review.");
      return;
    }

    if (!rating) {
      setMessage("Please select a rating.");
      return;
    }

    if (!comment.trim()) {
      setMessage("Please write a review comment.");
      return;
    }

    setReviewingId(bookingId);
    setMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/bookings/reviews?booking_id=${bookingId}&customer_id=${user.id}&rating=${rating}&comment=${encodeURIComponent(
          comment
        )}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to submit review"
        );
      }

      setMessage(
        "Review submitted successfully! ⭐"
      );

      setRating("");
      setComment("");

      // Refresh bookings
      fetch(
        `http://127.0.0.1:8000/bookings/customer/${user.id}`
      )
        .then((response) => response.json())
        .then((data) => {
          setBookings(data);
        })
        .catch((error) => {
          console.error(
            "Error refreshing bookings:",
            error
          );
        });
    } catch (error) {
      console.error("Review error:", error);

      setMessage(
        error.message ||
          "Unable to submit review."
      );
    } finally {
      setReviewingId(null);
    }
  };

  // ==============================
  // STATUS STYLE
  // ==============================

  const getStatusStyle = (status) => {
    if (status === "Completed") {
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }

    if (status === "Accepted") {
      return {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
      };
    }

    if (status === "Rejected") {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (status === "Cancelled") {
      return {
        backgroundColor: "#f3f4f6",
        color: "#4b5563",
      };
    }

    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  };

  // ==============================
  // STATUS ICON
  // ==============================

  const getStatusIcon = (status) => {
    if (status === "Completed") {
      return "🟢";
    }

    if (status === "Accepted") {
      return "🔵";
    }

    if (status === "Rejected") {
      return "🔴";
    }

    if (status === "Cancelled") {
      return "⚫";
    }

    return "🟡";
  };

  // ==============================
  // BOOKING COUNTS
  // ==============================

  const totalBookings = bookings.length;

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "Pending"
  ).length;

  const acceptedBookings = bookings.filter(
    (booking) => booking.status === "Accepted"
  ).length;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "Completed"
  ).length;

  const rejectedBookings = bookings.filter(
    (booking) => booking.status === "Rejected"
  ).length;

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "Cancelled"
  ).length;

  // ==============================
  // FILTER BOOKINGS
  // ==============================

  const filteredBookings = bookings
    .filter((booking) => {
      if (statusFilter === "All") {
        return true;
      }

      return booking.status === statusFilter;
    })
    .sort((a, b) => {
      const dateA = new Date(
        `${a.date}T${a.time}`
      );

      const dateB = new Date(
        `${b.date}T${b.time}`
      );

      if (sortOrder === "newest") {
        return dateB - dateA;
      }

      return dateA - dateB;
    });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
      }}
    >
      {/* ==============================
          NAVBAR
      ============================== */}

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

      {/* ==============================
          MAIN
      ============================== */}

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
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "10px 18px",
            backgroundColor: "#e5e7eb",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1
          style={{
            marginBottom: "5px",
          }}
        >
          My Bookings
        </h1>

        <p
          style={{
            color: "#666",
            marginTop: "5px",
          }}
        >
          View and manage your complete booking history.
        </p>

        {/* ==============================
            MESSAGE
        ============================== */}

        {message && (
          <div
            style={{
              padding: "12px",
              marginTop: "20px",
              backgroundColor:
                message.includes("Unable") ||
                message.includes("failed") ||
                message.includes("Please")
                  ? "#fee2e2"
                  : "#dcfce7",
              color:
                message.includes("Unable") ||
                message.includes("failed") ||
                message.includes("Please")
                  ? "#991b1b"
                  : "#166534",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            {message}
          </div>
        )}

        {/* ==============================
            BOOKING SUMMARY
        ============================== */}

        {!loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
              marginTop: "25px",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px" }}>
                📋
              </div>

              <h2 style={{ margin: "8px 0" }}>
                {totalBookings}
              </h2>

              <p style={{ margin: 0, color: "#666" }}>
                Total
              </p>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px" }}>
                🟡
              </div>

              <h2 style={{ margin: "8px 0" }}>
                {pendingBookings}
              </h2>

              <p style={{ margin: 0, color: "#666" }}>
                Pending
              </p>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px" }}>
                🔵
              </div>

              <h2 style={{ margin: "8px 0" }}>
                {acceptedBookings}
              </h2>

              <p style={{ margin: 0, color: "#666" }}>
                Accepted
              </p>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px" }}>
                🟢
              </div>

              <h2 style={{ margin: "8px 0" }}>
                {completedBookings}
              </h2>

              <p style={{ margin: 0, color: "#666" }}>
                Completed
              </p>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px" }}>
                🔴
              </div>

              <h2 style={{ margin: "8px 0" }}>
                {rejectedBookings}
              </h2>

              <p style={{ margin: 0, color: "#666" }}>
                Rejected
              </p>
            </div>

            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px" }}>
                ⚫
              </div>

              <h2 style={{ margin: "8px 0" }}>
                {cancelledBookings}
              </h2>

              <p style={{ margin: 0, color: "#666" }}>
                Cancelled
              </p>
            </div>
          </div>
        )}

        {/* ==============================
            FILTERS
        ============================== */}

        {!loading && bookings.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              marginTop: "30px",
              borderRadius: "12px",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "15px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label>
                  <strong>Filter by Status</strong>
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "11px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="All">
                    All Bookings
                  </option>

                  <option value="Pending">
                    🟡 Pending
                  </option>

                  <option value="Accepted">
                    🔵 Accepted
                  </option>

                  <option value="Completed">
                    🟢 Completed
                  </option>

                  <option value="Rejected">
                    🔴 Rejected
                  </option>

                  <option value="Cancelled">
                    ⚫ Cancelled
                  </option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "200px" }}>
                <label>
                  <strong>Sort Bookings</strong>
                </label>

                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value)
                  }
                  style={{
                    width: "100%",
                    padding: "11px",
                    marginTop: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="newest">
                    Newest First
                  </option>

                  <option value="oldest">
                    Oldest First
                  </option>
                </select>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: "150px",
                  paddingTop: "25px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("All");
                    setSortOrder("newest");
                  }}
                  style={{
                    width: "100%",
                    padding: "11px",
                    backgroundColor: "#e5e7eb",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <p
              style={{
                marginBottom: 0,
                marginTop: "15px",
                color: "#666",
              }}
            >
              Showing{" "}
              <strong>
                {filteredBookings.length}
              </strong>{" "}
              booking
              {filteredBookings.length !== 1
                ? "s"
                : ""}
            </p>
          </div>
        )}

        {/* ==============================
            LOADING
        ============================== */}

        {loading && (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              marginTop: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <h2>Loading bookings...</h2>
          </div>
        )}

        {/* ==============================
            NO BOOKINGS
        ============================== */}

        {!loading && bookings.length === 0 && (
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              marginTop: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontSize: "50px" }}>
              📋
            </div>

            <h2>No bookings yet</h2>

            <p>
              You haven't booked any services yet.
            </p>

            <button
              type="button"
              onClick={() => navigate("/services")}
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
              Book a Service
            </button>
          </div>
        )}

        {/* ==============================
            NO FILTER RESULTS
        ============================== */}

        {!loading &&
          bookings.length > 0 &&
          filteredBookings.length === 0 && (
            <div
              style={{
                backgroundColor: "white",
                padding: "40px",
                marginTop: "20px",
                borderRadius: "12px",
                textAlign: "center",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: "45px" }}>
                🔍
              </div>

              <h2>No matching bookings</h2>

              <p>
                There are no bookings with the selected
                status.
              </p>

              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Show All Bookings
              </button>
            </div>
          )}

        {/* ==============================
            BOOKINGS
        ============================== */}

        {!loading &&
          filteredBookings.length > 0 &&
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                backgroundColor: "white",
                padding: "25px",
                marginTop: "20px",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      marginBottom: "8px",
                    }}
                  >
                    {booking.service}
                  </h2>

                  <span
                    style={{
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    Booking #{booking.id}
                  </span>
                </div>

                <span
                  style={{
                    ...getStatusStyle(
                      booking.status
                    ),
                    padding: "7px 14px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {getStatusIcon(booking.status)}{" "}
                  {booking.status}
                </span>
              </div>

              <hr
                style={{
                  margin: "20px 0",
                  border: "none",
                  borderTop: "1px solid #eee",
                }}
              />

              {/* BOOKING DETAILS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "12px",
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>👨‍🔧 Provider:</strong>{" "}
                  {booking.provider_name}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>📅 Date:</strong>{" "}
                  {booking.date}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>🕐 Time:</strong>{" "}
                  {booking.time}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>📍 Address:</strong>{" "}
                  {booking.address}
                </p>
              </div>

              <div
                style={{
                  marginTop: "15px",
                  padding: "15px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <strong>Problem Description</strong>

                <p
                  style={{
                    marginBottom: 0,
                    color: "#555",
                  }}
                >
                  {booking.description}
                </p>
              </div>

              {/* CANCEL BUTTON */}

              {(booking.status === "Pending" ||
                booking.status === "Accepted") && (
                <button
                  type="button"
                  disabled={
                    cancellingId === booking.id
                  }
                  onClick={() =>
                    handleCancelBooking(
                      booking.id
                    )
                  }
                  style={{
                    padding: "12px 20px",
                    marginTop: "20px",
                    backgroundColor:
                      cancellingId === booking.id
                        ? "#9ca3af"
                        : "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      cancellingId === booking.id
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {cancellingId === booking.id
                    ? "Cancelling..."
                    : "Cancel Booking"}
                </button>
              )}

              {/* COMPLETED */}

              {booking.status === "Completed" && (
                <>
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "12px",
                      backgroundColor: "#dcfce7",
                      color: "#166534",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    ✓ Service completed
                  </div>

                  {/* REVIEW */}

                  <div
                    style={{
                      marginTop: "15px",
                      padding: "20px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>
                      ⭐ Rate Provider
                    </h3>

                    <select
                      value={rating}
                      onChange={(e) =>
                        setRating(e.target.value)
                      }
                      disabled={
                        reviewingId === booking.id
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        marginBottom: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">
                        Select Rating
                      </option>

                      <option value="1">
                        ⭐ 1 Star
                      </option>

                      <option value="2">
                        ⭐⭐ 2 Stars
                      </option>

                      <option value="3">
                        ⭐⭐⭐ 3 Stars
                      </option>

                      <option value="4">
                        ⭐⭐⭐⭐ 4 Stars
                      </option>

                      <option value="5">
                        ⭐⭐⭐⭐⭐ 5 Stars
                      </option>
                    </select>

                    <textarea
                      placeholder="Write your review..."
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value)
                      }
                      disabled={
                        reviewingId === booking.id
                      }
                      rows="4"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        submitReview(booking.id)
                      }
                      disabled={
                        reviewingId === booking.id
                      }
                      style={{
                        marginTop: "10px",
                        padding: "10px 20px",
                        backgroundColor:
                          reviewingId === booking.id
                            ? "#9ca3af"
                            : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor:
                          reviewingId === booking.id
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {reviewingId === booking.id
                        ? "Submitting..."
                        : "Submit Review"}
                    </button>
                  </div>
                </>
              )}

              {/* REJECTED */}

              {booking.status === "Rejected" && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: "8px",
                    fontWeight: "bold",
                  }}
                >
                  ✕ Booking rejected by provider
                </div>
              )}

              {/* CANCELLED */}

              {booking.status === "Cancelled" && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px",
                    backgroundColor: "#f3f4f6",
                    color: "#4b5563",
                    borderRadius: "8px",
                    fontWeight: "bold",
                  }}
                >
                  ✓ Booking cancelled
                </div>
              )}
            </div>
          ))}
      </main>
    </div>
  );
}

export default MyBookings;