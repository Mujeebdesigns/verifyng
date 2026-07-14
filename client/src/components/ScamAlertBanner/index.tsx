import React from 'react';
import styles from './ScamAlertBanner.module.css';

interface ScamAlertBannerProps {
  reason: string | null;
}

export const ScamAlertBanner: React.FC<ScamAlertBannerProps> = ({ reason }) => {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon} aria-hidden="true">
        🚨
      </span>
      <div className={styles.content}>
        <h4 className={styles.title}>High Risk Scam Vendor</h4>
        <p className={styles.message}>
          {reason ||
            'This vendor has been flagged by the community for exhibiting high-risk scam behavior (e.g. non-delivery after payment or blocking customers). Proceed with extreme caution.'}
        </p>
      </div>
    </div>
  );
};
