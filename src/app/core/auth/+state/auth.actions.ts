import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { LoginResponse } from '../auth-api.service';

/**
 * AuthActions - NgRx actions for authentication
 * Now only supports MSAL (Microsoft) authentication
 */
export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    // Login success/failure (used for MSAL login)
    LoginSuccess: props<{ response: LoginResponse }>(),
    LoginFailure: props<{ error: string }>(),

    // Restore auth state from localStorage on app init
    RestoreFromStorage: emptyProps(),
    
    // Logout
    Logout: emptyProps(),
  },
});


