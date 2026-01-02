import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { Unit } from './unit.model';
import { StartFlowModalComponent } from '../../shared/components/start-flow-modal/start-flow-modal.component';

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

// Response is now directly an array of UnitJourneyInstance

@Component({
  selector: 'app-unit-view',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, StartFlowModalComponent],
  templateUrl: './unit-view.component.html',
})
export class UnitViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);

  unit = signal<Unit | null>(null);
  unitId = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // AI communication history (status/by-unit)
  aiStatusLoading = signal(false);
  aiStatusError = signal<string | null>(null);
  aiStatus = signal<UnitJourneyInstance[]>([]);

  // Check if debug mode is enabled via query param
  showStartFlowButton = signal(false);
  showStartFlowModal = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.unitId.set(id);
      this.loadUnit(Number(id));
      this.loadUnitAiStatus(id);
    }

    // Check debug and flow-start query params
    this.updateQueryParams();

    // Listen to route changes to update modal state
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateQueryParams();
      });
  }

  private updateQueryParams(): void {
    const debug = this.route.snapshot.queryParamMap.get('debug');
    const flowStart = this.route.snapshot.queryParamMap.get('flow-start');
    
    this.showStartFlowButton.set(debug === 'true');
    this.showStartFlowModal.set(debug === 'true' && flowStart === 'true');
  }

  closeStartFlowModal(): void {
    this.showStartFlowModal.set(false);
    const unitId = this.unitId();
    if (unitId) {
      this.router.navigate(['/unit', unitId], {
        queryParams: { debug: 'true' },
      });
    }
  }

  onFlowStarted(event: { instanceId: string }): void {
    // Reload AI status to show the new instance
    if (this.unitId()) {
      this.loadUnitAiStatus(this.unitId()!);
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
      .get<UnitJourneyInstance[]>(`${environment.apiBaseUrl}/agentic/flows?unitId=${unitId}`)
      .subscribe({
        next: (data) => {
          this.aiStatus.set(Array.isArray(data) ? data : []);
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

