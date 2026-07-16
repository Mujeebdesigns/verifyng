import React, { useState } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants.js';
import { reviewService } from '../../services/review.service.js';
import { ReviewForm } from '../../components/ReviewForm/index.js';
import { ConfirmModal } from '../../components/ConfirmModal/index.js';
import type { CreateReviewPayload, UpdateReviewPayload } from '../../types/review.js';

export const SubmitReview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [showSuccess, setShowSuccess] = useState(false);
  const [newVendorId, setNewVendorId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const editState = location.state as {
    isEdit?: boolean;
    reviewId?: string;
    initialRating?: number;
    initialText?: string;
    vendorId?: string;
  } | null;

  const isEdit = editState?.isEdit || false;
  const reviewId = editState?.reviewId;
  const initialRating = editState?.initialRating || 0;
  const initialText = editState?.initialText || '';

  const vendorId = editState?.vendorId || searchParams.get('vendorId') || undefined;
  const prefilledName = searchParams.get('query') || '';

  const handleSubmit = async (payload: CreateReviewPayload | UpdateReviewPayload) => {
    if (isEdit && reviewId) {
      await reviewService.updateReview(reviewId, {
        rating: payload.rating,
        reviewText: payload.reviewText,
      });
      navigate(ROUTES.DASHBOARD);
    } else {
      const res = await reviewService.createReview(payload as CreateReviewPayload);
      setNewVendorId(res.vendorId);
      setShowSuccess(true);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!reviewId) return;
    setDeleteLoading(true);
    try {
      await reviewService.deleteReview(reviewId);
      setShowDeleteConfirm(false);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEdit || vendorId) {
      navigate(-1);
    } else {
      navigate(ROUTES.HOME);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-weak-100)',
      }}
    >
      {/* Navigation header */}
      <nav
        style={{
          height: '4.5rem',
          backgroundColor: 'var(--color-bg-white-0)',
          borderBottom: '0.0625rem solid var(--color-stroke-soft-200)',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'var(--effect-regular-shadow-x-small)',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img src="/verifyng-logo.svg" alt="VerifyNG Logo" style={{ height: '2.5rem', width: 'auto', display: 'block' }} />
          </Link>
        </div>
      </nav>

      {/* Main Review Form */}
      <main style={{ padding: '2.5rem 0', flexGrow: 1 }}>
        <div className="container" style={{ maxWidth: '43.75rem' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <button
              onClick={handleCancel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-sub-500)',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                padding: 0,
                fontFamily: 'inherit',
                lineHeight: 1,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-primary-base)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-sub-500)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Cancel and go back
            </button>
          </div>

          <ReviewForm
            vendorId={vendorId}
            isEdit={isEdit}
            initialRating={initialRating}
            initialText={initialText}
            {...(!vendorId && !isEdit && prefilledName && { businessName: prefilledName })}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDelete={handleDeleteClick}
          />
        </div>
      </main>

      {/* Success Confirmation Modal */}
      {showSuccess && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(0.25rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-white-0)',
              border: '0.0625rem solid var(--color-stroke-soft-200)',
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '30rem',
              width: '100%',
              boxShadow: 'var(--effect-regular-shadow-large)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div className="animated-mail-container" style={{ marginBottom: '0.5rem' }}>
              <div className="animated-mail-glow" />
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary-primary-base)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main-900)', margin: 0 }}>
              Review Submitted! 🎉
            </h3>
            
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--color-text-sub-500)', margin: 0 }}>
              Thank you for keeping VerifyNG safe! To maintain community trust, your review is marked as <strong>"Unverified"</strong> by default.
              <br /><br />
              Our moderators will review any uploaded evidence to verify this transaction and award you the verified buyer badge.
            </p>

            <button
              onClick={() => {
                if (newVendorId) {
                  navigate(`/vendors/${newVendorId}`);
                } else {
                  navigate(ROUTES.HOME);
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: 'var(--color-primary-primary-base)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                marginTop: '0.5rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-primary-dark)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-primary-base)')}
            >
              Proceed to Vendor Profile
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleteLoading}
      />
    </div>
  );
};

export default SubmitReview;
