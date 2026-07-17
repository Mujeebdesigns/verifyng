import React, { useMemo } from 'react';
import { StarRating } from '../StarRating/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import type { ReviewResponse } from '../../types/review.js';
import styles from './ReviewCard.module.css';

interface ReviewCardProps {
  review: ReviewResponse;
  onEditClick?: (review: ReviewResponse) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onEditClick,
}) => {
  const { user } = useAuth();
  const {
    rating,
    reviewText,
    transactionChannel,
    orderDate,
    verifiedBuyer,
    isFlagged,
    createdAt,
    user: reviewUser,
  } = review;

  // Determine if review is editable (user is author and within 48-hour window)
  /* eslint-disable react-hooks/purity */
  const isEditable = useMemo(() => {
    if (!user || user.id !== review.userId) return false;
    const createdAtDate = new Date(createdAt).getTime();
    return Date.now() - createdAtDate < 48 * 60 * 60 * 1000;
  }, [user, review.userId, createdAt]);
  /* eslint-enable react-hooks/purity */

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.nameGroup}>
          {verifiedBuyer && (
            <span className={styles.verifiedBuyer} title="Verified purchase" aria-label="Verified purchase">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
          <span className={styles.displayName}>
            {reviewUser?.displayName || 'Anonymous User'}
          </span>
        </div>
        <div className={styles.ratingRow}>
          <StarRating rating={rating} />
        </div>
      </div>

      <div className={styles.meta}>
        <span>{formatDate(createdAt)}</span>
        {orderDate && <span>• Order Date: {formatDate(orderDate)}</span>}
      </div>

      <p className={[styles.text, isFlagged ? styles.flaggedText : ''].join(' ')}>
        {isFlagged
          ? '⚠️ This review has been flagged for moderation check.'
          : reviewText}
      </p>

      <div className={styles.footer}>
        <div className={styles.channelInfo}>
          {transactionChannel && (
            <span>Bought via: <strong>{transactionChannel}</strong></span>
          )}
        </div>
        <div className={styles.actions}>
          {isEditable && onEditClick && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => onEditClick(review)}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
