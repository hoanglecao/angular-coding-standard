# Angular Comprehensive Code Examples for Training

## Component Examples

### Example 1: Basic Component with OnPush
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-basic-example',
  templateUrl: './basic-example.component.html',
  styleUrls: ['./basic-example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicExampleComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.initializeComponent();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private initializeComponent(): void {
    this.cdr.markForCheck();
  }
}
```

### Example 2: Form Component
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  userForm: FormGroup;
  isSubmitting = false;
  
  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.createForm();
  }
  
  ngOnInit(): void {
    this.setupFormValidation();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.pattern(/^\d{10}$/)],
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
      })
    });
  }
  
  private setupFormValidation(): void {
    this.userForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }
  
  onSubmit(): void {
    if (this.userForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.cdr.markForCheck();
      
      const formData = this.userForm.value;
      console.log('Form submitted:', formData);
      
      setTimeout(() => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }, 2000);
    }
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Invalid email format';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return 'Invalid format';
    }
    return '';
  }
}
```

### Example 3: List Component with Pagination
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ListItem {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly isActive: boolean;
}

interface PaginationConfig {
  readonly currentPage: number;
  readonly itemsPerPage: number;
  readonly totalItems: number;
}

@Component({
  selector: 'app-paginated-list',
  templateUrl: './paginated-list.component.html',
  styleUrls: ['./paginated-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginatedListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly paginationSubject = new BehaviorSubject<PaginationConfig>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  });
  
  @Input() items: ListItem[] = [];
  @Input() loading = false;
  @Output() itemSelect = new EventEmitter<ListItem>();
  @Output() pageChange = new EventEmitter<number>();
  
  selectedItems = new Set<number>();
  sortField = 'title';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.setupPagination();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.paginationSubject.complete();
  }
  
  private setupPagination(): void {
    this.paginationSubject
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.cdr.markForCheck();
      });
  }
  
  trackByItemId(index: number, item: ListItem): number {
    return item.id;
  }
  
  onItemClick(item: ListItem): void {
    this.itemSelect.emit(item);
  }
  
  onItemSelect(item: ListItem, event: Event): void {
    event.stopPropagation();
    
    if (this.selectedItems.has(item.id)) {
      this.selectedItems.delete(item.id);
    } else {
      this.selectedItems.add(item.id);
    }
    this.cdr.markForCheck();
  }
  
  isItemSelected(item: ListItem): boolean {
    return this.selectedItems.has(item.id);
  }
  
  onSort(field: keyof ListItem): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.cdr.markForCheck();
  }
  
  onPageChange(page: number): void {
    const currentConfig = this.paginationSubject.value;
    this.paginationSubject.next({
      ...currentConfig,
      currentPage: page
    });
    this.pageChange.emit(page);
  }
  
  selectAll(): void {
    this.items.forEach(item => this.selectedItems.add(item.id));
    this.cdr.markForCheck();
  }
  
  clearSelection(): void {
    this.selectedItems.clear();
    this.cdr.markForCheck();
  }
  
  getSelectedCount(): number {
    return this.selectedItems.size;
  }
  
  getPaginationInfo(): PaginationConfig {
    return this.paginationSubject.value;
  }
}
```

### Example 4: Modal Component
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  @ViewChild('modalElement', { static: true }) modalElement!: ElementRef<HTMLDivElement>;
  
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() closable = true;
  
  @Output() modalClose = new EventEmitter<void>();
  @Output() modalOpen = new EventEmitter<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.setupKeyboardHandlers();
    this.setupFocusManagement();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  private setupFocusManagement(): void {
    if (this.isOpen) {
      setTimeout(() => {
        this.modalElement.nativeElement.focus();
      }, 100);
    }
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen && this.closable) {
      this.closeModal();
    }
  }
  
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && this.closable) {
      this.closeModal();
    }
  }
  
  closeModal(): void {
    this.isOpen = false;
    this.modalClose.emit();
    this.cdr.markForCheck();
  }
  
  openModal(): void {
    this.isOpen = true;
    this.modalOpen.emit();
    this.setupFocusManagement();
    this.cdr.markForCheck();
  }
  
  getModalClasses(): string[] {
    const classes = ['modal'];
    if (this.isOpen) classes.push('modal--open');
    classes.push(`modal--${this.size}`);
    return classes;
  }
}
```

### Example 5: Data Table Component
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface TableColumn {
  readonly key: string;
  readonly label: string;
  readonly sortable: boolean;
  readonly width?: string;
}

interface SortConfig {
  readonly field: string;
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
  
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading = false;
  @Input() selectable = false;
  @Input() sortable = true;
  
  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() sortChange = new EventEmitter<SortConfig>();
  
  selectedRows = new Set<any>();
  currentSort: SortConfig | null = null;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.initializeTable();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private initializeTable(): void {
    this.cdr.markForCheck();
  }
  
  trackByRowId(index: number, row: any): any {
    return row.id || index;
  }
  
  trackByColumnKey(index: number, column: TableColumn): string {
    return column.key;
  }
  
  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }
  
  onRowSelect(row: any, event: Event): void {
    event.stopPropagation();
    
    if (this.selectedRows.has(row)) {
      this.selectedRows.delete(row);
    } else {
      this.selectedRows.add(row);
    }
    
    this.selectionChange.emit(Array.from(this.selectedRows));
    this.cdr.markForCheck();
  }
  
  onHeaderSort(column: TableColumn): void {
    if (!column.sortable || !this.sortable) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    
    if (this.currentSort?.field === column.key) {
      direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    
    this.currentSort = { field: column.key, direction };
    this.sortChange.emit(this.currentSort);
    this.cdr.markForCheck();
  }
  
  isRowSelected(row: any): boolean {
    return this.selectedRows.has(row);
  }
  
  selectAllRows(): void {
    this.data.forEach(row => this.selectedRows.add(row));
    this.selectionChange.emit(Array.from(this.selectedRows));
    this.cdr.markForCheck();
  }
  
  clearSelection(): void {
    this.selectedRows.clear();
    this.selectionChange.emit([]);
    this.cdr.markForCheck();
  }
  
  isAllSelected(): boolean {
    return this.data.length > 0 && this.selectedRows.size === this.data.length;
  }
  
  getSortIcon(column: TableColumn): string {
    if (!this.currentSort || this.currentSort.field !== column.key) {
      return 'sort';
    }
    return this.currentSort.direction === 'asc' ? 'sort-up' : 'sort-down';
  }
  
  getCellValue(row: any, column: TableColumn): any {
    return row[column.key];
  }
}
```

## Service Examples

### Example 1: HTTP Service with Error Handling
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, map, finalize } from 'rxjs/operators';

interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
  readonly total?: number;
}

interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly apiUrl = 'https://api.example.com/users';
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  
  readonly loading$ = this.loadingSubject.asObservable();
  
  constructor(private http: HttpClient) {}
  
  async getUsers(page = 1, limit = 10): Promise<User[]> {
    this.setLoading(true);
    
    try {
      const params = new HttpParams()
        .set('page', page.toString())
        .set('limit', limit.toString());
      
      const response = await this.http.get<ApiResponse<User[]>>(`${this.apiUrl}`, { params })
        .pipe(
          retry(2),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as ApiResponse<User[]>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }
  
  async getUserById(id: number): Promise<User> {
    this.setLoading(true);
    
    try {
      const response = await this.http.get<ApiResponse<User>>(`${this.apiUrl}/${id}`)
        .pipe(
          retry(2),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as ApiResponse<User>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user ${id}: ${error}`);
    }
  }
  
  async createUser(userData: Partial<User>): Promise<User> {
    this.setLoading(true);
    
    try {
      const response = await this.http.post<ApiResponse<User>>(`${this.apiUrl}`, userData)
        .pipe(
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as ApiResponse<User>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    this.setLoading(true);
    
    try {
      const response = await this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, userData)
        .pipe(
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as ApiResponse<User>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update user ${id}: ${error}`);
    }
  }
  
  async deleteUser(id: number): Promise<void> {
    this.setLoading(true);
    
    try {
      await this.http.delete(`${this.apiUrl}/${id}`)
        .pipe(
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise();
    } catch (error) {
      throw new Error(`Failed to delete user ${id}: ${error}`);
    }
  }
  
  searchUsers(query: string): Observable<User[]> {
    const params = new HttpParams().set('search', query);
    
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/search`, { params })
      .pipe(
        retry(2),
        map(response => response.data),
        catchError(this.handleError)
      );
  }
  
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Bad request - please check your input';
          break;
        case 401:
          errorMessage = 'Unauthorized - please log in';
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          break;
        case 404:
          errorMessage = 'Resource not found';
          break;
        case 500:
          errorMessage = 'Internal server error';
          break;
        default:
          errorMessage = `Server error: ${error.status} - ${error.message}`;
      }
    }
    
    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
```

### Example 2: State Management Service
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

interface AppState {
  readonly user: User | null;
  readonly theme: 'light' | 'dark';
  readonly language: string;
  readonly notifications: Notification[];
}

interface Notification {
  readonly id: string;
  readonly message: string;
  readonly type: 'success' | 'error' | 'warning' | 'info';
  readonly timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly initialState: AppState = {
    user: null,
    theme: 'light',
    language: 'en',
    notifications: []
  };
  
  private readonly stateSubject = new BehaviorSubject<AppState>(this.initialState);
  
  readonly state$ = this.stateSubject.asObservable();
  readonly user$ = this.state$.pipe(
    map(state => state.user),
    distinctUntilChanged()
  );
  readonly theme$ = this.state$.pipe(
    map(state => state.theme),
    distinctUntilChanged()
  );
  readonly notifications$ = this.state$.pipe(
    map(state => state.notifications),
    distinctUntilChanged()
  );
  
  constructor() {
    this.loadStateFromStorage();
  }
  
  private loadStateFromStorage(): void {
    try {
      const savedState = localStorage.getItem('app-state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.stateSubject.next({ ...this.initialState, ...parsedState });
      }
    } catch (error) {
      console.error('Failed to load state from storage:', error);
    }
  }
  
  private saveStateToStorage(state: AppState): void {
    try {
      localStorage.setItem('app-state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state to storage:', error);
    }
  }
  
  private updateState(updater: (state: AppState) => AppState): void {
    const currentState = this.stateSubject.value;
    const newState = updater(currentState);
    this.stateSubject.next(newState);
    this.saveStateToStorage(newState);
  }
  
  setUser(user: User | null): void {
    this.updateState(state => ({ ...state, user }));
  }
  
  setTheme(theme: 'light' | 'dark'): void {
    this.updateState(state => ({ ...state, theme }));
  }
  
  setLanguage(language: string): void {
    this.updateState(state => ({ ...state, language }));
  }
  
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date()
    };
    
    this.updateState(state => ({
      ...state,
      notifications: [...state.notifications, newNotification]
    }));
  }
  
  removeNotification(id: string): void {
    this.updateState(state => ({
      ...state,
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  }
  
  clearNotifications(): void {
    this.updateState(state => ({ ...state, notifications: [] }));
  }
  
  resetState(): void {
    this.stateSubject.next(this.initialState);
    localStorage.removeItem('app-state');
  }
  
  getCurrentState(): AppState {
    return this.stateSubject.value;
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```