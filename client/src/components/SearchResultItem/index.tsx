import React from 'react';
import { Link } from 'react-router-dom';
import type { VendorSearchResult } from '../../types/vendor.js';
import styles from './SearchResultItem.module.css';

interface SearchResultItemProps {
  vendor: VendorSearchResult;
}

function getTier(score: number): 'High' | 'Caution' | 'Mid' | 'Low' {
  if (score >= 7.0) return 'High';
  if (score >= 5.0) return 'Caution';
  if (score >= 3.0) return 'Mid';
  return 'Low';
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ vendor }) => {
  const {
    id,
    businessName,
    instagramHandle,
    phoneNumber,
    trustScore,
    trustLabel,
    scamFlag,
  } = vendor;

  const score = trustScore != null ? trustScore.toFixed(1) : '—';
  const tier = getTier(trustScore ?? 0);
  const displayName = businessName || 'Unnamed Vendor';

  // Show the single best identifier — Instagram first, phone as fallback
  const identifier = instagramHandle
    ? `@${instagramHandle}`
    : phoneNumber ?? null;

  const scoreClass = styles[`score${tier}`];
  const badgeClass = styles[`badge${tier}`];

  return (
    <Link to={`/vendors/${id}`} className={styles.item}>
      {/* Score box */}
      <div className={`${styles.score} ${scoreClass}`}>
        <span className={styles.scoreNum}>{score}</span>
        <span className={styles.scoreDenom}>/10</span>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.name}>{displayName}</div>
        {identifier && <div className={styles.meta}>{identifier}</div>}
      </div>

      {/* Right: trust badge only */}
      <div className={styles.right}>
        {scamFlag ? (
          <span className={styles.scamBadge}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Scam Alert
          </span>
        ) : (
          <span className={`${styles.trustBadge} ${badgeClass}`}>
            {trustLabel || 'No Rating'}
          </span>
        )}
      </div>
    </Link>
  );
};

export default SearchResultItem;
