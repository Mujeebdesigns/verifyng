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

/** Post-registration confirmation — a calm, centered "check your inbox" state. */
export const SuccessScreen: React.FC<SuccessScreenProps> = ({ flat, role, email }) => {
  const content = (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '1.25rem',
        // Fill the vendor column so it sits centered, not clinging to the top.
        minHeight: flat ? '60vh' : undefined,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: '50%',
          backgroundColor: 'color-mix(in srgb, var(--color-primary-primary-base) 12%, transparent)',
          color: 'var(--color-primary-primary-dark)',
        }}
        aria-hidden="true"
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '26rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--color-text-main-900)', margin: 0, letterSpacing: '-0.01em' }}>
          Account created
        </h2>
        <p style={{ color: 'var(--color-text-sub-500)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
          We sent a verification link to{' '}
          <span style={{ fontWeight: 500, color: 'var(--color-text-main-900)' }}>{email}</span>. Check your inbox to verify your email before logging in.
        </p>
      </div>

      <Link to={role === 'VENDOR' ? ROUTES.LOGIN_VENDOR : ROUTES.LOGIN_BUYER} style={{ width: '100%', maxWidth: '22rem' }}>
        <Button fullWidth={true}>
          {role === 'VENDOR' ? 'Proceed to Merchant Hub' : 'Proceed to Shopper Portal'}
        </Button>
      </Link>
    </div>
  );

  // Buyer flow shows inside the centered auth card; vendor flow fills its column.
  return flat ? content : <div className={styles.form}>{content}</div>;
};
