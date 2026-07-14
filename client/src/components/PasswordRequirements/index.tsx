import React from 'react';
import { PASSWORD_RULES } from '../../utils/passwordPolicy.js';
import styles from './PasswordRequirements.module.css';

interface PasswordRequirementsProps {
  password: string;
  visible: boolean;
}

/**
 * Live password-strength checklist. Shown while the password field is
 * focused; each rule ticks on the moment it's satisfied, so users get
 * accurate feedback as they type rather than a rejection after submit.
 */
export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password, visible }) => {
  if (!visible) return null;

  return (
    <div className={styles.panel} role="status">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <div key={rule.id} className={`${styles.rule} ${met ? styles.ruleMet : ''}`}>
            <span className={`${styles.dot} ${met ? styles.dotMet : ''}`}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            {rule.label}
          </div>
        );
      })}
    </div>
  );
};

export default PasswordRequirements;
