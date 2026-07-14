import React, { useState } from 'react';
import { PasswordRequirements } from '../PasswordRequirements/index.js';
import formStyles from './RegisterForm.module.css';
import type { WizardFormApi } from './types.js';

interface StepAccountFieldsProps {
  form: WizardFormApi;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  onAgreedTermsChange: (checked: boolean) => void;
  onAgreedPrivacyChange: (checked: boolean) => void;
}

/** Wizard step 1 — name, email, password, and the legal checkboxes. */
export const StepAccountFields: React.FC<StepAccountFieldsProps> = ({
  form,
  agreedTerms,
  agreedPrivacy,
  onAgreedTermsChange,
  onAgreedPrivacyChange,
}) => {
  const { fields, touched, fieldErrors, handleFieldChange, handleBlur, labelStyle, inputGroupStyle, errorStyle } = form;
  const [passwordFocused, setPasswordFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={inputGroupStyle}>
        <label style={labelStyle} htmlFor="displayName">
          Full Name
        </label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="displayName"
            className={formStyles.input}
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={fields.displayName}
            onChange={handleFieldChange('displayName')}
            onBlur={handleBlur('displayName')}
            style={touched.displayName && fieldErrors.displayName ? { borderColor: 'var(--color-state-error) !important' } : undefined}
          />
        </div>
        {touched.displayName && fieldErrors.displayName && (
          <span style={errorStyle}>{fieldErrors.displayName}</span>
        )}
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle} htmlFor="email">
          Business Email Address
        </label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="email"
            className={formStyles.input}
            type="email"
            autoComplete="email"
            placeholder="e.g. hello@mybusiness.com"
            value={fields.email}
            onChange={handleFieldChange('email')}
            onBlur={handleBlur('email')}
            style={touched.email && fieldErrors.email ? { borderColor: 'var(--color-state-error) !important' } : undefined}
          />
        </div>
        {touched.email && fieldErrors.email && (
          <span style={errorStyle}>{fieldErrors.email}</span>
        )}
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle} htmlFor="password">
          Password
        </label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="password"
            className={formStyles.input}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={fields.password}
            onChange={handleFieldChange('password')}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => { setPasswordFocused(false); handleBlur('password')(); }}
            style={touched.password && fieldErrors.password ? { borderColor: 'var(--color-state-error) !important' } : undefined}
          />
        </div>
        {touched.password && fieldErrors.password && !passwordFocused && (
          <span style={errorStyle}>{fieldErrors.password}</span>
        )}
        <PasswordRequirements password={fields.password} visible={passwordFocused} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.625rem' }}>
        <label className={formStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => onAgreedTermsChange(e.target.checked)}
            className={formStyles.checkboxHidden}
          />
          <div className={formStyles.checkboxBox}>
            <svg className={formStyles.checkboxCheck} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className={formStyles.checkboxLabel}>
            I agree to VerifyNG's <a href="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>.
          </span>
        </label>

        <label className={formStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={agreedPrivacy}
            onChange={(e) => onAgreedPrivacyChange(e.target.checked)}
            className={formStyles.checkboxHidden}
          />
          <div className={formStyles.checkboxBox}>
            <svg className={formStyles.checkboxCheck} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className={formStyles.checkboxLabel}>
            I understand that VerifyNG will process my information in accordance with their <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </span>
        </label>
      </div>
    </div>
  );
};
