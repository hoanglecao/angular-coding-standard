import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface TableColumn {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly width?: string;
}

export interface SortEvent {
  readonly column: string;
  readonly direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading = false;
  @Input() pageSize = 10;
  @Input() showPagination = true;
  @Input() showSearch = true;
  
  @Output() sortChange = new EventEmitter<SortEvent>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() searchChange = new EventEmitter<string>();
  
  filteredData: any[] = [];
  paginatedData: any[] = [];
  currentPage = 1;
  totalPages = 1;
  searchTerm = '';
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.setupSearch();
    this.updateData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }
  
  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.searchTerm = term;
        this.searchChange.emit(term);
        this.filterData();
        this.updatePagination();
        this.cdr.markForCheck();
      });
  }
  
  private updateData(): void {
    this.filterData();
    this.updatePagination();
  }
  
  private filterData(): void {
    if (!this.searchTerm.trim()) {
      this.filteredData = [...this.data];
    } else {
      this.filteredData = this.data.filter(item =>
        this.columns.some(column =>
          String(item[column.key]).toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      );
    }
  }
  
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }
  
  onSearch(term: string): void {
    this.searchSubject.next(term);
  }
  
  onSort(column: TableColumn): void {
    if (!column.sortable) return;
    
    if (this.sortColumn === column.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column.key;
      this.sortDirection = 'asc';
    }
    
    this.sortChange.emit({
      column: this.sortColumn,
      direction: this.sortDirection
    });
    
    this.sortData();
    this.updatePagination();
    this.cdr.markForCheck();
  }
  
  private sortData(): void {
    this.filteredData.sort((a, b) => {
      const aValue = a[this.sortColumn];
      const bValue = b[this.sortColumn];
      
      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
    this.cdr.markForCheck();
  }
  
  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }
  
  trackByIndex(index: number): number {
    return index;
  }
  
  getSortIcon(column: TableColumn): string {
    if (!column.sortable || this.sortColumn !== column.key) {
      return 'sort';
    }
    return this.sortDirection === 'asc' ? 'sort-up' : 'sort-down';
  }
  
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}