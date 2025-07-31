# Angular Component Coding Standards

## Component Structure Requirements

### 1. Component Class Template
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-[component-name]',
  templateUrl: './[component-name].component.html',
  styleUrls: ['./[component-name].component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class [ComponentName]Component implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    // Component initialization logic
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 2. Mandatory Requirements
- ALWAYS use OnPush change detection strategy
- ALWAYS implement OnDestroy interface
- ALWAYS use Subject for subscription cleanup
- ALWAYS use takeUntil operator for subscription management
- ALWAYS use readonly for private properties when possible
- ALWAYS inject ChangeDetectorRef for manual change detection

### 3. Naming Conventions
- Component files: [feature-name].component.ts
- Component classes: [FeatureName]Component (PascalCase)
- Component selectors: app-[feature-name] (kebab-case with app- prefix)
- Template files: [feature-name].component.html
- Style files: [feature-name].component.scss

### 4. Template Best Practices
- ALWAYS use trackBy functions in *ngFor loops
- ALWAYS use async pipe for observables
- ALWAYS use ng-template for conditional content
- NEVER put complex logic in templates

### 5. Performance Requirements
- Components must not exceed 300 lines of code
- Use lazy loading for feature modules
- Implement proper cleanup in ngOnDestroy
- Use OnPush change detection for better performance

### 6. Complete Component Examples

#### Example 1: Data List Component
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface DataItem {
  readonly id: number;
  readonly name: string;
  readonly status: 'active' | 'inactive';
  readonly createdAt: Date;
}

@Component({
  selector: 'app-data-list',
  templateUrl: './data-list.component.html',
  styleUrls: ['./data-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new BehaviorSubject<string>('');
  
  @Input() items: DataItem[] = [];
  @Input() loading = false;
  @Output() itemSelect = new EventEmitter<DataItem>();
  @Output() itemDelete = new EventEmitter<number>();
  
  filteredItems: DataItem[] = [];
  selectedItems = new Set<number>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.setupSearch();
    this.filterItems();
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
      .subscribe(searchTerm => {
        this.filterItems(searchTerm);
        this.cdr.markForCheck();
      });
  }
  
  private filterItems(searchTerm = ''): void {
    if (!searchTerm.trim()) {
      this.filteredItems = [...this.items];
    } else {
      this.filteredItems = this.items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }
  
  trackByItemId(index: number, item: DataItem): number {
    return item.id;
  }
  
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }
  
  onItemClick(item: DataItem): void {
    this.itemSelect.emit(item);
  }
  
  onItemSelect(item: DataItem, event: Event): void {
    event.stopPropagation();
    
    if (this.selectedItems.has(item.id)) {
      this.selectedItems.delete(item.id);
    } else {
      this.selectedItems.add(item.id);
    }
    this.cdr.markForCheck();
  }
  
  onDeleteItem(item: DataItem, event: Event): void {
    event.stopPropagation();
    this.itemDelete.emit(item.id);
  }
  
  isItemSelected(item: DataItem): boolean {
    return this.selectedItems.has(item.id);
  }
  
  getSelectedCount(): number {
    return this.selectedItems.size;
  }
  
  clearSelection(): void {
    this.selectedItems.clear();
    this.cdr.markForCheck();
  }
}
```

#### Example 2: Modal Dialog Component
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-modal-dialog',
  templateUrl: './modal-dialog.component.html',
  styleUrls: ['./modal-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  @ViewChild('modalElement', { static: true }) modalElement!: ElementRef<HTMLDivElement>;
  @ViewChild('firstFocusableElement') firstFocusableElement!: ElementRef;
  
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() closable = true;
  @Input() backdrop = true;
  
  @Output() modalClose = new EventEmitter<void>();
  @Output() modalOpen = new EventEmitter<void>();
  @Output() backdropClick = new EventEmitter<void>();
  
  private previousActiveElement: HTMLElement | null = null;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.setupKeyboardHandlers();
    this.setupAccessibility();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.restoreFocus();
  }
  
  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  private setupAccessibility(): void {
    if (this.isOpen) {
      this.trapFocus();
    }
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    
    switch (event.key) {
      case 'Escape':
        if (this.closable) {
          this.closeModal();
        }
        break;
      case 'Tab':
        this.handleTabKey(event);
        break;
    }
  }
  
  private handleTabKey(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  private getFocusableElements(): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(this.modalElement.nativeElement.querySelectorAll(focusableSelectors));
  }
  
  private trapFocus(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    
    setTimeout(() => {
      const focusableElements = this.getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        this.modalElement.nativeElement.focus();
      }
    }, 100);
  }
  
  private restoreFocus(): void {
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }
  
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.backdropClick.emit();
      if (this.closable && this.backdrop) {
        this.closeModal();
      }
    }
  }
  
  openModal(): void {
    this.isOpen = true;
    this.modalOpen.emit();
    this.setupAccessibility();
    this.cdr.markForCheck();
  }
  
  closeModal(): void {
    this.isOpen = false;
    this.modalClose.emit();
    this.restoreFocus();
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

#### Example 3: Infinite Scroll Component
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, throttleTime, map, filter } from 'rxjs/operators';

@Component({
  selector: 'app-infinite-scroll',
  templateUrl: './infinite-scroll.component.html',
  styleUrls: ['./infinite-scroll.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfiniteScrollComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLDivElement>;
  
  @Input() items: any[] = [];
  @Input() loading = false;
  @Input() hasMore = true;
  @Input() threshold = 200;
  @Input() debounceTime = 100;
  
  @Output() loadMore = new EventEmitter<void>();
  @Output() scrollPosition = new EventEmitter<number>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.setupScrollListener();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupScrollListener(): void {
    fromEvent(this.scrollContainer.nativeElement, 'scroll')
      .pipe(
        throttleTime(this.debounceTime),
        map(() => this.getScrollPosition()),
        filter(position => this.shouldLoadMore(position)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (!this.loading && this.hasMore) {
          this.loadMore.emit();
        }
      });
    
    fromEvent(this.scrollContainer.nativeElement, 'scroll')
      .pipe(
        throttleTime(50),
        map(() => this.getScrollPosition()),
        takeUntil(this.destroy$)
      )
      .subscribe(position => {
        this.scrollPosition.emit(position.scrollTop);
      });
  }
  
  private getScrollPosition() {
    const element = this.scrollContainer.nativeElement;
    return {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight
    };
  }
  
  private shouldLoadMore(position: any): boolean {
    const { scrollTop, scrollHeight, clientHeight } = position;
    return scrollHeight - scrollTop - clientHeight < this.threshold;
  }
  
  trackByItemId(index: number, item: any): any {
    return item.id || index;
  }
  
  scrollToTop(): void {
    this.scrollContainer.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  scrollToBottom(): void {
    this.scrollContainer.nativeElement.scrollTo({
      top: this.scrollContainer.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  getScrollPercentage(): number {
    const position = this.getScrollPosition();
    const { scrollTop, scrollHeight, clientHeight } = position;
    return Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
  }
}
```