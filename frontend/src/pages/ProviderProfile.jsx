// frontend/src/pages/ProviderProfile.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import StarRating from "../components/StarRating";
import ReviewItem from "../components/ReviewItem";
import ReviewAnalytics from "../components/ReviewAnalytics";
import "./ProviderProfile.css";

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Profile states
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState("Available");
  const [saving, setSaving] = useState(false);
  
  // Review states
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Analytics states
  const [showAnalytics, setShowAnalytics] = useState(false);

  // ==============================
  // CHECK IF USER OWNS THIS PROFILE
  // ==============================

  const isOwner = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return false;
    try {
      const user = JSON.parse(storedUser);
      return profile && user.id === profile.id;
    } catch {
      return false;
    }
  };

  // ==============================
  // LOAD PROVIDER PROFILE
  // ==============================

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        setCurrentUser(null);
      }
    }

    if (id) {
      fetchProviderProfile(id);
    } else {
      // If no ID, check if user is a provider and load their own profile
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user.role === "provider") {
            fetchProviderProfile(user.id);
          } else {
            navigate("/dashboard");
          }
        } catch {
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    }
  }, [id, navigate]);

  const fetchProviderProfile = async (providerId) => {
    try {
      setLoading(true);
      setError("");
      
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/bookings/profile/${providerId}`,
        {
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Provider not found");
        }
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      
      if (data.success) {
        const provider = data.user;
        setProfile(provider);
        
        // Set form fields
        setService(provider.service || "");
        setLocation(provider.location || "");
        setExperience(provider.experience || "");
        setPrice(provider.price || "");
        setAvailability(provider.availability || "Available");
        
        // Set reviews
        const ratingStats = provider.provider_stats || {};
        setReviews(ratingStats.recent_reviews || []);
      } else {
        throw new Error(data.message || "Provider not found");
      }
    } catch (err) {
      console.error("Profile error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // UPDATE PROFILE
  // ==============================

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profile) return;

    setSaving(true);
    setMessage("Saving profile...");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_BASE_URL}/bookings/profile/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ service, location, experience, price }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update profile");
      }

      const updatedProfile = data.user || {};
      setProfile(updatedProfile);
      setMessage("Profile updated successfully! ✅");
      setIsEditing(false);
    } catch (error) {
      console.error("Update profile error:", error);
      setMessage(error.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ==============================
  // UPDATE AVAILABILITY
  // ==============================

  const handleAvailabilityChange = async (newAvailability) => {
    if (!profile) return;

    setAvailability(newAvailability);
    setMessage("Updating availability...");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${API_BASE_URL}/bookings/availability/${profile.id}?availability=${encodeURIComponent(newAvailability)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update availability");
      }

      setAvailability(data.availability);
      setProfile((prev) => ({
        ...prev,
        availability: data.availability,
      }));

      setMessage(`Availability changed to ${data.availability} ✅`);
    } catch (error) {
      console.error("Availability error:", error);
      setMessage(error.message || "Unable to update availability.");
    }
  };

  // ==============================
  // HANDLE REVIEW UPDATE
  // ==============================

  const handleReviewUpdate = (updatedReview) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === updatedReview.id ? { ...r, ...updatedReview } : r
      )
    );
    // Refresh profile to update rating stats
    if (profile) {
      fetchProviderProfile(profile.id);
    }
  };

  const handleReviewDelete = (reviewId) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    // Refresh profile to update rating stats
    if (profile) {
      fetchProviderProfile(profile.id);
    }
  };

  // ==============================
  // RENDER RATING DISTRIBUTION
  // ==============================

  const renderRatingDistribution = (distribution) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return <p className="no-reviews">No reviews yet</p>;

    return (
      <div className="rating-distribution">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="distribution-row">
              <span className="star-label">{star} ★</span>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="count-label">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // ==============================
  // LOADING STATE
  // ==============================

  if (loading) {
    return (
      <div className="provider-profile">
        <div className="loading">Loading provider profile...</div>
      </div>
    );
  }

  // ==============================
  // ERROR STATE
  // ==============================

  if (error || !profile) {
    return (
      <div className="provider-profile">
        <div className="error">{error || "Provider not found"}</div>
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Go Back
        </button>
      </div>
    );
  }

  // ==============================
  // RENDER
  // ==============================

  const ratingStats = profile.provider_stats || {};
  const avgRating = ratingStats.rating || 0;
  const totalReviews = ratingStats.total_reviews || 0;
  const distribution = ratingStats.rating_distribution || {};
  const providerReviews = ratingStats.recent_reviews || [];
  const owner = isOwner();

  return (
    <div className="provider-profile">
      {/* ==============================
          BACK BUTTON
      ============================== */}

      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
      </button>

      {/* ==============================
          PROFILE HEADER
      ============================== */}

      <div className="profile-header">
        <div className="provider-info">
          <h1>{profile.name}</h1>
          <p className="service">{profile.service}</p>
          <p className="location">📍 {profile.location}</p>
          <p className="experience">💼 {profile.experience} years experience</p>
          <p className="price">💰 {profile.price}</p>
          <span className={`availability ${availability?.toLowerCase() || "available"}`}>
            {availability || "Available"}
          </span>
          
          {owner && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="edit-profile-btn"
            >
              {isEditing ? "Cancel Edit" : "✏️ Edit Profile"}
            </button>
          )}
        </div>

        <div className="rating-section">
          <div className="rating-summary">
            <div className="big-rating">
              {avgRating > 0 ? avgRating.toFixed(1) : "New"}
              <span className="stars"> ⭐</span>
            </div>
            <div className="total-reviews">
              {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </div>
            <div className="rating-breakdown">
              {renderRatingDistribution(distribution)}
            </div>
          </div>
        </div>
      </div>

      {/* ==============================
          EDIT PROFILE FORM
      ============================== */}

      {isEditing && owner && (
        <div className="edit-profile-form">
          <h2>Edit Profile</h2>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label>Service</label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="Example: Electrician"
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Example: Silvassa"
                required
              />
            </div>

            <div className="form-group">
              <label>Experience</label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Example: 5 years"
                required
              />
            </div>

            <div className="form-group">
              <label>Price</label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Example: ₹300 - ₹500"
                required
              />
            </div>

            {message && <div className="message">{message}</div>}

            <button type="submit" disabled={saving} className="save-btn">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* ==============================
          AVAILABILITY (Owner Only)
      ============================== */}

      {owner && (
        <div className="availability-section">
          <h3>📊 Set Your Availability</h3>
          <div className="availability-buttons">
            <button
              onClick={() => handleAvailabilityChange("Available")}
              className={`avail-btn ${availability === "Available" ? "active available" : ""}`}
            >
              🟢 Available
            </button>
            <button
              onClick={() => handleAvailabilityChange("Busy")}
              className={`avail-btn ${availability === "Busy" ? "active busy" : ""}`}
            >
              🟡 Busy
            </button>
            <button
              onClick={() => handleAvailabilityChange("Offline")}
              className={`avail-btn ${availability === "Offline" ? "active offline" : ""}`}
            >
              🔴 Offline
            </button>
          </div>
          <p className="current-status">
            Current Status:{" "}
            <span className={availability.toLowerCase()}>
              {availability}
            </span>
          </p>
        </div>
      )}

      {/* ==============================
          PROFILE BODY
      ============================== */}

      <div className="profile-body">
        {/* ==============================
            REVIEWS SECTION
        ============================== */}

        <div className="reviews-section">
          <h2>Reviews ({totalReviews})</h2>

          {providerReviews.length === 0 ? (
            <p className="no-reviews">No reviews yet. Be the first to review!</p>
          ) : (
            <>
              {(showAllReviews ? providerReviews : providerReviews.slice(0, 3)).map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <strong>{review.customer_name}</strong>
                    <StarRating
                      rating={review.rating}
                      totalReviews={0}
                      size={16}
                      showCount={false}
                    />
                  </div>
                  <p className="review-comment">{review.comment}</p>
                  <small className="review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </small>
                </div>
              ))}

              {providerReviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="show-more-btn"
                >
                  {showAllReviews ? "Show Less" : `Show All ${providerReviews.length} Reviews`}
                </button>
              )}
            </>
          )}
        </div>

        {/* ==============================
            SIDEBAR
        ============================== */}

        <div className="sidebar-section">
          <div className="info-card">
            <h4>📋 About This Provider</h4>
            <p><strong>Service:</strong> {profile.service}</p>
            <p><strong>Location:</strong> {profile.location}</p>
            <p><strong>Experience:</strong> {profile.experience} years</p>
            <p><strong>Category:</strong> {profile.category || "General"}</p>
            <p><strong>Status:</strong> {availability || "Available"}</p>
          </div>

          <button
            onClick={() => navigate(`/book/${profile.id}`)}
            className="book-now-btn"
          >
            📅 Book Now
          </button>

          {/* ==============================
              ANALYTICS TOGGLE
          ============================== */}

          {owner && (
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="analytics-toggle-btn"
            >
              📊 {showAnalytics ? "Hide" : "Show"} Analytics
            </button>
          )}

          {/* ==============================
              REVIEW ANALYTICS
          ============================== */}

          {showAnalytics && owner && (
            <ReviewAnalytics providerId={profile.id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderProfile;