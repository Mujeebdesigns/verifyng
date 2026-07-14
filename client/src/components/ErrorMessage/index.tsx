import React from 'react';
import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string | null;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon} aria-hidden="true">
        ⚠️
      </span>
      <span className={styles.message}>{message}</span>
    </div>
  );
};
