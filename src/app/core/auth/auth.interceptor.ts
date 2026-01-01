import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAuthToken } from './+state/auth.selectors';
import { TokenRefreshService } from './token-refresh.service';
import { switchMap, take, catchError, throwError, from, Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const tokenRefreshService = inject(TokenRefreshService);

  return store.select(selectAuthToken).pipe(
    take(1),
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      if (tokenRefreshService.isTokenExpiredOrExpiringSoon(token)) {
        return from(tokenRefreshService.refreshToken()).pipe(
          switchMap((newToken) => {
            const tokenToUse = newToken || token;
            return sendRequest(req, next, tokenToUse, tokenRefreshService);
          })
        );
      }

      return sendRequest(req, next, token, tokenRefreshService);
    })
  );
};

function sendRequest(
  req: HttpRequest<any>,
  next: (req: HttpRequest<any>) => Observable<HttpEvent<any>>,
  token: string,
  tokenRefreshService: TokenRefreshService
): Observable<HttpEvent<any>> {
  let tokenInfo: any = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    tokenInfo = {
      exp: payload.exp,
      aud: payload.aud,
      iss: payload.iss,
      isExpired: payload.exp ? Date.now() >= payload.exp * 1000 : false,
    };
  } catch (e) {
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {        
        return from(tokenRefreshService.refreshToken()).pipe(
          switchMap((newToken) => {
            if (!newToken) {
              return throwError(() => error);
            }

            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });

            return next(retryReq);
          }),
          catchError((refreshError) => {
            return throwError(() => error);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
}


