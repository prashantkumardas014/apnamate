// frontend/src/components/ReviewAnalytics.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './ReviewAnalytics.css';

const ReviewAnalytics = ({ providerId: propProviderId }) => {
  const { providerId: paramProviderId } = useParams();
  const providerId = propProviderId || paramProviderId;
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (providerId) {
      fetchAnalytics();
    }
  }, [providerId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_BASE_URL}/bookings/analytics/provider/${providerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  if (!analytics || analytics.total_reviews === 0) {
    return (
      <div className="analytics-empty">
        <h3>📊 No Reviews Yet</h3>
        <p>You haven't received any reviews from customers yet.</p>
      </div>
    );
  }

  const distribution = analytics.rating_distribution || {};
  const total = analytics.total_reviews || 0;

  return (
    <div className="review-analytics">
      <div className="analytics-summary">
        <div className="summary-card">
          <h3>⭐ Average Rating</h3>
          <div className="big-rating">
            <span className="rating-number">{analytics.average_rating}</span>
            <span className="rating-stars">⭐</span>
          </div>
          <p>out of 5</p>
        </div>

        <div className="summary-card">
          <h3>📝 Total Reviews</h3>
          <div className="big-number">{total}</div>
          <p>customer reviews</p>
        </div>
      </div>

      <div className="analytics-details">
        <div className="distribution-section">
          <h3>Rating Distribution</h3>
          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="bar-row">
                  <span className="bar-label">{star} ★</span>
                  <div className="bar-track">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${percentage}%`,
                        background: star >= 4 ? '#22c55e' : 
                                   star >= 3 ? '#eab308' : '#ef4444'
                      }}
                    ></div>
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="trend-section">
          <h3>Monthly Trend</h3>
          <div className="trend-chart">
            {analytics.monthly_trend && analytics.monthly_trend.map((month) => (
              <div key={month.month} className="trend-bar">
                <div 
                  className="trend-fill"
                  style={{ 
                    height: `${(month.average_rating / 5) * 100}%`,
                    background: month.average_rating >= 4 ? '#22c55e' :
                               month.average_rating >= 3 ? '#eab308' : '#ef4444'
                  }}
                ></div>
                <span className="trend-label">{month.month.substring(5)}</span>
                <span className="trend-value">{month.average_rating}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="recent-reviews">
        <h3>Recent Reviews</h3>
        {analytics.recent_reviews && analytics.recent_reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="recent-review-item">
            <div className="review-header">
              <span className="customer-name">{review.customer_name}</span>
              <span className="review-rating">
                {'⭐'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </span>
            </div>
            <p className="review-comment">{review.comment}</p>
            <small className="review-date">
              {new Date(review.created_at).toLocaleDateString()}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewAnalytics;