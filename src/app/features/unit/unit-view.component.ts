import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { Unit } from './unit.model';
import { StartFlowModalComponent } from '../../shared/components/start-flow-modal/start-flow-modal.component';
import * as signalR from '@microsoft/signalr';

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

interface FlowStartedEvent {
  unitId: string;
  instanceId: string;
  telemetry: string;
  startTime: string;
  status: string;
}

interface FlowCompletedEvent {
  unitId: string;
  instanceId: string;
  status: string;
}

// Response is now directly an array of UnitJourneyInstance

@Component({
  selector: 'app-unit-view',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, StartFlowModalComponent],
  templateUrl: './unit-view.component.html',
})
export class UnitViewComponent implements OnInit, OnDestroy {
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
  flowsConnected = signal(false);
  private signalRConnection: signalR.HubConnection | null = null;

  // Check if debug mode is enabled via query param
  showStartFlowButton = signal(false);
  showStartFlowModal = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.unitId.set(id);
      this.loadUnit(Number(id));
      this.loadUnitAiStatus(id);
      this.setupSignalRConnection(id);
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

  ngOnDestroy(): void {
    if (this.signalRConnection) {
      this.signalRConnection.stop().catch(() => {});
      this.signalRConnection = null;
    }
  }

  private async setupSignalRConnection(unitId: string): Promise<void> {
    try {
      // Stop old connection if any
      if (this.signalRConnection) {
        await this.signalRConnection.stop();
      }
      this.signalRConnection = null;

      // 1) Negotiate SignalR connection through backend
      // Backend will proxy the connection to hmi-ai-agents and forward events
      const userId = unitId; // Use unitId as userId
      const negResp = await this.http
        .get<{ url: string; accessToken: string }>(
          `${environment.apiBaseUrl}/agentic/negotiate?unitId=${encodeURIComponent(unitId)}&userId=${encodeURIComponent(userId)}`
        )
        .toPromise();

      if (!negResp) {
        throw new Error('No response from negotiate endpoint');
      }

      const { url, accessToken } = negResp;

      // 2) Connect SignalR
      const conn = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build();

      // 3) Listen for new flow starts
      conn.on('flowStarted', (flow: FlowStartedEvent) => {
        console.log('Received flowStarted event:', flow);
        console.log('Expected unitId:', unitId);
        console.log('Received unitId:', flow.unitId);
        
        // Only add if it's for our unit
        if (flow.unitId === unitId) {
          this.aiStatus.update((prev) => {
            // Check if flow already exists to avoid duplicates
            const exists = prev.some(f => f.instanceId === flow.instanceId);
            if (exists) {
              console.log('Flow already exists, skipping:', flow.instanceId);
              return prev;
            }
            console.log('Adding flow to list:', flow);
            
            // Map FlowStartedEvent to UnitJourneyInstance
            const newFlow: UnitJourneyInstance = {
              instanceId: flow.instanceId,
              runtimeStatus: flow.status,
              createdTime: flow.startTime,
              lastUpdatedTime: flow.startTime,
              input: {
                unitId: flow.unitId,
                telemetry: flow.telemetry,
              },
            };
            
            // Add to the beginning and sort by createdTime descending
            return [newFlow, ...prev].sort((a, b) => 
              new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
            );
          });
        } else {
          console.log(`Ignoring flow for different unit: ${flow.unitId}`);
        }
      });

      // 4) Listen for flow completions
      conn.on('flowCompleted', (data: FlowCompletedEvent) => {
        console.log('Received flowCompleted event:', data);
        if (data.unitId === unitId) {
          this.aiStatus.update((prev) => {
            const existingFlow = prev.find(f => f.instanceId === data.instanceId);
            if (existingFlow) {
              // Update existing flow status
              console.log('Updated flow status to:', data.status);
              return prev.map((f) =>
                f.instanceId === data.instanceId 
                  ? { ...f, runtimeStatus: data.status, lastUpdatedTime: new Date().toISOString() }
                  : f
              );
            } else {
              // Flow not in list (started before we connected), add it now
              console.log('Flow not in list, adding as completed:', data.instanceId);
              const newFlow: UnitJourneyInstance = {
                instanceId: data.instanceId,
                runtimeStatus: data.status,
                createdTime: new Date().toISOString(),
                lastUpdatedTime: new Date().toISOString(),
                input: {
                  unitId: data.unitId,
                  telemetry: 'Flow started before connection',
                },
              };
              return [newFlow, ...prev].sort((a, b) => 
                new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
              );
            }
          });
        }
      });

      await conn.start();
      this.signalRConnection = conn;
      this.flowsConnected.set(true);
      console.log('SignalR connected for unit:', unitId);
    } catch (error) {
      console.error('Failed to setup SignalR connection:', error);
      this.flowsConnected.set(false);
    }
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

