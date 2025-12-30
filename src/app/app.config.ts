import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { authReducer } from './core/auth/+state/auth.reducer';
import { AUTH_FEATURE_KEY } from './core/auth/+state/auth.models';
import { AuthEffects } from './core/auth/+state/auth.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideStore({
      [AUTH_FEATURE_KEY]: authReducer,
    }),
    provideEffects([AuthEffects]),
    importProvidersFrom(StoreDevtoolsModule.instrument({ maxAge: 25 })),
  ],
};


