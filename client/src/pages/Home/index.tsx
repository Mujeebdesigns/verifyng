import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useVendorSearch } from '../../hooks/useVendorSearch.js';
import { ROUTES, MIN_QUERY_LENGTH } from '../../utils/constants.js';
import { SearchResults } from '../../components/SearchResults/index.js';
import { LoadingSpinner } from '../../components/LoadingSpinner/index.js';
import { EmptyState } from '../../components/EmptyState/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { vendorService } from '../../services/vendor.service.js';
import type { VendorSearchResult } from '../../types/vendor.js';
import styles from './Home.module.css';
import { Navbar } from '../../components/Navbar/index.js';

const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

/* ── Animated Mock: Search (Card 1) ── */
const AnimatedSearchMock: React.FC = () => {
  const [tick, setTick] = useState(0);
  const CYCLE = 44;
  const searchText = 'chicfinds';

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % CYCLE), 140);
    return () => clearInterval(id);
  }, []);

  const chars = Math.max(0, Math.min(tick - 3, searchText.length));
  const typed = searchText.slice(0, chars);
  const showCursor = tick >= 1 && tick < 15;
  const r1 = tick >= 16 && tick < 39;
  const r2 = tick >= 18 && tick < 39;
  const r3 = tick >= 20 && tick < 39;

  return (
    <div className={styles.howMock}>
      <div className={styles.mockSearchBar}>
        <SearchIcon />
        <span className={styles.mockSearchText}>
          {typed || '\u00A0'}
          {showCursor && <span className={styles.typingCursor} />}
        </span>
      </div>
      <div className={`${styles.animResult} ${r1 ? styles.animResultShow : ''}`}>
        <div className={`${styles.mockScoreDot} ${styles.dotGreen}`}>8.7</div>
        <div className={styles.mockResultInfo}>
          <div className={styles.mockResultName}>ChicStyles_NG</div>
          <div className={styles.mockResultMeta}>@chicstyles_ng · 142 reviews</div>
        </div>
        <span className={`${styles.mockBadge} ${styles.badgeGreen}`}>Trusted</span>
      </div>
      <div className={`${styles.animResult} ${r2 ? styles.animResultShow : ''}`}>
        <div className={`${styles.mockScoreDot} ${styles.dotAmber}`}>5.2</div>
        <div className={styles.mockResultInfo}>
          <div className={styles.mockResultName}>ChicFinds Abuja</div>
          <div className={styles.mockResultMeta}>08031234567 · 18 reviews</div>
        </div>
        <span className={`${styles.mockBadge} ${styles.badgeAmber}`}>Caution</span>
      </div>
      <div className={`${styles.animResult} ${r3 ? styles.animResultShow : ''}`}>
        <div className={`${styles.mockScoreDot} ${styles.dotRed}`}>1.4</div>
        <div className={styles.mockResultInfo}>
          <div className={styles.mockResultName}>ChicHub_NG</div>
          <div className={styles.mockResultMeta}>****4821 · 31 reviews</div>
        </div>
        <span className={`${styles.mockBadge} ${styles.badgeRed}`}>High Risk</span>
      </div>
    </div>
  );
};

/* ── Animated Mock: Profile (Card 2) ── */
const AnimatedProfileMock: React.FC = () => {
  const [tick, setTick] = useState(0);
  const CYCLE = 46;

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % CYCLE), 140);
    return () => clearInterval(id);
  }, []);

  const showHeader = tick >= 2 && tick < 40;
  const showSummary = tick >= 6 && tick < 40;
  const bar1 = tick >= 10 && tick < 40 ? 88 : 0;
  const bar2 = tick >= 13 && tick < 40 ? 82 : 0;
  const bar3 = tick >= 16 && tick < 40 ? 91 : 0;

  return (
    <div className={styles.howMock}>
      <div className={`${styles.animFade} ${showHeader ? styles.animFadeShow : ''}`}>
        <div className={styles.mockProfileHeader}>
          <div>
            <div className={styles.mockVendorName}>ChicStyles_NG</div>
            <div className={styles.mockVendorHandle}>@chicstyles_ng · Instagram</div>
          </div>
          <div className={styles.mockBigScore}>
            <div className={styles.mockBigScoreNum}>8.7</div>
            <div className={styles.mockBigScoreLabel}>Mostly Reliable</div>
          </div>
        </div>
      </div>
      <div className={`${styles.animFade} ${showSummary ? styles.animFadeShow : ''}`}>
        <div className={styles.mockSummary}>
          Most buyers report fast delivery and accurate product descriptions. A small number mention delayed responses on weekends.
        </div>
      </div>
      <div className={styles.mockBreakdown}>
        {[
          { label: 'Delivery', pct: bar1 },
          { label: 'Satisfaction', pct: bar2 },
          { label: 'Accuracy', pct: bar3 },
        ].map(b => (
          <div key={b.label} className={styles.mockBreakdownRow}>
            <span className={styles.mockBreakdownLabel}>{b.label}</span>
            <div className={styles.mockBreakdownBar}>
              <div className={styles.animBarFill} style={{ width: `${b.pct}%` }} />
            </div>
            <span className={styles.mockBreakdownVal}>{b.pct > 0 ? `${b.pct}%` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Animated Mock: Review (Card 3) ── */
const AnimatedReviewMock: React.FC = () => {
  const [tick, setTick] = useState(0);
  const CYCLE = 50;
  const reviewText = 'Delivery was fast and the item matched the description exactly. Will buy again!';

  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % CYCLE), 140);
    return () => clearInterval(id);
  }, []);

  const starsLit = Math.min(Math.max(Math.floor((tick - 2) / 2), 0), 4);
  const showText = tick >= 10 && tick < 44;
  const textChars = showText ? Math.min((tick - 10) * 4, reviewText.length) : 0;
  const displayText = reviewText.slice(0, textChars);
  const showPill = tick >= 28 && tick < 44;
  const showSubmit = tick >= 31 && tick < 44;
  const resetting = tick >= 44;

  return (
    <div className={styles.howMock}>
      <div className={styles.mockFormTitle}>Leave a review — Abuja Gadgets Store</div>
      <div className={styles.mockStars}>
        {[0, 1, 2, 3, 4].map(i => (
          <span
            key={i}
            className={`${styles.animStar} ${(!resetting && i < starsLit) ? styles.animStarLit : ''}`}
          >⭐</span>
        ))}
      </div>
      <textarea
        className={`${styles.animTextarea} ${(showText && !resetting) ? styles.animTextareaActive : ''}`}
        readOnly
        value={resetting ? '' : displayText}
      />
      <div className={styles.mockFormRow}>
        <span className={`${styles.animPill} ${showPill ? styles.animPillActive : ''}`}>Instagram</span>
        <span className={styles.animPill}>WhatsApp</span>
        <span className={styles.animPill}>TikTok</span>
      </div>
      <button className={`${styles.animSubmit} ${showSubmit ? styles.animSubmitGlow : ''}`}>Submit Review</button>
    </div>
  );
};

/* ── Animated Trust Grid ── */
const AnimatedTrustGrid: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={styles.trustGrid}>
      <div>
        <div className={styles.trustMiniChart}>
          <div className={styles.trustMiniChartLabel}>Community trust trend — last 6 months</div>
          <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <line x1="0" y1="30" x2="400" y2="30" stroke="var(--color-stroke-soft-200)" strokeWidth="1" strokeDasharray="4 4"/>
            <line x1="0" y1="60" x2="400" y2="60" stroke="var(--color-stroke-soft-200)" strokeWidth="1" strokeDasharray="4 4"/>
            <line x1="0" y1="90" x2="400" y2="90" stroke="var(--color-stroke-soft-200)" strokeWidth="1" strokeDasharray="4 4"/>
            <path
              className={`${styles.animChartFill} ${isVisible ? styles.animChartFillShow : ''}`}
              d="M0 95 C40 90 70 75 110 65 C150 55 180 50 220 42 C260 34 300 30 340 22 C360 18 380 15 400 12 L400 120 L0 120 Z"
              fill="url(#cg)"
            />
            <path
              className={`${styles.animChartPath} ${isVisible ? styles.animChartPathDraw : ''}`}
              d="M0 95 C40 90 70 75 110 65 C150 55 180 50 220 42 C260 34 300 30 340 22 C360 18 380 15 400 12"
              stroke="var(--color-primary-primary-base)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="0"   cy="95" r="4" fill="var(--color-bg-white-0)" stroke="var(--color-primary-primary-base)" strokeWidth="2"
              className={`${styles.animChartDot} ${isVisible ? styles.animChartDotShow : ''}`}
              style={{ transitionDelay: '0.2s' }}
            />
            <circle cx="110" cy="65" r="4" fill="var(--color-bg-white-0)" stroke="var(--color-primary-primary-base)" strokeWidth="2"
              className={`${styles.animChartDot} ${isVisible ? styles.animChartDotShow : ''}`}
              style={{ transitionDelay: '0.5s' }}
            />
            <circle cx="220" cy="42" r="4" fill="var(--color-bg-white-0)" stroke="var(--color-primary-primary-base)" strokeWidth="2"
              className={`${styles.animChartDot} ${isVisible ? styles.animChartDotShow : ''}`}
              style={{ transitionDelay: '0.8s' }}
            />
            <circle cx="340" cy="22" r="4" fill="var(--color-bg-white-0)" stroke="var(--color-primary-primary-base)" strokeWidth="2"
              className={`${styles.animChartDot} ${isVisible ? styles.animChartDotShow : ''}`}
              style={{ transitionDelay: '1.1s' }}
            />
            <circle cx="400" cy="12" r="5" fill="var(--color-primary-primary-base)" stroke="var(--color-bg-white-0)" strokeWidth="2"
              className={`${styles.animChartDot} ${isVisible ? styles.animChartDotShow : ''}`}
              style={{ transitionDelay: '1.4s' }}
            />
            <text x="0"   y="116" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="var(--color-text-soft-400)">Jan</text>
            <text x="100" y="116" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="var(--color-text-soft-400)">Feb</text>
            <text x="205" y="116" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="var(--color-text-soft-400)">Mar</text>
            <text x="320" y="116" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="var(--color-text-soft-400)">Apr</text>
            <text x="375" y="116" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10" fill="var(--color-primary-primary-base)" fontWeight="600">Now</text>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--color-primary-primary-base)" stopOpacity="0.15"/>
                <stop offset="100%" stopColor="var(--color-primary-primary-base)" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className={styles.scoreRanges}>
          {[
            { color: 'var(--color-primary-primary-base)', bg: 'var(--color-primary-primary-lighter)', border: 'color-mix(in srgb, var(--color-primary-primary-base) 20%, transparent)', label: 'Highly Trusted', lc: 'var(--color-primary-primary-base)', range: '8.5 – 10.0' },
            { color: 'var(--color-primary-primary-light)', bg: 'var(--color-primary-primary-lighter)', border: 'color-mix(in srgb, var(--color-primary-primary-light) 25%, transparent)', label: 'Mostly Reliable', lc: 'var(--color-primary-primary-dark)', range: '7.0 – 8.4' },
            { color: 'var(--color-state-away)', bg: 'color-mix(in srgb, var(--color-state-away) 7%, transparent)', border: 'color-mix(in srgb, var(--color-state-away) 25%, transparent)', label: 'Proceed with Caution', lc: 'color-mix(in srgb, var(--color-state-away) 75%, black)', range: '5.0 – 6.9' },
            { color: 'var(--color-state-warning)', bg: 'color-mix(in srgb, var(--color-state-warning) 7%, transparent)', border: 'color-mix(in srgb, var(--color-state-warning) 25%, transparent)', label: 'Poor Track Record', lc: 'color-mix(in srgb, var(--color-state-warning) 75%, black)', range: '3.0 – 4.9' },
            { color: 'var(--color-state-error)', bg: 'color-mix(in srgb, var(--color-state-error) 7%, transparent)', border: 'color-mix(in srgb, var(--color-state-error) 20%, transparent)', label: 'High Risk', lc: 'var(--color-state-error)', range: '0.0 – 2.9' },
          ].map((r, i) => (
            <div
              key={r.label}
              className={`${styles.scoreRangeRow} ${styles.animRangeRow} ${isVisible ? styles.animRangeRowShow : ''}`}
              style={{
                background: r.bg,
                borderColor: r.border,
                transitionDelay: `${i * 120}ms`
              }}
            >
              <div className={styles.srrLeft}>
                <div className={styles.srrDot} style={{ background: r.color }}/>
                <span className={styles.srrLabel} style={{ color: r.lc }}>{r.label}</span>
              </div>
              <span className={styles.srrVal}>{r.range}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.trustCard}>
        <div className={styles.trustCardTitle}>Live score breakdown — ChicStyles_NG</div>
        <div className={styles.barList}>
          {[
            { label: 'Average star rating',      weight: 'Base (1.0×)', pct: '88%' },
            { label: 'Verified buyer multiplier', weight: '+1.1×',       pct: '76%' },
            { label: 'Recency (last 90 days)',    weight: '+1.1×',       pct: '94%' },
          ].map((b, i) => (
            <div key={b.label} className={styles.barItem}>
              <div className={styles.barTop}>
                <span className={styles.barLabel}>{b.label}</span>
                <span className={styles.barWeight}>{b.weight}</span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.animTrustBarFill}
                  style={{
                    width: isVisible ? b.pct : '0%',
                    transitionDelay: `${i * 200 + 400}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className={`${styles.trustTotal} ${styles.animTrustScore} ${isVisible ? styles.animTrustScoreShow : ''}`} style={{ transitionDelay: '1.2s' }}>
          <span className={styles.trustTotalLabel}>Final Trust Score</span>
          <span className={styles.trustTotalScore}>8.7 / 10</span>
        </div>
      </div>
    </div>
  );
};

export const Home: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { query, setQuery, debouncedQuery, results, loading, error, page, setPage, totalPages } = useVendorSearch();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('Search by name, instagram, phone, or bank...');
  const [featuredVendors, setFeaturedVendors] = useState<VendorSearchResult[]>([]);
  const initialized = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setSearchPlaceholder(
        window.innerWidth <= 768
          ? 'Search vendor...'
          : 'Search by name, instagram, phone, or bank...'
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Fetch featured vendors
  useEffect(() => {
    vendorService.getFeaturedVendors()
      .then(vendors => {
        setFeaturedVendors(vendors);
      })
      .catch(err => {
        console.error('Failed to load featured vendors:', err);
      });
  }, []);

  // Read ?q= from URL (supports shareable, deep-linked search URLs)
  useEffect(() => {
    if (initialized.current) return;
    const q = searchParams.get('q');
    if (q && q.trim().length >= MIN_QUERY_LENGTH) {
      initialized.current = true;
      setTimeout(() => {
        setInputValue(q.trim());
        setQuery(q.trim());
      }, 0);
    }
  }, [searchParams, setQuery]);



  // Auto-clear search query when input is cleared
  useEffect(() => {
    if (inputValue.trim() === '') {
      setQuery('');
    }
  }, [inputValue, setQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim().startsWith('@') ? inputValue.trim().slice(1) : inputValue.trim();
    if (q.length < MIN_QUERY_LENGTH) return;
    setQuery(q);
  };

  const fillHint = (hint: string) => {
    setInputValue(hint);
    const q = hint.startsWith('@') ? hint.slice(1) : hint;
    setQuery(q);
  };

  const isSearching = loading || query.trim() !== debouncedQuery;
  const hasResults = !isSearching && !error && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className={styles.page}>

      {/* ── NAV ── */}
      <Navbar />

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <div className={styles.heroBadgeDot}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          Nigeria's First Vendor Reputation Platform
        </div>

        <h1 className={styles.heroHeadline}>
          Buy with confidence.<br/>
          <em>Verify before you pay.</em>
        </h1>

        <p className={`${styles.heroSub} ${styles.heroSubDesktop}`}>
          Verify online vendors before you pay. Search by name, Instagram, phone, or bank details to instantly see trust scores and scam alerts.
        </p>
        <p className={`${styles.heroSub} ${styles.heroSubMobile}`}>
          Search any vendor. See their trust score. Buy with confidence.
        </p>

        <div className={styles.heroSearchWrap}>
          <form onSubmit={handleSearch}>
            <div className={styles.heroSearch}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className={styles.heroSearchInput}
              />
              <button type="submit" className={styles.heroSearchBtn}>Search</button>
            </div>
          </form>
        </div>

        <div className={styles.searchHints}>
          <span className={styles.searchHintLabel}>Try:</span>
          {['@chicfinds_ng', '08031234567', 'QuickFinds Abuja', '4821'].map(hint => (
            <button key={hint} className={styles.searchHint} onClick={() => fillHint(hint)}>
              {hint === '4821' ? 'Bank last 4: 4821' : hint}
            </button>
          ))}
        </div>

        {/* ── INLINE SEARCH RESULTS — sits above stats, inside hero ── */}
        {query.length >= MIN_QUERY_LENGTH && (
          <div ref={resultsRef} className={styles.heroResults}>
            {isSearching && <LoadingSpinner />}
            <ErrorMessage message={error} />
            {hasResults && results.length === 0 && (
              <EmptyState
                title="No vendors found"
                message={`No results for "${query}". Be the first to review this vendor!`}
                onClose={() => {
                  setInputValue('');
                  setQuery('');
                }}
                action={
                  (!isAuthenticated || user?.role === 'BUYER') ? (
                    <Link to={ROUTES.SUBMIT_REVIEW} state={{ query }} className={styles.emptyAction}>
                      Review {query}
                    </Link>
                  ) : undefined
                }
              />
            )}
            {hasResults && results.length > 0 && (
              <>
                <h2 className={styles.resultsTitle}>Search Results ({results.length})</h2>
                <SearchResults results={results} page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </div>
        )}

        {/* Stats — always displayed below results */}
        <div className={styles.heroStats}>
          {[
            { num: '12', suffix: 'K+', label: 'Vendors tracked' },
            { num: '48', suffix: 'K+', label: 'Community reviews' },
            { num: '3.2', suffix: 'K',  label: 'Scams flagged' },
            { num: '98', suffix: '%',   label: 'Buyer satisfaction' },
          ].map(s => (
            <div key={s.label} className={styles.heroStat}>
              <div className={styles.heroStatNum}>{s.num}<span>{s.suffix}</span></div>
              <div className={styles.heroStatLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className={styles.marqueeSection} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {[
            'Community-Powered Trust', 'AI Review Summaries', 'Scam Pattern Detection',
            'Search by Instagram Handle', 'Search by Phone Number', 'Search by Bank Account',
            'Built for Nigerian Buyers', 'NDPR Compliant', 'Verified Buyer Badges',
            'Community-Powered Trust', 'AI Review Summaries', 'Scam Pattern Detection',
            'Search by Instagram Handle', 'Search by Phone Number', 'Search by Bank Account',
            'Built for Nigerian Buyers', 'NDPR Compliant', 'Verified Buyer Badges',
          ].map((item, i) => (
            <div key={i} className={styles.marqueeItem}>
              <div className={styles.marqueeDot}/>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED VENDORS ── */}
      {featuredVendors && featuredVendors.length > 0 && (
        <section id="featured-vendors-section" className={styles.featuredOuter}>
          <div className={styles.featuredInner}>
            <div className={styles.featuredHeader}>
              <div className={styles.featuredHeaderLeft}>
                <div className={styles.sectionLabel}>Verified Partners</div>
                <h2 className={styles.sectionTitle}>Featured <em>Verified Vendors</em></h2>
                <p className={styles.sectionDesc} style={{ marginTop: '0.625rem' }}>
                  Top-rated Nigerian vendors who have claimed their profiles and built
                  trusted transaction histories with real buyers.
                </p>
              </div>
              <Link to={ROUTES.DIRECTORY} className={styles.featuredSeeAll}>
                See all vendors
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>

            <div className={styles.featuredGrid}>
              {featuredVendors.map((v, index) => {
                const category = v.category || 'Retail store';
                const location = v.state ? `${v.state}` : '';
                const categoryLoc = location ? `${category} · ${location}` : category;

                const initials = v.businessName
                  ? v.businessName.split(' ').map((n) => n.charAt(0)).join('').slice(0, 2).toUpperCase()
                  : '';

                let scoreClass = styles.fvScoreLow;
                if (v.trustScore >= 8.5) {
                  scoreClass = styles.fvScoreHigh;
                } else if (v.trustScore >= 5.0) {
                  scoreClass = styles.fvScoreMid;
                }

                const bgIndex = (index % 3) + 1;
                const bgClass = styles[`fvBg_${bgIndex}`];

                return (
                  <div key={v.id} className={styles.fvCard}>
                    {v.coverImage ? (
                      <div className={styles.fvCardBg} style={{ backgroundImage: `url(${v.coverImage})` }} />
                    ) : (
                      <div className={`${styles.fvCardBg} ${bgClass}`}>
                        <div className={styles.fvInitials}>{initials}</div>
                      </div>
                    )}
                    <div className={styles.fvCardOverlay} />
                    <div className={styles.fvVerified}>
                      <div className={styles.fvVerifiedDot} />
                      Verified
                    </div>
                    <div className={`${styles.fvScore} ${scoreClass}`}>
                      <span className={styles.fvScoreNum}>{v.trustScore.toFixed(1)}</span>
                      <span className={styles.fvScoreDenom}>/10</span>
                    </div>
                    <div className={styles.fvContent}>
                      <span className={styles.fvCategory}>{categoryLoc}</span>
                      <div className={styles.fvName}>{v.businessName}</div>
                      <div className={styles.fvHandle}>@{v.instagramHandle || 'instagram'} · {v.state || 'Nigeria'}</div>
                      <div className={styles.fvFooter}>
                        <div className={styles.fvReviews}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                          </svg>
                          {v.reviewCount} reviews
                        </div>
                        <Link to={`/vendors/${v.id}`} className={styles.fvCta}>
                          View Profile
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS — STICKY SCROLL ── */}
      <section id="how" className={styles.howSection}>
        <div className={styles.howInner}>
          <div className={`${styles.sectionHeader} ${styles.howIntro}`}>
            <div className={styles.sectionLabel}>How it works</div>
            <h2 className={styles.sectionTitle}>Three steps to a <em>safer purchase</em></h2>
            <p className={styles.sectionDesc}>No registration needed to search. Find out what other buyers are saying before you pay a single naira.</p>
          </div>

          <div className={styles.howStack}>
            <div className={`${styles.howStep} ${styles.howStep1}`}>
              <div className={styles.howStepLeft}>
                <span className={styles.howStepBadge}>Step 01 — Search</span>
                <h3 className={styles.howStepHeading}>Search any vendor<br/>before you pay</h3>
                <ul className={styles.howChecklist}>
                  <li><CheckIcon />Search by business name or store name</li>
                  <li><CheckIcon />Search by Instagram or TikTok handle</li>
                  <li><CheckIcon />Search by WhatsApp phone number</li>
                  <li><CheckIcon />Search by last 4 digits of bank account</li>
                </ul>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={styles.howLearnMore}>
                  Try a search <ArrowIcon />
                </button>
              </div>
              <div className={styles.howPanelWrap}>
                <div className={styles.howPanel}>
                  <AnimatedSearchMock />
                </div>
              </div>
            </div>

            <div className={`${styles.howStep} ${styles.howStep2}`}>
              <div className={styles.howPanelWrap}>
                <div className={styles.howPanel}>
                  <AnimatedProfileMock />
                </div>
              </div>
              <div className={styles.howStepLeft}>
                <span className={styles.howStepBadge}>Step 02 — Verify</span>
                <h3 className={styles.howStepHeading}>Read the full<br/>community verdict</h3>
                <ul className={styles.howChecklist}>
                  <li><CheckIcon />See the vendor's weighted trust score out of 10</li>
                  <li><CheckIcon />Read AI-generated summary of all community reviews</li>
                  <li><CheckIcon />Check delivery reliability and satisfaction breakdown</li>
                  <li><CheckIcon />See any scam alerts or recurring complaints flagged</li>
                </ul>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={styles.howLearnMore}>
                  See a sample profile <ArrowIcon />
                </button>
              </div>
            </div>

            <div className={`${styles.howStep} ${styles.howStep3}`}>
              <div className={styles.howStepLeft}>
                <span className={styles.howStepBadge}>Step 03 — Protect</span>
                <h3 className={styles.howStepHeading}>Buy safely — then<br/>give back to the community</h3>
                <ul className={styles.howChecklist}>
                  <li><CheckIcon />Make an informed decision before sending money</li>
                  <li><CheckIcon />Leave a review after your transaction</li>
                  <li><CheckIcon />Warn others about scam vendors instantly</li>
                  <li><CheckIcon />Help build a safer online commerce community</li>
                </ul>
                {isAuthenticated ? (
                  user?.role === 'BUYER' ? (
                    <Link to={ROUTES.SUBMIT_REVIEW} className={styles.howLearnMore}>
                      Write a review <ArrowIcon />
                    </Link>
                  ) : (
                    <Link
                      to={
                        user?.role === 'ADMIN'
                          ? ROUTES.ADMIN_DASHBOARD
                          : ROUTES.VENDOR_DASHBOARD
                      }
                      className={styles.howLearnMore}
                    >
                      Go to Dashboard <ArrowIcon />
                    </Link>
                  )
                ) : (
                  <Link to={ROUTES.REGISTER} className={styles.howLearnMore}>
                    Create free account <ArrowIcon />
                  </Link>
                )}
              </div>
              <div className={styles.howPanelWrap}>
                <div className={styles.howPanel}>
                  <AnimatedReviewMock />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.howSpacer} />
        </div>
      </section>

      {/* ── APP PREVIEW ── */}
      <div className={styles.previewOuter}>
        <div className={styles.previewShell}>
          <div className={styles.previewTopbar}>
            <div className={`${styles.topbarDot} ${styles.dotRed}`}/>
            <div className={`${styles.topbarDot} ${styles.dotYellow}`}/>
            <div className={`${styles.topbarDot} ${styles.dotGreen}`}/>
            <div className={styles.topbarUrl}>verifyng.com/search</div>
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewSearchRow}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span className={styles.previewSearchText}>chicfinds</span>
              <button className={styles.previewSearchBtnSm}>Search</button>
            </div>
            <div className={styles.scamStrip}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ⚠ Scam Alert — FashionHub_NG: multiple buyers report non-delivery after payment
            </div>
            {[
              { score: '8.7', color: 'green', name: 'ChicStyles_NG',   meta: '@chicstyles_ng · 08031234567 · 142 reviews', badge: 'Highly Trusted', bc: 'green' },
              { score: '5.2', color: 'amber', name: 'QuickFinds Abuja', meta: '@quickfinds_abj · 18 reviews',               badge: 'Proceed with Caution', bc: 'amber' },
              { score: '1.4', color: 'red',   name: 'FashionHub_NG',   meta: '@fashionhub_ng · Bank: ****4821 · 31 reviews', badge: 'High Risk', bc: 'red' },
            ].map(v => (
              <div key={v.name} className={styles.vendorRow}>
                <div className={`${styles.vScore} ${styles[`vs_${v.color}`]}`}>
                  <span className={styles.vScoreNum}>{v.score}</span>
                  <span className={styles.vScoreDenom}>/10</span>
                </div>
                <div className={styles.vInfo}>
                  <div className={styles.vName}>{v.name}</div>
                  <div className={styles.vMeta}>{v.meta}</div>
                </div>
                <span className={`${styles.vBadge} ${styles[`vb_${v.bc}`]}`}>{v.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div id="features" className={styles.featuresOuter}>
        <div className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionLabel}>Platform features</div>
            <h2 className={styles.sectionTitle}>Everything you need to <em>shop smarter</em></h2>
            <p className={styles.sectionDesc}>Purpose-built for Nigeria's social commerce ecosystem — where millions transact daily with no consumer protection.</p>
          </div>
          <div className={styles.featuresGrid}>
            {[
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>, title: 'Multi-identifier search', desc: 'Search by business name, Instagram handle, phone number, or bank last 4 digits. No vendor can hide behind a different name.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, title: 'Weighted trust scores', desc: 'Scores factor in star ratings, verified buyers, and review recency — not just simple averages. A scam vendor can\'t game the system.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, title: 'AI review summaries', desc: 'AI reads all community reviews and generates a concise, honest summary covering delivery, satisfaction, and recurring complaints.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, title: 'Scam pattern detection', desc: 'Automatically flags vendors when patterns match known scam behaviour — non-delivery, blocking after payment, bait-and-switch.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, title: 'Community reviews', desc: 'Every review comes from a registered buyer. Verified buyer badges highlight confirmed transactions for the most trustworthy feedback.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, title: 'Privacy protected', desc: 'Only the last 4 digits of bank accounts are stored. Your personal data is never sold or shared. NDPR compliant from day one.' },
            ].map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <div className={styles.featureTitle}>{f.title}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRUST SCORE ── */}
      <div id="trust" className={styles.trustOuter}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Trust Score System</div>
          <h2 className={styles.sectionTitle}>A score built on <em>real signals</em></h2>
          <p className={styles.sectionDesc}>Not a simple average. A weighted system that rewards verified transactions, recency, and consistent positive behaviour.</p>
        </div>
        <AnimatedTrustGrid />
      </div>

      {/* ── CTA ── */}
      <div className={styles.ctaOuter}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaBadge}>Free to use · No registration to search</div>
          <h2 className={styles.ctaTitle}>Stop guessing.<br/><em>Start verifying.</em></h2>
          <p className={styles.ctaDesc}>Join thousands of Nigerian buyers who verify vendors before every purchase. 10 seconds to search. Could save you thousands of naira.</p>
          <div className={styles.ctaButtons}>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={styles.btnWhite}>
              Search a vendor now
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <Link to={ROUTES.REGISTER} className={styles.btnOutline}>Create free account</Link>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <img src="/verifyng-logo.svg" alt="VerifyNG" className={styles.footerLogo} />
              <p className={styles.footerBrandDesc}>Nigeria's community-powered vendor reputation platform. Verify before you pay.</p>
            </div>
            <div className={styles.footerCol}>
              <div className={styles.footerColHead}>Product</div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={styles.footerLink}>Search Vendors</button>
              {(!isAuthenticated || user?.role === 'BUYER') && (
                <Link to={ROUTES.SUBMIT_REVIEW} className={styles.footerLink}>Write a Review</Link>
              )}
              <a href="#how"      className={styles.footerLink}>How It Works</a>
              <a href="#trust"    className={styles.footerLink}>Trust Score</a>
            </div>
            <div className={styles.footerCol}>
              <div className={styles.footerColHead}>Account</div>
              <Link to={ROUTES.REGISTER} className={styles.footerLink}>Sign Up Free</Link>
              <Link to={ROUTES.LOGIN}    className={styles.footerLink}>Log In</Link>
              <Link to={ROUTES.FORGOT_PASSWORD} className={styles.footerLink}>Reset Password</Link>
            </div>
            <div className={styles.footerCol}>
              <div className={styles.footerColHead}>Legal</div>
              <span className={styles.footerLink}>Privacy Policy</span>
              <span className={styles.footerLink}>Terms of Service</span>
              <span className={styles.footerLink}>NDPR Compliance</span>
              <span className={styles.footerLink}>Report Abuse</span>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p className={styles.footerCopy}>© {new Date().getFullYear()} <strong>VerifyNG</strong>. Empowering Nigerians to shop with confidence.</p>
            <div className={styles.footerSocials}>
              <a href="#" className={styles.footerSocial} aria-label="X">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className={styles.footerSocial} aria-label="Instagram">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className={styles.footerSocial} aria-label="WhatsApp">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
