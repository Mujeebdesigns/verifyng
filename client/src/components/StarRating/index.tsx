import React, { useState } from 'react';
import styles from './StarRating.module.css';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  interactive = false,
  onChange,
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleStarClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (interactive) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null);
    }
  };

  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div
      className={[styles.container, interactive ? styles.interactive : ''].join(
        ' '
      )}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = starValue <= activeRating;
        return (
          <button
            key={starValue}
            type="button"
            className={[styles.star, isFilled ? styles.filled : ''].join(' ')}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            disabled={!interactive}
            aria-label={`${starValue} Stars`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
};
