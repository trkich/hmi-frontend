import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { environment } from '../../../../environments/environment';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-start-flow-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './start-flow-modal.component.html',
})
export class StartFlowModalComponent {
  @Input() isOpen = false;
  @Input() unitId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() flowStarted = new EventEmitter<{ instanceId: string }>();

  private http = inject(HttpClient);
  private router = inject(Router);

  isStarting = signal(false);
  error = signal<string | null>(null);
  telemetry = signal<string>('Elevator vibration anomaly at 3.2Hz for 40 seconds.');

  private connectionRef: signalR.HubConnection | null = null;

  onOpenChange(): void {
    if (!this.isOpen) {
      this.stopConnection();
      this.close.emit();
    }
  }

  async startFlow(): Promise<void> {
    if (!this.unitId) {
      this.error.set('Unit ID is required');
      return;
    }

    this.isStarting.set(true);
    this.error.set(null);

    try {
      // Stop old connection if any
      if (this.connectionRef) {
        await this.connectionRef.stop();
      }
      this.connectionRef = null;

      // 1) Start orchestrator
      const startResp = await this.http
        .post<{ instanceId?: string; id?: string; statusQueryGetUri?: string }>(
          `${environment.apiBaseUrl}/agentic/start`,
          {
            telemetry: this.telemetry(),
            unitId: this.unitId,
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

      // Emit event with instanceId
      this.flowStarted.emit({ instanceId });

      // Close modal and navigate to instance detail page
      this.close.emit();
      this.router.navigate(['/unit', this.unitId, 'instance', instanceId]);
    } catch (error: any) {
      console.error('Error starting flow:', error);
      let errorMessage = 'Failed to start flow';
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status === 0) {
        errorMessage = 'Network error: Could not connect to server. Please check if the backend is running.';
      } else if (error?.status) {
        errorMessage = `HTTP ${error.status}: ${error.statusText || 'Request failed'}`;
      }
      
      this.error.set(errorMessage);
      this.isStarting.set(false);
    }
  }

  closeModal(): void {
    this.stopConnection();
    this.close.emit();
  }

  private stopConnection(): void {
    if (this.connectionRef) {
      this.connectionRef.stop().catch(() => {});
      this.connectionRef = null;
    }
  }
}

