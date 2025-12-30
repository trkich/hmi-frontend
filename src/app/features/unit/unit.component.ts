import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TableComponent, FilterOption } from '../../shared/components/table/table.component';
import { Unit } from './unit.model';

@Component({
  selector: 'app-unit',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ConfirmDialogComponent, TableComponent],
  templateUrl: './unit.component.html',
})
export class UnitComponent implements OnInit {
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);

  units = signal<Unit[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Delete modal state
  deleteModalOpen = signal(false);
  selectedUnit = signal<Unit | null>(null);
  deleting = signal(false);

  // Filters for new table component
  unitFilters: FilterOption[] = [
    {
      key: 'status',
      label: 'unit.status',
      type: 'select',
      options: [
        { value: 'online', label: 'unit.online' },
        { value: 'offline', label: 'unit.offline' },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<Unit[]>(`${environment.apiBaseUrl}/unit`).subscribe({
      next: (data) => {
        this.units.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Unit API Error:', err);
        
        let errorKey = 'unit.failedToLoad';
        
        // CORS error
        if (err.status === 0 || err.message?.includes('CORS')) {
          errorKey = 'unit.corsError';
        } else if (err.status === 401) {
          errorKey = 'unit.unauthorized';
        } else if (err.status === 403) {
          errorKey = 'unit.forbidden';
        } else if (err.status === 404) {
          errorKey = 'unit.notFound';
        } else if (err.status >= 500) {
          errorKey = 'unit.serverError';
        } else if (err.error?.message) {
          errorKey = 'unit.failedToLoad';
        }
        
        const errorMessage = this.translationService.translate(errorKey);
        
        this.error.set(errorMessage);
        this.loading.set(false);
      },
    });
  }

  getStatusClass(status: string): string {
    return status === 'online'
      ? 'badge-success'
      : 'badge-error';
  }

  getStatusText(status: string): string {
    return status === 'online'
      ? this.translationService.translate('unit.online')
      : this.translationService.translate('unit.offline');
  }

  openDeleteModal(unit: Unit): void {
    this.selectedUnit.set(unit);
    this.deleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.deleteModalOpen.set(false);
    this.selectedUnit.set(null);
  }

  confirmDelete(): void {
    const unit = this.selectedUnit();
    if (!unit) return;

    this.deleting.set(true);
    this.http.delete(`${environment.apiBaseUrl}/unit/${unit.id}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        // Reload units list
        this.loadUnits();
      },
      error: (err) => {
        console.error('Delete unit error:', err);
        this.error.set(this.translationService.translate('unit.failedToLoad'));
        this.deleting.set(false);
      },
    });
  }

  onPageChange(page: number): void {
    // This method is called when page changes in the table component
    // If you need server-side pagination, you can fetch data from API here
    // For now, client-side pagination is handled by the table component
    // Example for server-side pagination:
    // this.loadUnits(page);
  }
}

