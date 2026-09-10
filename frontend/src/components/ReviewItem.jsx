// frontend/src/components/ReviewItem.jsx
import { useState } from 'react';
import { API_BASE_URL } from '../config';
import StarRating from './StarRating';
import './ReviewItem.css';

const ReviewItem = ({ review, onUpdate, onDelete, currentUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [rating, setRating] = useState(review.rating);
    const [comment, setComment] = useState(review.comment);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isOwner = currentUser?.id === review.customer_id;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${API_BASE_URL}/bookings/reviews/${review.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        rating: parseInt(rating),
                        comment: comment.trim()
                    })
                }
            );

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update review');
            }

            setIsEditing(false);
            onUpdate(data.review);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this review?')) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${API_BASE_URL}/bookings/reviews/${review.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to delete review');
            }

            onDelete(review.id);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isEditing) {
        return (
            <div className="review-item edit-mode">
                <form onSubmit={handleSubmit}>
                    <div className="edit-rating">
                        <label>Rating</label>
                        <div className="star-select">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    onClick={() => setRating(star)}
                                    style={{
                                        cursor: 'pointer',
                                        color: star <= rating ? '#FFD700' : '#ddd',
                                        fontSize: '30px',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="edit-comment">
                        <label>Review</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows="3"
                            required
                            minLength={3}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="edit-actions">
                        <button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsEditing(false);
                                setRating(review.rating);
                                setComment(review.comment);
                            }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="review-item">
            <div className="review-header">
                <strong>{review.customer_name || 'User'}</strong>
                <StarRating rating={review.rating} totalReviews={0} size={16} showCount={false} />
            </div>
            
            <p className="review-comment">{review.comment}</p>
            
            <div className="review-footer">
                <small className="review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                    {review.updated_at && review.updated_at !== review.created_at && 
                        ` (edited)`
                    }
                </small>
                
                {isOwner && (
                    <div className="review-actions">
                        <button onClick={() => setIsEditing(true)} className="edit-btn">
                            ✏️ Edit
                        </button>
                        <button onClick={handleDelete} className="delete-btn" disabled={loading}>
                            🗑️ Delete
                        </button>
                    </div>
                )}
            </div>
            
            {loading && <div className="loading-spinner">Loading...</div>}
        </div>
    );
};

export default ReviewItem;