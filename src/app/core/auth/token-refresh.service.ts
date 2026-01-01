import { Injectable, inject } from '@angular/core';
import { MsalService } from './msal.service';
import { Store } from '@ngrx/store';
import { AuthActions } from './+state/auth.actions';


@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private msalService = inject(MsalService);
  private store = inject(Store);
  private refreshPromise: Promise<string | null> | null = null;


  async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string | null> {
    try {
      const result = await this.msalService.acquireTokenSilent();
      
      if (!result?.accessToken) {
        return null;
      }

      const account = this.msalService.getAccount();
      if (account) {
        this.store.dispatch(
          AuthActions.loginSuccess({
            response: {
              token: result.accessToken,
              user: {
                id: account.homeAccountId,
                email: account.username || '',
                name: account.name || '',
              },
            },
          })
        );
      }

      return result.accessToken;
    } catch (error: any) {
      if (error?.errorCode === 'interaction_required' || error?.errorCode === 'consent_required') {
        this.store.dispatch(AuthActions.logout());
      }

      return null;
    }
  }

  /**
   * Checks if token is expired or will expire soon (within 5 minutes)
   */
  isTokenExpiredOrExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return true;

      const expirationTime = exp * 1000;
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      
      return expirationTime <= fiveMinutesFromNow;
    } catch (e) {
      return true;
    }
  }
}

