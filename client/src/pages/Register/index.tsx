import React from 'react';
import { Link } from 'react-router-dom';
import { RegisterForm } from '../../components/RegisterForm/index.js';
import { Logo } from '../../components/Logo/index.js';
import { AuthVisualPanel } from '../../components/AuthVisualPanel/index.js';
import styles from './Register.module.css';

interface RegisterProps {
  role?: 'BUYER' | 'VENDOR';
}

export const Register: React.FC<RegisterProps> = ({ role }) => {
  const isVendor = role === 'VENDOR';

  if (!isVendor) {
    return (
      <div className="auth-centered-page">
        <Link to="/" className="auth-centered-logo">
          <Logo variant="dark" height="3rem" />
        </Link>
        <RegisterForm role={role} flat={false} />
      </div>
    );
  }

  return (
    <div className={styles.vendorRegister}>
      <div className={styles.split}>
        <div className={styles.formColumn}>
          <div className={styles.topBar}>
            <Link to="/" style={{ display: 'inline-block' }}>
              <Logo variant="dark" height="2.125rem" />
            </Link>
          </div>

          <RegisterForm role={role} flat={true} />
        </div>
        <div className={styles.sidebar}>
          <AuthVisualPanel />
        </div>
      </div>
    </div>
  );
};

export default Register;
