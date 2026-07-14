import React from 'react';
import styles from './LoadingSpinner.module.css';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className={styles.spinnerContainer} aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  );
};
