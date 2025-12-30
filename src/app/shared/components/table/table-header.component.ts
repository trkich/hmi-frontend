import { Component, EventEmitter, Input, Output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-table-header',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './table-header.component.html',
})
export class TableHeaderComponent implements OnInit, OnDestroy {
  @Input() showSearch = false;
  @Input() showFilter = false;
  @Input() filtersCount = 0;
  @Input() initialSearchValue = '';
  
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterClick = new EventEmitter<void>();

  searchInput = signal('');
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (this.initialSearchValue) {
      this.searchInput.set(this.initialSearchValue);
    }

    // Debounce search input
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.searchChange.emit(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.searchSubject.next(value);
  }
}

