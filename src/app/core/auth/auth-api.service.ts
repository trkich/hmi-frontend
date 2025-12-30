import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser } from './auth.models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface EntraDeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  message: string;
  expiresIn: number;
  interval: number;
}

export interface EntraTokenResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  /**
   * Initiate Entra ID device code flow
   * Backend should return device code and user code
   */
  initiateEntraLogin(): Observable<EntraDeviceCodeResponse> {
    const url = `${this.baseUrl}/auth/entra/device-code`;
    console.log('🔐 Initiating Entra ID login:', { url, baseUrl: "http://localhost:3000/docs/oauth2-redirect.html" });
    return this.http.post<EntraDeviceCodeResponse>(url, {});
  }

  /**
   * Poll backend to check if user has authenticated via device code
   * Backend should poll Microsoft's token endpoint and return token when ready
   */
  pollEntraToken(deviceCode: string): Observable<EntraTokenResponse> {
    return this.http.post<EntraTokenResponse>(
      `${this.baseUrl}/auth/entra/token`,
      { deviceCode }
    );
  }
}


