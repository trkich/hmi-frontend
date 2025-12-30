import { Injectable } from '@angular/core';
import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
  PopupRequest,
  RedirectRequest,
} from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MsalService {
  private msalInstance: PublicClientApplication;
  private initPromise: Promise<void>;

  constructor() {
    const msalConfig = {
      auth: {
        clientId: environment.entraId.clientId,
        authority: `https://login.microsoftonline.com/${environment.entraId.tenantId}`,
        redirectUri: window.location.origin, // For redirect flow
      },
      cache: {
        cacheLocation: 'sessionStorage', // or 'localStorage'
        storeAuthStateInCookie: false,
      },
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
    // Store the initialization promise and await it in all public methods
    this.initPromise = this.msalInstance.initialize();
  }

  /**
   * Login using Popup (recommended for SPA)
   * Returns access token directly
   */
  async loginPopup(): Promise<AuthenticationResult> {
    await this.initPromise;

    const loginRequest: PopupRequest = {
      scopes: [environment.entraId.scope],
    };

    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      return response;
    } catch (error) {
      console.error('MSAL Popup login error:', error);
      throw error;
    }
  }

  /**
   * Login using Redirect (alternative to popup)
   */
  async loginRedirect(): Promise<void> {
    await this.initPromise;

    const loginRequest: RedirectRequest = {
      scopes: [environment.entraId.scope],
    };

    await this.msalInstance.loginRedirect(loginRequest);
  }

  /**
   * Handle redirect response (call this in app.component.ts ngOnInit)
   */
  async handleRedirectPromise(): Promise<AuthenticationResult | null> {
    await this.initPromise;
    return await this.msalInstance.handleRedirectPromise();
  }

  /**
   * Get current account
   */
  getAccount(): AccountInfo | null {
    // This is called only after initPromise has been awaited in public methods
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  /**
   * Get access token silently (if user is already logged in)
   */
  async acquireTokenSilent(): Promise<AuthenticationResult | null> {
    await this.initPromise;

    const account = this.getAccount();
    if (!account) {
      return null;
    }

    const request = {
      scopes: [environment.entraId.scope],
      account: account,
    };

    try {
      const response = await this.msalInstance.acquireTokenSilent(request);
      return response;
    } catch (error) {
      console.error('Silent token acquisition failed:', error);
      return null;
    }
  }

  /**
   * Get access token (tries silent first, then popup if needed)
   */
  async getAccessToken(): Promise<string | null> {
    // Try to get token silently first
    const silentResult = await this.acquireTokenSilent();
    if (silentResult?.accessToken) {
      return silentResult.accessToken;
    }

    // If silent fails, try popup
    try {
      const popupResult = await this.loginPopup();
      return popupResult?.accessToken || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.initPromise;

    const account = this.getAccount();
    if (account) {
      await this.msalInstance.logoutPopup({ account });
    }
  }
}

