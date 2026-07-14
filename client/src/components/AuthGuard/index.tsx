import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../utils/constants.js';
import { LoadingSpinner } from '../LoadingSpinner/index.js';

interface AuthGuardProps {
  children: React.ReactElement;
  allowedRoles?: ('BUYER' | 'VENDOR' | 'ADMIN')[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    const isTempAdminPath = location.pathname.startsWith('/admin-dashboard');
    const loginRedirectPath = isTempAdminPath ? ROUTES.LOGIN_ADMIN : ROUTES.LOGIN;
    // Redirect to login page but save the current location they were trying to access
    return <Navigate to={loginRedirectPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If user's role is not authorized, redirect to home
    return <Navigate to="/" replace />;
  }

  return children;
};
