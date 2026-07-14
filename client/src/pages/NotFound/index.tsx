import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/index.js';
import { Button } from '../../components/Button/index.js';
import { ROUTES } from '../../utils/constants.js';
import styles from './NotFound.module.css';

export const NotFound: React.FC = () => {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <p className={styles.code} aria-hidden="true">404</p>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.message}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Check the address, or head back to safety below.
        </p>
        <div className={styles.actions}>
          <Link to={ROUTES.HOME}>
            <Button variant="primary">Go to homepage</Button>
          </Link>
          <Link to={ROUTES.DIRECTORY}>
            <Button variant="secondary">Browse vendors</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
