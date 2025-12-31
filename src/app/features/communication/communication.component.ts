import { Component, OnInit, OnDestroy, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { environment } from '../../../environments/environment';
import { NgDiagramComponent, NgDiagramBackgroundComponent, initializeModel, provideNgDiagram, type ModelAdapter, type SimpleNode, type Edge, NgDiagramModelService, NgDiagramService, NgDiagramNodeTemplateMap, type SelectionChangedEvent, type DiagramInitEvent } from 'ng-diagram';
import { StepNodeComponent } from './step-node.component';
import * as signalR from '@microsoft/signalr';

export type StepId =
  | 'SENSING'
  | 'REASONING'
  | 'DECIDING'
  | 'ACTING'
  | 'ENABLEMENT'
  | 'REPORTING'
  | 'OPTIMIZATION';

export interface JourneyEvent {
  instanceId: string;
  step: StepId;
  state: 'RUNNING' | 'DONE' | 'FAILED';
  percent: number;
  message?: string;
  output?: any;
  ts: string;
}

const stepOrder: StepId[] = [
  'SENSING',
  'REASONING',
  'DECIDING',
  'ACTING',
  'ENABLEMENT',
  'REPORTING',
  'OPTIMIZATION',
];

function stepLabel(step: StepId): string {
  const map: Record<StepId, string> = {
    SENSING: '01 Sensing',
    REASONING: '02 Reasoning',
    DECIDING: '03 Deciding',
    ACTING: '04 Acting',
    ENABLEMENT: '05 Tech enablement',
    REPORTING: '06 Reporting',
    OPTIMIZATION: '07 Continuous optimization',
  };
  return map[step];
}

@Component({
  selector: 'app-communication',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, NgDiagramComponent, NgDiagramBackgroundComponent],
  providers: [provideNgDiagram()],
  templateUrl: './communication.component.html',
})
export class CommunicationComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private modelService = inject(NgDiagramModelService);
  private diagramService = inject(NgDiagramService);
  
  diagramInitialized = signal(false);
  private connectionRef: signalR.HubConnection | null = null;

  // Node template map for custom step nodes
  nodeTemplateMap = signal<NgDiagramNodeTemplateMap>(
    new NgDiagramNodeTemplateMap([['step-node', StepNodeComponent]])
  );

  instanceId = signal<string | null>(null);
  connected = signal(false);
  events = signal<JourneyEvent[]>([]);
  selectedEvent = signal<JourneyEvent | null>(null);
  unitId = signal<string>('');
  progress = signal<number>(0);

  stepOrder = stepOrder;
  stepLabel = stepLabel;

  // Diagram model - nodes for each step
  diagramModel = signal<ModelAdapter>(
    initializeModel({
      nodes: this.createInitialNodes(),
      edges: this.createInitialEdges(),
    })
  );

  ngOnInit(): void {
    // Pre-fill unitId from query param if provided (e.g., from Unit detail page)
    const qpUnitId = this.route.snapshot.queryParamMap.get('unitId');
    if (qpUnitId) {
      this.unitId.set(qpUnitId);
    }
  }

  private createInitialNodes(): SimpleNode<{ step: StepId; label: string }>[] {
    return stepOrder.map((step, index) => ({
      id: step,
      position: { x: 150 + index * 220, y: 200 },
      data: {
        step,
        label: stepLabel(step),
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

  // Effect to update node data when events change (only after diagram is initialized)
  private updateNodeStates = effect(() => {
    const events = this.events();
    const isInitialized = this.diagramInitialized();
    
    // Only update nodes if diagram is initialized
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

      // Update node data with state
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

  ngOnDestroy(): void {
    // Stop SignalR connection on destroy
    if (this.connectionRef) {
      this.connectionRef.stop().catch(() => {});
      this.connectionRef = null;
    }
  }

  async startRun(): Promise<void> {
    this.events.set([]);
    this.selectedEvent.set(null);
    this.progress.set(0);
    this.connected.set(false);

    // Stop old connection if any
    try {
      if (this.connectionRef) {
        await this.connectionRef.stop();
      }
    } catch {}
    this.connectionRef = null;

    try {
      // 1) Start orchestrator (backend returns instanceId + statusQueryGetUri)
      const startResp = await this.http
        .post<{ instanceId?: string; id?: string; statusQueryGetUri?: string }>(
          `${environment.apiBaseUrl}/api/start`,
          {
            telemetry: 'Elevator vibration anomaly at 3.2Hz for 40 seconds.',
            ...(this.unitId() && { unitId: this.unitId() }),
          }
        )
        .toPromise();

      if (!startResp) {
        throw new Error('No response from start endpoint');
      }

      const instanceId = startResp.instanceId ?? startResp.id;
      if (!instanceId) {
        throw new Error('Start did not return instanceId');
      }

      this.instanceId.set(instanceId);

      // 2) Negotiate with instanceId (server sets userId = instanceId)
      const negResp = await this.http
        .get<{ url: string; accessToken: string }>(
          `${environment.apiBaseUrl}/api/negotiate?instanceId=${instanceId}`
        )
        .toPromise();

      if (!negResp) {
        throw new Error('No response from negotiate endpoint');
      }

      const { url, accessToken } = negResp;

      // 3) Connect SignalR
      const conn = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build();

      conn.on('journeyUpdate', (ev: JourneyEvent) => {
        this.events.update((prev) => [...prev, ev]);
        this.selectedEvent.set(ev);
        this.progress.set(ev.percent);
      });

      await conn.start();
      this.connectionRef = conn;
      this.connected.set(true);

      // 4) DEBUG: fetch durable status via API proxy (avoid CORS)
      if (startResp.statusQueryGetUri) {
        const u = new URL(startResp.statusQueryGetUri);
        const code = u.searchParams.get('code');

        if (code) {
          try {
            const s = await this.http
              .get<any>(`${environment.apiBaseUrl}/api/status/${instanceId}?code=${encodeURIComponent(code)}`)
              .toPromise();
            console.log('DURABLE STATUS:', s);
          } catch (e) {
            console.warn('Status fetch failed:', e);
          }
        } else {
          console.warn('No `code` param in statusQueryGetUri');
        }
      }
    } catch (error: any) {
      console.error('Error starting AI journey:', error);
      alert(`Error: ${error?.message || error}`);
      this.connected.set(false);
    }
  }

  getNodeState(step: StepId): 'RUNNING' | 'DONE' | 'FAILED' | 'PENDING' {
    const latestEvent = this.events().find((e) => e.step === step && e.state !== 'RUNNING');
    if (!latestEvent) {
      const runningEvent = this.events().find((e) => e.step === step && e.state === 'RUNNING');
      return runningEvent ? 'RUNNING' : 'PENDING';
    }
    return latestEvent.state;
  }

  getNodeStyle(step: StepId): Record<string, string> {
    const state = this.getNodeState(step);
    let bg = '#ffffff';
    let border = '1px solid #ddd';

    if (state === 'RUNNING') {
      bg = '#fff7e6';
      border = '2px solid #ffb020';
    } else if (state === 'DONE') {
      bg = '#eaffea';
      border = '2px solid #3bb54a';
    } else if (state === 'FAILED') {
      bg = '#ffeaea';
      border = '2px solid #e23b3b';
    }

    return {
      background: bg,
      border: border,
      padding: '12px',
      borderRadius: '12px',
      width: '160px',
    };
  }

  onNodeClick(nodeId: string): void {
    const step = nodeId as StepId;
    const eventsForStep = this.events().filter((e: JourneyEvent) => e.step === step);
    const latestEvent = eventsForStep.length > 0 ? eventsForStep[eventsForStep.length - 1] : null;
    this.selectedEvent.set(latestEvent);
    if (latestEvent) {
      this.progress.set(latestEvent.percent);
    }
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    // Handle selection changes - when a node is selected, show its latest event
    const selectedNodes = event.selectedNodes || [];
    if (selectedNodes.length > 0) {
      const nodeId = selectedNodes[0].id;
      this.onNodeClick(nodeId);
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

