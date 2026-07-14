import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service.js';
import { ROUTES, loginRouteForRole } from '../../utils/constants.js';
import { Button } from '../../components/Button/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { Logo } from '../../components/Logo/index.js';
import styles from '../../components/AuthCard/AuthCard.module.css';

export const ForgotPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const loginRoute = loginRouteForRole(searchParams.get('role'));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const getEmailError = (v: string) => {
    if (!v) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email address';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = getEmailError(email);
    setTouched(true);
    setFieldError(err);
    setError(null);
    if (err) return;

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-centered-page">
      <Link to={ROUTES.HOME} className="auth-centered-logo">
        <Logo variant="dark" height="3rem" />
      </Link>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {success ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 className={styles.title} style={{ marginBottom: '1rem' }}>Reset Password</h2>
            <div className="animated-mail-container">
              <div className="animated-mail-glow" />
              <svg
                className="animated-mail-svg"
                width="48" height="48" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
                <path className="animated-mail-paper" d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                <path d="M16 19l2 2 4-4" stroke="var(--color-state-success)" strokeWidth="2.5" />
              </svg>
            </div>
            <p style={{ color: 'var(--color-text-sub-500)', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              If an account with that email exists, a password reset link has been sent. Please check your inbox.
            </p>
            <Link to={loginRoute} style={{ display: 'inline-block', width: '100%' }}>
              <Button fullWidth={true}>Proceed to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.headerGroup}>
              <h2 className={styles.title}>Reset Password</h2>
              <p className={styles.subtitle}>
                Enter your email and we'll send you a password reset link.
              </p>
            </div>

            <ErrorMessage message={error} />

            <div className={styles.group}>
              <label className={styles.label} htmlFor="email">Email Address</label>
              <input
                id="email" type="email" placeholder="e.g. name@example.com"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  if (touched) setFieldError(getEmailError(v));
                }}
                onBlur={() => { setTouched(true); setFieldError(getEmailError(email)); }}
                style={touched && fieldError ? { borderColor: 'var(--color-state-error)' } : undefined}
              />
              {touched && fieldError && (
                <span style={{ color: 'var(--color-state-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{fieldError}</span>
              )}
            </div>

            <Button type="submit" disabled={loading} fullWidth={true}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <p className={styles.bottomText}>
              Back to <Link to={loginRoute}>Log In</Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
};

export default ForgotPassword;
