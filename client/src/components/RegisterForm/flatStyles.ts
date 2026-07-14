/**
 * CSS injected by the flat (landing-page) variants of the registration form.
 * Kept verbatim from the original inline <style> blocks — these target global
 * class names (flat-*, checkbox-*, reloy-*) rather than CSS modules because
 * the flat variant renders inside the marketing layout, outside AuthCard.
 */

/** Styles for the vendor onboarding task dashboard (wizard mode). */
export const WIZARD_CSS = `
  .slide-in-view {
    animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    width: 100% !important;
  }
  @keyframes slideIn {
    0% { opacity: 0; transform: translateX(0.75rem); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .flat-input-field {
    width: 100% !important;
    height: 2.625rem !important;
    padding: 0.625rem 0.875rem !important;
    border-radius: 0.5rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    font-size: 0.875rem !important;
    color: var(--color-text-main-900) !important;
    background: var(--color-bg-white-0) !important;
    outline: none !important;
    box-sizing: border-box !important;
    transition: all 0.2s ease !important;
    font-family: inherit !important;
  }
  .flat-input-field::placeholder {
    color: var(--color-text-soft-400) !important;
  }
  .flat-input-field:focus {
    border-color: var(--color-primary-primary-base) !important;
    box-shadow: 0 0 0 0.125rem color-mix(in srgb, var(--color-primary-primary-base) 15%, transparent) !important;
  }
  .flat-select-field {
    width: 100% !important;
    height: 2.625rem !important;
    padding: 0.625rem 2rem 0.625rem 0.875rem !important;
    border-radius: 0.5rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    font-size: 0.875rem !important;
    color: var(--color-text-main-900) !important;
    background: var(--color-bg-white-0) !important;
    outline: none !important;
    box-sizing: border-box !important;
    appearance: none !important;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23868c98' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 0.875rem center !important;
    background-size: 1rem !important;
    transition: all 0.2s ease !important;
    font-family: inherit !important;
  }
  .flat-select-field:focus {
    border-color: var(--color-primary-primary-base) !important;
    box-shadow: 0 0 0 0.125rem color-mix(in srgb, var(--color-primary-primary-base) 15%, transparent) !important;
  }
  .flat-textarea-field {
    width: 100% !important;
    padding: 0.75rem 0.875rem !important;
    border-radius: 0.5rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    font-size: 0.875rem !important;
    color: var(--color-text-main-900) !important;
    background: var(--color-bg-white-0) !important;
    outline: none !important;
    box-sizing: border-box !important;
    resize: vertical !important;
    font-family: inherit !important;
    transition: all 0.2s ease !important;
    min-height: 5.625rem !important;
  }
  .flat-textarea-field::placeholder {
    color: var(--color-text-soft-400) !important;
  }
  .flat-textarea-field:focus {
    border-color: var(--color-primary-primary-base) !important;
    box-shadow: 0 0 0 0.125rem color-mix(in srgb, var(--color-primary-primary-base) 15%, transparent) !important;
  }
  .flat-form-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 1rem !important;
  }
  @media (max-width: 48rem) {
    .flat-form-grid {
      grid-template-columns: 1fr !important;
      gap: 1rem !important;
    }
  }
  .checkbox-row {
    display: flex !important;
    align-items: flex-start !important;
    gap: 0.75rem !important;
    cursor: pointer !important;
    user-select: none !important;
    width: 100% !important;
  }
  .checkbox-input-hidden {
    position: absolute !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    pointer-events: none !important;
  }
  .custom-checkbox-box {
    width: 1.125rem !important;
    height: 1.125rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    border-radius: 0.25rem !important;
    background: var(--color-bg-white-0) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
    margin-top: 0.125rem !important;
    transition: all 0.2s ease !important;
    box-sizing: border-box !important;
  }
  .checkbox-row:hover .custom-checkbox-box {
    border-color: var(--color-primary-primary-base) !important;
  }
  .checkbox-input-hidden:checked + .custom-checkbox-box {
    background: var(--color-primary-primary-base) !important;
    border-color: var(--color-primary-primary-base) !important;
  }
  .custom-checkbox-check {
    display: none !important;
    stroke: var(--color-bg-white-0) !important;
    stroke-width: 3.5 !important;
  }
  .checkbox-input-hidden:checked + .custom-checkbox-box .custom-checkbox-check {
    display: block !important;
  }
  .checkbox-label {
    font-size: 0.8125rem !important;
    color: var(--color-text-sub-500) !important;
    line-height: 1.5 !important;
    cursor: pointer !important;
    text-align: left !important;
  }
  .checkbox-label a {
    color: var(--color-primary-primary-base) !important;
    font-weight: 500 !important;
    text-decoration: none !important;
  }
  .checkbox-label a:hover {
    text-decoration: underline !important;
  }
  .flat-primary-button {
    width: 100% !important;
    height: 2.75rem !important;
    background: var(--color-primary-primary-base) !important;
    border: 0.0625rem solid rgba(0, 0, 0, 0.1) !important;
    border-radius: 0.5rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    color: var(--color-bg-white-0) !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 0.0625rem 0.125rem 0 rgba(0, 0, 0, 0.05) !important;
  }
  .flat-primary-button:hover:not(:disabled) {
    background: var(--color-primary-primary-dark) !important;
  }
  .flat-primary-button:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
  }
  .flat-back-button {
    background: var(--color-bg-white-0) !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    border-radius: 0.5rem !important;
    color: var(--color-text-sub-500) !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    height: 2.75rem !important;
    padding: 0 1.25rem !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .flat-back-button:hover:not(:disabled) {
    border-color: var(--color-text-soft-400) !important;
    color: var(--color-text-main-900) !important;
  }
  .flat-link {
    color: var(--color-primary-primary-base) !important;
    font-weight: 500 !important;
    text-decoration: none !important;
  }
  .flat-link:hover {
    text-decoration: underline !important;
  }

  /* Reloy task row styles */
  .reloy-task-row {
    display: flex !important;
    align-items: center !important;
    gap: 1.125rem !important;
    padding: 1.125rem 1.5rem !important;
    border: 0.0625rem solid var(--color-stroke-soft-200) !important;
    border-radius: 0.875rem !important;
    background: var(--color-bg-white-0) !important;
    cursor: pointer !important;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    text-align: left !important;
    margin-bottom: 0.875rem !important;
    box-shadow: 0 0.125rem 0.5rem -0.125rem rgba(10, 13, 20, 0.04) !important;
  }
  .reloy-task-row:hover {
    border-color: var(--color-primary-primary-base) !important;
    transform: translateY(-0.1875rem) !important;
    box-shadow: 0 0.75rem 1.5rem -0.625rem rgba(22, 166, 98, 0.18) !important;
  }
  .reloy-task-row:active {
    transform: translateY(-0.0625rem) !important;
  }
  .reloy-task-completed {
    background: var(--color-neutral-100) !important;
    border-color: var(--color-stroke-soft-200) !important;
    box-shadow: none !important;
    opacity: 0.8 !important;
  }
  .reloy-task-completed:hover {
    background: var(--color-bg-white-0) !important;
    border-color: var(--color-primary-primary-base) !important;
    opacity: 1 !important;
  }
  .reloy-task-row:hover .reloy-chevron {
    transform: translateX(0.25rem) !important;
    color: var(--color-primary-primary-base) !important;
  }
  .reloy-chevron {
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease !important;
    flex-shrink: 0 !important;
    display: flex !important;
    align-items: center;
    color: var(--color-text-soft-400) !important;
  }
  .reloy-icon-container {
    width: 2.75rem !important;
    height: 2.75rem !important;
    border-radius: 0.625rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
    box-sizing: border-box !important;
    transition: all 0.25s ease !important;
  }
  .reloy-task-row:hover .reloy-icon-container {
    transform: scale(1.05) !important;
  }
  .reloy-task-title {
    font-size: 0.9375rem !important;
    font-weight: 500 !important;
    color: var(--color-text-main-900) !important;
    margin: 0 !important;
  }
  .reloy-task-desc {
    font-size: 0.8125rem !important;
    color: var(--color-text-sub-500) !important;
    margin: 0.1875rem 0 0 0 !important;
    line-height: 1.4 !important;
  }
  .reloy-completed-badge {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 1.375rem !important;
    height: 1.375rem !important;
    border-radius: 50% !important;
    background: rgba(56, 199, 147, 0.1) !important;
    color: var(--color-state-success) !important;
    flex-shrink: 0 !important;
    box-shadow: 0 0 0.5rem rgba(56, 199, 147, 0.2) !important;
  }
`;

/** Styles for the simple flat form (buyer registration on the landing layout). */
export const SIMPLE_FLAT_CSS = `
  .flat-input-field {
    width: 100% !important;
    padding: 0.75rem 0.875rem !important;
    border-radius: 0.5rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    font-size: 0.875rem !important;
    color: var(--color-text-main-900) !important;
    background: var(--color-bg-white-0) !important;
    outline: none !important;
    box-sizing: border-box !important;
    transition: all 0.2s ease !important;
    font-family: inherit !important;
  }
  .flat-input-field::placeholder {
    color: var(--color-text-soft-400) !important;
  }
  .flat-input-field:focus {
    border-color: var(--color-primary-primary-base) !important;
    box-shadow: 0 0 0 0.1875rem color-mix(in srgb, var(--color-primary-primary-base) 10%, transparent) !important;
  }
  .flat-select-field {
    width: 100% !important;
    padding: 0.75rem 2rem 0.75rem 0.875rem !important;
    border-radius: 0.5rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    font-size: 0.875rem !important;
    color: var(--color-text-main-900) !important;
    background: var(--color-bg-white-0) !important;
    outline: none !important;
    box-sizing: border-box !important;
    appearance: none !important;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23868c98' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 0.75rem center !important;
    background-size: 1rem !important;
    transition: all 0.2s ease !important;
    font-family: inherit !important;
  }
  .flat-select-field:focus {
    border-color: var(--color-primary-primary-base) !important;
    box-shadow: 0 0 0 0.1875rem color-mix(in srgb, var(--color-primary-primary-base) 10%, transparent) !important;
  }
  .flat-textarea-field {
    width: 100% !important;
    padding: 0.75rem 0.875rem !important;
    border-radius: 0.5rem !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    font-size: 0.875rem !important;
    color: var(--color-text-main-900) !important;
    background: var(--color-bg-white-0) !important;
    outline: none !important;
    box-sizing: border-box !important;
    resize: vertical !important;
    font-family: inherit !important;
    transition: all 0.2s ease !important;
  }
  .flat-textarea-field::placeholder {
    color: var(--color-text-soft-400) !important;
  }
  .flat-textarea-field:focus {
    border-color: var(--color-primary-primary-base) !important;
    box-shadow: 0 0 0 0.1875rem color-mix(in srgb, var(--color-primary-primary-base) 10%, transparent) !important;
  }
  .flat-form-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 1rem !important;
  }
  @media (max-width: 48rem) {
    .flat-form-grid {
      grid-template-columns: 1fr !important;
      gap: 1.25rem !important;
    }
  }
  .checkbox-row {
    display: flex !important;
    align-items: flex-start !important;
    gap: 0.625rem !important;
  }
  .checkbox-input {
    width: 1rem !important;
    height: 1rem !important;
    flex-shrink: 0 !important;
    margin-top: 0.1875rem !important;
    accent-color: var(--color-primary-primary-base) !important;
    cursor: pointer !important;
  }
  .checkbox-label {
    font-size: 0.8125rem !important;
    color: var(--color-text-sub-500) !important;
    line-height: 1.5 !important;
    cursor: pointer !important;
    user-select: none !important;
    text-align: left !important;
  }
  .checkbox-label a {
    color: var(--color-primary-primary-base) !important;
    font-weight: 500 !important;
    text-decoration: none !important;
  }
  .checkbox-label a:hover {
    text-decoration: underline !important;
  }
  .flat-primary-button {
    width: 100% !important;
    height: 3.25rem !important;
    background: var(--color-primary-primary-base) !important;
    border: none !important;
    border-radius: 0.5rem !important;
    font-size: 0.9375rem !important;
    font-weight: 500 !important;
    color: var(--color-bg-white-0) !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .flat-primary-button:hover:not(:disabled) {
    background: var(--color-primary-primary-dark) !important;
    transform: translateY(-0.0625rem) !important;
  }
  .flat-primary-button:disabled {
    opacity: 0.7 !important;
    cursor: not-allowed !important;
  }
  .flat-back-button {
    background: var(--color-bg-white-0) !important;
    border: 0.0625rem solid var(--color-stroke-sub-300) !important;
    border-radius: 0.5rem !important;
    color: var(--color-text-sub-500) !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    padding: 0.8125rem 1.375rem !important;
    height: 3.25rem !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .flat-back-button:hover:not(:disabled) {
    border-color: var(--color-text-soft-400) !important;
    color: var(--color-text-main-900) !important;
  }
  .flat-back-button:disabled {
    opacity: 0.7 !important;
    cursor: not-allowed !important;
  }
  .flat-link {
    color: var(--color-primary-primary-base) !important;
    font-weight: 500 !important;
    text-decoration: none !important;
  }
  .flat-link:hover {
    text-decoration: underline !important;
  }
`;
