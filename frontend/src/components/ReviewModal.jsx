import { useState } from 'react';
import RatingStars from './RatingStars';
import api from '../utils/api';
import './ReviewModal.css';

const ReviewModal = ({ booking, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 3) {
      setError('Please write a review (minimum 3 characters)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/reviews', {
        booking_id: booking.id,
        rating: rating,
        comment: comment.trim()
      });

      if (response.data.message) {
        onSuccess(response.data);
        onClose();
      }
    } catch (err) {
      console.error('Review error:', err);
      setError(err.response?.data?.detail || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2>⭐ Rate Your Experience</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="review-modal-body">
          <div className="booking-info">
            <p><strong>Service:</strong> {booking.service}</p>
            <p><strong>Provider:</strong> {booking.provider_name}</p>
            <p><strong>Date:</strong> {booking.date}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="rating-section">
              <label>How was your experience?</label>
              <RatingStars rating={rating} onRating={setRating} size={40} />
              <span className="rating-text">
                {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Tap a star to rate'}
              </span>
            </div>

            <div className="comment-section">
              <label>Write a review</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this provider..."
                rows={4}
                maxLength={500}
              />
              <span className="char-count">{comment.length}/500</span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;