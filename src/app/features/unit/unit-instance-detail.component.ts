import { Component, OnInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { environment } from '../../../environments/environment';
import { NgDiagramComponent, NgDiagramBackgroundComponent, initializeModel, provideNgDiagram, type ModelAdapter, type SimpleNode, type Edge, NgDiagramModelService, type SelectionChangedEvent, type DiagramInitEvent, NgDiagramNodeTemplateMap } from 'ng-diagram';
import { StepId, JourneyEvent, stepOrder, stepLabel } from '../communication/communication.component';
import { StepNodeComponent } from '../communication/step-node.component';
import { DebriefModalComponent } from '../../shared/components/debrief-modal/debrief-modal.component';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-unit-instance-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, NgDiagramComponent, NgDiagramBackgroundComponent, DebriefModalComponent],
  providers: [provideNgDiagram()],
  templateUrl: './unit-instance-detail.component.html',
})
export class UnitInstanceDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private modelService = inject(NgDiagramModelService);
  
  diagramInitialized = signal(false);
  private connectionRef: signalR.HubConnection | null = null;

  instanceId = signal<string | null>(null);
  unitId = signal<string | null>(null);
  connected = signal(false);
  events = signal<JourneyEvent[]>([]);
  selectedEvent = signal<JourneyEvent | null>(null);
  progress = signal<number>(0);
  loading = signal(true);
  error = signal<string | null>(null);
  showDebriefModal = signal(false);

  stepOrder = stepOrder;
  stepLabel = stepLabel;

  // Node template map for custom step nodes
  nodeTemplateMap = signal<NgDiagramNodeTemplateMap>(
    new NgDiagramNodeTemplateMap([['step-node', StepNodeComponent]])
  );

  // Diagram model - nodes for each step
  diagramModel = signal<ModelAdapter>(
    initializeModel({
      nodes: this.createInitialNodes(),
      edges: this.createInitialEdges(),
    })
  );

  ngOnInit(): void {
    const instanceId = this.route.snapshot.paramMap.get('instanceId');
    const unitId = this.route.snapshot.paramMap.get('unitId');
    
    if (instanceId) {
      this.instanceId.set(instanceId);
      if (unitId) {
        this.unitId.set(unitId);
      }
      this.loadInstanceDetails();
    } else {
      this.error.set('Instance ID is required');
      this.loading.set(false);
    }

    // Check if debriefing query param is present
    const debriefing = this.route.snapshot.queryParamMap.get('debriefing');
    this.showDebriefModal.set(debriefing === 'true');

    // Listen to route changes to update modal state
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const debriefing = this.route.snapshot.queryParamMap.get('debriefing');
        this.showDebriefModal.set(debriefing === 'true');
      });
  }

  closeDebriefModal(): void {
    this.showDebriefModal.set(false);
    const unitId = this.unitId();
    const instanceId = this.instanceId();
    if (unitId && instanceId) {
      this.router.navigate(['/unit', unitId, 'instance', instanceId], {
        queryParams: {},
      });
    }
  }

  ngOnDestroy(): void {
    if (this.connectionRef) {
      this.connectionRef.stop().catch(() => {});
      this.connectionRef = null;
    }
  }

  private createInitialNodes(): SimpleNode<{ step: StepId; label: string; state?: 'RUNNING' | 'DONE' | 'FAILED' | 'PENDING' }>[] {
    return stepOrder.map((step, index) => ({
      id: step,
      position: { x: 150 + index * 220, y: 200 },
      data: {
        step,
        label: stepLabel(step),
        state: 'PENDING' as const,
      },
      type: 'step-node',
      autoSize: false,
      size: { width: 180, height: 100 },
      resizable: false,
      rotatable: false,
    }));
  }

  private createInitialEdges(): Edge[] {
    const edges: Edge[] = [];
    for (let i = 0; i < stepOrder.length - 1; i++) {
      edges.push({
        id: `edge-${stepOrder[i]}-${stepOrder[i + 1]}`,
        source: stepOrder[i],
        target: stepOrder[i + 1],
        data: {},
      });
    }
    return edges;
  }

  // Effect to update node data when events change
  private updateNodeStates = effect(() => {
    const events = this.events();
    const isInitialized = this.diagramInitialized();
    
    if (!isInitialized) {
      return;
    }
    
    stepOrder.forEach((step) => {
      const latestEvent = events.find((e) => e.step === step && e.state !== 'RUNNING');
      let state: 'RUNNING' | 'DONE' | 'FAILED' | 'PENDING' = 'PENDING';
      
      if (!latestEvent) {
        const runningEvent = events.find((e) => e.step === step && e.state === 'RUNNING');
        state = runningEvent ? 'RUNNING' : 'PENDING';
      } else {
        state = latestEvent.state;
      }

      this.modelService.updateNode(step, {
        data: {
          step,
          label: stepLabel(step),
          state,
        },
      });
    });
  });

  onDiagramInit(event: DiagramInitEvent): void {
    this.diagramInitialized.set(true);
  }

  /**
   * Parse output object and create JourneyEvent-s for each completed step
   */
  private parseOutputToEvents(instanceId: string, output: any, lastUpdatedTime: string): JourneyEvent[] {
    const events: JourneyEvent[] = [];
    if (!output) {
      return events;
    }

    const stepPercentMap: Record<StepId, number> = {
      SENSING: 14,
      REASONING: 28,
      DECIDING: 42,
      ACTING: 57,
      ENABLEMENT: 71,
      REPORTING: 85,
      OPTIMIZATION: 100,
    };

    // Check each step in order
    stepOrder.forEach((step) => {
      // Check if this step exists in output (could be nested or direct)
      let stepOutput: any = null;
      
      // First check if step exists directly in output
      if (output[step] && typeof output[step] === 'object' && output[step] !== null) {
        stepOutput = output[step];
      } 
      // For REPORTING and OPTIMIZATION, they might contain nested steps
      // but we want the main step output, not nested ones
      else if (step === 'REPORTING' && output.REPORTING) {
        stepOutput = output.REPORTING;
      } 
      else if (step === 'OPTIMIZATION' && output.OPTIMIZATION) {
        stepOutput = output.OPTIMIZATION;
      }

      // If step has output, create event
      if (stepOutput && typeof stepOutput === 'object') {
        // Create a DONE event for this step
        events.push({
          instanceId,
          step,
          state: 'DONE',
          percent: stepPercentMap[step],
          message: `Step ${step} completed`,
          output: stepOutput,
          ts: lastUpdatedTime,
        });
      }
    });

    return events;
  }

  async loadInstanceDetails(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const instanceId = this.instanceId();
      if (!instanceId) {
        throw new Error('Instance ID is required');
      }

      // 1) Get instance status from API
      let instanceData: any = null;
      try {
        const statusResp = await this.http
          .get<any>(`${environment.apiBaseUrl}/agentic/flows?instanceId=${instanceId}`)
          .toPromise();

        if (statusResp) {
          console.log('Instance status:', statusResp);
          
          // Handle both single object and array response
          instanceData = Array.isArray(statusResp) ? statusResp[0] : statusResp;
          
          // If instance has output, parse it to create events
          if (instanceData?.output) {
            const parsedEvents = this.parseOutputToEvents(
              instanceId,
              instanceData.output,
              instanceData.lastUpdatedTime || instanceData.createdTime || new Date().toISOString()
            );
            
            if (parsedEvents.length > 0) {
              this.events.set(parsedEvents);
              // Set progress to the last completed step
              const lastEvent = parsedEvents[parsedEvents.length - 1];
              this.progress.set(lastEvent.percent);
              this.selectedEvent.set(lastEvent);
            }
          }
          
          // Set unitId from instance data if not already set
          if (!this.unitId() && instanceData?.customStatus?.unitId) {
            this.unitId.set(instanceData.customStatus.unitId);
          } else if (!this.unitId() && instanceData?.input?.unitId) {
            this.unitId.set(String(instanceData.input.unitId));
          }
        }
      } catch (statusError) {
        console.warn('Could not fetch instance status:', statusError);
        // Continue anyway - SignalR might still work
      }

      // 2) Try to negotiate SignalR connection (may fail for completed instances)
      try {
        const negResp = await this.http
          .get<{ url: string; accessToken: string }>(
            `${environment.apiBaseUrl}/agentic/negotiate?instanceId=${instanceId}`
          )
          .toPromise();

        if (negResp) {
          const { url, accessToken } = negResp;

          // 3) Connect SignalR
          const conn = new signalR.HubConnectionBuilder()
            .withUrl(url, { accessTokenFactory: () => accessToken })
            .withAutomaticReconnect()
            .build();

          conn.on('journeyUpdate', (ev: JourneyEvent) => {
            this.events.update((prev) => {
              // Avoid duplicates
              const exists = prev.some(
                (e) => e.step === ev.step && e.state === ev.state && e.percent === ev.percent
              );
              if (exists) {
                return prev;
              }
              return [...prev, ev];
            });
            this.selectedEvent.set(ev);
            this.progress.set(ev.percent);
          });

          await conn.start();
          this.connectionRef = conn;
          this.connected.set(true);
        }
      } catch (signalRError) {
        console.warn('SignalR connection failed (instance may be completed):', signalRError);
        // This is OK for completed instances - we already have the data from API
        this.connected.set(false);
      }

      this.loading.set(false);
    } catch (error: any) {
      console.error('Error loading instance details:', error);
      this.error.set(error?.message || 'Failed to load instance details');
      this.loading.set(false);
    }
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    const selectedNodes = event.selectedNodes || [];
    if (selectedNodes.length > 0) {
      const nodeId = selectedNodes[0].id;
      const step = nodeId as StepId;
      const eventsForStep = this.events().filter((e: JourneyEvent) => e.step === step);
      const latestEvent = eventsForStep.length > 0 ? eventsForStep[eventsForStep.length - 1] : null;
      this.selectedEvent.set(latestEvent);
      if (latestEvent) {
        this.progress.set(latestEvent.percent);
      }
    }
  }

  formatJsonOutput(output: any): string {
    if (!output) {
      return '{}';
    }
    try {
      return JSON.stringify(output, null, 2);
    } catch (error) {
      return String(output);
    }
  }
}

