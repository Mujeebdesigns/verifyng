import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.js';
import { AuthGuard } from './components/AuthGuard/index.js';
import { ROUTES } from './utils/constants.js';
import Home from './pages/Home/index.js';
import VendorProfile from './pages/VendorProfile/index.js';
import Dashboard from './pages/Dashboard/index.js';
import Login from './pages/Login/index.js';
import Register from './pages/Register/index.js';
import VerifyEmail from './pages/VerifyEmail/index.js';
import ForgotPassword from './pages/ForgotPassword/index.js';
import ResetPassword from './pages/ResetPassword/index.js';
import SubmitReview from './pages/SubmitReview/index.js';
import Directory from './pages/Directory/index.js';
import Support from './pages/Support/index.tsx';
import VendorDashboard from './pages/VendorDashboard/index.js';
import AdminDashboard from './pages/AdminDashboard/index.js';
import NotFound from './pages/NotFound/index.js';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.DIRECTORY} element={<Directory />} />
          <Route path={ROUTES.SUPPORT} element={<Support />} />
          <Route path={ROUTES.VENDOR_PROFILE} element={<VendorProfile />} />
          
          <Route path={ROUTES.LOGIN_BUYER} element={<Login role="BUYER" />} />
          <Route path={ROUTES.LOGIN_VENDOR} element={<Login role="VENDOR" />} />
          <Route path={ROUTES.LOGIN_ADMIN} element={<Login role="ADMIN" />} />
          <Route path={ROUTES.REGISTER_BUYER} element={<Register role="BUYER" />} />
          <Route path={ROUTES.REGISTER_VENDOR} element={<Register role="VENDOR" />} />
          
          <Route path={ROUTES.LOGIN} element={<Navigate to={ROUTES.LOGIN_BUYER} replace />} />
          <Route path={ROUTES.REGISTER} element={<Navigate to={ROUTES.REGISTER_BUYER} replace />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route
            path={ROUTES.DASHBOARD}
            element={<AuthGuard><Dashboard /></AuthGuard>}
          />
          <Route
            path={ROUTES.VENDOR_DASHBOARD}
            element={<AuthGuard allowedRoles={['VENDOR', 'ADMIN']}><VendorDashboard /></AuthGuard>}
          />
          <Route
            path={ROUTES.ADMIN_DASHBOARD}
            element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>}
          />
          <Route
            path={ROUTES.SUBMIT_REVIEW}
            element={<AuthGuard allowedRoles={['BUYER']}><SubmitReview /></AuthGuard>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
