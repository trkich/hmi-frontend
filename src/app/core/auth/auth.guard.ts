import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectIsAuthenticated } from './+state/auth.selectors';
import { map, take, tap } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  // Also check localStorage to cover initial app load before NgRx state is restored
  const hasToken = !!localStorage.getItem('tke_jwt');

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    tap((isAuth) => {
      if (!(isAuth || hasToken)) {
        router.navigate(['/login']);
      }
    }),
    map((isAuth) => isAuth || hasToken)
  );
};


