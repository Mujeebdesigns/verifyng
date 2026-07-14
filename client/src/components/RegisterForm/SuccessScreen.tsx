import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../Button/index.js';
import { ROUTES } from '../../utils/constants.js';
import styles from '../AuthCard/AuthCard.module.css';

interface SuccessScreenProps {
  flat: boolean;
  role: 'BUYER' | 'VENDOR';
  email: string;
}

/** Post-registration confirmation panel with the verify-email prompt. */
export const SuccessScreen: React.FC<SuccessScreenProps> = ({ flat, role, email }) => {
  return (
    <div
      className={flat ? undefined : styles.form}
      style={
        flat
          ? {
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0,
              textAlign: 'left',
            }
          : { textAlign: 'center' }
      }
    >
      <h2
        className={flat ? undefined : styles.title}
        style={
          flat
            ? {
                fontSize: '2rem',
                fontWeight: '500',
                color: 'var(--color-text-main-900)',
                textAlign: 'left',
                margin: '0 0 0.75rem 0',
              }
            : undefined
        }
      >
        Account Created!
      </h2>
      <div style={{ fontSize: '3rem', margin: '1rem 0', textAlign: flat ? 'left' : 'center' }} role="img" aria-label="success">
        ✉️
      </div>
      <p style={{ color: 'var(--color-text-sub-500)', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1.5rem', textAlign: flat ? 'left' : 'center' }}>
        We sent a verification link to <span style={{ fontWeight: 500, color: 'var(--color-text-main-900)' }}>{email}</span>.<br />
        Please check your inbox to verify your email address before logging in.
      </p>
      <Link to={role === 'VENDOR' ? ROUTES.LOGIN_VENDOR : ROUTES.LOGIN_BUYER} style={{ width: '100%' }}>
        <Button fullWidth={true}>
          {role === 'VENDOR' ? 'Proceed to Merchant Hub' : 'Proceed to Shopper Portal'}
        </Button>
      </Link>
    </div>
  );
};
