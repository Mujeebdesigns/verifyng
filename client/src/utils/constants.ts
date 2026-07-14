export const ROUTES = {
  HOME: '/',
  DIRECTORY: '/directory',
  SUPPORT: '/support',
  VENDOR_PROFILE: '/vendors/:id',
  LOGIN: '/login',
  LOGIN_BUYER: '/login/buyer',
  LOGIN_VENDOR: '/login/vendor',
  LOGIN_ADMIN: '/admin/login',
  REGISTER: '/register',
  REGISTER_BUYER: '/register/buyer',
  REGISTER_VENDOR: '/register/vendor',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  VENDOR_DASHBOARD: '/vendor-dashboard',
  ADMIN_DASHBOARD: '/admin-dashboard',
  SUBMIT_REVIEW: '/submit-review',
} as const;

/**
 * Maps a role to its dedicated login page. Used by the forgot/reset password
 * flow so "back to login" always returns the user to the login page they
 * actually started from — never a hardcoded default.
 */
export function loginRouteForRole(role: string | null | undefined): string {
  switch (role) {
    case 'VENDOR':
      return ROUTES.LOGIN_VENDOR;
    case 'ADMIN':
      return ROUTES.LOGIN_ADMIN;
    case 'BUYER':
    default:
      return ROUTES.LOGIN_BUYER;
  }
}

export const MIN_QUERY_LENGTH = 2 as const;

export const DEBOUNCE_MS = 300 as const;

export const DEFAULT_PAGE_LIMIT = 10 as const;

export const REVIEW_EDIT_WINDOW_HOURS = 48 as const;
export const REVIEW_UNDER_REVIEW_HOURS = 2 as const;

export const CATEGORIES = [
  'Fashion & Accessories',
  'Phones & Tablets',
  'Food & Groceries',
  'Beauty & Cosmetics',
  'Home & Kitchen',
  'Electronics',
  'Cars & Automobiles',
  'Services',
] as const;

export const STATES = [
  'Abia',
  'Abuja (FCT)',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;
