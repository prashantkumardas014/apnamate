// frontend/src/components/StarRating.jsx
import React from 'react';

const StarRating = ({ rating, totalReviews, size = 20, showCount = true }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <div className="star-rating" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Full stars */}
            {[...Array(fullStars)].map((_, i) => (
                <span key={`full-${i}`} style={{ color: '#FFD700', fontSize: `${size}px` }}>★</span>
            ))}
            
            {/* Half star if needed */}
            {hasHalfStar && (
                <span style={{ color: '#FFD700', fontSize: `${size}px` }}>★</span>
            )}
            
            {/* Empty stars */}
            {[...Array(emptyStars)].map((_, i) => (
                <span key={`empty-${i}`} style={{ color: '#ddd', fontSize: `${size}px` }}>★</span>
            ))}
            
            {/* Rating number and count */}
            {showCount && (
                <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>
                    {rating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </span>
            )}
        </div>
    );
};

export default StarRating;