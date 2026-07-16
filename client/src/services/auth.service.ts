import { api } from './api.js';
import type {
  RegisterPayload,
  RegisterVendorPayload,
  LoginPayload,
  AuthResponse,
  UserProfile,
  ResetPasswordPayload,
  ChangePasswordPayload,
} from '../types/auth.js';

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', payload);
  },

  async registerVendor(payload: RegisterVendorPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register-vendor', payload);
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', payload);
  },

  async loginAdmin(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/admin/login', payload);
  },

  async logout(): Promise<void> {
    await api.post<void>('/auth/logout');
  },

  async getMe(): Promise<UserProfile> {
    return api.get<UserProfile>('/auth/me');
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/verify-email', { token });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/forgot-password', { email });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/reset-password', payload);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/change-password', payload);
  },

  async logoutOtherSessions(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/logout-other-sessions');
  },
};
