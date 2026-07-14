/**
 * Single source of truth for password strength rules on the client.
 * Kept in exact sync with server/src/utils/validation.ts — the server is
 * the real authority, this just mirrors it so users see accurate live
 * feedback instead of a rejection after submit.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'number',
    label: 'One number',
    test: (p) => /\d/.test(p),
  },
  {
    id: 'special',
    label: 'One special character',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

/** Returns a validation error message, or '' if the password satisfies every rule. */
export function getPasswordPolicyError(password: string): string {
  if (!password) return 'Password is required';
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? 'Password does not meet the requirements below' : '';
}
