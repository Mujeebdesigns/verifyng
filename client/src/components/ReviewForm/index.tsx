import React, { useState, useEffect, useRef } from 'react';
import { StarRating } from '../StarRating/index.js';
import { Button } from '../Button/index.js';
import { ErrorMessage } from '../ErrorMessage/index.js';
import { Turnstile, type TurnstileHandle } from '../Turnstile/index.js';
import { TURNSTILE_SITE_KEY } from '../../utils/config.js';
import type { CreateReviewPayload, UpdateReviewPayload } from '../../types/review.js';
import styles from './ReviewForm.module.css';

interface ReviewFormProps {
  vendorId?: string;
  isEdit?: boolean;
  initialRating?: number;
  initialText?: string;
  onSubmit: (payload: CreateReviewPayload | UpdateReviewPayload) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: string, year: string): number {
  if (!month) return 31;
  const y = year ? parseInt(year, 10) : new Date().getFullYear();
  return new Date(y, parseInt(month, 10), 0).getDate();
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  vendorId,
  isEdit = false,
  initialRating = 0,
  initialText = '',
  onSubmit,
  onCancel,
  onDelete,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [reviewText, setReviewText] = useState(initialText);
  const [transactionChannel, setTransactionChannel] = useState('');
  const [orderDay, setOrderDay] = useState('');
  const [orderMonth, setOrderMonth] = useState('');
  const [orderYear, setOrderYear] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  useEffect(() => {
    const maxDay = daysInMonth(orderMonth, orderYear);
    if (orderDay && parseInt(orderDay, 10) > maxDay) {
      setOrderDay(String(maxDay));
    }
  }, [orderMonth, orderYear, orderDay]);

  const orderDate = orderDay && orderMonth && orderYear
    ? `${orderYear}-${orderMonth.padStart(2, '0')}-${orderDay.padStart(2, '0')}`
    : '';

  // Vendor auto-creation fields (only if not editing and vendorId is not provided)
  const [businessName, setBusinessName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankAccountLast4, setBankAccountLast4] = useState('');

  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  // Captcha only applies to new submissions (server enforces it on create, not
  // edit) and only when a site key is configured.
  const captchaRequired = !isEdit && Boolean(TURNSTILE_SITE_KEY);

  useEffect(() => {
    if (isEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync props to local state
      setRating(initialRating);
      setReviewText(initialText);
    }
  }, [isEdit, initialRating, initialText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation checks
    if (rating < 1) {
      setValidationError('Please select a star rating.');
      return;
    }
    if (reviewText.trim().length < 30) {
      setValidationError('Review text must be at least 30 characters.');
      return;
    }
    if (reviewText.trim().length > 1000) {
      setValidationError('Review text cannot exceed 1000 characters.');
      return;
    }

    if (!isEdit) {
      if (!transactionChannel) {
        setValidationError('Please select the transaction channel where the deal happened.');
        return;
      }
      if (!orderDate) {
        setValidationError('Please select the order date.');
        return;
      }
    }

    if (!isEdit && !vendorId) {
      if (
        !businessName.trim() &&
        !instagramHandle.trim() &&
        !phoneNumber.trim() &&
        !bankAccountLast4.trim()
      ) {
        setValidationError(
          'Please provide at least one vendor identifier (Business Name, Instagram, Phone, or Bank Last 4).'
        );
        return;
      }

      if (bankAccountLast4.trim() && !/^\d{4}$/.test(bankAccountLast4.trim())) {
        setValidationError('Bank account must be exactly the last 4 digits for security.');
        return;
      }
    }

    if (captchaRequired && !turnstileToken) {
      setValidationError('Please complete the captcha below before submitting.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await onSubmit({ rating, reviewText: reviewText.trim() });
      } else {
        const payload: CreateReviewPayload = {
          rating,
          reviewText: reviewText.trim(),
          transactionChannel: transactionChannel.trim() || undefined,
          orderDate: orderDate || undefined,
          vendorId: vendorId || undefined,
          turnstileToken: turnstileToken || undefined,
        };

        if (!vendorId) {
          payload.businessName = businessName.trim() || undefined;
          payload.instagramHandle = instagramHandle.trim() || undefined;
          payload.phoneNumber = phoneNumber.trim() || undefined;
          payload.bankAccountLast4 = bankAccountLast4.trim() || undefined;
        }

        await onSubmit(payload);
      }
    } catch (err) {
      // Turnstile tokens are single-use — reset so the user can retry cleanly.
      if (captchaRequired) {
        setTurnstileToken('');
        turnstileRef.current?.reset();
      }
      setValidationError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.sectionTitle}>
        {isEdit ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      <ErrorMessage message={validationError} />

      {/* Vendor Details section — only shown when creating review for a NEW vendor */}
      {!isEdit && !vendorId && (
        <>
          <h4 className={styles.label}>Vendor Details</h4>
          <p className={styles.helper}>
            Provide whatever details you have. We use these to match or auto-scaffold the vendor profile.
          </p>
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="businessName">Business Name</label>
              <input
                id="businessName"
                type="text"
                placeholder="e.g. Abuja Gadgets Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="instagramHandle">Instagram Handle</label>
              <input
                id="instagramHandle"
                type="text"
                placeholder="e.g. abujagadgets (no @)"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="e.g. 08031234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="bankAccountLast4">Bank Account Last 4 Digits</label>
              <input
                id="bankAccountLast4"
                type="text"
                maxLength={4}
                placeholder="e.g. 5678"
                value={bankAccountLast4}
                onChange={(e) => setBankAccountLast4(e.target.value)}
              />
              <span className={styles.helper}>For security, last 4 digits only.</span>
            </div>
          </div>
        </>
      )}

      {/* Review details */}
      <div className={styles.group}>
        <label className={styles.label}>Your Rating</label>
        <div className={styles.ratingWrapper}>
          <StarRating rating={rating} interactive={true} onChange={setRating} />
          <span className={styles.ratingText}>{rating > 0 ? `(${rating} out of 5 stars)` : 'Select a rating'}</span>
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="reviewText">Review Text</label>
        <textarea
          id="reviewText"
          rows={5}
          placeholder="Share details of your experience with this vendor. Delivery reliability, product quality, communications, etc."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          required
        />
        <div className={styles.charCount}>
          {reviewText.length} / 1000 characters (minimum 30)
        </div>
      </div>

      {!isEdit && (
        <>
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="transactionChannel">Transaction Channel *</label>
              <select
                id="transactionChannel"
                value={transactionChannel}
                onChange={(e) => setTransactionChannel(e.target.value)}
                required
              >
                <option value="">Select Channel...</option>
                <option value="Instagram">Instagram DMs</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="TikTok">TikTok</option>
                <option value="Website">Website Checkout</option>
                <option value="Physical Store">Physical Store</option>
                <option value="Twitter">Twitter/X DMs</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="orderDay">Order Date *</label>
              <div className={styles.dateRow}>
                <select
                  id="orderDay"
                  aria-label="Day"
                  value={orderDay}
                  onChange={(e) => setOrderDay(e.target.value)}
                  required
                >
                  <option value="">Day</option>
                  {Array.from({ length: daysInMonth(orderMonth, orderYear) }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                <select
                  aria-label="Month"
                  value={orderMonth}
                  onChange={(e) => setOrderMonth(e.target.value)}
                  required
                >
                  <option value="">Month</option>
                  {MONTHS.map((month, i) => (
                    <option key={month} value={i + 1}>{month}</option>
                  ))}
                </select>
                <select
                  aria-label="Year"
                  value={orderYear}
                  onChange={(e) => setOrderYear(e.target.value)}
                  required
                >
                  <option value="">Year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {captchaRequired && (
        <Turnstile
          ref={turnstileRef}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
        />
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
        <Button type="submit" disabled={loading} variant="primary">
          {loading ? 'Submitting...' : isEdit ? 'Update Review' : 'Submit Review'}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        )}
        {isEdit && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-sub-500)',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-state-error)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-sub-500)')}
          >
            Delete Review
          </button>
        )}
      </div>
    </form>
  );
};
