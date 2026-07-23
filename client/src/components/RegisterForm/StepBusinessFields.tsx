import React from 'react';
import { CATEGORIES, STATES } from '../../utils/constants.js';
import formStyles from './RegisterForm.module.css';
import type { WizardFormApi } from './types.js';

interface StepBusinessFieldsProps {
  form: WizardFormApi;
}

/** Wizard step 2 — business identity, location, description, and social channels. */
export const StepBusinessFields: React.FC<StepBusinessFieldsProps> = ({ form }) => {
  const { fields, touched, fieldErrors, handleFieldChange, handleBlur, labelStyle, inputGroupStyle, errorStyle } = form;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={inputGroupStyle}>
        <label style={labelStyle} htmlFor="businessName">
          Business Name *
        </label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="businessName"
            className={formStyles.input}
            type="text"
            placeholder="e.g. Trendy Fits"
            value={fields.businessName}
            onChange={handleFieldChange('businessName')}
            onBlur={handleBlur('businessName')}
            style={touched.businessName && fieldErrors.businessName ? { borderColor: 'var(--color-state-error) !important' } : undefined}
          />
        </div>
        {touched.businessName && fieldErrors.businessName && (
          <span style={errorStyle}>{fieldErrors.businessName}</span>
        )}
      </div>

      <div className={formStyles.formGrid}>
        <div style={inputGroupStyle}>
          <label style={labelStyle} htmlFor="category">
            Category *
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <select
              id="category"
              className={formStyles.select}
              value={fields.category}
              onChange={handleFieldChange('category')}
              onBlur={handleBlur('category')}
              style={touched.category && fieldErrors.category ? { borderColor: 'var(--color-state-error) !important' } : undefined}
            >
              <option value="">Select Category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {touched.category && fieldErrors.category && (
            <span style={errorStyle}>{fieldErrors.category}</span>
          )}
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle} htmlFor="phoneNumber">
            Phone Number *
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id="phoneNumber"
              className={formStyles.input}
              type="text"
              placeholder="e.g. 08012345678"
              value={fields.phoneNumber}
              onChange={handleFieldChange('phoneNumber')}
              onBlur={handleBlur('phoneNumber')}
              style={touched.phoneNumber && fieldErrors.phoneNumber ? { borderColor: 'var(--color-state-error) !important' } : undefined}
            />
          </div>
          {touched.phoneNumber && fieldErrors.phoneNumber && (
            <span style={errorStyle}>{fieldErrors.phoneNumber}</span>
          )}
        </div>
      </div>

      <div className={formStyles.formGrid}>
        <div style={inputGroupStyle}>
          <label style={labelStyle} htmlFor="state">
            State *
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <select
              id="state"
              className={formStyles.select}
              value={fields.stateName}
              onChange={handleFieldChange('stateName')}
              onBlur={handleBlur('stateName')}
              style={touched.stateName && fieldErrors.stateName ? { borderColor: 'var(--color-state-error) !important' } : undefined}
            >
              <option value="">Select State</option>
              {STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          {touched.stateName && fieldErrors.stateName && (
            <span style={errorStyle}>{fieldErrors.stateName}</span>
          )}
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle} htmlFor="city">
            City *
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              id="city"
              className={formStyles.input}
              type="text"
              placeholder="e.g. Ikeja"
              value={fields.cityName}
              onChange={handleFieldChange('cityName')}
              onBlur={handleBlur('city')}
              style={touched.cityName && fieldErrors.cityName ? { borderColor: 'var(--color-state-error) !important' } : undefined}
            />
          </div>
          {touched.cityName && fieldErrors.cityName && (
            <span style={errorStyle}>{fieldErrors.cityName}</span>
          )}
        </div>
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle} htmlFor="instagram">
          Instagram Handle
        </label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="instagram"
            className={formStyles.input}
            type="text"
            placeholder="e.g. trendy_fits"
            value={fields.instagramHandle}
            onChange={handleFieldChange('instagramHandle')}
            onBlur={handleBlur('instagramHandle')}
          />
        </div>
      </div>

      <div style={inputGroupStyle}>
        <label style={labelStyle} htmlFor="description">
          Business Description *
        </label>
        <textarea
          id="description"
          className={formStyles.textarea}
          rows={3}
          maxLength={500}
          placeholder="Tell customers what you sell, your delivery policies, etc. (max 500 chars)"
          value={fields.description}
          onChange={handleFieldChange('description')}
          onBlur={handleBlur('description')}
          style={touched.description && fieldErrors.description ? { borderColor: 'var(--color-state-error) !important' } : undefined}
        />
        {touched.description && fieldErrors.description && (
          <span style={errorStyle}>{fieldErrors.description}</span>
        )}
      </div>

      <h4 style={{ fontSize: '0.8125rem', fontWeight: '500', textTransform: 'uppercase', color: 'var(--color-text-soft-400)', letterSpacing: '0.05em', margin: '1rem 0 0.5rem 0', textAlign: 'left' }}>Social & Chat Channels</h4>
      <div className={formStyles.formGrid}>
        <div style={inputGroupStyle}>
          <label style={labelStyle} htmlFor="whatsapp">WhatsApp Link / Number</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input id="whatsapp" className={formStyles.input} type="text" placeholder="wa.me/234..." value={fields.whatsappUrl} onChange={handleFieldChange('whatsappUrl')} />
          </div>
        </div>
        <div style={inputGroupStyle}>
          <label style={labelStyle} htmlFor="tiktok">TikTok Profile URL</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input id="tiktok" className={formStyles.input} type="text" placeholder="tiktok.com/@..." value={fields.tiktokUrl} onChange={handleFieldChange('tiktokUrl')} />
          </div>
        </div>
      </div>
    </div>
  );
};
