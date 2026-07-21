import React from 'react';
import type { WizardFormApi } from './types.js';

interface StepBrandingFieldsProps {
  form: WizardFormApi;
  coverImage: string;
  coverImageError: string | null;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  getInitials: (name: string) => string;
}

/** Wizard step 3 — cover image upload, live profile preview, and consent. */
export const StepBrandingFields: React.FC<StepBrandingFieldsProps> = ({
  form,
  coverImage,
  coverImageError,
  onCoverChange,
  consentChecked,
  onConsentChange,
  getInitials,
}) => {
  const { fields } = form;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cover Image Upload Box */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', alignItems: 'stretch' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-main-900)', textAlign: 'left' }}>Cover image</span>

        <div
          onClick={() => document.getElementById('coverUpload')?.click()}
          style={{
            border: '0.0625rem dashed var(--color-stroke-sub-300)',
            borderRadius: '0.75rem',
            padding: '2rem 1.25rem',
            background: 'var(--color-bg-white-0)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-primary-base)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-stroke-sub-300)'}
        >
          <input
            id="coverUpload"
            type="file"
            accept="image/*"
            onChange={onCoverChange}
            style={{ display: 'none' }}
          />

          {/* Image icon */}
          <div style={{
            width: '2.75rem',
            height: '2.75rem',
            borderRadius: '0.5rem',
            background: 'var(--color-primary-primary-lighter)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary-primary-base)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-main-900)', fontWeight: 500 }}>
              Upload cover image
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft-400)' }}>
              <span style={{ color: 'var(--color-primary-primary-base)', fontWeight: 500 }}>Click to browse</span> or drag and drop
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-soft-400)', marginTop: '0.125rem' }}>
              JPG, PNG or WEBP · Min 800×600px · Max 8MB · optimized automatically
            </span>
          </div>
        </div>
        {coverImageError && (
          <div style={{ color: 'var(--color-state-error)', fontSize: '0.75rem', marginTop: '0.25rem', textAlign: 'left' }}>
            ⚠️ {coverImageError}
          </div>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-soft-400)', textAlign: 'left', marginTop: '0.25rem' }}>
          This image appears on your featured vendor card and profile page.
        </span>
      </div>

      {/* Profile Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', alignItems: 'stretch', marginTop: '0.75rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-main-900)', textAlign: 'left' }}>Profile preview</span>

        <div style={{ background: 'var(--color-bg-white-0)', borderRadius: '1rem', overflow: 'hidden', border: '0.0625rem solid var(--color-stroke-soft-200)', boxShadow: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.05)' }}>
          {/* Cover banner */}
          <div style={{
            height: '8.75rem',
            background: coverImage ? `url(${coverImage}) center/cover no-repeat` : 'linear-gradient(135deg, #38c793 0%, #16a662 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {/* Faint Initials overlay */}
            <span style={{
              fontSize: '3.5rem',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.25)',
              letterSpacing: '0.125rem',
              userSelect: 'none'
            }}>
              {getInitials(fields.businessName)}
            </span>

            {/* Floating circle tag in top right */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: 'rgba(22, 166, 98, 0.85)',
              backdropFilter: 'blur(0.25rem)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </div>
          </div>

          {/* Card Details */}
          <div style={{ padding: '1.25rem 1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text-main-900)', margin: 0 }}>
              {fields.businessName || 'Your business name'}
            </h4>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-soft-400)' }}>
              @{fields.instagramHandle || 'yourhandle'} · {fields.stateName || 'Lagos'}
            </span>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              background: 'var(--color-primary-primary-lighter)',
              color: 'var(--color-primary-primary-base)',
              padding: '0.25rem 0.625rem',
              borderRadius: '6.25rem',
              fontSize: '0.6875rem',
              width: 'fit-content',
              marginTop: '0.5rem',
              border: '0.0625rem solid rgba(22, 166, 98, 0.15)',
              fontWeight: 500
            }}>
              <span style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', backgroundColor: 'var(--color-primary-primary-base)' }} />
              Verified vendor
            </div>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-soft-400)', textAlign: 'left', marginTop: '0.25rem' }}>
          This is how your profile appears to buyers. The trust score updates as reviews come in.
        </span>
      </div>

      {/* Public Display Consent Checkbox */}
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginTop: '1rem', textAlign: 'left' }}>
        <input
          id="consentCheck"
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => onConsentChange(e.target.checked)}
          style={{ marginTop: '0.25rem', cursor: 'pointer', width: '1rem', height: '1rem' }}
        />
        <label htmlFor="consentCheck" style={{ fontSize: '0.8125rem', color: 'var(--color-text-sub-500)', lineHeight: '1.5', cursor: 'pointer', userSelect: 'none' }}>
          I understand that VerifyNG will display my business information publicly. I may withdraw consent at any time by contacting support.
        </label>
      </div>
    </div>
  );
};
