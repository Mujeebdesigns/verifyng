import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ROUTES } from '../../utils/constants.js';
import { Button } from '../Button/index.js';
import { ErrorMessage } from '../ErrorMessage/index.js';
import { Turnstile, type TurnstileHandle } from '../Turnstile/index.js';
import { TURNSTILE_SITE_KEY } from '../../utils/config.js';
import styles from '../AuthCard/AuthCard.module.css';
import formStyles from './RegisterForm.module.css';
import { EMPTY_FIELDS, type FieldName, type WizardFormApi } from './types.js';
import { SIMPLE_FLAT_CSS } from './flatStyles.js';
import { getPasswordPolicyError } from '../../utils/passwordPolicy.js';
import { PasswordRequirements } from '../PasswordRequirements/index.js';
import { SuccessScreen } from './SuccessScreen.tsx';
import { StepAccountFields } from './StepAccountFields.tsx';
import { StepBusinessFields } from './StepBusinessFields.tsx';
import { StepBrandingFields } from './StepBrandingFields.tsx';
import { TaskDashboard } from './TaskDashboard.tsx';

interface RegisterFormProps {
  role?: 'BUYER' | 'VENDOR';
  flat?: boolean;
}

const STEP_HEADERS: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Account credentials', subtitle: 'Enter your full name and credentials to secure your vendor account.' },
  2: { title: 'Business details', subtitle: 'Provide your category, location, phone number, and description.' },
  3: { title: 'Storefront branding', subtitle: 'Upload your business logo, banner, and preview your public card.' },
};

const getInitials = (name: string) => {
  if (!name) return 'CW';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ role: initialRole, flat = false }) => {
  const { register, registerVendor } = useAuth();

  // Role comes straight from the route; steps are wizard-local state
  const role: 'BUYER' | 'VENDOR' = initialRole || 'BUYER';
  const [activeFormStep, setActiveFormStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // All text field values, consolidated
  const [fields, setFields] = useState(EMPTY_FIELDS);

  // Branding (step 3)
  const [coverImage, setCoverImage] = useState('');

  // Checkbox states for terms & conditions
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Error & Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImageError, setCoverImageError] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Captcha applies to buyer self-service registration only (vendors are
  // human-approved). Active only when a site key is configured.
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileHandle>(null);
  const captchaRequired = role === 'BUYER' && Boolean(TURNSTILE_SITE_KEY);

  const flatOnly = <T,>(value: T): T | undefined => (flat ? value : undefined);

  const labelStyle: React.CSSProperties = flat ? {
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: 'var(--color-text-main-900)',
    marginBottom: '0.375rem',
    display: 'block',
    textAlign: 'left',
  } : {};

  const inputGroupStyle: React.CSSProperties = flat ? {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  } : {};

  const errorStyle: React.CSSProperties = flat ? {
    color: 'var(--color-state-error)',
    fontSize: '0.75rem',
    marginTop: '0.25rem',
    display: 'block',
    textAlign: 'left',
  } : {};

  const getFieldError = (name: string, value: string): string => {
    switch (name) {
      case 'displayName':
        if (!value) return 'Name is required';
        if (value.length < 2 || value.length > 50) return 'Must be 2–50 characters';
        return '';
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
        return '';
      case 'password':
        return getPasswordPolicyError(value);
      case 'businessName':
        if (!value) return 'Business name is required';
        if (value.trim().length < 2) return 'Must be at least 2 characters';
        return '';
      case 'category':
        if (!value) return 'Category is required';
        return '';
      case 'phoneNumber':
        if (!value) return 'Phone number is required';
        return '';
      case 'stateName':
        if (!value) return 'State is required';
        return '';
      case 'cityName':
        if (!value) return 'City is required';
        return '';
      case 'description':
        if (!value) return 'Description is required';
        if (value.trim().length < 10) return 'Must be at least 10 characters';
        if (value.trim().length > 500) return 'Must be under 500 characters';
        return '';
      case 'bankAccountLast4':
        if (value && !/^\d{4}$/.test(value.replace(/[^0-9]/g, ''))) return 'Must be exactly 4 digits';
        return '';
      default:
        return '';
    }
  };

  const getFieldValue = (name: string): string =>
    (fields as Record<string, string>)[name] ?? '';

  const handleBlur = (name: string) => () => {
    setTouched((p) => ({ ...p, [name]: true }));
    setFieldErrors((p) => ({ ...p, [name]: getFieldError(name, getFieldValue(name)) }));
  };

  const handleFieldChange = (name: FieldName) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setFields((p) => ({ ...p, [name]: value }));
    if (touched[name]) {
      setFieldErrors((p) => ({ ...p, [name]: getFieldError(name, value) }));
    }
  };

  // Image Upload Handlers
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverImageError(null);

    if (file.size > 3 * 1024 * 1024) {
      setCoverImageError('Image is too large. Maximum size is 3MB.');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width < 800 || img.height < 600) {
        setCoverImageError(`Image is too small (${img.width}x${img.height}px). Minimum required is 800x600px.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setCoverImageError('Invalid image file.');
    };

    img.src = objectUrl;
  };

  // Submit & Wizard steps progress logic
  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};
    let stepFields: string[] = [];

    if (role === 'VENDOR' && s === 1) {
      stepFields = ['displayName', 'email', 'password'];
      if (flat && (!agreedTerms || !agreedPrivacy)) {
        setError('Please agree to the Terms & Conditions and Privacy Policy to proceed.');
        return false;
      }
    } else if (role === 'VENDOR' && s === 2) {
      stepFields = ['businessName', 'category', 'phoneNumber', 'stateName', 'cityName', 'description'];
      if (fields.bankAccountLast4) stepFields.push('bankAccountLast4');
    } else if (role === 'BUYER') {
      stepFields = ['displayName', 'email', 'password'];
    }

    stepFields.forEach((f) => {
      const err = getFieldError(f, getFieldValue(f));
      if (err) newErrors[f] = err;
    });

    setFieldErrors((prev) => ({ ...prev, ...newErrors }));
    setTouched((prev) => {
      const t = { ...prev };
      stepFields.forEach((f) => { t[f] = true; });
      return t;
    });
    return Object.keys(newErrors).length === 0;
  };

  const buildVendorPayload = () => ({
    email: fields.email.trim(),
    displayName: fields.displayName.trim(),
    password: fields.password,
    role: 'VENDOR' as const,
    businessName: fields.businessName.trim(),
    instagramHandle: fields.instagramHandle.trim() || undefined,
    phoneNumber: fields.phoneNumber.trim() || undefined,
    bankAccountLast4: fields.bankAccountLast4.trim() || undefined,
    state: fields.stateName,
    city: fields.cityName.trim(),
    category: fields.category,
    description: fields.description.trim(),
    whatsappUrl: fields.whatsappUrl.trim() || undefined,
    tiktokUrl: fields.tiktokUrl.trim() || undefined,
    coverImage: coverImage || undefined,
  });

  const submitRegistration = async () => {
    if (captchaRequired && !turnstileToken) {
      setError('Please complete the captcha before creating your account.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'VENDOR') {
        await registerVendor(buildVendorPayload());
      } else {
        await register({
          email: fields.email.trim(),
          displayName: fields.displayName.trim(),
          password: fields.password,
          role: 'BUYER',
          turnstileToken: turnstileToken || undefined,
        });
      }
      setSuccess(true);
    } catch (err) {
      // Turnstile tokens are single-use — reset so the user can retry cleanly.
      if (captchaRequired) {
        setTurnstileToken('');
        turnstileRef.current?.reset();
      }
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (role === 'VENDOR') {
      if (!validateStep(1)) {
        setActiveFormStep(1);
        return;
      }
      if (!validateStep(2)) {
        setActiveFormStep(2);
        return;
      }
      if (coverImageError) {
        setError('Please resolve all image dimension errors before submitting.');
        return;
      }
    } else {
      if (!validateStep(1)) return;
    }

    await submitRegistration();
  };

  if (success) {
    return <SuccessScreen flat={flat} role={role} email={fields.email} />;
  }

  const formApi: WizardFormApi = {
    fields,
    touched,
    fieldErrors,
    handleFieldChange,
    handleBlur,
    labelStyle,
    inputGroupStyle,
    errorStyle,
  };

  if (role === 'VENDOR' && flat) {
    const validateStep3 = (): boolean => {
      setError(null);
      if (coverImageError) {
        setError('Please resolve all image dimension errors before continuing.');
        return false;
      }
      return true;
    };

    const handleSaveStep = (stepIndex: number) => {
      setError(null);
      let isValid = false;
      if (stepIndex === 1) {
        isValid = validateStep(1);
      } else if (stepIndex === 2) {
        isValid = validateStep(2);
      } else if (stepIndex === 3) {
        isValid = true;
      }

      if (isValid) {
        if (!completedSteps.includes(stepIndex)) {
          setCompletedSteps((prev) => [...prev, stepIndex]);
        }
        setActiveFormStep(null);
      }
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Auto-save the current step if it hasn't been saved yet
      if (activeFormStep !== null && !completedSteps.includes(activeFormStep)) {
        if (activeFormStep === 1 && !validateStep(1)) return;
        if (activeFormStep === 2 && !validateStep(2)) return;
        if (activeFormStep === 3 && !validateStep3()) return;
        setCompletedSteps((prev) => [...prev, activeFormStep]);
      }

      // Validate each step in order, returning the user to the first failing one
      if (!validateStep(1)) {
        setError('Please complete Step 1: Account credentials.');
        setActiveFormStep(1);
        return;
      }
      if (!validateStep(2)) {
        setError('Please complete Step 2: Business details.');
        setActiveFormStep(2);
        return;
      }
      if (!validateStep3()) {
        setActiveFormStep(3);
        return;
      }
      if (!consentChecked) {
        setError('Please confirm your consent to display your business information publicly.');
        setActiveFormStep(3);
        return;
      }
      if (!completedSteps.includes(2) && activeFormStep !== 2) {
        setError('Please complete Step 2: Business details.');
        setActiveFormStep(2);
        return;
      }
      if (!completedSteps.includes(3) && activeFormStep !== 3) {
        setError('Please complete Step 3: Storefront branding.');
        setActiveFormStep(3);
        return;
      }

      await submitRegistration();
    };

    // Active step editor view
    if (activeFormStep !== null) {
      const header = STEP_HEADERS[activeFormStep];

      return (
        <div
          className={formStyles.slideInView}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'transparent',
            padding: 0,
          }}
        >
          <div className={formStyles.flatFormInner} style={{ margin: '0 auto' }}>

            {/* Back to tasks link */}
            <button
              type="button"
              className={formStyles.backToDashboard}
              onClick={() => {
                setError(null);
                setActiveFormStep(null);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to onboarding tasks
            </button>

            {/* Header for active step */}
            {header && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%', textAlign: 'left', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.375rem', fontWeight: 500, color: 'var(--color-text-main-900)', margin: 0 }}>
                  {header.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-sub-500)', margin: 0, lineHeight: '1.5' }}>
                  {header.subtitle}
                </p>
              </div>
            )}

            <ErrorMessage message={error} />

            {/* Step Fields */}
            <div style={{ marginBottom: '1.75rem' }}>
              {activeFormStep === 1 && (
                <StepAccountFields
                  form={formApi}
                  agreedTerms={agreedTerms}
                  agreedPrivacy={agreedPrivacy}
                  onAgreedTermsChange={(checked) => {
                    setAgreedTerms(checked);
                    if (checked && agreedPrivacy) setError(null);
                  }}
                  onAgreedPrivacyChange={(checked) => {
                    setAgreedPrivacy(checked);
                    if (checked && agreedTerms) setError(null);
                  }}
                />
              )}

              {activeFormStep === 2 && <StepBusinessFields form={formApi} />}

              {activeFormStep === 3 && (
                <StepBrandingFields
                  form={formApi}
                  coverImage={coverImage}
                  coverImageError={coverImageError}
                  onCoverChange={handleCoverChange}
                  consentChecked={consentChecked}
                  onConsentChange={setConsentChecked}
                  getInitials={getInitials}
                />
              )}
            </div>

            {/* Bottom Actions for Step Form */}
            {activeFormStep === 3 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                  <button
                    type="button"
                    className={formStyles.backBtn}
                    onClick={() => {
                      setError(null);
                      setActiveFormStep(null);
                    }}
                    style={{ flex: 1, gap: '0.375rem' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back
                  </button>

                  <button
                    type="button"
                    className={formStyles.primaryBtn}
                    disabled={!consentChecked || loading}
                    onClick={handleFinalSubmit}
                    style={{
                      flex: 2,
                      gap: '0.375rem',
                      background: consentChecked ? 'var(--color-primary-primary-base)' : 'var(--color-text-disabled-300)',
                      cursor: consentChecked ? 'pointer' : 'not-allowed',
                      opacity: consentChecked ? 1 : 0.6,
                    }}
                  >
                    {loading ? 'Processing...' : 'Create my profile'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  className={formStyles.skipLink}
                  onClick={() => handleSaveStep(3)}
                >
                  Skip for now — I'll add this later
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <button
                  type="button"
                  className={formStyles.backBtn}
                  onClick={() => {
                    setError(null);
                    setActiveFormStep(null);
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={formStyles.primaryBtn}
                  onClick={() => handleSaveStep(activeFormStep)}
                  style={{ flex: 2 }}
                >
                  Save & Continue
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <TaskDashboard
        error={error}
        loading={loading}
        completedSteps={completedSteps}
        onOpenStep={setActiveFormStep}
        onSubmit={handleFinalSubmit}
      />
    );
  }

  // Simple form: buyer registration (card or flat) and non-flat vendor fallback
  return (
    <form
      className={flat ? undefined : styles.form}
      onSubmit={handleSubmit}
      noValidate
      style={flatOnly<React.CSSProperties>({
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      })}
    >
      {flat && <style dangerouslySetInnerHTML={{ __html: SIMPLE_FLAT_CSS }} />}

      {/* Heading Text - aligned closely to resolve subtitle separation */}
      <div
        className={flat ? undefined : styles.headerGroup}
        style={flatOnly<React.CSSProperties>({
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          width: '100%',
          textAlign: 'left',
          marginBottom: '1.5rem',
        })}
      >
        <h2
          className={flat ? undefined : styles.title}
          style={flatOnly<React.CSSProperties>({
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--color-text-main-900)',
            margin: 0,
            letterSpacing: '-0.02em',
          })}
        >
          {role === 'VENDOR' ? 'Create your vendor account' : 'Become a Verified Shopper'}
        </h2>
        <p
          className={flat ? undefined : styles.subtitle}
          style={flatOnly<React.CSSProperties>({
            fontSize: '0.875rem',
            color: 'var(--color-text-sub-500)',
            margin: 0,
            lineHeight: '1.5',
          })}
        >
          {role === 'VENDOR'
            ? 'Set up your free vendor profile in 3 steps. Your profile goes live immediately after registration.'
            : 'Verify merchants & write reviews'}
        </p>
      </div>

      <ErrorMessage message={error} />

      {/* STEP 1 FIELDS (Buyer or Fallback Vendor) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {([
          { name: 'displayName' as const, label: 'Full Name / Public Nickname', type: 'text', placeholder: 'Write your full name', autoComplete: 'name' },
          { name: 'email' as const, label: 'Email Address', type: 'email', placeholder: 'e.g. name@example.com', autoComplete: 'email' },
          { name: 'password' as const, label: 'Password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
        ]).map(({ name, label, type, placeholder, autoComplete }) => {
          const isPassword = name === 'password';
          return (
            <div key={name} className={flat ? undefined : styles.group} style={flat ? inputGroupStyle : undefined}>
              <label className={flat ? undefined : styles.label} style={flat ? labelStyle : undefined} htmlFor={name}>
                {label}
              </label>
              <input
                id={name}
                className={flat ? 'flat-input-field' : undefined}
                type={type}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={fields[name]}
                onChange={handleFieldChange(name)}
                onFocus={isPassword ? () => setPasswordFocused(true) : undefined}
                onBlur={isPassword ? () => { setPasswordFocused(false); handleBlur(name)(); } : handleBlur(name)}
                style={
                  touched[name] && fieldErrors[name]
                    ? { borderColor: flat ? 'var(--color-state-error) !important' : 'var(--color-state-error)' }
                    : undefined
                }
              />
              {touched[name] && fieldErrors[name] && !(isPassword && passwordFocused) && (
                <span style={flat ? errorStyle : { color: 'var(--color-state-error)', fontSize: '0.75rem', display: 'block' }}>
                  {fieldErrors[name]}
                </span>
              )}
              {isPassword && (
                <PasswordRequirements password={fields.password} visible={passwordFocused} />
              )}
            </div>
          );
        })}
      </div>

      {captchaRequired && (
        <Turnstile
          ref={turnstileRef}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken('')}
        />
      )}

      <Button
        type="submit"
        disabled={loading}
        fullWidth={true}
      >
        {loading ? 'Processing...' : 'Register'}
      </Button>

      <p
        className={flat ? undefined : styles.bottomText}
        style={flatOnly<React.CSSProperties>({ color: '#a3c2be', marginTop: '1rem' })}
      >
        Already have an account?{' '}
        <Link
          to={role === 'VENDOR' ? ROUTES.LOGIN_VENDOR : ROUTES.LOGIN_BUYER}
          style={flatOnly<React.CSSProperties>({ color: '#4CD195', fontWeight: '500' })}
        >
          Log In
        </Link>
      </p>

      {flat && (
        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-sub-500)', marginTop: '1rem' }}>
          Are you a shopper looking to review merchants?{' '}
          <Link to="/register/buyer" className="flat-link">
            Register here
          </Link>
        </p>
      )}
    </form>
  );
};

export default RegisterForm;
