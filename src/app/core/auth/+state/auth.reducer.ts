import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { initialAuthState } from './auth.models';

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.loginSuccess, (state, { response }) => ({
    ...state,
    loading: false,
    token: response.token,
    user: response.user,
    error: null,
  })),

  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(AuthActions.logout, () => ({
    ...initialAuthState,
  }))
);


