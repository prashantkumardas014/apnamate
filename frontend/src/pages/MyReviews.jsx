// frontend/src/pages/MyReviews.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import ReviewItem from '../components/ReviewItem';
import './MyReviews.css';

const MyReviews = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        setUser(JSON.parse(storedUser));
        fetchMyReviews();
    }, []);

    const fetchMyReviews = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${API_BASE_URL}/bookings/reviews/customer/my-reviews`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch reviews');
            }

            const data = await response.json();
            if (data.total > 0) {
                setReviews(data.reviews);
            } else {
                setMessage('You haven\'t written any reviews yet.');
            }
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (updatedReview) => {
        setReviews(reviews.map(r => 
            r.id === updatedReview.id ? updatedReview : r
        ));
    };

    const handleDelete = (reviewId) => {
        setReviews(reviews.filter(r => r.id !== reviewId));
        setMessage('Review deleted successfully!');
    };

    if (loading) {
        return <div className="loading">Loading your reviews...</div>;
    }

    return (
        <div className="my-reviews">
            <h1>My Reviews</h1>
            <p className="subtitle">Manage all the reviews you've written</p>

            {message && (
                <div className={`message ${message.includes('deleted') ? 'success' : 'info'}`}>
                    {message}
                </div>
            )}

            {reviews.length === 0 ? (
                <div className="no-reviews">
                    <p>You haven't written any reviews yet.</p>
                    <button onClick={() => navigate('/my-bookings')}>
                        View Your Bookings
                    </button>
                </div>
            ) : (
                <div className="reviews-list">
                    {reviews.map(review => (
                        <ReviewItem
                            key={review.id}
                            review={review}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            currentUser={user}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyReviews;