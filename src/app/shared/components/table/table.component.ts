import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableHeaderComponent } from './table-header.component';
import { TableFiltersComponent } from './table-filters.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text';
  options?: { value: string; label: string }[];
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, TableHeaderComponent, TableFiltersComponent, TranslatePipe],
  templateUrl: './table.component.html',
})
export class TableComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @Input() data: any[] = [];
  @Input() showSearch = false;
  @Input() filters?: FilterOption[];
  @Input() query: any = {};
  @Input() useQueryParams = true; // Enable/disable query params
  @Input() pagination = false; // Enable/disable pagination
  @Input() itemsPerPage = 10; // Items per page
  @Input() totalItems?: number; // Total items (for server-side pagination, if not provided uses data.length)
  @Output() pageChange = new EventEmitter<number>(); // Emit when page changes
  
  @ContentChild('thead') theadTemplate?: TemplateRef<any>;
  @ContentChild('tableRow') tableRowTemplate?: TemplateRef<any>;
  @ContentChild('filters') filtersTemplate?: TemplateRef<any>;

  searchValue = signal('');
  filtersVisible = signal(false);
  activeFilters = signal<Record<string, any>>({});
  currentPage = signal(1);
  
  filtersCount = computed(() => {
    const filters = this.activeFilters();
    return Object.keys(filters).filter(key => {
      const value = filters[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    }).length;
  });

  hasFilters = computed(() => this.filters !== undefined && this.filters.length > 0);

  // Pagination computed values
  totalPages = computed(() => {
    const total = this.totalItems !== undefined ? this.totalItems : this.getFilteredData().length;
    return Math.ceil(total / this.itemsPerPage);
  });

  paginatedData = computed(() => {
    if (!this.pagination) {
      return this.getFilteredData();
    }
    const filtered = this.getFilteredData();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return filtered.slice(start, end);
  });

  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    
    if (total <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);
      
      if (current > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 2) {
        pages.push('...');
      }
      
      // Show last page
      pages.push(total);
    }
    
    return pages;
  });

  private isInitializing = true;

  ngOnInit(): void {
    if (this.useQueryParams) {
      // Read initial values from query params (only once on init)
      const params = this.route.snapshot.queryParams;
      
      // Read search
      if (params['search']) {
        this.searchValue.set(params['search']);
      }

      // Read page
      if (this.pagination && params['page']) {
        const page = parseInt(params['page'], 10);
        if (!isNaN(page) && page > 0) {
          this.currentPage.set(page);
        }
      }

      // Read filters
      const filters: Record<string, any> = {};
      this.filters?.forEach(filter => {
        const paramValue = params[filter.key];
        if (paramValue) {
          if (filter.type === 'multiselect') {
            filters[filter.key] = Array.isArray(paramValue) ? paramValue : [paramValue];
          } else {
            filters[filter.key] = paramValue;
          }
        }
      });
      this.activeFilters.set(filters);
      
      this.isInitializing = false;

      // Listen for external query param changes (e.g., browser back/forward)
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (this.isInitializing) return;
        
        // Only update if changed externally (not by us)
        const newSearch = params['search'] || '';
        if (newSearch !== this.searchValue()) {
          this.searchValue.set(newSearch);
        }

        // Read page
        if (this.pagination && params['page']) {
          const page = parseInt(params['page'], 10);
          if (!isNaN(page) && page > 0 && page !== this.currentPage()) {
            this.currentPage.set(page);
          }
        }

        // Read filters
        const filters: Record<string, any> = {};
        this.filters?.forEach(filter => {
          const paramValue = params[filter.key];
          if (paramValue) {
            if (filter.type === 'multiselect') {
              filters[filter.key] = Array.isArray(paramValue) ? paramValue : [paramValue];
            } else {
              filters[filter.key] = paramValue;
            }
          }
        });
        this.activeFilters.set(filters);
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleFilters(): void {
    this.filtersVisible.update(val => !val);
  }

  onSearchChange(value: string): void {
    this.searchValue.set(value);
    // Reset to first page when search changes
    if (this.pagination) {
      this.currentPage.set(1);
    }
    if (this.useQueryParams) {
      this.updateQueryParams({ search: value || null, page: this.pagination ? 1 : undefined });
    }
  }

  onFiltersChange(filters: Record<string, any>): void {
    this.activeFilters.set(filters);
    // Reset to first page when filters change
    if (this.pagination) {
      this.currentPage.set(1);
    }
    if (this.useQueryParams) {
      // Update query params with new filters, preserving search
      this.updateQueryParams({ ...filters, page: this.pagination ? 1 : undefined });
    }
  }

  onFiltersClose(): void {
    this.filtersVisible.set(false);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    
    this.currentPage.set(page);
    
    if (this.useQueryParams) {
      this.updateQueryParams({ page: page });
    }
    
    // Emit page change event for parent component (e.g., to fetch new data from API)
    this.pageChange.emit(page);
  }

  private updateQueryParams(params: Record<string, any>): void {
    if (this.isInitializing) return;
    
    // Get current query params
    const currentParams = { ...this.route.snapshot.queryParams };
    const queryParams: Record<string, any> = { ...currentParams };
    
    // Update search
    if (params['search'] !== undefined) {
      const search = params['search'];
      if (search && search.trim() !== '') {
        queryParams['search'] = search.trim();
      } else {
        delete queryParams['search'];
      }
    }

    // Update page
    if (this.pagination && params['page'] !== undefined) {
      const page = params['page'];
      if (page && page > 1) {
        queryParams['page'] = page;
      } else {
        delete queryParams['page'];
      }
    }

    // Update filters - first remove all existing filter params
    if (Object.keys(params).some(key => key !== 'search' && key !== 'page' && this.filters?.some(f => f.key === key))) {
      this.filters?.forEach(filter => {
        delete queryParams[filter.key];
      });

      // Add active filters
      const filtersToUse = Object.keys(params).length > 0 && params['search'] === undefined && params['page'] === undefined ? params : this.activeFilters();
      Object.keys(filtersToUse).forEach(key => {
        if (key === 'search' || key === 'page') return;
        
        const value = filtersToUse[key];
        if (value !== null && value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
          queryParams[key] = value;
        }
      });
    }

    // Navigate with new query params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
    });
  }

  getFilteredData(): any[] {
    let filtered = [...this.data];
    const search = this.searchValue().toLowerCase();
    const filters = this.activeFilters();

    // Apply search
    if (search) {
      filtered = filtered.filter(item => {
        return JSON.stringify(item).toLowerCase().includes(search);
      });
    }

    // Apply filters
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            filtered = filtered.filter(item => value.includes(item[key]));
          }
        } else {
          filtered = filtered.filter(item => item[key] === value);
        }
      }
    });

    return filtered;
  }
}

