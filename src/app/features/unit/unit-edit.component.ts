import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { Unit } from './unit.model';

@Component({
  selector: 'app-unit-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './unit-edit.component.html',
})
export class UnitEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);

  unit: Unit = { id: 0, status: 'online' };
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUnit(Number(id));
    }
  }

  loadUnit(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<Unit>(`${environment.apiBaseUrl}/unit/${id}`).subscribe({
      next: (data) => {
        this.unit = { ...data };
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

  saveUnit(): void {
    this.saving.set(true);
    this.error.set(null);

    this.http.put<Unit>(`${environment.apiBaseUrl}/unit/${this.unit.id}`, this.unit).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/unit', this.unit.id]);
      },
      error: (err) => {
        console.error('Update unit error:', err);
        this.error.set(this.translationService.translate('unit.failedToLoad'));
        this.saving.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/unit', this.unit.id]);
  }
}

