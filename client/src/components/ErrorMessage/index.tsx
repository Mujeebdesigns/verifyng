import React from 'react';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string | null;
}

const AlertIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <AlertIcon />
      </span>
      <span className={styles.message}>{message}</span>
    </div>
  );
};
