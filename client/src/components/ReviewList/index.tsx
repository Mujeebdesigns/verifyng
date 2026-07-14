import React from 'react';
import { ReviewCard } from '../ReviewCard/index.js';
import { Button } from '../Button/index.js';
import type { ReviewResponse } from '../../types/review.js';
import styles from './ReviewList.module.css';

interface ReviewListProps {
  reviews: ReviewResponse[];
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onEditReviewClick?: (review: ReviewResponse) => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  page,
  totalPages,
  onPageChange,
  onEditReviewClick,
}) => {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onEditClick={onEditReviewClick}
        />
      ))}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
};
