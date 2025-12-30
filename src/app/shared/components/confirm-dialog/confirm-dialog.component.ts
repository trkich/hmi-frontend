import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() message = '';
  @Input() confirmText = 'common.delete';
  @Input() cancelText = 'common.cancel';
  @Input() confirmButtonClass = 'btn-error';
  @Input() loading = false;
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  close(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }

  confirm(): void {
    this.confirmed.emit();
  }
}

