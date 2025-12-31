import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AzureSpeechTokenResponse {
  token: string;
  region: string;
}

@Injectable({ providedIn: 'root' })
export class AzureSpeechService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getToken(): Observable<AzureSpeechTokenResponse> {
    return this.http.get<AzureSpeechTokenResponse>(`${this.baseUrl}/speech/azure/token`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error getting Azure Speech token:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: `${this.baseUrl}/speech/azure/token`,
          message: error.message,
        });
        
        // Log JWT-related errors specifically
        if (error.error?.name === 'JsonWebTokenError' || error.error?.message?.includes('signature')) {
          console.error('🔐 JWT Signature Error - This usually means:');
          console.error('   1. JWT secret in Azure backend doesn\'t match the token signing secret');
          console.error('   2. Check Azure App Service → Configuration → Application settings');
          console.error('   3. Look for JWT_SECRET, JWT_KEY, or similar environment variables');
        }
        
        return throwError(() => error);
      })
    );
  }
}

