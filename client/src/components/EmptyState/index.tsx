import React from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  action,
  icon,
  onClose,
}) => {
  const renderIcon = () => {
    if (icon) {
      if (typeof icon === 'string') {
        return <span className={styles.emojiIcon} role="img" aria-label="icon">{icon}</span>;
      }
      return icon;
    }
    // Default premium storefront/vendor SVG icon
    return (
      <div className={styles.iconCircle}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
          <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" />
          <path d="M12 13v4" />
          <path d="M10 15h4" />
        </svg>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {onClose && (
        <button onClick={onClose} className={styles.closeButton} aria-label="Close empty state">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
      <div className={styles.iconContainer}>
        {renderIcon()}
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
