import { useState } from 'react';
import './RatingStars.css';

const RatingStars = ({ rating, onRating, readonly = false, size = 30 }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="rating-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !readonly && onRating(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            cursor: readonly ? 'default' : 'pointer',
            color: star <= (hover || rating) ? '#FFD700' : '#ddd',
            fontSize: `${size}px`,
            transition: 'color 0.2s',
            display: 'inline-block'
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default RatingStars;