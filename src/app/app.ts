import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { MsalService } from './core/auth/msal.service';
import { AuthActions } from './core/auth/+state/auth.actions';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private msal = inject(MsalService);
  private store = inject(Store);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  async ngOnInit(): Promise<void> {
    // Ensure theme is applied on app load
    this.themeService.setTheme(this.themeService.currentTheme());

    // Handle MSAL redirect response (if using redirect flow)
    const response = await this.msal.handleRedirectPromise();
    
    if (response?.accessToken && response?.account) {
      // Store token and user info in NgRx store
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

      // Redirect to dashboard if not already there
      if (this.router.url === '/login') {
        this.router.navigate(['/dashboard']);
      }
    }
  }
}
