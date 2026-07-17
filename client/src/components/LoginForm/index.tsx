import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../utils/constants.js';
import { Button } from '../Button/index.js';
import { ErrorMessage } from '../ErrorMessage/index.js';
import { Turnstile, type TurnstileHandle } from '../Turnstile/index.js';
import { TURNSTILE_SITE_KEY } from '../../utils/config.js';
import styles from '../AuthCard/AuthCard.module.css';
import flatStyles from './LoginForm.module.css';

import { authService } from '../../services/auth.service.js';
import { setStoredToken, clearStoredToken } from '../../utils/tokenStorage.js';
import type { AuthResponse } from '../../types/auth.js';

interface LoginFormProps {
  role?: 'BUYER' | 'VENDOR' | 'ADMIN';
  flat?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ role, flat = false }) => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Bot protection on admin login only (highest-value target). Buyer/vendor
  // login is already covered by rate limiting; adding a captcha there would
  // just add friction for every shopper.
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  const captchaRequired = role === 'ADMIN' && Boolean(TURNSTILE_SITE_KEY);

  // 2FA step: when admin login returns a challenge token, we switch to a code
  // entry view and complete login via the /admin/2fa endpoint.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const getFieldError = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (name: string) => () => {
    setTouched((p) => ({ ...p, [name]: true }));
    const value = name === 'email' ? email : password;
    setFieldErrors((p) => ({ ...p, [name]: getFieldError(name, value) }));
  };

  const handleFieldChange = (name: string, setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setter(value);
    if (touched[name]) {
      setFieldErrors((p) => ({ ...p, [name]: getFieldError(name, value) }));
    }
  };

  let title = 'Welcome Back';
  let subtitle = 'Log in to share your vendor experiences';
  let buttonLabel = 'Log In';

  if (role === 'BUYER') {
    title = 'Shopper Portal';
    subtitle = 'Log in to verify merchants and leave reviews';
    buttonLabel = 'Enter Portal';
  } else if (role === 'VENDOR') {
    title = 'Merchant Hub';
    subtitle = 'Log in to manage your business profile';
    buttonLabel = 'Enter Hub';
  } else if (role === 'ADMIN') {
    title = 'Admin Portal';
    subtitle = 'VerifyNG Internal Administrative Access';
    buttonLabel = 'Access Portal';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const newErrors: Record<string, string> = {};
    ['email', 'password'].forEach((f) => {
      const err = getFieldError(f, f === 'email' ? email : password);
      if (err) newErrors[f] = err;
    });
    setFieldErrors(newErrors);
    setTouched({ email: true, password: true });
    if (Object.keys(newErrors).length > 0) return;

    if (captchaRequired && !turnstileToken) {
      setError('Please complete the captcha below before signing in.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'ADMIN') {
        const res = await authService.loginAdmin({ email, password, turnstileToken: turnstileToken || undefined });
        // 2FA enabled — switch to the code step instead of finishing login.
        if ('twoFactorRequired' in res) {
          setChallengeToken(res.challengeToken);
          setError(null);
          setLoading(false);
          return;
        }
        await completeLogin(res);
      } else {
        const res = await authService.login({ email, password });
        await completeLogin(res);
      }
    } catch (err) {
      // Turnstile tokens are single-use — reset so the admin can retry cleanly.
      if (captchaRequired) {
        setTurnstileToken('');
        turnstileRef.current?.reset();
      }
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async (res: AuthResponse) => {
    setStoredToken(res.token);

    if (role && res.user.role !== role) {
      await authService.logout();
      clearStoredToken();
      const roleLabel = role === 'BUYER' ? 'shoppers' : role === 'VENDOR' ? 'merchants' : 'admins';
      setError(`This login page is for ${roleLabel} only.`);
      return;
    }

    await refreshUser();

    const from = (location.state as { from?: { pathname: string; search?: string; hash?: string } })?.from;
    if (from) {
      navigate(from.pathname + (from.search || '') + (from.hash || ''));
    } else if (res.user.role === 'ADMIN') {
      navigate(ROUTES.ADMIN_DASHBOARD);
    } else if (res.user.role === 'VENDOR') {
      navigate(ROUTES.VENDOR_DASHBOARD);
    } else {
      navigate(ROUTES.HOME);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!challengeToken) return;
    if (twoFactorCode.trim().length < 6) {
      setError('Enter the 6-digit code from your authenticator app (or a backup code).');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.adminTwoFactor(challengeToken, twoFactorCode.trim());
      await completeLogin(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA code step (admin, after a correct password when 2FA is enabled).
  if (challengeToken) {
    return (
      <form
        className={flat ? undefined : styles.form}
        onSubmit={handleTwoFactorSubmit}
        noValidate
        style={flat ? { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } : undefined}
      >
        <div className={flat ? flatStyles.flatHeader : styles.headerGroup}>
          <h2 className={flat ? flatStyles.flatTitle : styles.title}>Two-Factor Verification</h2>
          <p className={flat ? flatStyles.flatSubtitle : styles.subtitle}>
            Enter the 6-digit code from your authenticator app. You can also use a backup code.
          </p>
        </div>

        <ErrorMessage message={error} />

        <div className={styles.group}>
          <label className={flat ? flatStyles.flatLabel : styles.label} htmlFor="twoFactorCode">Authentication Code</label>
          <input
            id="twoFactorCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            className={flat ? flatStyles.flatInput : undefined}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={loading} fullWidth={true} className={flat ? flatStyles.flatSubmitBtn : undefined}>
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </Button>

        <button
          type="button"
          onClick={() => { setChallengeToken(null); setTwoFactorCode(''); setError(null); }}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-sub-500)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Back to login
        </button>
      </form>
    );
  }

  return (
    <form
      className={flat ? undefined : styles.form}
      onSubmit={handleSubmit}
      noValidate
      style={flat ? { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } : undefined}
    >
      <div className={flat ? flatStyles.flatHeader : styles.headerGroup}>
        <h2 className={flat ? flatStyles.flatTitle : styles.title}>
          {title}
        </h2>
        <p className={flat ? flatStyles.flatSubtitle : styles.subtitle}>
          {subtitle}
        </p>
      </div>

      <ErrorMessage message={error} />

      <div className={styles.group}>
        <label className={flat ? flatStyles.flatLabel : styles.label} htmlFor="email">Email Address</label>
        <input
          id="email" type="email" placeholder="e.g. name@example.com"
          autoComplete="username"
          className={flat ? `${flatStyles.flatInput} ${touched.email && fieldErrors.email ? flatStyles.flatInputError : ''}` : undefined}
          value={email}
          onChange={handleFieldChange('email', setEmail)}
          onBlur={handleBlur('email')}
          style={!flat && touched.email && fieldErrors.email ? { borderColor: 'var(--color-state-error)' } : undefined}
        />
        {touched.email && fieldErrors.email && (
          <span className={flat ? flatStyles.flatErrorText : undefined} style={!flat ? { color: 'var(--color-state-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' } : undefined}>{fieldErrors.email}</span>
        )}
      </div>

      <div className={styles.group}>
        <label className={flat ? flatStyles.flatLabel : styles.label} htmlFor="password">Password</label>
        <input
          id="password" type="password" placeholder="••••••••"
          autoComplete="current-password"
          className={flat ? `${flatStyles.flatInput} ${touched.password && fieldErrors.password ? flatStyles.flatInputError : ''}` : undefined}
          value={password}
          onChange={handleFieldChange('password', setPassword)}
          onBlur={handleBlur('password')}
          style={!flat && touched.password && fieldErrors.password ? { borderColor: 'var(--color-state-error)' } : undefined}
        />
        {touched.password && fieldErrors.password && (
          <span className={flat ? flatStyles.flatErrorText : undefined} style={!flat ? { color: 'var(--color-state-error)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' } : undefined}>{fieldErrors.password}</span>
        )}
      </div>

      <div className={styles.links} style={{ justifyContent: flat ? 'flex-start' : 'space-between' }}>
        <Link to={role ? `${ROUTES.FORGOT_PASSWORD}?role=${role}` : ROUTES.FORGOT_PASSWORD} className={flat ? flatStyles.flatLink : undefined}>
          Forgot Password?
        </Link>
      </div>

      {captchaRequired && (
        <Turnstile
          ref={turnstileRef}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
        />
      )}

      <Button type="submit" disabled={loading} fullWidth={true} className={flat ? flatStyles.flatSubmitBtn : undefined}>
        {loading ? 'Logging in...' : buttonLabel}
      </Button>

      {role !== 'ADMIN' && (
        <p className={flat ? flatStyles.flatBottomText : styles.bottomText}>
          Don't have an account?{' '}
          <Link to={role === 'VENDOR' ? ROUTES.REGISTER_VENDOR : ROUTES.REGISTER_BUYER} className={flat ? flatStyles.flatLink : undefined}>
            Register
          </Link>
        </p>
      )}
    </form>
  );
};

export default LoginForm;
