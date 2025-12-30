import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from './+state/auth.selectors';
import { map, take, tap } from 'rxjs';

/**
 * Guard for routes that should be accessible only when user is NOT authenticated.
 * If user is already logged in, redirect to /dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  // Also check localStorage to cover initial app load before NgRx state is restored
  const hasToken = !!localStorage.getItem('tke_jwt');

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    tap((isAuth) => {
      if (isAuth || hasToken) {
        router.navigate(['/dashboard']);
      }
    }),
    map((isAuth) => !(isAuth || hasToken))
  );
};


