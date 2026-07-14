import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../utils/constants.js';
import { Logo } from '../Logo/index.js';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedLogin, setExpandedLogin] = useState(false);
  const [expandedJoin, setExpandedJoin] = useState(false);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setExpandedLogin(false);
    setExpandedJoin(false);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isHome = location.pathname === ROUTES.HOME;

  const handleHomeScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (isHome) {
      e.preventDefault();
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    closeMenu();
  };

  const isDashboardView =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/vendor-dashboard') ||
    location.pathname.startsWith('/admin-dashboard') ||
    (location.state as { fromDashboard?: boolean })?.fromDashboard === true;

  const dashboardPath =
    user?.role === 'ADMIN'
      ? ROUTES.ADMIN_DASHBOARD
      : user?.role === 'VENDOR'
      ? ROUTES.VENDOR_DASHBOARD
      : ROUTES.DASHBOARD;

  const ArrowIcon = () => (
    <svg className={styles.arrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  return (
    <>
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <Link
          to={ROUTES.HOME}
          className={styles.navLogo}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Logo variant="dark" height="2rem" className={styles.navLogoImg} />
        </Link>

        <div className={styles.navLinks}>
          {isDashboardView ? (
            <>
              <Link
                to={ROUTES.DIRECTORY}
                state={{ fromDashboard: true }}
                className={`${styles.navLink} ${location.pathname === ROUTES.DIRECTORY ? styles.navLinkActive : ''}`}
              >
                Directory
              </Link>
              <Link
                to={ROUTES.SUPPORT}
                state={{ fromDashboard: true }}
                className={`${styles.navLink} ${location.pathname === ROUTES.SUPPORT ? styles.navLinkActive : ''}`}
              >
                Support
              </Link>
              <Link
                to={dashboardPath}
                className={`${styles.navLink} ${
                  location.pathname === ROUTES.DASHBOARD ||
                  location.pathname === ROUTES.VENDOR_DASHBOARD ||
                  location.pathname === ROUTES.ADMIN_DASHBOARD
                    ? styles.navLinkActive
                    : ''
                }`}
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <a
                href="/#featured-vendors-section"
                onClick={(e) => handleHomeScroll(e, '#featured-vendors-section')}
                className={styles.navLink}
              >
                Featured Vendors
              </a>
              <a
                href="/#how"
                onClick={(e) => handleHomeScroll(e, '#how')}
                className={styles.navLink}
              >
                How it works
              </a>
              <Link
                to={ROUTES.SUPPORT}
                className={`${styles.navLink} ${location.pathname === ROUTES.SUPPORT ? styles.navLinkActive : ''}`}
              >
                Support
              </Link>
            </>
          )}
        </div>

        <div className={styles.navRight}>
          {isDashboardView ? (
            <button onClick={logout} className={styles.navLogin} style={{ fontWeight: 500 }}>
              Logout
            </button>
          ) : isAuthenticated ? (
            <>
              <Link
                to={dashboardPath}
                className={styles.displayName}
              >
                Hi, {user?.displayName}
              </Link>
              {user?.role === 'BUYER' && (
                <Link to={ROUTES.SUBMIT_REVIEW} className={styles.navLogin}>
                  Write Review
                </Link>
              )}
              <button onClick={logout} className={styles.navCta}>
                Logout
              </button>
            </>
          ) : (
            <div className={styles.navAuthWrapper}>
              <div className={styles.dropdownContainer}>
                <button className={styles.navLogin}>
                  Log In
                  <ArrowIcon />
                </button>
                <div className={styles.authDropdown}>
                  <Link to={ROUTES.LOGIN_BUYER} className={styles.dropdownItem}>
                    <div className={styles.itemIconCircle}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>Shopper Portal</span>
                      <span className={styles.itemDesc}>Check ratings & leave reviews</span>
                    </div>
                  </Link>
                  <Link to={ROUTES.LOGIN_VENDOR} className={styles.dropdownItem}>
                    <div className={styles.itemIconCircle}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>Merchant Hub</span>
                      <span className={styles.itemDesc}>Manage business profile</span>
                    </div>
                  </Link>
                </div>
              </div>

              <div className={styles.dropdownContainer}>
                <button className={styles.navCta}>
                  Join Free
                  <ArrowIcon />
                </button>
                <div className={`${styles.authDropdown} ${styles.authDropdownRight}`}>
                  <Link to={ROUTES.REGISTER_BUYER} className={styles.dropdownItem}>
                    <div className={styles.itemIconCircle}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </div>
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>Become a Verified Shopper</span>
                      <span className={styles.itemDesc}>Verify merchants & write reviews</span>
                    </div>
                  </Link>
                  <Link to={ROUTES.REGISTER_VENDOR} className={styles.dropdownItem}>
                    <div className={styles.itemIconCircle}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        <path d="M2 21v-2a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className={styles.itemContent}>
                      <span className={styles.itemTitle}>List Your Business</span>
                      <span className={styles.itemDesc}>Claim profile & build credibility</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine}>
            <span className={styles.hamburgerLineInner} />
          </span>
          <span className={styles.hamburgerLine} />
        </button>
      </nav>

      {menuOpen && <div className={styles.overlay} onClick={closeMenu} />}

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`} aria-hidden={!menuOpen}>
        <nav className={styles.mobileMenuNav}>
            {isDashboardView ? (
              <>
                <Link
                  to={ROUTES.DIRECTORY}
                  state={{ fromDashboard: true }}
                  className={`${styles.mobileNavLink} ${location.pathname === ROUTES.DIRECTORY ? styles.mobileNavLinkActive : ''}`}
                  onClick={closeMenu}
                >
                  Directory
                </Link>
                <Link
                  to={ROUTES.SUPPORT}
                  state={{ fromDashboard: true }}
                  className={`${styles.mobileNavLink} ${location.pathname === ROUTES.SUPPORT ? styles.mobileNavLinkActive : ''}`}
                  onClick={closeMenu}
                >
                  Support
                </Link>
                <Link
                  to={dashboardPath}
                  className={`${styles.mobileNavLink} ${
                    location.pathname === ROUTES.DASHBOARD ||
                    location.pathname === ROUTES.VENDOR_DASHBOARD ||
                    location.pathname === ROUTES.ADMIN_DASHBOARD
                      ? styles.mobileNavLinkActive
                      : ''
                  }`}
                  onClick={closeMenu}
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <a
                  href="/#featured-vendors-section"
                  onClick={(e) => handleHomeScroll(e, '#featured-vendors-section')}
                  className={styles.mobileNavLink}
                >
                  Featured Vendors
                </a>
                <a
                  href="/#how"
                  onClick={(e) => handleHomeScroll(e, '#how')}
                  className={styles.mobileNavLink}
                >
                  How it works
                </a>
                <Link
                  to={ROUTES.SUPPORT}
                  className={`${styles.mobileNavLink} ${location.pathname === ROUTES.SUPPORT ? styles.mobileNavLinkActive : ''}`}
                  onClick={closeMenu}
                >
                  Support
                </Link>
              </>
            )}
          </nav>

          <div className={styles.mobileMenuFooter}>
            {isDashboardView ? (
              <button onClick={() => { logout(); closeMenu(); }} className={styles.mobileFooterBtn}>
                Logout
              </button>
            ) : isAuthenticated ? (
              <>
                <Link to={dashboardPath} className={styles.mobileFooterUser} onClick={closeMenu}>
                  Hi, {user?.displayName}
                </Link>
                {user?.role === 'BUYER' && (
                  <Link to={ROUTES.SUBMIT_REVIEW} className={styles.mobileFooterLink} onClick={closeMenu}>
                    Write Review
                  </Link>
                )}
                <button onClick={() => { logout(); closeMenu(); }} className={styles.mobileFooterBtn}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className={styles.mobileDropdownGroup}>
                  <button
                    className={`${styles.mobileDropdownToggle} ${expandedLogin ? styles.mobileDropdownToggleOpen : ''}`}
                    onClick={() => setExpandedLogin((prev) => !prev)}
                    aria-expanded={expandedLogin}
                  >
                    <span className={styles.mobileDropdownIconBox}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <span className={styles.mobileDropdownLabel}>Log In</span>
                    <ChevronIcon open={expandedLogin} />
                  </button>
                  <div className={`${styles.mobileDropdownContent} ${expandedLogin ? styles.mobileDropdownContentOpen : ''}`}>
                    <Link to={ROUTES.LOGIN_BUYER} className={styles.mobileDropdownLink} onClick={closeMenu}>
                      Shopper Portal
                      <span className={styles.mobileDropdownLinkDesc}>Check ratings &amp; leave reviews</span>
                    </Link>
                    <Link to={ROUTES.LOGIN_VENDOR} className={styles.mobileDropdownLink} onClick={closeMenu}>
                      Merchant Hub
                      <span className={styles.mobileDropdownLinkDesc}>Manage business profile</span>
                    </Link>
                  </div>
                </div>

                <div className={styles.mobileDropdownGroup}>
                  <button
                    className={`${styles.mobileDropdownToggle} ${styles.mobileDropdownToggleCta} ${expandedJoin ? styles.mobileDropdownToggleOpen : ''}`}
                    onClick={() => setExpandedJoin((prev) => !prev)}
                    aria-expanded={expandedJoin}
                  >
                    <span className={`${styles.mobileDropdownIconBox} ${styles.mobileDropdownIconBoxCta}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </span>
                    <span className={styles.mobileDropdownLabel}>Join Free</span>
                    <ChevronIcon open={expandedJoin} />
                  </button>
                  <div className={`${styles.mobileDropdownContent} ${expandedJoin ? styles.mobileDropdownContentOpen : ''}`}>
                    <Link to={ROUTES.REGISTER_BUYER} className={styles.mobileDropdownLink} onClick={closeMenu}>
                      Become a Verified Shopper
                      <span className={styles.mobileDropdownLinkDesc}>Verify merchants &amp; write reviews</span>
                    </Link>
                    <Link to={ROUTES.REGISTER_VENDOR} className={styles.mobileDropdownLink} onClick={closeMenu}>
                      List Your Business
                      <span className={styles.mobileDropdownLinkDesc}>Claim profile &amp; build credibility</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
      </div>
    </>
  );
};

export default Navbar;
