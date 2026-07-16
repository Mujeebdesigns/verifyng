import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { reviewService } from '../../services/review.service.js';
import { authService } from '../../services/auth.service.js';
import { Button } from '../../components/Button/index.js';
import { LoadingSpinner } from '../../components/LoadingSpinner/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { ConfirmModal } from '../../components/ConfirmModal/index.js';
import { PasswordRequirements } from '../../components/PasswordRequirements/index.js';
import { getPasswordPolicyError } from '../../utils/passwordPolicy.js';
import type { MyReviewResponse } from '../../types/review.js';
import { ROUTES, REVIEW_EDIT_WINDOW_HOURS, REVIEW_UNDER_REVIEW_HOURS } from '../../utils/constants.js';
import styles from './Dashboard.module.css';
import { Navbar } from '../../components/Navbar/index.js';

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={styles.customSelectWrapper} ref={dropdownRef}>
      <button
        type="button"
        className={styles.customSelectTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className={styles.customSelectArrow} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className={styles.customSelectOptions}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`${styles.customSelectOption} ${o.value === value ? styles.customSelectOptionActive : ''}`}
              onClick={() => {
                onChange(o.value);
                setIsOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'security'>('overview');

  const [reviews, setReviews] = useState<MyReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [reviewsSearch, setReviewsSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [reviewsRating, setReviewsRating] = useState('');
  const [reviewsChannel, setReviewsChannel] = useState('');
  const [reviewsSortBy, setReviewsSortBy] = useState('desc');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [showLogoutOthersConfirm, setShowLogoutOthersConfirm] = useState(false);
  const [logoutOthersLoading, setLogoutOthersLoading] = useState(false);
  const [logoutOthersError, setLogoutOthersError] = useState<string | null>(null);
  const [logoutOthersSuccess, setLogoutOthersSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    const policyError = getPasswordPolicyError(newPassword);
    if (policyError) {
      setPwError(policyError);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogoutOtherSessions = async () => {
    setLogoutOthersLoading(true);
    setLogoutOthersError(null);
    try {
      await authService.logoutOtherSessions();
      setShowLogoutOthersConfirm(false);
      setLogoutOthersSuccess(true);
    } catch (err) {
      setLogoutOthersError(err instanceof Error ? err.message : 'Failed to log out other sessions.');
    } finally {
      setLogoutOthersLoading(false);
    }
  };

  const fetchReviews = useCallback(async (
    p: number,
    searchVal = '',
    ratingVal = '',
    channelVal = '',
    sortVal = 'desc'
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewService.getMyReviews(p, 10, {
        search: searchVal,
        rating: ratingVal,
        channel: channelVal,
        sortBy: sortVal,
      });
      setReviews(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalReviews(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const [renderTime] = useState(() => Date.now());

  useEffect(() => {
    if (user) {
      if (user.role === 'VENDOR') {
        navigate(ROUTES.VENDOR_DASHBOARD, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchReviews(page, activeSearch, reviewsRating, reviewsChannel, reviewsSortBy);
    });
  }, [page, activeSearch, reviewsRating, reviewsChannel, reviewsSortBy, fetchReviews]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const canEdit = (createdAtStr: string) => {
    const diffMs = renderTime - new Date(createdAtStr).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < REVIEW_EDIT_WINDOW_HOURS;
  };

  const getReviewStatus = (review: MyReviewResponse) => {
    if (review.isFlagged) return 'Flagged';
    const diffMs = renderTime - new Date(review.createdAt).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < REVIEW_UNDER_REVIEW_HOURS) return 'Under Review';
    return 'Published';
  };

  const renderStatusBadge = (review: MyReviewResponse) => {
    const status = getReviewStatus(review);
    let dotClass = styles.dotPublished;
    let badgeClass = styles.badgePublished;
    if (status === 'Flagged') {
      dotClass = styles.dotFlagged;
      badgeClass = styles.badgeFlagged;
    } else if (status === 'Under Review') {
      dotClass = styles.dotReview;
      badgeClass = styles.badgeReview;
    }

    return (
      <span className={`${styles.statusBadge} ${badgeClass}`}>
        <span className={`${styles.statusDot} ${dotClass}`} />
        {status}
      </span>
    );
  };

  const handleClearFilters = () => {
    setPage(1);
    setReviewsSearch('');
    setActiveSearch('');
    setReviewsRating('');
    setReviewsChannel('');
    setReviewsSortBy('desc');
  };

  return (
    <div className={styles.page} style={{ paddingTop: '4.25rem' }}>
      {/* Navbar */}
      <Navbar />

      {/* Main Body with Sidebar Layout */}
      <div className={styles.dashboardContainer}>
        {/* Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarProfile}>
            <div className={styles.sidebarAvatar}>
              {user?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className={styles.sidebarProfileInfo}>
              <div className={styles.sidebarName}>{user?.displayName}</div>
              <div className={styles.sidebarEmail}>{user?.email}</div>
            </div>
          </div>

          <nav className={styles.sidebarMenu}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`${styles.menuItem} ${activeTab === 'overview' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Overview
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`${styles.menuItem} ${activeTab === 'reviews' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              My Reviews
              {totalReviews > 0 && <span className={styles.menuBadge}>{totalReviews}</span>}
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`${styles.menuItem} ${activeTab === 'security' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className={styles.menuLabelFull}>Security & Settings</span>
              <span className={styles.menuLabelShort}>Security</span>
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className={styles.content}>
          <div className={styles.contentHeader}>
            <Link to={ROUTES.HOME} className={styles.backLink}>← Back to Search</Link>
          </div>

          <div className={styles.contentBody}>
            {/* Overview View */}
            {activeTab === 'overview' && (
              <div className={styles.tabContent}>
                {/* Supabase-style Header */}
                <div className={styles.minimalHeader}>
                  <div className={styles.headerTitleCol}>
                    <div className={styles.headerTitleRow}>
                      <h1 className={styles.minimalTitle}>
                        Welcome back, {user?.displayName ? user.displayName.split(' ')[0] : 'User'}
                      </h1>
                    </div>
                    <div className={styles.headerMetaRow}>
                      <span className={styles.metaLabel}>Joined: <strong>{formatDate(user?.createdAt || '')}</strong></span>
                    </div>
                  </div>

                  <div className={styles.headerActions}>
                    <Link to={ROUTES.SUBMIT_REVIEW}>
                      <Button variant="primary" className={styles.newReviewBtn}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.375rem' }}>
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New review
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Email verification status alert box */}
                {!user?.isVerified && (
                  <div className={styles.minimalAlertUnverified}>
                    <span className={styles.alertIcon}>⚠️</span>
                    <p>Your email address is unverified. Please check your inbox to verify your account so you can write reviews.</p>
                  </div>
                )}

                {/* Content section */}
                <div className={styles.activitySectionHeader}>
                  <h3 className={styles.sectionSubtitle}>Recent Reviews</h3>
                </div>

                {loading ? (
                  <LoadingSpinner />
                ) : reviews.length === 0 ? (
                  <div className={styles.minimalEmptyState}>
                    <svg className={styles.emptyStateSvg} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <h3>No reviews yet</h3>
                    <p>You haven't written any vendor reviews. Click the "New review" button above to share your first experience.</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.projectGrid}>
                      {reviews.slice(0, 3).map((review) => (
                        <div key={review.id} className={styles.projectCard}>
                          <div className={styles.projectCardHeader}>
                            <Link to={`/vendors/${review.vendorId}`} className={styles.projectVendorName}>
                              {review.vendor.businessName || 'Unnamed Vendor'}
                            </Link>
                            <div className={styles.projectRating}>
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </div>
                          </div>
                          <p className={styles.projectText}>{review.reviewText}</p>
                          <div className={styles.projectCardFooter}>
                            <div className={styles.projectMeta}>
                              {review.transactionChannel && (
                                <>
                                  <span className={styles.projectChannel}>{review.transactionChannel}</span>
                                  <span className={styles.projectMetaDivider}>|</span>
                                </>
                              )}
                              <span>{formatDate(review.createdAt)}</span>
                            </div>
                            <div className={styles.projectActions}>
                              {canEdit(review.createdAt) ? (
                                <Link
                                  to={ROUTES.SUBMIT_REVIEW}
                                  state={{
                                    isEdit: true,
                                    reviewId: review.id,
                                    initialRating: review.rating,
                                    initialText: review.reviewText,
                                    vendorId: review.vendorId,
                                  }}
                                  className={styles.projectEditLink}
                                >
                                  Edit
                                </Link>
                              ) : (
                                <span className={styles.projectEditDisabled}>Ended</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalReviews > 3 && (
                      <div>
                        <button
                          onClick={() => setActiveTab('reviews')}
                          className={styles.seeMoreReviewsLink}
                        >
                          See all reviews &rarr;
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Quick Action Card */}
                <div className={styles.quickActionCard}>
                  <div className={styles.quickActionContent}>
                    <h4 className={styles.quickActionTitle}>Protect the community</h4>
                    <p className={styles.quickActionText}>
                      Haven't bought from a vendor recently? Leave a review and help others make safer decisions.
                    </p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchTerm.trim()) {
                        navigate(`${ROUTES.SUBMIT_REVIEW}?query=${encodeURIComponent(searchTerm.trim())}`);
                      }
                    }}
                    className={styles.quickActionForm}
                  >
                    <div className={styles.unifiedSearchInputContainer}>
                      <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Enter business name, phone or handle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.quickActionInput}
                      />
                    </div>
                    <button type="submit" className={styles.quickActionButton}>
                      Write Review
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Reviews View */}
            {activeTab === 'reviews' && (
              <div className={styles.tabContent}>
                {/* Supabase-style Header */}
                <div className={styles.minimalHeader}>
                  <div className={styles.headerTitleCol}>
                    <h1 className={styles.minimalTitle}>My Reviews</h1>
                    <div className={styles.headerMetaRow}>
                      <span className={styles.metaLabel}>Manage and edit your submitted vendor reviews.</span>
                    </div>
                  </div>

                  <div className={styles.headerActions}>
                    <Link to={ROUTES.SUBMIT_REVIEW}>
                      <Button variant="primary" className={styles.newReviewBtn}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.375rem' }}>
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New review
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Search, Filter & Sort Bar */}
                {(totalReviews > 0 || activeSearch || reviewsRating || reviewsChannel) && (
                  <div className={styles.filterBar}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setPage(1);
                        setActiveSearch(reviewsSearch);
                      }}
                      className={styles.reviewsSearchForm}
                    >
                      <div className={styles.reviewsSearchWrapper}>
                        <svg className={styles.reviewsSearchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search your reviews..."
                          value={reviewsSearch}
                          onChange={(e) => setReviewsSearch(e.target.value)}
                          className={styles.reviewsSearchInput}
                        />
                      </div>
                      {reviewsSearch !== activeSearch && (
                        <button type="submit" className={styles.reviewsSearchBtn}>
                          Search
                        </button>
                      )}
                    </form>

                    <div className={styles.filterGroup}>
                      <CustomSelect
                        value={reviewsRating}
                        onChange={(val) => {
                          setPage(1);
                          setReviewsRating(val);
                        }}
                        options={[
                          { value: '', label: 'All Ratings' },
                          { value: '5', label: '5 Stars' },
                          { value: '4', label: '4 Stars' },
                          { value: '3', label: '3 Stars' },
                          { value: '2', label: '2 Stars' },
                          { value: '1', label: '1 Star' },
                        ]}
                        placeholder="All Ratings"
                      />

                      <CustomSelect
                        value={reviewsChannel}
                        onChange={(val) => {
                          setPage(1);
                          setReviewsChannel(val);
                        }}
                        options={[
                          { value: '', label: 'All Channels' },
                          { value: 'Instagram', label: 'Instagram' },
                          { value: 'WhatsApp', label: 'WhatsApp' },
                          { value: 'Twitter', label: 'Twitter / X' },
                          { value: 'Facebook', label: 'Facebook' },
                          { value: 'Website', label: 'Website' },
                          { value: 'Physical Store', label: 'Physical Store' },
                          { value: 'Other', label: 'Other' },
                        ]}
                        placeholder="All Channels"
                      />

                      <CustomSelect
                        value={reviewsSortBy}
                        onChange={(val) => {
                          setPage(1);
                          setReviewsSortBy(val);
                        }}
                        options={[
                          { value: 'desc', label: 'Newest First' },
                          { value: 'asc', label: 'Oldest First' },
                        ]}
                        placeholder="Sort By"
                      />
                    </div>
                  </div>
                )}

                <ErrorMessage message={error} />
                {loading ? (
                  <LoadingSpinner />
                ) : reviews.length === 0 ? (
                  activeSearch || reviewsRating || reviewsChannel ? (
                    <div className={styles.minimalEmptyState}>
                      <svg className={styles.emptyStateSvg} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <h3>No matching reviews</h3>
                      <p>We couldn't find any reviews matching your search or filter criteria. Try clearing them.</p>
                      <Button onClick={handleClearFilters} variant="secondary" style={{ marginTop: '1rem' }}>
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.minimalEmptyState}>
                      <svg className={styles.emptyStateSvg} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <h3>No reviews yet</h3>
                      <p>You haven't written any vendor reviews. Click the "New review" button to share your first experience.</p>
                    </div>
                  )
                ) : (
                  <>
                    <div className={styles.projectGrid}>
                      {reviews.map((review) => (
                        <div key={review.id} className={styles.projectCard}>
                          <div className={styles.projectCardHeader}>
                            <div className={styles.projectVendorCol}>
                              <Link to={`/vendors/${review.vendorId}`} className={styles.projectVendorName}>
                                {review.vendor.businessName || 'Unnamed Vendor'}
                              </Link>
                              {renderStatusBadge(review)}
                            </div>
                            <div className={styles.projectRating}>
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </div>
                          </div>
                          <p className={styles.projectText}>{review.reviewText}</p>
                          <div className={styles.projectCardFooter}>
                            <div className={styles.projectMeta}>
                              {review.transactionChannel && (
                                <>
                                  <span className={styles.projectChannel}>{review.transactionChannel}</span>
                                  <span className={styles.projectMetaDivider}>|</span>
                                </>
                              )}
                              <span>{formatDate(review.createdAt)}</span>
                            </div>
                            <div className={styles.projectActions}>
                              {canEdit(review.createdAt) ? (
                                <Link
                                  to={ROUTES.SUBMIT_REVIEW}
                                  state={{
                                    isEdit: true,
                                    reviewId: review.id,
                                    initialRating: review.rating,
                                    initialText: review.reviewText,
                                    vendorId: review.vendorId,
                                  }}
                                  className={styles.projectEditLink}
                                >
                                  Edit
                                </Link>
                              ) : (
                                <span className={styles.projectEditDisabled}>Ended</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className={styles.pagination}>
                        <Button
                          variant="secondary"
                          disabled={page === 1}
                          onClick={() => {
                            setPage(page - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          ← Previous
                        </Button>
                        <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                        <Button
                          variant="secondary"
                          disabled={page === totalPages}
                          onClick={() => {
                            setPage(page + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Next →
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Security View */}
            {activeTab === 'security' && (
              <div className={styles.tabContent}>
                {/* Supabase-style Header */}
                <div className={styles.minimalHeader}>
                  <div className={styles.headerTitleCol}>
                    <h1 className={styles.minimalTitle}>Security & Settings</h1>
                    <div className={styles.headerMetaRow}>
                      <span className={styles.metaLabel}>Manage account verification and security guidelines.</span>
                    </div>
                  </div>
                </div>

                <div className={styles.securityPanel}>
                  <div className={styles.securitySection}>
                    <h3 className={styles.securityTitle}>Account Verification</h3>
                    <p className={styles.securityText}>
                      {user?.isVerified
                        ? `Your email address (${user.email}) is verified. You have full access to platform features, including review submissions.`
                        : `Your email address (${user?.email}) is currently unverified. Check your inbox for the link sent during registration.`}
                    </p>
                  </div>

                  <div className={styles.securitySection}>
                    <h3 className={styles.securityTitle}>Change Password</h3>
                    <p className={styles.securityText} style={{ marginBottom: '1rem' }}>
                      Update the password used to sign in to your account.
                    </p>

                    <ErrorMessage message={pwError} />
                    {pwSuccess && (
                      <div className={styles.securitySuccessMsg}>Password changed successfully.</div>
                    )}

                    <form onSubmit={handleChangePassword} className={styles.securityForm}>
                      <div className={styles.securityFormGroup}>
                        <label className={styles.securityLabel} htmlFor="currentPassword">Current Password</label>
                        <input
                          id="currentPassword"
                          type="password"
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className={styles.securityFormGroup}>
                        <label className={styles.securityLabel} htmlFor="newPassword">New Password</label>
                        <input
                          id="newPassword"
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onFocus={() => setNewPasswordFocused(true)}
                          onBlur={() => setNewPasswordFocused(false)}
                          required
                        />
                        <PasswordRequirements password={newPassword} visible={newPasswordFocused} />
                      </div>

                      <div className={styles.securityFormGroup}>
                        <label className={styles.securityLabel} htmlFor="confirmNewPassword">Confirm New Password</label>
                        <input
                          id="confirmNewPassword"
                          type="password"
                          autoComplete="new-password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" variant="primary" disabled={pwLoading} className={styles.securitySubmitBtn}>
                        {pwLoading ? 'Updating...' : 'Update Password'}
                      </Button>
                    </form>
                  </div>

                  <div className={styles.securitySection}>
                    <h3 className={styles.securityTitle}>Active Sessions</h3>
                    <p className={styles.securityText} style={{ marginBottom: '1rem' }}>
                      If you suspect your account is signed in somewhere you don't recognize, you can log out every other active session. This device stays signed in.
                    </p>

                    <ErrorMessage message={logoutOthersError} />
                    {logoutOthersSuccess && (
                      <div className={styles.securitySuccessMsg}>All other sessions have been logged out.</div>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowLogoutOthersConfirm(true)}
                    >
                      Log out of all other devices
                    </Button>
                  </div>
                </div>

                <ConfirmModal
                  isOpen={showLogoutOthersConfirm}
                  title="Log out of all other devices?"
                  message="This will immediately sign out every other browser or device currently logged into your account. This device will remain signed in."
                  confirmLabel="Log out others"
                  onConfirm={handleLogoutOtherSessions}
                  onCancel={() => setShowLogoutOthersConfirm(false)}
                  loading={logoutOthersLoading}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
