import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaInstagram, FaWhatsapp, FaTiktok, FaFacebookF, FaLinkedinIn } from 'react-icons/fa6';
import { useAuth } from '../../hooks/useAuth.js';
import { Navbar } from '../../components/Navbar/index.js';
import { useVendorProfile } from '../../hooks/useVendorProfile.js';
import { ROUTES } from '../../utils/constants.js';
import { reviewService } from '../../services/review.service.js';
import { vendorService } from '../../services/vendor.service.js';
import { ScamAlertBanner } from '../../components/ScamAlertBanner/index.js';
import { ReviewList } from '../../components/ReviewList/index.js';
import { ReviewForm } from '../../components/ReviewForm/index.js';
import { Button } from '../../components/Button/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { LoadingSpinner } from '../../components/LoadingSpinner/index.js';
import { ConfirmModal } from '../../components/ConfirmModal/index.js';
import { normalizeInstagramHandle, isSafeHttpUrl } from '../../utils/social.js';
import type { ReviewResponse } from '../../types/review.js';
import styles from './VendorProfile.module.css';

type Tier = 'High' | 'Caution' | 'Mid' | 'Low';

function getTier(score: number): Tier {
  if (score >= 7) return 'High';
  if (score >= 5) return 'Caution';
  if (score >= 3) return 'Mid';
  return 'Low';
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const CheckIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const VendorProfile: React.FC = () => {
  const { id: vendorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const {
    vendor,
    reviews,
    summary,
    summaryStatus,
    loading,
    error,
    reviewsError,
    summaryError,
    page,
    setPage,
    totalPages,
    refreshAll,
  } = useVendorProfile(vendorId);

  // Claim state
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);

  // Editing review state
  const [editingReview, setEditingReview] = useState<ReviewResponse | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reporting vendor state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  if (loading && !vendor) {
    return (
      <div className={styles.centerLoading}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className={`container ${styles.errorWrap}`}>
        <ErrorMessage message={error || 'Vendor profile not found.'} />
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Back to Search
        </Button>
      </div>
    );
  }

  const handleEditSubmit = async (payload: { rating: number; reviewText: string }) => {
    if (!editingReview) return;
    await reviewService.updateReview(editingReview.id, payload);
    setEditingReview(null);
    refreshAll(); // Refresh vendor details & reviews
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!editingReview) return;
    setDeleteLoading(true);
    try {
      await reviewService.deleteReview(editingReview.id);
      setShowDeleteConfirm(false);
      setEditingReview(null);
      refreshAll(); // Refresh vendor details & reviews
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    if (!vendorId || !reportReason.trim()) return;

    setReportLoading(true);
    setReportError(null);
    try {
      await reviewService.reportVendor(vendorId, {
        reason: reportReason.trim(),
        description: reportDesc.trim() || undefined,
      });
      setReportSuccess(true);
      setReportReason('');
      setReportDesc('');
      setTimeout(() => setReportSuccess(false), 5000);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleClaimClick = async () => {
    if (!isAuthenticated) {
      navigate(`${ROUTES.LOGIN}?redirect=/vendors/${vendor.id}`);
      return;
    }
    if (user?.role !== 'VENDOR' && user?.role !== 'ADMIN') {
      setClaimError('Only vendor accounts can claim profiles. Please register as a vendor.');
      return;
    }
    setClaimLoading(true);
    setClaimError(null);
    try {
      await vendorService.claimProfile(vendor.id);
      setClaimSuccess(true);
      refreshAll();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim submission failed');
    } finally {
      setClaimLoading(false);
    }
  };

  // ── Derived display values ──
  const displayName = vendor.businessName || 'Unnamed Vendor';
  const tier = getTier(vendor.trustScore);
  const filledStars = Math.round(vendor.trustScore / 2);
  const igHandle = vendor.instagramHandle ? normalizeInstagramHandle(vendor.instagramHandle) : null;
  const canWriteReview =
    !vendor.isOwnedByViewer && (!isAuthenticated || user?.role === 'BUYER') && !editingReview;

  const contactChannels = [
    vendor.whatsappUrl && {
      key: 'whatsapp',
      icon: <FaWhatsapp size={15} />,
      label: 'WhatsApp',
      value: 'Open chat',
      href: isSafeHttpUrl(vendor.whatsappUrl)
        ? vendor.whatsappUrl
        : `https://wa.me/${vendor.whatsappUrl.replace(/[^0-9]/g, '')}`,
    },
    igHandle && {
      key: 'instagram',
      icon: <FaInstagram size={15} />,
      label: 'Instagram',
      value: `@${igHandle}`,
      href: `https://instagram.com/${igHandle}`,
    },
    vendor.tiktokUrl && isSafeHttpUrl(vendor.tiktokUrl) && {
      key: 'tiktok',
      icon: <FaTiktok size={13} />,
      label: 'TikTok',
      value: 'View profile',
      href: vendor.tiktokUrl,
    },
    vendor.facebookUrl && isSafeHttpUrl(vendor.facebookUrl) && {
      key: 'facebook',
      icon: <FaFacebookF size={13} />,
      label: 'Facebook',
      value: 'View page',
      href: vendor.facebookUrl,
    },
    vendor.linkedinUrl && isSafeHttpUrl(vendor.linkedinUrl) && {
      key: 'linkedin',
      icon: <FaLinkedinIn size={13} />,
      label: 'LinkedIn',
      value: 'View profile',
      href: vendor.linkedinUrl,
    },
    vendor.phoneNumber && {
      key: 'phone',
      icon: <PhoneIcon />,
      label: 'Phone',
      value: vendor.phoneNumber,
      href: `tel:${vendor.phoneNumber}`,
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; value: string; href: string }[];

  return (
    <div className={styles.profile}>
      <Navbar />

      <main className={styles.mainSection}>
        <div className={styles.pageWrap}>
          <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Search
          </button>

          {/* Scam Alert Banner */}
          {vendor.scamFlag && <ScamAlertBanner reason={summary?.scamReason || null} />}

          <div className={styles.layout}>
            {/* ── MAIN SHEET ── */}
            <div className={styles.mainPanel}>
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.avatar}>
                  {vendor.logoImage ? (
                    <img className={styles.avatarImg} src={vendor.logoImage} alt={displayName} />
                  ) : (
                    <div className={styles.avatarFallback}>{getInitials(vendor.businessName)}</div>
                  )}
                </div>

                <div className={styles.headIdentity}>
                  <div className={styles.nameRow}>
                    <h1 className={styles.vendorName}>{displayName}</h1>
                  </div>

                  <div className={styles.tagRow}>
                    {vendor.claimStatus === 'CLAIMED' ? (
                      <span className={`${styles.claimPill} ${styles.claimClaimed}`}>Verified</span>
                    ) : vendor.claimStatus === 'PENDING_APPROVAL' ? (
                      <span className={`${styles.claimPill} ${styles.claimPending}`}>Claim Pending</span>
                    ) : (
                      <span className={`${styles.claimPill} ${styles.claimUnclaimed}`}>Unclaimed</span>
                    )}
                  </div>
                </div>

                <div className={styles.headAction}>
                  {vendor.isOwnedByViewer ? (
                    <span className={styles.ownerNote}>
                      <CheckIcon size={12} /> You own this profile
                    </span>
                  ) : canWriteReview ? (
                    <Link to={`${ROUTES.SUBMIT_REVIEW}?vendorId=${vendor.id}`} className={styles.plainLink}>
                      <Button variant="primary" fullWidth>Write a Review</Button>
                    </Link>
                  ) : null}
                </div>
              </div>

              {vendor.description && <p className={styles.bio}>{vendor.description}</p>}

              {/* Trust strip — the one highlighted element */}
              <div className={styles.trustStrip}>
                <div className={styles.trustScoreGroup}>
                  <span className={`${styles.trustScoreNum} ${styles[`num${tier}`]}`}>
                    {vendor.trustScore.toFixed(1)}
                  </span>
                  <span className={styles.trustDenom}>/ 10</span>
                </div>
                <div className={styles.stars} aria-label={`${filledStars} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`${styles.star} ${s <= filledStars ? styles.starFilled : ''}`}>★</span>
                  ))}
                </div>
                <span className={`${styles.trustLabelText} ${styles[`label${tier}`]}`}>
                  {vendor.trustLabel}
                </span>
                <span className={styles.trustCaption}>
                  Based on {vendor.reviewCount} community review{vendor.reviewCount !== 1 ? 's' : ''}
                </span>
              </div>

              <hr className={styles.divider} />

              {/* Reputation summary */}
              <section>
                <div className={styles.sectionTitleRow}>
                  <h2 className={styles.sectionTitle}>Community Reputation Summary</h2>
                  {summary && (
                    <span className={styles.summaryBadge}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6L4 10l6.1-1.2L12 3z" />
                      </svg>
                      AI generated
                    </span>
                  )}
                </div>
                <ErrorMessage message={summaryError} />
                {summary ? (
                  <>
                    <p className={styles.summaryText}>{summary.summaryText}</p>
                    <div className={styles.breakdownGrid}>
                      {summary.deliveryReliability && (
                        <div className={styles.breakdownCard}>
                          <h4 className={styles.breakdownTitle}><span className={styles.breakdownDot} />Delivery Reliability</h4>
                          <p className={styles.breakdownDesc}>{summary.deliveryReliability}</p>
                        </div>
                      )}
                      {summary.customerSatisfaction && (
                        <div className={styles.breakdownCard}>
                          <h4 className={styles.breakdownTitle}><span className={styles.breakdownDot} />Customer Satisfaction</h4>
                          <p className={styles.breakdownDesc}>{summary.customerSatisfaction}</p>
                        </div>
                      )}
                      {summary.recurringComplaints && (
                        <div className={styles.breakdownCard}>
                          <h4 className={styles.breakdownTitle}><span className={`${styles.breakdownDot} ${styles.dotComplaint}`} />Recurring Complaints</h4>
                          <p className={styles.breakdownDesc}>{summary.recurringComplaints}</p>
                        </div>
                      )}
                      {summary.trustPatterns && (
                        <div className={styles.breakdownCard}>
                          <h4 className={styles.breakdownTitle}><span className={`${styles.breakdownDot} ${styles.dotPositive}`} />Positive Trust Patterns</h4>
                          <p className={styles.breakdownDesc}>{summary.trustPatterns}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.summaryPlaceholder}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      {summaryStatus === 'generating'
                        ? 'An AI summary is being compiled from existing community reviews. Check back shortly.'
                        : summaryStatus === 'insufficient_data'
                        ? `A community summary unlocks once this vendor has at least 3 reviews (currently ${vendor.reviewCount}). Share your experience to help.`
                        : summaryStatus === 'unavailable'
                        ? 'The AI summary is temporarily unavailable. Community reviews are shown below.'
                        : 'An AI summary will compile automatically once this vendor reaches 3 reviews.'}
                    </span>
                  </div>
                )}
              </section>

              <hr className={styles.divider} />

              {/* Reviews */}
              <section>
                <div className={styles.sectionTitleRow}>
                  <h2 className={styles.sectionTitle}>Community Reviews</h2>
                  <span className={styles.reviewsCount}>{vendor.reviewCount} total</span>
                </div>

                <ErrorMessage message={reviewsError} />

                {editingReview ? (
                  <ReviewForm
                    isEdit={true}
                    initialRating={editingReview.rating}
                    initialText={editingReview.reviewText}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setEditingReview(null)}
                    onDelete={handleDeleteClick}
                  />
                ) : reviews.length === 0 ? (
                  <div className={styles.emptyReviews}>
                    <div className={styles.emptyIcon}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <p className={styles.emptyTitle}>No reviews yet</p>
                    <p className={styles.emptyDesc}>
                      Be the first to share your experience with {displayName} and help other buyers shop with confidence.
                    </p>
                    {canWriteReview && (
                      <div className={styles.emptyCtaWrap}>
                        <Link to={`${ROUTES.SUBMIT_REVIEW}?vendorId=${vendor.id}`} className={styles.plainLink}>
                          <Button variant="primary" fullWidth>Write a Review</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <ReviewList
                    reviews={reviews}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onEditReviewClick={setEditingReview}
                  />
                )}
              </section>
            </div>

            {/* ── SIDEBAR ── */}
            <aside className={styles.sideCol}>
              <div className={styles.sidePanel}>
                  {contactChannels.length > 0 && (
                    <>
                      <h2 className={styles.sectionTitle}>Contact &amp; Channels</h2>
                      <div className={styles.socialList}>
                        {contactChannels.map((c) => (
                          <a
                            key={c.key}
                            href={c.href}
                            target={c.key === 'phone' ? undefined : '_blank'}
                            rel="noopener noreferrer"
                            className={styles.socialRow}
                          >
                            <span className={styles.socialIcon}>{c.icon}</span>
                            <span className={styles.socialLabel}>{c.label}</span>
                            <span className={styles.socialSep}>:</span>
                            <span className={styles.socialValue}>{c.value}</span>
                          </a>
                        ))}
                      </div>
                      <hr className={styles.sideDivider} />
                    </>
                  )}

                  {!showReportForm ? (
                    <>
                      <p className={styles.reportPrompt}>
                        Noticed scam behaviour or fake reviews here?
                      </p>
                      <Button variant="secondary" onClick={() => setShowReportForm(true)} fullWidth>
                        Report Vendor
                      </Button>
                    </>
                  ) : (
                    <form onSubmit={handleReportSubmit} className={styles.reportForm}>
                      <h3 className={styles.sectionTitle}>Report Vendor</h3>
                      <ErrorMessage message={reportError} />
                      {reportSuccess && (
                        <div className={styles.reportSuccessNote}>
                          <CheckIcon size={13} /> Report submitted. Our moderators will review it.
                        </div>
                      )}
                      <div className={styles.formGroup}>
                        <label className={styles.fieldLabel}>Reason for reporting</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Scammed me on Instagram, fake reviews"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.fieldLabel}>Additional context (optional)</label>
                        <textarea
                          rows={3}
                          placeholder="Dates, order values, or other details"
                          value={reportDesc}
                          onChange={(e) => setReportDesc(e.target.value)}
                        />
                      </div>
                      <div className={styles.reportActions}>
                        <Button type="submit" disabled={reportLoading} variant="danger">
                          {reportLoading ? 'Submitting...' : 'Submit Report'}
                        </Button>
                        <Button type="button" onClick={() => setShowReportForm(false)} variant="secondary">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
              </div>

              {vendor.claimStatus === 'UNCLAIMED' && (
                <div className={styles.sidePanel}>
                  <div className={styles.claimTile}>
                    <h3 className={styles.claimTitle}>Do you own this business?</h3>
                    <p className={styles.claimDesc}>
                      Claim this profile to manage your details, add contact channels, and showcase your VerifyNG trust rating.
                    </p>
                    {claimError && <p className={styles.claimErrorNote}>{claimError}</p>}
                    {claimSuccess ? (
                      <p className={styles.claimSuccessNote}>
                        <CheckIcon size={13} /> Claim submitted — awaiting admin approval.
                      </p>
                    ) : (
                      <Button onClick={handleClaimClick} disabled={claimLoading} variant="primary" fullWidth>
                        {claimLoading ? 'Submitting...' : 'Claim this Profile'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.pageWrap}>
          <p>© {new Date().getFullYear()} VerifyNG. Built to foster safe commerce in Nigeria.</p>
        </div>
      </footer>
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
export default VendorProfile;
