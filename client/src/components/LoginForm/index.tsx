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
      let res;
      if (role === 'ADMIN') {
        res = await authService.loginAdmin({ email, password, turnstileToken: turnstileToken || undefined });
      } else {
        res = await authService.login({ email, password });
      }

      setStoredToken(res.token);

      if (role && res.user.role !== role) {
        await authService.logout();
        clearStoredToken();
        const roleLabel = role === 'BUYER' ? 'shoppers' : role === 'VENDOR' ? 'merchants' : 'admins';
        setError(`This login page is for ${roleLabel} only.`);
        setLoading(false);
        return;
      }

      await refreshUser();

      const from = (location.state as { from?: { pathname: string; search?: string; hash?: string } })?.from;
      if (from) {
        navigate(from.pathname + (from.search || '') + (from.hash || ''));
      } else {
        if (res.user.role === 'ADMIN') {
          navigate(ROUTES.ADMIN_DASHBOARD);
        } else if (res.user.role === 'VENDOR') {
          navigate(ROUTES.VENDOR_DASHBOARD);
        } else {
          navigate(ROUTES.HOME);
        }
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
