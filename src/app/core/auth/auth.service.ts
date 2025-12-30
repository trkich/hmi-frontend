import { Injectable, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';

import {
  selectAuthError,
  selectAuthLoading,
  selectAuthToken,
  selectAuthUser,
  selectIsAuthenticated,
} from './+state/auth.selectors';
import { AuthActions } from './+state/auth.actions';
import { AuthUser } from './auth.models';
import { MsalService } from './msal.service';

/**
 * AuthService - Facade for NgRx auth state
 * Now only supports MSAL (Microsoft) authentication
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private store = inject(Store);
  private msal = inject(MsalService);

  private isAuth$ = this.store.select(selectIsAuthenticated);
  private token$ = this.store.select(selectAuthToken);
  private user$ = this.store.select(selectAuthUser);
  private loading$ = this.store.select(selectAuthLoading);
  private error$ = this.store.select(selectAuthError);

  private isAuthenticatedSig = signal(false);
  private tokenSig = signal<string | null>(null);
  private userSig = signal<AuthUser | null>(null);
  private loadingSig = signal(false);
  private errorSig = signal<string | null>(null);

  constructor() {
    this.isAuth$.subscribe((v) => this.isAuthenticatedSig.set(v));
    this.token$.subscribe((v) => this.tokenSig.set(v));
    this.user$.subscribe((v) => this.userSig.set(v));
    this.loading$.subscribe((v) => this.loadingSig.set(v));
    this.error$.subscribe((v) => this.errorSig.set(v));

    this.store.dispatch(AuthActions.restoreFromStorage());
  }

  /**
   * Logout - clears both MSAL session and NgRx state
   */
  logout(): void {
    // Clear MSAL session (Microsoft account) as well
    void this.msal.logout();
    this.store.dispatch(AuthActions.logout());
  }

  // Read-only computed signals
  isAuthenticated = computed(() => this.isAuthenticatedSig());
  token = computed(() => this.tokenSig());
  user = computed(() => this.userSig());
  loading = computed(() => this.loadingSig());
  error = computed(() => this.errorSig());
}


