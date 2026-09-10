// frontend/src/pages/AdminReviews.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./AdminReviews.css";

function AdminReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/bookings/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch reviews");
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  if (loading) return <div className="loading">Loading reviews...</div>;

  return (
    <div className="admin-reviews">
      <div className="admin-header">
        <button onClick={() => navigate("/admin-dashboard")} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>⭐ All Reviews</h1>
        <p>View all customer reviews on the platform</p>
      </div>

      {message && (
        <div className={`message ${message.includes("✅") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      <div className="review-stats">
        <div className="stat-card">
          <h3>Total Reviews</h3>
          <p className="stat-number">{reviews.length}</p>
        </div>
        <div className="stat-card">
          <h3>Average Rating</h3>
          <p className="stat-number">
            {reviews.length > 0 
              ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
              : "N/A"}
          </p>
        </div>
        <div className="stat-card">
          <h3>5-Star Reviews</h3>
          <p className="stat-number">{reviews.filter(r => r.rating === 5).length}</p>
        </div>
      </div>

      <div className="review-table-container">
        <table className="review-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Provider</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td>#{review.id}</td>
                <td>{review.customer_name || "Unknown"}</td>
                <td>{review.provider_name || "Unknown"}</td>
                <td>
                  <span style={{ fontSize: "16px" }}>
                    {renderStars(review.rating)}
                  </span>
                  <span style={{ marginLeft: "8px", fontWeight: "bold" }}>
                    {review.rating}/5
                  </span>
                </td>
                <td style={{ maxWidth: "200px", wordBreak: "break-word" }}>
                  {review.comment || "No comment"}
                </td>
                <td>{review.created_at ? new Date(review.created_at).toLocaleDateString() : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminReviews;