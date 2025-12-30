import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AUTH_FEATURE_KEY, AuthState } from './auth.models';

export const selectAuthState =
  createFeatureSelector<AuthState>(AUTH_FEATURE_KEY);

export const selectAuthToken = createSelector(
  selectAuthState,
  (state) => state.token
);

export const selectAuthUser = createSelector(
  selectAuthState,
  (state) => state.user
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.error
);

export const selectIsAuthenticated = createSelector(
  selectAuthToken,
  (token) => !!token
);


