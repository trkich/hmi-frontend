import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';

import { AuthActions } from './auth.actions';
import { AuthUser } from '../auth.models';

/**
 * AuthEffects - Handles NgRx side effects for authentication
 * Now only supports MSAL (Microsoft) authentication via direct MSAL service calls
 */
@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'tke_jwt';
  private readonly USER_KEY = 'tke_user';

  loginSuccessRedirect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap((action) => {
          // Save to localStorage when login succeeds
          localStorage.setItem(this.TOKEN_KEY, action.response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(action.response.user));
          
          // Only redirect to dashboard if user is on login page
          // Don't redirect if user is already on a protected route (e.g., after refresh)
          const currentUrl = this.router.url;
          if (currentUrl === '/login' || currentUrl.startsWith('/login')) {
            this.router.navigate(['/dashboard']);
          }
        })
      ),
    { dispatch: false }
  );

  restoreFromStorage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restoreFromStorage),
      map(() => {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const rawUser = localStorage.getItem(this.USER_KEY);

        if (!token || !rawUser) {
          return AuthActions.loginFailure({ error: '' });
        }

        let user: AuthUser;
        try {
          user = JSON.parse(rawUser) as AuthUser;
        } catch {
          return AuthActions.loginFailure({ error: '' });
        }

        const response = { token, user };
        return AuthActions.loginSuccess({ response });
      })
    )
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.USER_KEY);
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

}


