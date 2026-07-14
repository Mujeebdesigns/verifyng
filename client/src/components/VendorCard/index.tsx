import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram } from 'react-icons/fa6';
import { normalizeInstagramHandle } from '../../utils/social.js';
import type { VendorSearchResult } from '../../types/vendor.js';
import styles from './VendorCard.module.css';

interface VendorCardProps {
  vendor: VendorSearchResult;
}

type Tier = 'high' | 'caution' | 'mid' | 'low';

function getTier(score: number): Tier {
  if (score >= 7.0) return 'high';
  if (score >= 5.0) return 'caution';
  if (score >= 3.0) return 'mid';
  return 'low';
}

function tierSuffix(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function getInitials(name: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor }) => {
  const {
    id,
    businessName,
    instagramHandle,
    trustScore,
    trustLabel,
    reviewCount,
    scamFlag,
    state,
    city,
    category,
    claimStatus,
    coverImage,
  } = vendor;

  const score = trustScore != null ? trustScore.toFixed(1) : '—';
  const tier = getTier(trustScore ?? 0);
  const suffix = tierSuffix(tier);
  const isVerified = claimStatus === 'CLAIMED';
  const displayName = businessName || 'Unnamed Vendor';
  const location = city || state || null;
  const initials = getInitials(businessName);
  // Vendors sometimes store a full profile URL — always display a clean @username
  const igHandle = instagramHandle ? normalizeInstagramHandle(instagramHandle) : null;

  return (
    <Link to={`/vendors/${id}`} className={styles.card}>
      <div className={`${styles.cover} ${scamFlag ? styles.coverScam : ''}`}>
        {coverImage ? (
          <img className={styles.coverImg} src={coverImage} alt={displayName} />
        ) : (
          <span className={styles.avatarMono}>{initials}</span>
        )}

        <div className={styles.scoreBadge}>
          <span className={`${styles.scoreBadgeNum} ${styles[`num${suffix}`]}`}>{score}</span>
          <span className={styles.scoreBadgeDen}>/10</span>
        </div>

        {scamFlag && (
          <div className={styles.scamStrip}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Scam Alert
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{displayName}</span>
            {isVerified && (
              <span className={styles.verifiedMark} aria-label="Verified vendor" role="img">
                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </div>
          {category && <div className={styles.category}>{category}</div>}
        </div>

        <div className={styles.identityRow}>
          <div className={`${styles.trustPill} ${styles[`pill${suffix}`]}`}>
            <span className={`${styles.trustDot} ${styles[`dot${suffix}`]}`} />
            {trustLabel || 'No Rating'}
          </div>
          {igHandle && (
            <div className={styles.handle}>
              <FaInstagram size={12} />
              <span>@{igHandle}</span>
            </div>
          )}
        </div>

        {location && (
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.reviewCount}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {reviewCount} review{reviewCount !== 1 ? 's' : ''}
        </div>
        <span className={styles.viewProfile}>
          View profile
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
};

export default VendorCard;
