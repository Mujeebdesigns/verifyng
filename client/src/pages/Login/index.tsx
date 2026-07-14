import React from 'react';
import { Link } from 'react-router-dom';
import { LoginForm } from '../../components/LoginForm/index.js';
import { Logo } from '../../components/Logo/index.js';
import { AuthVisualPanel } from '../../components/AuthVisualPanel/index.js';
import styles from './Login.module.css';

interface LoginProps {
  role?: 'BUYER' | 'VENDOR' | 'ADMIN';
}

export const Login: React.FC<LoginProps> = ({ role }) => {
  const isVendor = role === 'VENDOR';

  if (!isVendor) {
    return (
      <div className="auth-centered-page">
        <Link to="/" className="auth-centered-logo">
          <Logo variant="dark" height="3rem" />
        </Link>
        <LoginForm role={role} flat={false} />
      </div>
    );
  }

  return (
    <div className={styles.vendorLogin}>
      <div className={styles.formSection}>
        <div className={styles.topBar}>
          <Link to="/" style={{ display: 'inline-block' }}>
            <Logo variant="dark" height="2.125rem" />
          </Link>
        </div>

        <div className={styles.formCenter}>
          <div className={styles.formWrapper}>
            <LoginForm role={role} flat={true} />
          </div>
        </div>
      </div>

      <div className={styles.visualSection}>
        <AuthVisualPanel />
      </div>
    </div>
  );
};

export default Login;
