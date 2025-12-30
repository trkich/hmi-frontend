import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAuthToken } from './+state/auth.selectors';
import { switchMap, take } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);

  return store.select(selectAuthToken).pipe(
    take(1),
    switchMap((token) => {
      if (!token) {
        console.warn('⚠️ No auth token found, sending request without Authorization header');
        return next(req);
      }

      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('🔐 Sending request with token:', {
        url: req.url,
        hasToken: !!token,
        tokenPreview: token.substring(0, 20) + '...',
      });

      return next(authReq);
    })
  );
};


