import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service.js';
import { ROUTES, loginRouteForRole } from '../../utils/constants.js';
import { Button } from '../../components/Button/index.js';
import { ErrorMessage } from '../../components/ErrorMessage/index.js';
import { Logo } from '../../components/Logo/index.js';
import { PasswordRequirements } from '../../components/PasswordRequirements/index.js';
import { getPasswordPolicyError } from '../../utils/passwordPolicy.js';
import styles from '../../components/AuthCard/AuthCard.module.css';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const loginRoute = loginRouteForRole(searchParams.get('role'));

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordFocused, setPasswordFocused] = useState(false);

  const getFieldError = (name: string, value: string): string => {
    switch (name) {
      case 'newPassword':
        return getPasswordPolicyError(value);
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== newPassword) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (name: string) => () => {
    setTouched((p) => ({ ...p, [name]: true }));
    const value = name === 'newPassword' ? newPassword : confirmPassword;
    setFieldErrors((p) => ({ ...p, [name]: getFieldError(name, value) }));
  };

  const handleFieldChange = (name: string, setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setter(value);
    if (touched[name]) {
      setFieldErrors((p) => ({ ...p, [name]: getFieldError(name, value) }));
    }
    if (name === 'newPassword' && touched.confirmPassword) {
      setFieldErrors((p) => ({ ...p, confirmPassword: getFieldError('confirmPassword', confirmPassword) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing from the link URL.');
      return;
    }

    const newErrors: Record<string, string> = {};
    ['newPassword', 'confirmPassword'].forEach((f) => {
      const err = getFieldError(f, f === 'newPassword' ? newPassword : confirmPassword);
      if (err) newErrors[f] = err;
    });
    setFieldErrors(newErrors);
    setTouched({ newPassword: true, confirmPassword: true });
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Token may have expired.');
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
            <h2 className={styles.title} style={{ marginBottom: '1rem' }}>Choose New Password</h2>
            <div className="animated-lock-container">
              <div className="animated-mail-glow" />
              <div className="confetti-particle confetti-1" />
              <div className="confetti-particle confetti-2" />
              <div className="confetti-particle confetti-3" />
              <div className="confetti-particle confetti-4" />
              <div className="confetti-particle confetti-5" />
              <div className="confetti-particle confetti-6" />
              <svg
                className="animated-mail-svg"
                width="48" height="48" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path className="animated-lock-shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                <line x1="12" y1="18" x2="12" y2="20" strokeWidth="2" />
              </svg>
            </div>
            <p style={{ color: 'var(--color-text-sub-500)', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Your password has been reset successfully! You can now log in using your new credentials.
            </p>
            <Link to={loginRoute} style={{ display: 'inline-block', width: '100%' }}>
              <Button fullWidth={true}>Proceed to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.headerGroup}>
              <h2 className={styles.title}>Choose New Password</h2>
            </div>

            <ErrorMessage message={error} />

            <div className={styles.group}>
              <label className={styles.label} htmlFor="newPassword">New Password</label>
              <input
                id="newPassword" type="password" placeholder="••••••••"
                autoComplete="new-password"
                value={newPassword}
                onChange={handleFieldChange('newPassword', setNewPassword)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => { setPasswordFocused(false); handleBlur('newPassword')(); }}
                style={touched.newPassword && fieldErrors.newPassword ? { borderColor: 'var(--color-state-error)' } : undefined}
              />
              {touched.newPassword && fieldErrors.newPassword && !passwordFocused && (
                <span style={{ color: 'var(--color-state-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.newPassword}</span>
              )}
              <PasswordRequirements password={newPassword} visible={passwordFocused} />
            </div>

            <div className={styles.group}>
              <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword" type="password" placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={handleFieldChange('confirmPassword', setConfirmPassword)}
                onBlur={handleBlur('confirmPassword')}
                style={touched.confirmPassword && fieldErrors.confirmPassword ? { borderColor: 'var(--color-state-error)' } : undefined}
              />
              {touched.confirmPassword && fieldErrors.confirmPassword && (
                <span style={{ color: 'var(--color-state-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{fieldErrors.confirmPassword}</span>
              )}
            </div>

            <Button type="submit" disabled={loading} fullWidth={true}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </>
        )}
      </form>
    </div>
  );
};

export default ResetPassword;
