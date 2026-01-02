import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { environment } from '../../../environments/environment';
import { LayoutComponent } from '../../shared/components/layout/layout.component';

@Component({
  selector: 'app-unit-start-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './unit-start-flow.component.html',
})
export class UnitStartFlowComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  unitId = signal<string | null>(null);
  isStarting = signal(false);
  error = signal<string | null>(null);
  telemetry = signal<string>('Elevator vibration anomaly at 3.2Hz for 40 seconds.');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.unitId.set(id);
    } else {
      this.error.set('Unit ID is required');
    }
  }

  async startFlow(): Promise<void> {
    if (!this.unitId()) {
      this.error.set('Unit ID is required');
      return;
    }

    this.isStarting.set(true);
    this.error.set(null);

    try {
      // Start orchestrator
      const startResp = await this.http
        .post<{ instanceId?: string; id?: string; statusQueryGetUri?: string }>(
          `${environment.apiBaseUrl}/agentic/start`,
          {
            telemetry: this.telemetry(),
            unitId: this.unitId(),
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

      // Navigate to instance detail page
      this.router.navigate(['/unit', this.unitId(), 'instance', instanceId]);
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

  goBack(): void {
    if (this.unitId()) {
      this.router.navigate(['/unit', this.unitId()]);
    } else {
      this.router.navigate(['/unit']);
    }
  }
}

