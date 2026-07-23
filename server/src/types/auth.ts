export type UserRole = 'BUYER' | 'VENDOR' | 'ADMIN';

/** JWT payload shape — only userId, displayName, role, and tokenVersion */
export interface JwtPayload {
  userId: string;
  displayName: string;
  role: UserRole;
  tokenVersion: number;
}

/** POST /api/auth/register request body */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role?: 'BUYER' | 'VENDOR';
  /** Cloudflare Turnstile token — verified at the controller, not persisted. */
  turnstileToken?: string;
}

/** POST /api/auth/register-vendor request body */
export interface RegisterVendorPayload extends RegisterPayload {
  businessName: string;
  instagramHandle?: string;
  phoneNumber?: string;
  state?: string;
  city?: string;
  category?: string;
  description?: string;
  whatsappUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  coverImage?: string;
  logoImage?: string;
}

/** POST /api/auth/login request body */
export interface LoginPayload {
  email: string;
  password: string;
  /** Cloudflare Turnstile token — required on admin login when configured. */
  turnstileToken?: string;
}

/** POST /api/auth/verify-email request body */
export interface VerifyEmailPayload {
  token: string;
}

/** POST /api/auth/forgot-password request body */
export interface ForgotPasswordPayload {
  email: string;
}

/** POST /api/auth/reset-password request body */
export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/** POST /api/auth/change-password request body */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Authenticated user profile returned by GET /api/auth/me */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  totpEnabled?: boolean;
}

/** Login/register success response */
export interface AuthResponse {
  token: string;
  user: UserProfile;
}
