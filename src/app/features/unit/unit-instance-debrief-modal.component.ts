import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AzureSpeechService } from '../../core/debriefing/azure-speech.service';
import { DebriefModalComponent } from '../../shared/components/debrief-modal/debrief-modal.component';

@Component({
  selector: 'app-unit-instance-debrief-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, DebriefModalComponent],
  template: `
    <app-debrief-modal
      [isOpen]="true"
      (close)="closeModal()"
    ></app-debrief-modal>
  `,
})
export class UnitInstanceDebriefModalComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    // Modal is always open when this component is loaded
  }

  ngOnDestroy(): void {
    // Cleanup handled by DebriefModalComponent
  }

  closeModal(): void {
    const unitId = this.route.snapshot.paramMap.get('unitId');
    const instanceId = this.route.snapshot.paramMap.get('instanceId');
    
    if (unitId && instanceId) {
      this.router.navigate(['/unit', unitId, 'instance', instanceId]);
    } else if (unitId) {
      this.router.navigate(['/unit', unitId]);
    } else {
      this.router.navigate(['/unit']);
    }
  }
}

