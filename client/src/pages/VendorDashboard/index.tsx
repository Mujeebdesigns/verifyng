import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Navbar } from '../../components/Navbar/index.js';
import { vendorService } from '../../services/vendor.service.js';
import { reviewService } from '../../services/review.service.js';
import { Button } from '../../components/Button/index.js';
import { LoadingSpinner } from '../../components/LoadingSpinner/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { CustomSelect } from '../../components/CustomSelect/index.js';
import { ReviewCard } from '../../components/ReviewCard/index.js';
import type { VendorDetail, VendorSummaryResponse, VendorSummaryApiResponse } from '../../types/vendor.js';
import type { ReviewResponse } from '../../types/review.js';
import { ROUTES } from '../../utils/constants.js';
import { compressImage } from '../../utils/compressImage.js';
import styles from './VendorDashboard.module.css';

const CATEGORIES = [
  'Fashion & Apparel',
  'Electronics & Gadgets',
  'Beauty & Cosmetics',
  'Food & Groceries',
  'Home & Kitchen',
  'Services',
  'Health & Wellness',
  'Other',
];

const STATES = [
  'Lagos',
  'Abuja (FCT)',
  'Rivers',
  'Oyo',
  'Kaduna',
  'Kano',
  'Enugu',
  'Edo',
  'Ogun',
  'Anambra',
];

type TabType = 'overview' | 'reviews' | 'edit';

export const VendorDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<VendorSummaryResponse | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<VendorSummaryApiResponse['status'] | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Profile Form States
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [stateName, setStateName] = useState('');
  const [cityName, setCityName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  
  // Onboarding Form (New Profile)
  const [bizName, setBizName] = useState('');
  const [acctLast4, setAcctLast4] = useState('');
  const [phone, setPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [coverImage, setCoverImage] = useState('');
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState('');
  const [logoImageError, setLogoImageError] = useState<string | null>(null);

  // Review reply state
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverImageError(null);
    if (file.size > 8 * 1024 * 1024) {
      setCoverImageError('Image is too large. Maximum size is 8MB.');
      return;
    }

    try {
      const { dataUrl, width, height } = await compressImage(file, { maxDimension: 1600 });
      if (width < 800 || height < 600) {
        setCoverImageError(`Image is too small (${width}x${height}px). Minimum required is 800x600px.`);
        return;
      }
      setCoverImage(dataUrl);
    } catch (err) {
      setCoverImageError(err instanceof Error ? err.message : 'Invalid image file.');
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoImageError(null);
    if (file.size > 8 * 1024 * 1024) {
      setLogoImageError('Image is too large. Maximum size is 8MB.');
      return;
    }

    try {
      const { dataUrl, width, height } = await compressImage(file, { maxDimension: 600 });
      if (width < 200 || height < 200) {
        setLogoImageError(`Image is too small (${width}x${height}px). Minimum required is 200x200px.`);
        return;
      }
      setLogoImage(dataUrl);
    } catch (err) {
      setLogoImageError(err instanceof Error ? err.message : 'Invalid image file.');
    }
  };

  const fetchProfileAndReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vendorService.getMyVendorProfile();
      setVendor(data);

      // Prepopulate form fields
      setDescription(data.description || '');
      setCategory(data.category || '');
      setStateName(data.state || '');
      setCityName(data.city || '');
      setInstagram(data.instagramHandle || '');
      setWhatsapp(data.whatsappUrl || '');
      setTiktok(data.tiktokUrl || '');
      setFacebook(data.facebookUrl || '');
      setLinkedin(data.linkedinUrl || '');
      setCoverImage(data.coverImage || '');
      setLogoImage(data.logoImage || '');

      // Load reviews
      const reviewsRes = await vendorService.getReviews(data.id, 1, 50);
      setReviews(reviewsRes.data);

      // Load AI summary (best-effort — a failure here shouldn't block the rest of the dashboard)
      setSummaryError(null);
      try {
        const summaryRes = await vendorService.getSummary(data.id);
        setSummaryStatus(summaryRes.status);
        setSummary(summaryRes.status === 'ready' ? summaryRes.data : null);
      } catch (summaryErr) {
        setSummaryError(summaryErr instanceof Error ? summaryErr.message : 'Failed to load AI summary');
      }
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      if (error.statusCode === 404) {
        setVendor(null);
      } else {
        setError(error.message || 'Failed to load vendor profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    if (user?.role !== 'VENDOR' && user?.role !== 'ADMIN') {
      navigate(ROUTES.HOME);
      return;
    }
    fetchProfileAndReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!bizName || !category || !stateName || !cityName || !description) {
      setError('Please fill in all required fields.');
      setSaving(false);
      return;
    }

    if (!coverImage) {
      setError('Please upload a product cover image.');
      setSaving(false);
      return;
    }

    if (coverImageError) {
      setError('Please resolve image validation errors first.');
      setSaving(false);
      return;
    }

    const payload = {
      businessName: bizName.trim(),
      category,
      state: stateName,
      city: cityName.trim(),
      description: description.trim(),
      instagramHandle: instagram || undefined,
      phoneNumber: phone || undefined,
      whatsappUrl: whatsapp || undefined,
      tiktokUrl: tiktok || undefined,
      facebookUrl: facebook || undefined,
      linkedinUrl: linkedin || undefined,
      bankAccountLast4: acctLast4 || undefined,
      coverImage: coverImage || undefined,
      logoImage: logoImage || undefined,
    };

    try {
      await vendorService.createVendorProfile(payload);
      fetchProfileAndReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    setError(null);
    setSaving(true);
    setSaveSuccess(false);

    if (coverImageError || logoImageError) {
      setError('Please resolve image validation errors first.');
      setSaving(false);
      return;
    }

    try {
      await vendorService.updateVendorProfile(vendor.id, {
        description,
        category,
        state: stateName,
        city: cityName,
        instagramHandle: instagram,
        whatsappUrl: whatsapp,
        tiktokUrl: tiktok,
        facebookUrl: facebook,
        linkedinUrl: linkedin,
        coverImage: coverImage || undefined,
        logoImage: logoImage || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
      fetchProfileAndReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const startReply = (rev: ReviewResponse) => {
    setReplyError(null);
    setReplyDraft(rev.vendorReplyText || '');
    setReplyingId(rev.id);
  };

  const cancelReply = () => {
    setReplyingId(null);
    setReplyDraft('');
    setReplyError(null);
  };

  const submitReply = async (reviewId: string) => {
    setReplyError(null);
    setReplySaving(true);
    try {
      const updated = await reviewService.replyToReview(reviewId, { replyText: replyDraft });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyingId(null);
      setReplyDraft('');
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to save reply');
    } finally {
      setReplySaving(false);
    }
  };

  const copyTrustLink = () => {
    if (!vendor) return;
    const link = `${window.location.origin}/vendors/${vendor.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  if (loading) {
    return (
      <div className={styles.centerLoading}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Sidebar Layout */}
      <div className={styles.dashboardContainer}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarProfile}>
            <h3 className={styles.sidebarName}>{vendor?.businessName || user?.displayName}</h3>
            <span className={styles.sidebarRoleBadge}>Vendor Account</span>
          </div>

          {vendor && (
            <nav className={styles.sidebarMenu}>
              <button
                onClick={() => setActiveTab('overview')}
                className={`${styles.menuItem} ${activeTab === 'overview' ? styles.menuItemActive : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.menuIcon}>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.menuIcon}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Reviews
              </button>

              <button
                onClick={() => setActiveTab('edit')}
                className={`${styles.menuItem} ${activeTab === 'edit' ? styles.menuItemActive : ''}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.menuIcon}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Business Details
              </button>
            </nav>
          )}
        </aside>

        {/* Content Area */}
        <main className={styles.content}>
          <div className={styles.contentHeader}>
            <Link to={ROUTES.HOME} className={styles.backLink}>
              ← Back to Search
            </Link>
            <h1 className={styles.pageTitle}>
              {vendor && activeTab === 'reviews' ? 'Customer Reviews' : 'Vendor Dashboard'}
            </h1>
            <p className={styles.pageSubtitle}>
              {vendor && activeTab === 'reviews'
                ? `${vendor.reviewCount} review${vendor.reviewCount !== 1 ? 's' : ''} from your community.`
                : vendor
                ? 'Manage your credentials, verify reviews, and update your business bio.'
                : 'Publish your business page to start collecting reviews.'}
            </p>
          </div>

          <div className={styles.contentBody}>
            <ErrorMessage message={error} />

            {!vendor ? (
              /* ONBOARDING FLOW: CREATE PROFILE FORM */
              <div className={styles.panel}>
                <h2 className={styles.panelTitle}>Publish Your Business Profile</h2>
                <p className={styles.panelSubtitle}>Complete the setup to publish your public rating profile on VerifyNG.</p>

                <form onSubmit={handleCreateProfile}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="bizName">Business Name *</label>
                      <input
                        id="bizName"
                        type="text"
                        required
                        placeholder="e.g. Trendy Fits"
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Category *</label>
                      <CustomSelect
                        value={category}
                        onChange={setCategory}
                        placeholder="Select Category"
                        wrapperClassName={styles.selectField}
                        options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                      />
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>State *</label>
                      <CustomSelect
                        value={stateName}
                        onChange={setStateName}
                        placeholder="Select State"
                        wrapperClassName={styles.selectField}
                        options={STATES.map((st) => ({ value: st, label: st }))}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="cityName">City *</label>
                      <input
                        id="cityName"
                        type="text"
                        required
                        placeholder="e.g. Ikeja"
                        value={cityName}
                        onChange={(e) => setCityName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="phone">Phone Number</label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="e.g. 08012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="acctLast4">Bank Account (Last 4 Digits)</label>
                      <input
                        id="acctLast4"
                        type="text"
                        maxLength={4}
                        placeholder="e.g. 4321"
                        value={acctLast4}
                        onChange={(e) => setAcctLast4(e.target.value.replace(/[^0-9]/g, ''))}
                      />
                    </div>
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupTight}`}>
                    <label className={styles.formLabel} htmlFor="desc">Business Bio *</label>
                    <textarea
                      id="desc"
                      required
                      rows={4}
                      maxLength={500}
                      placeholder="Describe your business and services (max 500 characters)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupLoose}`}>
                    <label className={styles.formLabel} htmlFor="coverImageInput">Product Cover Image *</label>
                    <div>
                      <input
                        id="coverImageInput"
                        type="file"
                        accept="image/*"
                        required
                        onChange={handleImageChange}
                        className={styles.fileInput}
                      />
                      <p className={styles.fileHint}>
                        Add a product photo that represents your business best — this is what buyers see first. Minimum size 800×37.5rem.
                      </p>
                      {coverImageError && (
                        <div className={styles.fileError}>
                          {coverImageError}
                        </div>
                      )}
                      {coverImage && !coverImageError && (
                        <div className={styles.coverPreview}>
                          <img src={coverImage} alt="Cover Preview" className={styles.previewImg} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGroupLoose}`}>
                    <label className={styles.formLabel} htmlFor="logoImageInput">Logo / Profile Picture</label>
                    <div>
                      <input
                        id="logoImageInput"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className={styles.fileInput}
                      />
                      <p className={styles.fileHint}>
                        Add a logo or profile picture for your business. Minimum size 200×12.5rem.
                      </p>
                      {logoImageError && (
                        <div className={styles.fileError}>
                          {logoImageError}
                        </div>
                      )}
                      {logoImage && !logoImageError && (
                        <div className={styles.logoPreview}>
                          <img src={logoImage} alt="Logo Preview" className={styles.previewImg} />
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className={styles.sectionTitle}>Social Profiles</h3>
                  <div className={`${styles.formGrid} ${styles.formGroupLoose}`}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="instagram">Instagram Handle</label>
                      <input
                        id="instagram"
                        type="text"
                        placeholder="e.g. trendy_fits"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} htmlFor="whatsapp">WhatsApp Link or Number</label>
                      <input
                        id="whatsapp"
                        type="text"
                        placeholder="e.g. https://wa.me/2348012345678"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} fullWidth={true}>
                    {saving ? 'Creating Profile...' : 'Save & Publish Profile'}
                  </Button>
                </form>
              </div>
            ) : (
              /* ACTIVE DASHBOARD TABS */
              <div className={styles.tabContent}>
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <>
                    {/* Claims Alert Banner */}
                    {vendor.claimStatus === 'PENDING_APPROVAL' && (
                      <div className={`${styles.alertBox} ${styles.alertBoxWarning}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Your claim request is currently pending administrator verification. Some features may be hidden on your public page until approved.</span>
                      </div>
                    )}

                    {/* Stats scorecard */}
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <span className={styles.statLabel}>Trust Rating</span>
                        <div className={styles.statValue}>
                          {vendor.trustScore.toFixed(1)} <span className={styles.statValueUnit}>/10</span>
                        </div>
                        <span className={styles.badge}>{vendor.trustLabel}</span>
                      </div>

                      <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Reviews</span>
                        <div className={styles.statValue}>{vendor.reviewCount}</div>
                        <span className={styles.statSubtext}>Submitted by community</span>
                      </div>

                      <div className={styles.statCard}>
                        <span className={styles.statLabel}>Status</span>
                        <span className={vendor.claimStatus === 'CLAIMED' ? styles.statusPillVerified : styles.statusPillPending}>
                          {vendor.claimStatus === 'CLAIMED' ? 'Verified' : 'Pending approval'}
                        </span>
                        <span className={styles.statSubtext}>Claim confirmation state</span>
                      </div>
                    </div>

                    {/* AI reputation summary */}
                    <div className={styles.panel}>
                      <div className={styles.summaryHeaderRow}>
                        <div>
                          <h3 className={styles.panelTitle}>Your AI Reputation Summary</h3>
                          <p className={styles.panelSubtitle}>How buyers see your business, generated from community reviews.</p>
                        </div>
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
                              ? 'An AI summary is being compiled from your reviews. Check back shortly.'
                              : summaryStatus === 'insufficient_data'
                              ? `A summary unlocks once you have at least 3 reviews (currently ${vendor.reviewCount}). Share your link to collect more.`
                              : summaryStatus === 'unavailable'
                              ? 'The AI summary is temporarily unavailable.'
                              : 'An AI summary will compile automatically once you reach 3 reviews.'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Link share box */}
                    <div className={styles.shareWidget}>
                      <h3 className={styles.shareWidgetTitle}>Collect Rating Reviews</h3>
                      <p className={styles.shareWidgetDesc}>Share your VerifyNG profile link to gather verified feedback and build reputation.</p>
                      <div className={styles.shareInputGroup}>
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/vendors/${vendor.id}`}
                          className={styles.shareInput}
                        />
                        <Button onClick={copyTrustLink} variant="primary">
                          {copySuccess ? 'Copied!' : 'Copy Link'}
                        </Button>
                      </div>
                      <span className={styles.profileViewsNote}>
                        {vendor.profileViews} profile view{vendor.profileViews !== 1 ? 's' : ''} so far
                      </span>
                    </div>
                  </>
                )}

                {/* REVIEWS TAB */}
                {activeTab === 'reviews' && (
                  <>
                    {reviews.length === 0 ? (
                      <p className={styles.emptyFeedNote}>
                        No reviews submitted yet. Use the share link to collect customer ratings.
                      </p>
                    ) : (
                      <div className={styles.reviewsFeed}>
                        {reviews.map((rev) => (
                          <ReviewCard
                            key={rev.id}
                            review={rev}
                            vendorName={vendor.businessName || undefined}
                            onReplyClick={() => startReply(rev)}
                            replyFormSlot={replyingId === rev.id ? (
                              <div className={styles.replyForm}>
                                <textarea
                                  className={styles.replyTextarea}
                                  value={replyDraft}
                                  onChange={(e) => setReplyDraft(e.target.value)}
                                  placeholder="Write a public reply to this review (10–500 characters)"
                                  maxLength={500}
                                  rows={3}
                                />
                                {replyError && <div className={styles.replyErrorNote}>{replyError}</div>}
                                <div className={styles.replyFormActions}>
                                  <button
                                    type="button"
                                    className={styles.replyCancelBtn}
                                    onClick={cancelReply}
                                    disabled={replySaving}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.replySaveBtn}
                                    onClick={() => submitReply(rev.id)}
                                    disabled={replySaving || replyDraft.trim().length < 10}
                                  >
                                    {replySaving ? 'Saving...' : 'Save Reply'}
                                  </button>
                                </div>
                              </div>
                            ) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* EDIT TAB */}
                {activeTab === 'edit' && (
                  <div className={styles.panel}>
                    <h3 className={`${styles.panelTitle} ${styles.panelTitleSpacedLg}`}>Update Business Profile</h3>
                    {saveSuccess && (
                      <div className={styles.saveSuccessNote}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Profile details updated successfully.
                      </div>
                    )}

                    <form onSubmit={handleUpdateProfile}>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Category</label>
                          <CustomSelect
                            value={category}
                            onChange={setCategory}
                            placeholder="Select Category"
                            wrapperClassName={styles.selectField}
                            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Business Name</label>
                          <input
                            type="text"
                            className={`${styles.formInput} ${styles.disabledInput}`}
                            disabled
                            value={vendor.businessName || ''}
                          />
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>State</label>
                          <CustomSelect
                            value={stateName}
                            onChange={setStateName}
                            placeholder="Select State"
                            wrapperClassName={styles.selectField}
                            options={STATES.map((st) => ({ value: st, label: st }))}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel} htmlFor="editCity">City</label>
                          <input
                            id="editCity"
                            className={styles.formInput}
                            type="text"
                            required
                            value={cityName}
                            onChange={(e) => setCityName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className={`${styles.formGroup} ${styles.formGroupTight}`}>
                        <label className={styles.formLabel} htmlFor="editDesc">Business Description (max 500 characters)</label>
                        <textarea
                          id="editDesc"
                          className={styles.formTextarea}
                          required
                          rows={4}
                          maxLength={500}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>

                      <div className={`${styles.formGroup} ${styles.formGroupLoose}`}>
                        <label className={styles.formLabel} htmlFor="editCoverImageInput">Product Cover Image</label>
                        <div>
                          <input
                            id="editCoverImageInput"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className={styles.fileInput}
                          />
                          <p className={styles.fileHint}>
                            Add a product photo that represents your business best — this is what buyers see first. Minimum size 800×37.5rem.
                          </p>
                          {coverImageError && (
                            <div className={styles.fileError}>
                              {coverImageError}
                            </div>
                          )}
                          {coverImage && !coverImageError && (
                            <div className={styles.coverPreview}>
                              <img src={coverImage} alt="Cover Preview" className={styles.previewImg} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`${styles.formGroup} ${styles.formGroupLoose}`}>
                        <label className={styles.formLabel} htmlFor="editLogoImageInput">Logo / Profile Picture</label>
                        <div>
                          <input
                            id="editLogoImageInput"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className={styles.fileInput}
                          />
                          <p className={styles.fileHint}>
                            Add a logo or profile picture for your business. Minimum size 200×12.5rem.
                          </p>
                          {logoImageError && (
                            <div className={styles.fileError}>
                              {logoImageError}
                            </div>
                          )}
                          {logoImage && !logoImageError && (
                            <div className={styles.logoPreview}>
                              <img src={logoImage} alt="Logo Preview" className={styles.previewImg} />
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className={styles.sectionTitle}>Contact & Social Channels</h4>
                      <div className={`${styles.formGrid} ${styles.formGroupTight}`}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel} htmlFor="editInstagram">Instagram Handle</label>
                          <input
                            id="editInstagram"
                            className={styles.formInput}
                            type="text"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel} htmlFor="editWhatsapp">WhatsApp Link</label>
                          <input
                            id="editWhatsapp"
                            className={styles.formInput}
                            type="text"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className={`${styles.formGrid} ${styles.formGroupLoose}`}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel} htmlFor="editTiktok">TikTok URL</label>
                          <input
                            id="editTiktok"
                            className={styles.formInput}
                            type="text"
                            value={tiktok}
                            onChange={(e) => setTiktok(e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel} htmlFor="editFacebook">Facebook URL</label>
                          <input
                            id="editFacebook"
                            className={styles.formInput}
                            type="text"
                            value={facebook}
                            onChange={(e) => setFacebook(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={saving} fullWidth={true}>
                        {saving ? 'Saving...' : 'Update Details'}
                      </Button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VendorDashboard;
