import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { Unit } from './unit.model';

interface UnitJourneyInstance {
  instanceId: string;
  name?: string;
  runtimeStatus: string;
  customStatus?: any;
  createdTime: string;
  lastUpdatedTime: string;
  input?: any;
  output?: any;
}

interface StatusByUnitResponse {
  unitId: string;
  count: number;
  instances: UnitJourneyInstance[];
}

@Component({
  selector: 'app-unit-view',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './unit-view.component.html',
})
export class UnitViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);

  unit = signal<Unit | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // AI communication history (status/by-unit)
  aiStatusLoading = signal(false);
  aiStatusError = signal<string | null>(null);
  aiStatus = signal<StatusByUnitResponse | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUnit(Number(id));
      this.loadUnitAiStatus(id);
    }
  }

  loadUnit(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<Unit>(`${environment.apiBaseUrl}/unit/${id}`).subscribe({
      next: (data) => {
        this.unit.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Unit API Error:', err);
        let errorKey = 'unit.failedToLoad';
        
        if (err.status === 404) {
          errorKey = 'unit.notFound';
        } else if (err.status === 401) {
          errorKey = 'unit.unauthorized';
        } else if (err.status === 403) {
          errorKey = 'unit.forbidden';
        }
        
        const errorMessage = this.translationService.translate(errorKey);
        this.error.set(errorMessage);
        this.loading.set(false);
      },
    });
  }

  loadUnitAiStatus(unitId: string | number): void {
    this.aiStatusLoading.set(true);
    this.aiStatusError.set(null);

    this.http
      .get<StatusByUnitResponse>(`${environment.apiBaseUrl}/unit-status/by-unit/${unitId}`)
      .subscribe({
        next: (data) => {
          this.aiStatus.set(data);
          this.aiStatusLoading.set(false);
        },
        error: (err) => {
          console.error('AI statusByUnit API Error:', err);
          this.aiStatusError.set('Failed to load AI communication history.');
          this.aiStatusLoading.set(false);
        },
      });
  }

  getStatusClass(status: string): string {
    return status === 'online' ? 'badge-success' : 'badge-error';
  }

  getStatusText(status: string): string {
    return status === 'online'
      ? this.translationService.translate('unit.online')
      : this.translationService.translate('unit.offline');
  }
}

