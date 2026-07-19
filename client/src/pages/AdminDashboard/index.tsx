import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Navbar } from '../../components/Navbar/index.js';
import { adminService, type AdminStats, type AdminClaim, type AdminReport, type AdminUser, type FlaggedReviewResponse, type AdminReview, type AdminVendor } from '../../services/admin.service.js';
import { LoadingSpinner } from '../../components/LoadingSpinner/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { TwoFactorSettings } from '../../components/TwoFactorSettings/index.js';
import { RowActionMenu } from '../../components/RowActionMenu/index.js';
import { Pagination } from '../../components/Pagination/index.js';
import { ROUTES } from '../../utils/constants.js';
import styles from './AdminDashboard.module.css';

type TabType = 'claims' | 'reports' | 'flagged' | 'reviews' | 'vendors' | 'users' | 'security';

export const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('claims');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab Data States
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<FlaggedReviewResponse[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const loadStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadTabData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'claims') {
        const res = await adminService.getClaims(page, pageSize);
        setClaims(res.data);
        setTotalPages(res.pagination.totalPages);
      } else if (activeTab === 'reports') {
        const res = await adminService.getReports(page, pageSize);
        setReports(res.data);
        setTotalPages(res.pagination.totalPages);
      } else if (activeTab === 'flagged') {
        const res = await adminService.getFlaggedReviews(page, pageSize);
        setFlaggedReviews(res.data);
        setTotalPages(res.pagination.totalPages);
      } else if (activeTab === 'reviews') {
        const res = await adminService.getAllReviews(page, pageSize);
        setReviews(res.data);
        setTotalPages(res.pagination.totalPages);
      } else if (activeTab === 'vendors') {
        const res = await adminService.getVendors(page, pageSize);
        setVendors(res.data);
        setTotalPages(res.pagination.totalPages);
      } else if (activeTab === 'users') {
        const res = await adminService.getUsers(page, pageSize);
        setUsers(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
    if (user?.role !== 'ADMIN') {
      navigate(ROUTES.HOME);
      return;
    }
    loadStats();
    loadTabData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab, page, pageSize]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // Claim actions
  const handleClaimApproval = async (vendorId: string, approve: boolean) => {
    try {
      setError(null);
      if (approve) {
        await adminService.approveClaim(vendorId);
      } else {
        await adminService.rejectClaim(vendorId);
      }
      loadStats();
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  // Report actions
  const handleResolveReport = async (reportId: string, status: 'REVIEWED' | 'DISMISSED') => {
    try {
      setError(null);
      await adminService.resolveReport(reportId, status);
      loadStats();
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  // Review actions — admin endpoints (no ownership/time-window limits).
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Delete this review permanently? This cannot be undone.')) return;
    try {
      setError(null);
      await adminService.deleteReview(reviewId);
      loadStats();
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleVerifyReview = async (reviewId: string, verified: boolean) => {
    try {
      setError(null);
      await adminService.verifyReview(reviewId, verified);
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleToggleFeature = async (vendorId: string) => {
    try {
      setError(null);
      await adminService.toggleFeatured(vendorId);
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  // User actions
  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'delete' | 'promote') => {
    if (action === 'delete' && !window.confirm('Delete this user? All reviews and reports from this user will be deleted too.')) return;
    try {
      setError(null);
      if (action === 'ban') {
        await adminService.banUser(userId);
      } else if (action === 'unban') {
        await adminService.unbanUser(userId);
      } else if (action === 'promote') {
        await adminService.promoteUser(userId);
      } else if (action === 'delete') {
        await adminService.deleteUser(userId);
      }
      loadStats();
      loadTabData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <div className={styles.page} style={{ paddingTop: '4.25rem' }}>
      <Navbar />

      {/* Main Admin Content Container */}
      <div className={styles.dashboardContainer}>
        {/* Sidebar Nav */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarProfile}>
            <div className={styles.sidebarAvatar}>
              {user?.displayName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className={styles.sidebarProfileInfo}>
              <h3 className={styles.sidebarName}>{user?.displayName}</h3>
              <span className={styles.sidebarRoleBadge}>Admin Suite</span>
            </div>
          </div>

          <nav className={styles.sidebarMenu}>
            <button
              onClick={() => handleTabChange('claims')}
              className={`${styles.menuItem} ${activeTab === 'claims' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Claims
              {stats?.pendingClaims !== undefined && stats.pendingClaims > 0 && (
                <span className={styles.menuBadge}>{stats.pendingClaims}</span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('reports')}
              className={`${styles.menuItem} ${activeTab === 'reports' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Disputes
              {stats?.pendingReports !== undefined && stats.pendingReports > 0 && (
                <span className={styles.menuBadge}>{stats.pendingReports}</span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('flagged')}
              className={`${styles.menuItem} ${activeTab === 'flagged' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Flagged Reviews
            </button>

            <button
              onClick={() => handleTabChange('reviews')}
              className={`${styles.menuItem} ${activeTab === 'reviews' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              All Reviews
            </button>

            <button
              onClick={() => handleTabChange('vendors')}
              className={`${styles.menuItem} ${activeTab === 'vendors' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M3 9l1-5h16l1 5" />
                <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
                <path d="M9 22V12h6v10" />
              </svg>
              Vendors
            </button>

            <button
              onClick={() => handleTabChange('users')}
              className={`${styles.menuItem} ${activeTab === 'users' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              User List
            </button>

            <button
              onClick={() => handleTabChange('security')}
              className={`${styles.menuItem} ${activeTab === 'security' ? styles.menuItemActive : ''}`}
            >
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Security
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className={styles.content}>
          <div className={styles.contentHeader}>
            <h1 className={styles.pageTitle}>Admin Moderation Panel</h1>
            <p className={styles.pageSubtitle}>Review vendor claims, scam reports, and moderate reviews</p>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Users</span>
                <div className={styles.statValue}>{stats.totalUsers}</div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Vendors</span>
                <div className={styles.statValue}>{stats.totalVendors}</div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Pending Claims</span>
                <div className={stats.pendingClaims > 0 ? styles.statValueAttention : styles.statValue}>{stats.pendingClaims}</div>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Pending Reports</span>
                <div className={stats.pendingReports > 0 ? styles.statValueAttention : styles.statValue}>{stats.pendingReports}</div>
              </div>
            </div>
          )}

          <ErrorMessage message={error} />

          {loading ? (
            <div style={{ display: 'flex', padding: '4rem', justifyContent: 'center' }}>
              <LoadingSpinner />
            </div>
          ) : (
            <div className={styles.panel}>
              
              {/* CLAIMS TAB */}
              {activeTab === 'claims' && (
                <div>
                  <h3 className={styles.panelTitle}>Pending Profile Claims</h3>
                  <p className={styles.panelSubtitle}>Verify and approve vendor ownership claims for their business pages.</p>
                  
                  {claims.length === 0 ? (
                    <div className={styles.emptyState}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <polyline points="9 15 11 17 15 13" />
                      </svg>
                      <h3>No pending claims</h3>
                      <p>Vendor ownership claims will appear here when someone requests to manage a business page.</p>
                    </div>
                  ) : (
                    <div className={`${styles.tableWrapper} ${styles.cardMobile}`}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Business Details</th>
                            <th>Claimant User</th>
                            <th>Location / Category</th>
                            <th className={styles.actionsCol}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {claims.map((c) => (
                            <tr key={c.id} className={styles.trHover}>
                              <td>
                                <strong>{c.businessName}</strong>
                                <div className={styles.businessMeta}>
                                  📸 @{c.instagramHandle} | 📞 {c.phoneNumber}
                                </div>
                              </td>
                              <td className={styles.cardFull} data-label="Claimant User">
                                {c.owner?.displayName}
                                <div className={styles.businessMeta}>{c.owner?.email}</div>
                              </td>
                              <td className={styles.cardFull} data-label="Location / Category">
                                {c.category}
                                <div className={styles.businessMeta}>{c.state}</div>
                              </td>
                              <td className={styles.actionsCol}>
                                <RowActionMenu actions={[
                                  { label: 'Approve claim', onClick: () => handleClaimApproval(c.id, true) },
                                  { label: 'Reject claim', onClick: () => handleClaimApproval(c.id, false), danger: true },
                                ]} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* REPORTS TAB */}
              {activeTab === 'reports' && (
                <div>
                  <h3 className={styles.panelTitle}>Scam & Moderation Reports</h3>
                  <p className={styles.panelSubtitle}>Investigate customer reports regarding online vendor fraud or bad conducts.</p>
                  
                  {reports.length === 0 ? (
                    <div className={styles.emptyState}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <h3>No reports</h3>
                      <p>Scam and moderation reports submitted by buyers will show up here for review.</p>
                    </div>
                  ) : (
                    <div className={`${styles.tableWrapper} ${styles.cardMobile}`}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Reported Vendor</th>
                            <th>Reporter User</th>
                            <th>Reason & Description</th>
                            <th className={styles.actionsCol}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((r) => (
                            <tr key={r.id} className={styles.trHover}>
                              <td>
                                <strong>{r.vendor.businessName}</strong>
                                <div className={styles.businessMeta}>@{r.vendor.instagramHandle}</div>
                              </td>
                              <td className={styles.cardFull} data-label="Reporter">
                                {r.user.displayName}
                                <div className={styles.businessMeta}>{r.user.email}</div>
                              </td>
                              <td className={styles.cardFull} data-label="Reason & Description">
                                <span className={styles.badgeDanger}>{r.reason}</span>
                                <p className={styles.reporterText}>{r.description}</p>
                              </td>
                              <td className={styles.actionsCol}>
                                <RowActionMenu actions={[
                                  { label: 'Mark resolved', onClick: () => handleResolveReport(r.id, 'REVIEWED') },
                                  { label: 'Dismiss report', onClick: () => handleResolveReport(r.id, 'DISMISSED') },
                                ]} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* FLAG REVIEWS TAB */}
              {activeTab === 'flagged' && (
                <div>
                  <h3 className={styles.panelTitle}>Flagged Review Moderation</h3>
                  <p className={styles.panelSubtitle}>Manage reviews that have been flagged as spam, suspicious, or inappropriate.</p>
                  
                  {flaggedReviews.length === 0 ? (
                    <div className={styles.emptyState}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <h3>No flagged reviews</h3>
                      <p>Reviews flagged for spam or suspicious activity will appear here for moderation.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                      {flaggedReviews.map((rev) => (
                        <div key={rev.id} className={styles.flaggedReviewCard}>
                          <div className={styles.flaggedReviewHeader}>
                            <div className={styles.flaggedReviewInfo}>
                              <span>
                                <strong>{rev.user?.displayName || 'Buyer'}</strong> reviewed <strong>{rev.vendor?.businessName}</strong>
                              </span>
                              <span className={styles.businessMeta}>Rating: ★ {rev.rating}/5</span>
                            </div>
                            <button type="button" onClick={() => handleDeleteReview(rev.id)} className={styles.rowBtnDanger}>
                              Delete Review
                            </button>
                          </div>
                          <p className={styles.flaggedReviewBody}>
                            "{rev.reviewText}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ALL REVIEWS TAB */}
              {activeTab === 'reviews' && (
                <div>
                  <h3 className={styles.panelTitle}>All Reviews</h3>
                  <p className={styles.panelSubtitle}>Award the verified-buyer badge or remove reviews that violate the guidelines.</p>

                  {reviews.length === 0 ? (
                    <div className={styles.emptyState}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <h3>No reviews yet</h3>
                      <p>Buyer reviews will appear here once they start reviewing vendors.</p>
                    </div>
                  ) : (
                    <div className={`${styles.tableWrapper} ${styles.cardMobile}`}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Review</th>
                            <th>Vendor</th>
                            <th>Rating</th>
                            <th>Status</th>
                            <th className={styles.actionsCol}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {reviews.map((rev) => (
                            <tr key={rev.id} className={styles.trHover}>
                              <td>
                                <strong>{rev.user.displayName}</strong>
                                <p className={styles.reporterText}>"{rev.reviewText}"</p>
                              </td>
                              <td data-label="Vendor">{rev.vendor.businessName}</td>
                              <td data-label="Rating">★ {rev.rating}/5</td>
                              <td data-label="Status">
                                {rev.verifiedBuyer && <span className={styles.badgeSuccess}>Verified</span>}
                                {rev.isFlagged && <span className={styles.badgeDanger}>Flagged</span>}
                                {!rev.verifiedBuyer && !rev.isFlagged && <span className={styles.badgeNeutral}>Unverified</span>}
                              </td>
                              <td className={styles.actionsCol}>
                                <RowActionMenu actions={[
                                  { label: rev.verifiedBuyer ? 'Remove verified badge' : 'Verify buyer', onClick: () => handleVerifyReview(rev.id, !rev.verifiedBuyer) },
                                  { label: 'Delete review', onClick: () => handleDeleteReview(rev.id), danger: true },
                                ]} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* VENDORS TAB */}
              {activeTab === 'vendors' && (
                <div>
                  <h3 className={styles.panelTitle}>Vendors</h3>
                  <p className={styles.panelSubtitle}>Feature trusted vendors on the homepage and monitor trust standing.</p>

                  {vendors.length === 0 ? (
                    <div className={styles.emptyState}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l1-5h16l1 5" />
                        <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
                        <path d="M9 22V12h6v10" />
                      </svg>
                      <h3>No vendors yet</h3>
                      <p>Registered vendors will appear here as businesses join the platform.</p>
                    </div>
                  ) : (
                    <div className={`${styles.tableWrapper} ${styles.cardMobile}`}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Business</th>
                            <th>Trust</th>
                            <th>Reviews</th>
                            <th>Status</th>
                            <th className={styles.actionsCol}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendors.map((v) => (
                            <tr key={v.id} className={styles.trHover}>
                              <td>
                                <strong>{v.businessName}</strong>
                                <div className={styles.businessMeta}>{[v.category, v.state].filter(Boolean).join(' • ') || '—'}</div>
                              </td>
                              <td data-label="Trust">{v.trustScore?.toFixed(1)} <span className={styles.businessMeta}>{v.trustLabel}</span></td>
                              <td data-label="Reviews">{v.reviewCount}</td>
                              <td data-label="Status">
                                {v.featured && <span className={styles.badgeSuccess}>Featured</span>}
                                {v.scamFlag && <span className={styles.badgeDanger}>Scam flag</span>}
                                {!v.featured && !v.scamFlag && <span className={styles.badgeNeutral}>—</span>}
                              </td>
                              <td className={styles.actionsCol}>
                                <RowActionMenu actions={[
                                  { label: v.featured ? 'Remove from featured' : 'Feature on homepage', onClick: () => handleToggleFeature(v.id) },
                                ]} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* USERS TAB */}
              {activeTab === 'users' && (
                <div>
                  <h3 className={styles.panelTitle}>User Access Control</h3>
                  <p className={styles.panelSubtitle}>Ban, promote, or remove accounts across the platform.</p>
                  
                  <div className={`${styles.tableWrapper} ${styles.cardMobile}`}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Name / Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th className={styles.actionsCol}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className={styles.trHover}>
                            <td>
                              <strong>{u.displayName}</strong>
                              <div className={styles.businessMeta}>{u.email}</div>
                            </td>
                            <td data-label="Role">
                              <span className={
                                u.role === 'ADMIN' ? styles.badgeDanger :
                                u.role === 'VENDOR' ? styles.badgeSuccess :
                                styles.badgeNeutral
                              }>
                                {u.role}
                              </span>
                            </td>
                            <td data-label="Status">
                              {u.isBanned ? (
                                <span className={styles.badgeDanger} style={{ textTransform: 'none' }}>Banned</span>
                              ) : u.isVerified ? (
                                <span className={styles.badgeSuccess} style={{ textTransform: 'none' }}>Active</span>
                              ) : (
                                <span className={styles.badgeNeutral} style={{ textTransform: 'none' }}>Unverified</span>
                              )}
                            </td>
                            <td className={styles.actionsCol}>
                              {u.role !== 'ADMIN' && (
                                <RowActionMenu actions={[
                                  { label: 'Make admin', onClick: () => handleUserAction(u.id, 'promote') },
                                  u.isBanned
                                    ? { label: 'Unban user', onClick: () => handleUserAction(u.id, 'unban') }
                                    : { label: 'Ban user', onClick: () => handleUserAction(u.id, 'ban') },
                                  { label: 'Delete user', onClick: () => handleUserAction(u.id, 'delete'), danger: true },
                                ]} />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div>
                  <h3 className={styles.panelTitle}>Two-Factor Authentication</h3>
                  <p className={styles.panelSubtitle}>Protect your admin account with an authenticator app.</p>
                  <div style={{ marginTop: '1.25rem' }}>
                    <TwoFactorSettings />
                  </div>
                </div>
              )}

              {/* Pagination controls (data tabs only) */}
              {activeTab !== 'security' && totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

