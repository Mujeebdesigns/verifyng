import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service.js';
import { ROUTES } from '../../utils/constants.js';
import { Button } from '../../components/Button/index.js';
import { LoadingSpinner } from '../../components/LoadingSpinner/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { Logo } from '../../components/Logo/index.js';
import styles from '../../components/AuthCard/AuthCard.module.css';

const verificationCache: Record<string, Promise<unknown>> = {};

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setError('Verification token is missing in the URL link.');
        setLoading(false);
        return;
      }

      try {
        if (!verificationCache[token]) {
          verificationCache[token] = authService.verifyEmail(token);
        }
        await verificationCache[token];
        setSuccess(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Email verification failed. The token may be expired.');
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [token]);

  return (
    <div className="auth-centered-page">
      <Link to={ROUTES.HOME} className="auth-centered-logo">
        <Logo variant="dark" height="3rem" />
      </Link>

      <div className={styles.form} style={{ textAlign: 'center', alignItems: 'center' }}>
        <div className={styles.headerGroup}>
          <h2 className={styles.title}>Email Verification</h2>
        </div>

        {loading && (
          <div>
            <p style={{ color: 'var(--color-text-sub-500)', marginBottom: '0.75rem' }}>Verifying your email address...</p>
            <LoadingSpinner />
          </div>
        )}

        {!loading && (
          error && !success ? (
            <div>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-state-error)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '1rem 0' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <ErrorMessage message={error} />
              <Link to={ROUTES.REGISTER} style={{ marginTop: '1rem', display: 'inline-block' }}>
                <Button>Try Registering Again</Button>
              </Link>
            </div>
          ) : success ? (
            <div>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-state-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '1rem 0' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="8 12 11 15 17 9" />
              </svg>
              <p style={{ color: 'var(--color-text-sub-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                Your email has been verified successfully! You can now log in to access your dashboard.
              </p>
              <Link to={ROUTES.LOGIN} style={{ display: 'inline-block', width: '100%' }}>
                <Button fullWidth={true}>Proceed to Login</Button>
              </Link>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
