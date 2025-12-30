import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { MsalService } from '../../../core/auth/msal.service';
import { AuthActions } from '../../../core/auth/+state/auth.actions';
import { AccountInfo } from '@azure/msal-browser';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-entra-login',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './entra-login.component.html',
})
export class EntraLoginComponent implements OnInit {
  private msal = inject(MsalService);
  private store = inject(Store);
  private router = inject(Router);
  private translationService = inject(TranslationService);

  loading = signal(false);
  error = signal<string | null>(null);
  account = signal<AccountInfo | null>(null);

  async ngOnInit(): Promise<void> {
    // Check if user is already logged in
    console.log("Asdasa");
    const account = this.msal.getAccount();
    if (account) {
      this.account.set(account);
      // Try to get token silently
      await this.getTokenSilently();
    }
  }

  async loginWithPopup(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.msal.loginPopup();
      
      if (response?.accessToken && response?.account) {
        this.account.set(response.account);
        
        // Store token and user info in NgRx store
        // The loginSuccessRedirect$ effect will handle redirect if needed
        this.store.dispatch(
          AuthActions.loginSuccess({
            response: {
              token: response.accessToken,
              user: {
                id: response.account.homeAccountId,
                email: response.account.username || '',
                name: response.account.name || '',
              },
            },
          })
        );
      } else {
        throw new Error('No access token received');
      }
    } catch (error: any) {
      console.error('MSAL login error:', error);
      this.error.set(
        error?.message || this.translationService.translate('auth.failedToLogin')
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async getTokenSilently(): Promise<void> {
    try {
      const response = await this.msal.acquireTokenSilent();
      if (response?.accessToken) {
        const account = this.msal.getAccount();
        if (account) {
          this.store.dispatch(
            AuthActions.loginSuccess({
              response: {
                token: response.accessToken,
                user: {
                  id: account.homeAccountId,
                  email: account.username || '',
                  name: account.name || '',
                },
              },
            })
          );
        }
      }
    } catch (error) {
      console.log('Silent token acquisition failed, user needs to login');
    }
  }
}

