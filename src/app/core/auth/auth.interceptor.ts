import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAuthToken } from './+state/auth.selectors';
import { switchMap, take, catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);

  return store.select(selectAuthToken).pipe(
    take(1),
    switchMap((token) => {
      if (!token) {
        console.warn('⚠️ No auth token found, sending request without Authorization header');
        return next(req);
      }

      // Decode token to check expiration and audience (without verification)
      let tokenInfo: any = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        tokenInfo = {
          exp: payload.exp,
          aud: payload.aud,
          iss: payload.iss,
          isExpired: payload.exp ? Date.now() >= payload.exp * 1000 : false,
        };
        
        console.log('🔐 Token info:', {
          url: req.url,
          audience: tokenInfo.aud,
          issuer: tokenInfo.iss,
          isExpired: tokenInfo.isExpired,
          expiresAt: tokenInfo.exp ? new Date(tokenInfo.exp * 1000).toISOString() : 'unknown',
        });
      } catch (e) {
        console.warn('⚠️ Could not decode token:', e);
      }

      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // Log JWT-specific errors
          if (error.status === 401 || error.status === 403) {
            console.error('🔐 Authentication error:', {
              status: error.status,
              url: req.url,
              error: error.error,
              tokenInfo: tokenInfo,
            });

            // If it's a JWT signature error, log helpful info
            if (error.error?.name === 'JsonWebTokenError' || error.error?.message?.includes('signature')) {
              console.error('❌ JWT Signature Error Details:');
              console.error('   Token audience:', tokenInfo?.aud);
              console.error('   Expected audience: api://<ENTRA_CLIENT_ID>');
              console.error('   Token issuer:', tokenInfo?.iss);
              console.error('   Check: ENV.ENTRA_CLIENT_ID in Azure backend matches frontend clientId');
              console.error('   Frontend clientId: fcc16c18-a4ec-47ac-8fe0-7744c442e2f7');
            }
          }
          return throwError(() => error);
        })
      );
    })
  );
};


