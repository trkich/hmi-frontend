import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

export interface EntraIDUser {
  id: string;
  name: string;
  email: string;
}

export interface ProfileResponse {
  entraID: EntraIDUser;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private translationService = inject(TranslationService);

  profile = signal<ProfileResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Fallback to auth service user if API fails
  fallbackUser = computed(() => {
    const user = this.auth.user();
    if (user) {
      return {
        entraID: {
          id: user.id,
          name: user.name || '',
          email: user.email,
        },
      };
    }
    return null;
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<ProfileResponse>(`${environment.apiBaseUrl}/user/profile`).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Profile API Error:', err);
        const errorMessage = this.translationService?.translate('profile.failedToLoad') || 'Failed to load profile';
        this.error.set(errorMessage);
        this.loading.set(false);
        // Use fallback user from auth service
        if (this.fallbackUser()) {
          this.profile.set(this.fallbackUser()!);
        }
      },
    });
  }
}

