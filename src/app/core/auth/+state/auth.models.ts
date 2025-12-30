import { AuthUser } from '../auth.models';

/**
 * AuthState - NgRx state for authentication
 * Now only supports MSAL (Microsoft) authentication
 */
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const AUTH_FEATURE_KEY = 'auth';

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
};


