import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../Button/index.js';
import { ErrorMessage } from '../ErrorMessage/index.js';
import { ROUTES } from '../../utils/constants.js';
import formStyles from './RegisterForm.module.css';
import { WIZARD_CSS } from './flatStyles.js';

interface TaskInfo {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TASKS: TaskInfo[] = [
  {
    step: 1,
    title: 'Account credentials',
    description: 'Enter your full name and credentials to secure your vendor account.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primary-primary-base)">
        <circle cx="12" cy="12" r="7" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Business details',
    description: 'Provide your category, location, phone number, and description.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primary-primary-base)">
        <path d="M4 20 V12 A 8 8 0 0 1 20 12 V20 Z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Storefront branding',
    description: 'Upload your business logo, banner, and preview your public card.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primary-primary-base)">
        <rect x="4" y="4" width="16" height="16" rx="4" />
      </svg>
    ),
  },
];

interface TaskDashboardProps {
  error: string | null;
  loading: boolean;
  completedSteps: number[];
  onOpenStep: (step: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Vendor onboarding home view — progress capsule + the three task rows. */
export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  error,
  loading,
  completedSteps,
  onOpenStep,
  onSubmit,
}) => {
  const completedCount = completedSteps.length;
  const tasksRemaining = 3 - completedCount;
  const completionPercent = Math.round((completedCount / 3) * 100);

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="slide-in-view"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '26.25rem',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}>
        {/* Styles block */}
        <style dangerouslySetInnerHTML={{ __html: WIZARD_CSS }} />

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', textAlign: 'left', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--color-text-main-900)', margin: 0, letterSpacing: '-0.0312rem' }}>
            Welcome to VerifyNG
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-sub-500)', margin: 0, lineHeight: '1.5' }}>
            A few quick steps to complete your business profile.
          </p>
        </div>

        <ErrorMessage message={error} />

        {/* Progress Capsule */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.875rem 1.25rem',
          background: 'var(--color-bg-white-0)',
          border: '0.0625rem solid var(--color-stroke-soft-200)',
          borderRadius: '0.75rem',
          marginBottom: '1.75rem',
          boxShadow: '0 0.125rem 0.5rem -0.125rem rgba(10, 13, 20, 0.03)',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-sub-500)' }}>
            {tasksRemaining} {tasksRemaining === 1 ? 'task' : 'tasks'} remaining
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-sub-500)' }}>
              {completionPercent}% complete
            </span>
            <div style={{
              width: '4.375rem',
              height: '0.1875rem',
              background: 'var(--color-stroke-soft-200)',
              borderRadius: '6.25rem',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${completionPercent}%`,
                background: 'var(--color-primary-primary-base)',
                borderRadius: '6.25rem',
                transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 0 0.375rem rgba(22, 166, 98, 0.4)',
              }} />
            </div>
          </div>
        </div>

        {/* Clean Flat Rows list */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
          {TASKS.map((task) => (
            <div
              key={task.step}
              className={`reloy-task-row ${completedSteps.includes(task.step) ? 'reloy-task-completed' : ''}`}
              onClick={() => onOpenStep(task.step)}
            >
              <div className="reloy-icon-container" style={{ background: 'var(--color-primary-primary-lighter)', border: '0.0625rem solid rgba(22, 166, 98, 0.15)' }}>
                {task.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 className="reloy-task-title">{task.title}</h4>
                <p className="reloy-task-desc">{task.description}</p>
              </div>
              {completedSteps.includes(task.step) ? (
                <div className="reloy-completed-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <div className="reloy-chevron">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Final Submission Action Button */}
        <Button
          type="submit"
          disabled={loading || completedSteps.length < 3}
          fullWidth={true}
          className={formStyles.primaryBtn}
          style={{ fontSize: '0.9375rem' }}
        >
          {loading ? 'Processing...' : 'Complete Onboarding'}
        </Button>

        <p style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '0.0625rem solid var(--color-stroke-soft-200)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-sub-500)' }}>
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN_VENDOR} className="flat-link">
            Log In
          </Link>
        </p>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-sub-500)', marginTop: '1rem' }}>
          Are you a shopper looking to review merchants?{' '}
          <Link to="/register/buyer" className="flat-link">
            Register here
          </Link>
        </p>
      </div>
    </form>
  );
};
