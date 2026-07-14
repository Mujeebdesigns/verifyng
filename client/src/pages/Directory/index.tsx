import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Navbar } from '../../components/Navbar/index.js';
import { VendorCard } from '../../components/VendorCard/index.js';
import { useVendorDirectory, type DirectoryFilters } from '../../hooks/useVendorDirectory.js';
import { useVendorSearch } from '../../hooks/useVendorSearch.js';
import { CATEGORIES, STATES, MIN_QUERY_LENGTH } from '../../utils/constants.js';
import styles from './Directory.module.css';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'featured_desc', label: 'Featured' },
  { value: 'trustScore_desc', label: 'Highest rated' },
  { value: 'reviewCount_desc', label: 'Most reviewed' },
  { value: 'newest', label: 'Newest' },
];

/** Display label → API slug for the platform filter. */
const PLATFORMS: { label: string; slug: string }[] = [
  { label: 'Instagram', slug: 'instagram' },
  { label: 'WhatsApp', slug: 'whatsapp' },
  { label: 'TikTok', slug: 'tiktok' },
  { label: 'Facebook', slug: 'facebook' },
];

interface FilterChip {
  key: keyof DirectoryFilters | 'platform';
  label: string;
}

export const Directory: React.FC = () => {
  const {
    vendors: directoryVendors,
    filters,
    updateFilter,
    clearFilters,
    page: dirPage,
    setPage: setDirPage,
    totalPages: dirTotalPages,
    totalVendors,
    isLoading: dirLoading,
    error: dirError,
    activeFilterCount,
  } = useVendorDirectory();

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    debouncedQuery,
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    page: searchPage,
    setPage: setSearchPage,
    totalPages: searchTotalPages,
    total: searchTotal,
  } = useVendorSearch();

  const isSearchMode = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const vendors = isSearchMode ? searchResults : directoryVendors;
  const isLoading = isSearchMode ? searchLoading : dirLoading;
  const error = isSearchMode ? searchError : dirError;
  const page = isSearchMode ? searchPage : dirPage;
  const setPage = isSearchMode ? setSearchPage : setDirPage;
  const totalPages = isSearchMode ? searchTotalPages : dirTotalPages;

  const totalCount = isSearchMode ? searchTotal : totalVendors;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(['category', 'state', 'verification', 'score'])
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortOpen]);

  // Selected platform slugs, derived from the hook-backed filter string
  const activePlatforms = new Set(filters.platforms ? filters.platforms.split(',') : []);

  const togglePlatform = useCallback((slug: string) => {
    const next = new Set(filters.platforms ? filters.platforms.split(',') : []);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    updateFilter('platforms', Array.from(next).join(','));
  }, [filters.platforms, updateFilter]);

  const toggleGroup = useCallback((name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const activeChips: FilterChip[] = [];
  if (filters.category) activeChips.push({ key: 'category', label: filters.category });
  if (filters.state) activeChips.push({ key: 'state', label: filters.state });
  if (filters.claimStatus) activeChips.push({ key: 'claimStatus', label: 'Verified only' });
  if (filters.trustScoreMin) activeChips.push({ key: 'trustScoreMin', label: `${filters.trustScoreMin}+` });
  activePlatforms.forEach((slug) => {
    const platform = PLATFORMS.find((p) => p.slug === slug);
    if (platform) activeChips.push({ key: 'platform', label: platform.label });
  });

  const removeChip = useCallback((chip: FilterChip) => {
    if (chip.key === 'platform') {
      const slug = PLATFORMS.find((p) => p.label === chip.label)?.slug;
      if (slug) togglePlatform(slug);
    } else {
      updateFilter(chip.key, '');
    }
  }, [updateFilter, togglePlatform]);

  const clearAll = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const renderSkeletonGrid = () => (
    <div className={styles.vendorGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonCover} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeleton} style={{ height: '0.875rem', width: '70%' }} />
            <div className={styles.skeleton} style={{ height: '0.625rem', width: '40%' }} />
            <div className={styles.skeleton} style={{ height: '0.75rem', width: '60%' }} />
            <div className={styles.skeleton} style={{ height: '0.75rem', width: '45%' }} />
            <div className={styles.skeleton} style={{ height: '0.5rem', width: '30%', marginTop: '0.25rem' }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    pages.push(1);
    if (page > 3) pages.push('ellipsis');

    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);

    return (
      <div className={styles.pagination}>
        <p className={styles.pageInfo}>
          Page {page} of {totalPages} · {totalCount} vendor{totalCount !== 1 ? 's' : ''}
        </p>
        <div className={styles.pageBtns}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
                ···
              </span>
            ) : (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageShell}>
      <Navbar />

      <div className={styles.page}>
        {/* ── SIDEBAR OVERLAY (MOBILE) ── */}
        <div
          className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayVisible : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHead}>
            <span className={styles.sidebarTitle}>Filters</span>
            <button className={styles.clearBtn} onClick={clearAll}>
              Clear all
            </button>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className={styles.activeFilters}>
              {activeChips.map((chip, i) => (
                <div key={`${chip.key}-${chip.label}-${i}`} className={styles.filterChip}>
                  {chip.label}
                  <button className={styles.chipRemove} onClick={() => removeChip(chip)} aria-label={`Remove ${chip.label} filter`}>
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Category */}
          <div className={`${styles.filterGroup} ${openGroups.has('category') ? styles.filterGroupOpen : ''}`}>
            <div className={styles.filterGroupHead} onClick={() => toggleGroup('category')}>
              <span className={styles.filterGroupLabel}>Category</span>
              <svg className={styles.filterChevron} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className={styles.filterBody}>
              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  className={styles.checkboxNative}
                  checked={!filters.category}
                  onChange={() => updateFilter('category', '')}
                />
                <span className={styles.checkboxBox}>
                  <svg className={styles.checkboxCheck} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className={styles.checkItemLabel}>All categories</span>
              </label>
              {CATEGORIES.map((cat) => (
                <label key={cat} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    className={styles.checkboxNative}
                    checked={filters.category === cat}
                    onChange={() => updateFilter('category', filters.category === cat ? '' : cat)}
                  />
                  <span className={styles.checkboxBox}>
                    <svg className={styles.checkboxCheck} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.checkItemLabel}>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* State */}
          <div className={`${styles.filterGroup} ${openGroups.has('state') ? styles.filterGroupOpen : ''}`}>
            <div className={styles.filterGroupHead} onClick={() => toggleGroup('state')}>
              <span className={styles.filterGroupLabel}>State</span>
              <svg className={styles.filterChevron} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className={styles.filterBody}>
              <select
                className={styles.filterSelect}
                value={filters.state}
                onChange={(e) => updateFilter('state', e.target.value)}
              >
                <option value="">All states</option>
                {STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Verification */}
          <div className={`${styles.filterGroup} ${openGroups.has('verification') ? styles.filterGroupOpen : ''}`}>
            <div className={styles.filterGroupHead} onClick={() => toggleGroup('verification')}>
              <span className={styles.filterGroupLabel}>Verification</span>
              <svg className={styles.filterChevron} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className={styles.filterBody}>
              <div className={styles.radioPills}>
                <button
                  className={`${styles.radioPill} ${!filters.claimStatus ? styles.radioPillActive : ''}`}
                  onClick={() => updateFilter('claimStatus', '')}
                >
                  All
                </button>
                <button
                  className={`${styles.radioPill} ${filters.claimStatus === 'CLAIMED' ? styles.radioPillActive : ''}`}
                  onClick={() => updateFilter('claimStatus', filters.claimStatus === 'CLAIMED' ? '' : 'CLAIMED')}
                >
                  Verified only
                </button>
              </div>
            </div>
          </div>

          {/* Min Trust Score */}
          <div className={`${styles.filterGroup} ${openGroups.has('score') ? styles.filterGroupOpen : ''}`}>
            <div className={styles.filterGroupHead} onClick={() => toggleGroup('score')}>
              <span className={styles.filterGroupLabel}>Min. Trust Score</span>
              <svg className={styles.filterChevron} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className={styles.filterBody}>
              <div className={styles.radioPills}>
                {['', '7.0', '8.0', '9.0'].map((val) => (
                  <button
                    key={val}
                    className={`${styles.radioPill} ${filters.trustScoreMin === val ? styles.radioPillActive : ''}`}
                    onClick={() => updateFilter('trustScoreMin', filters.trustScoreMin === val ? '' : val)}
                  >
                    {val === '' ? 'Any' : `${val}+`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Platform */}
          <div className={`${styles.filterGroup} ${openGroups.has('platform') ? styles.filterGroupOpen : ''}`}>
            <div className={styles.filterGroupHead} onClick={() => toggleGroup('platform')}>
              <span className={styles.filterGroupLabel}>Platform</span>
              <svg className={styles.filterChevron} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className={styles.filterBody}>
              {PLATFORMS.map((platform) => (
                <label key={platform.slug} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    className={styles.checkboxNative}
                    checked={activePlatforms.has(platform.slug)}
                    onChange={() => togglePlatform(platform.slug)}
                  />
                  <span className={styles.checkboxBox}>
                    <svg className={styles.checkboxCheck} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className={styles.checkItemLabel}>{platform.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderTop}>
              <div>
                <h1 className={styles.pageTitle}>Vendor Directory</h1>
                <p className={styles.pageSubtitle}>Browse and verify Nigerian online vendors before you buy.</p>
              </div>
              <div className={styles.dirSearch}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <p className={styles.resultCount}>
              {isSearchMode
                ? `Showing results for "${debouncedQuery}"`
                : <>Showing <strong>{totalVendors}</strong> vendor{totalVendors !== 1 ? 's' : ''}</>
              }
            </p>
            <div className={styles.toolbarRight}>
              <button className={styles.mobileFilterBtn} onClick={() => setSidebarOpen(true)}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className={styles.filterBadge}>{activeFilterCount}</span>
                )}
              </button>
              <div className={styles.sortGroup}>
                <span className={styles.sortLabel}>Sort by</span>
                <div className={styles.sortDropdown} ref={sortRef}>
                  <button
                    type="button"
                    className={styles.sortTrigger}
                    onClick={() => setSortOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                  >
                    {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Featured'}
                    <svg
                      className={`${styles.sortChevron} ${sortOpen ? styles.sortChevronOpen : ''}`}
                      width="10" height="6" viewBox="0 0 10 6" fill="none"
                    >
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {sortOpen && (
                    <div className={styles.sortMenu} role="listbox">
                      {SORT_OPTIONS.map((opt) => {
                        const active = filters.sort === opt.value;
                        return (
                          <button
                            type="button"
                            key={opt.value}
                            role="option"
                            aria-selected={active}
                            className={`${styles.sortMenuItem} ${active ? styles.sortMenuItemActive : ''}`}
                            onClick={() => { updateFilter('sort', opt.value); setSortOpen(false); }}
                          >
                            <span className={styles.sortCheckSlot}>
                              {active && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Loading */}
          {isLoading && renderSkeletonGrid()}

          {/* Empty */}
          {!isLoading && !error && vendors.length === 0 && (
            <div className={styles.vendorGrid}>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <h3 className={styles.emptyTitle}>No vendors found</h3>
                <p className={styles.emptyDesc}>
                  {isSearchMode
                    ? `No vendors matching "${debouncedQuery}". Try a different search term.`
                    : "No vendors match your current filters. Try adjusting your search criteria or clearing the filters to browse all vendors."
                  }
                </p>
                <button className={styles.emptyAction} onClick={() => { clearAll(); setSearchQuery(''); }}>
                  Clear all filters
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && !error && vendors.length > 0 && (
            <>
              <div className={styles.vendorGrid}>
                {vendors.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
              {renderPagination()}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Directory;
