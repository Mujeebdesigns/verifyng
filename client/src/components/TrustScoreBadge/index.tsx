import React from 'react';
import styles from './TrustScoreBadge.module.css';

interface TrustScoreBadgeProps {
  score: number;
  label: string;
  className?: string;
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({
  score,
  label,
  className = '',
}) => {
  const getBadgeClass = (s: number) => {
    if (s >= 8.5) return styles.highlyTrusted;
    if (s >= 7.0) return styles.mostlyReliable;
    if (s >= 5.0) return styles.caution;
    if (s >= 3.0) return styles.poorTrack;
    return styles.highRisk;
  };

  const badgeClass = [styles.badge, getBadgeClass(score), className].join(' ');

  return (
    <div className={badgeClass}>
      <span className={styles.score}>{score.toFixed(1)}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
};
