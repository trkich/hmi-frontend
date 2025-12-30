import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { FilterOption } from './table.component';

@Component({
  selector: 'app-table-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './table-filters.component.html',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class TableFiltersComponent implements OnInit, OnChanges {
  private translationService = inject(TranslationService);

  @Input() visible = false;
  @Input() filters: FilterOption[] = [];
  @Input() activeFilters: Record<string, any> = {};
  
  @Output() filtersChange = new EventEmitter<Record<string, any>>();
  @Output() close = new EventEmitter<void>();

  localFilters: Record<string, any> = {};

  getFilterLabel(filter: FilterOption): string {
    return this.translationService.translate(filter.label);
  }

  getOptionLabel(option: { value: string; label: string }): string {
    return this.translationService.translate(option.label);
  }

  getSearchPlaceholder(filter: FilterOption): string {
    const searchText = this.translationService.translate('common.search');
    const filterLabel = this.getFilterLabel(filter);
    return `${searchText} ${filterLabel}`;
  }

  getSelectPlaceholder(filter: FilterOption): string {
    const selectText = this.translationService.translate('common.select');
    const filterLabel = this.getFilterLabel(filter);
    return `${selectText} ${filterLabel}`;
  }

  ngOnInit(): void {
    this.initializeFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initializeFilters();
    }
    if (changes['activeFilters']) {
      this.initializeFilters();
    }
  }

  private initializeFilters(): void {
    this.localFilters = { ...this.activeFilters };
    // Initialize empty values for all filters
    this.filters.forEach(filter => {
      if (!(filter.key in this.localFilters)) {
        this.localFilters[filter.key] = filter.type === 'multiselect' ? [] : '';
      }
    });
  }

  applyFilters(): void {
    this.filtersChange.emit({ ...this.localFilters });
    this.close.emit();
  }

  resetFilters(): void {
    this.localFilters = {};
    this.filtersChange.emit({});
    this.close.emit();
  }

  closeFilters(): void {
    this.localFilters = { ...this.activeFilters };
    this.close.emit();
  }
}

