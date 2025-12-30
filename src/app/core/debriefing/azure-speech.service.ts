import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<AzureSpeechTokenResponse>(`${this.baseUrl}/speech/azure/token`);
  }
}

