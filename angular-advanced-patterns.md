# Angular Advanced Patterns and Best Practices

## Reactive Programming Patterns

### Example 1: Advanced Observable Patterns
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, BehaviorSubject, combineLatest, merge, EMPTY } from 'rxjs';
import { takeUntil, switchMap, debounceTime, distinctUntilChanged, catchError, startWith, map, filter } from 'rxjs/operators';

@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private readonly filterSubject = new BehaviorSubject<SearchFilters>({});
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  
  readonly loading$ = this.loadingSubject.asObservable();
  readonly results$ = combineLatest([
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      startWith('')
    ),
    this.filterSubject.asObservable()
  ]).pipe(
    switchMap(([query, filters]) => {
      if (!query.trim() && Object.keys(filters).length === 0) {
        return EMPTY;
      }
      
      this.loadingSubject.next(true);
      return this.searchService.search(query, filters).pipe(
        catchError(error => {
          console.error('Search error:', error);
          return EMPTY;
        }),
        finalize(() => this.loadingSubject.next(false))
      );
    }),
    takeUntil(this.destroy$)
  );
  
  constructor(
    private searchService: SearchService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.setupSearchSubscription();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
    this.filterSubject.complete();
    this.loadingSubject.complete();
  }
  
  private setupSearchSubscription(): void {
    this.results$.subscribe(results => {
      this.cdr.markForCheck();
    });
  }
  
  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }
  
  onFilterChange(filters: SearchFilters): void {
    this.filterSubject.next(filters);
  }
}
```

### Example 2: State Management with RxJS
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';

interface AppState {
  readonly user: User | null;
  readonly preferences: UserPreferences;
  readonly notifications: Notification[];
  readonly loading: LoadingState;
}

interface LoadingState {
  readonly [key: string]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly preferencesSubject = new BehaviorSubject<UserPreferences>({});
  private readonly notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private readonly loadingSubject = new BehaviorSubject<LoadingState>({});
  
  readonly user$ = this.userSubject.asObservable().pipe(distinctUntilChanged());
  readonly preferences$ = this.preferencesSubject.asObservable().pipe(distinctUntilChanged());
  readonly notifications$ = this.notificationsSubject.asObservable().pipe(distinctUntilChanged());
  readonly loading$ = this.loadingSubject.asObservable().pipe(distinctUntilChanged());
  
  readonly state$: Observable<AppState> = combineLatest([
    this.user$,
    this.preferences$,
    this.notifications$,
    this.loading$
  ]).pipe(
    map(([user, preferences, notifications, loading]) => ({
      user,
      preferences,
      notifications,
      loading
    })),
    shareReplay(1)
  );
  
  readonly isAuthenticated$ = this.user$.pipe(
    map(user => !!user),
    distinctUntilChanged()
  );
  
  readonly unreadNotifications$ = this.notifications$.pipe(
    map(notifications => notifications.filter(n => !n.read)),
    distinctUntilChanged()
  );
  
  setUser(user: User | null): void {
    this.userSubject.next(user);
  }
  
  updatePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.preferencesSubject.value;
    this.preferencesSubject.next({ ...current, ...preferences });
  }
  
  addNotification(notification: Notification): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([...current, notification]);
  }
  
  markNotificationAsRead(id: string): void {
    const current = this.notificationsSubject.value;
    const updated = current.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
  }
  
  setLoading(key: string, loading: boolean): void {
    const current = this.loadingSubject.value;
    this.loadingSubject.next({ ...current, [key]: loading });
  }
  
  isLoading(key: string): Observable<boolean> {
    return this.loading$.pipe(
      map(loading => loading[key] || false),
      distinctUntilChanged()
    );
  }
}
```

## Advanced Component Patterns

### Example 3: Higher-Order Component Pattern
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter, TemplateRef, ContentChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface WithLoadingState {
  loading: boolean;
  error: Error | null;
  data: any;
}

@Component({
  selector: 'app-with-loading',
  templateUrl: './with-loading.component.html',
  styleUrls: ['./with-loading.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WithLoadingComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  @Input() loading = false;
  @Input() error: Error | null = null;
  @Input() data: any = null;
  @Input() loadingTemplate: TemplateRef<any> | null = null;
  @Input() errorTemplate: TemplateRef<any> | null = null;
  @Input() emptyTemplate: TemplateRef<any> | null = null;
  
  @ContentChild('loadingTemplate') defaultLoadingTemplate: TemplateRef<any> | null = null;
  @ContentChild('errorTemplate') defaultErrorTemplate: TemplateRef<any> | null = null;
  @ContentChild('emptyTemplate') defaultEmptyTemplate: TemplateRef<any> | null = null;
  @ContentChild('contentTemplate') contentTemplate: TemplateRef<any> | null = null;
  
  @Output() retry = new EventEmitter<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.cdr.markForCheck();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onRetry(): void {
    this.retry.emit();
  }
  
  getLoadingTemplate(): TemplateRef<any> | null {
    return this.loadingTemplate || this.defaultLoadingTemplate;
  }
  
  getErrorTemplate(): TemplateRef<any> | null {
    return this.errorTemplate || this.defaultErrorTemplate;
  }
  
  getEmptyTemplate(): TemplateRef<any> | null {
    return this.emptyTemplate || this.defaultEmptyTemplate;
  }
  
  hasData(): boolean {
    return this.data && (Array.isArray(this.data) ? this.data.length > 0 : true);
  }
}
```

### Example 4: Dynamic Component Factory
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ViewContainerRef, ComponentFactoryResolver, ComponentRef, Type } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface DynamicComponentData {
  readonly component: Type<any>;
  readonly inputs?: { [key: string]: any };
  readonly outputs?: { [key: string]: (event: any) => void };
}

@Component({
  selector: 'app-dynamic-component-host',
  templateUrl: './dynamic-component-host.component.html',
  styleUrls: ['./dynamic-component-host.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicComponentHostComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private componentRef: ComponentRef<any> | null = null;
  
  @ViewChild('dynamicComponentContainer', { read: ViewContainerRef, static: true })
  dynamicComponentContainer!: ViewContainerRef;
  
  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.cdr.markForCheck();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyComponent();
  }
  
  loadComponent(componentData: DynamicComponentData): void {
    this.destroyComponent();
    
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(componentData.component);
    this.componentRef = this.dynamicComponentContainer.createComponent(componentFactory);
    
    // Set inputs
    if (componentData.inputs) {
      Object.keys(componentData.inputs).forEach(key => {
        if (this.componentRef?.instance.hasOwnProperty(key)) {
          this.componentRef.instance[key] = componentData.inputs![key];
        }
      });
    }
    
    // Subscribe to outputs
    if (componentData.outputs) {
      Object.keys(componentData.outputs).forEach(key => {
        if (this.componentRef?.instance[key] && this.componentRef.instance[key].subscribe) {
          this.componentRef.instance[key]
            .pipe(takeUntil(this.destroy$))
            .subscribe(componentData.outputs![key]);
        }
      });
    }
    
    this.cdr.markForCheck();
  }
  
  private destroyComponent(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = null;
    }
    this.dynamicComponentContainer.clear();
  }
  
  updateComponentInputs(inputs: { [key: string]: any }): void {
    if (this.componentRef) {
      Object.keys(inputs).forEach(key => {
        if (this.componentRef?.instance.hasOwnProperty(key)) {
          this.componentRef.instance[key] = inputs[key];
        }
      });
      this.cdr.markForCheck();
    }
  }
  
  getComponentInstance<T>(): T | null {
    return this.componentRef ? this.componentRef.instance : null;
  }
}
```

## Advanced Service Patterns

### Example 5: Caching Service with TTL
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';

interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
}

interface CacheConfig {
  readonly defaultTTL: number;
  readonly maxSize: number;
  readonly cleanupInterval: number;
}

@Injectable({
  providedIn: 'root'
})
export class CachingService {
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    cleanupInterval: 60 * 1000 // 1 minute
  };
  
  private cleanupTimer: any;
  
  constructor(private http: HttpClient) {
    this.startCleanupTimer();
  }
  
  get<T>(key: string, factory: () => Observable<T>, ttl?: number): Observable<T> {
    const cached = this.getCachedData<T>(key);
    
    if (cached) {
      return of(cached);
    }
    
    return factory().pipe(
      tap(data => this.setCachedData(key, data, ttl)),
      catchError(error => {
        console.error(`Cache factory error for key ${key}:`, error);
        throw error;
      })
    );
  }
  
  set<T>(key: string, data: T, ttl?: number): void {
    this.setCachedData(key, data, ttl);
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  getSize(): number {
    return this.cache.size;
  }
  
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldestEntry();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };
    
    this.cache.set(key, entry);
  }
  
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
  
  private evictOldestEntry(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  private cleanup(): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  ngOnDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}
```

### Example 6: WebSocket Service with Reconnection
```typescript
import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, NEVER } from 'rxjs';
import { retryWhen, delay, take, switchMap, tap, catchError } from 'rxjs/operators';

interface WebSocketConfig {
  readonly url: string;
  readonly reconnectInterval: number;
  readonly maxReconnectAttempts: number;
  readonly protocols?: string[];
}

interface WebSocketMessage {
  readonly type: string;
  readonly payload: any;
  readonly timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private readonly messageSubject = new Subject<WebSocketMessage>();
  private readonly connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new Subject<Event>();
  
  private config: WebSocketConfig | null = null;
  private reconnectAttempts = 0;
  
  readonly messages$ = this.messageSubject.asObservable();
  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();
  readonly errors$ = this.errorSubject.asObservable();
  
  connect(config: WebSocketConfig): Observable<boolean> {
    this.config = config;
    this.reconnectAttempts = 0;
    
    return this.createConnection().pipe(
      retryWhen(errors => 
        errors.pipe(
          tap(error => {
            console.error('WebSocket connection error:', error);
            this.reconnectAttempts++;
          }),
          delay(this.config.reconnectInterval),
          take(this.config.maxReconnectAttempts),
          switchMap(error => {
            if (this.reconnectAttempts >= this.config!.maxReconnectAttempts) {
              console.error('Max reconnection attempts reached');
              return NEVER;
            }
            return timer(0);
          })
        )
      )
    );
  }
  
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.connectionStatusSubject.next(false);
  }
  
  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now()
      };
      this.socket.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }
  
  private createConnection(): Observable<boolean> {
    return new Observable(observer => {
      if (!this.config) {
        observer.error(new Error('WebSocket configuration not provided'));
        return;
      }
      
      try {
        this.socket = new WebSocket(this.config.url, this.config.protocols);
        
        this.socket.onopen = (event) => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionStatusSubject.next(true);
          observer.next(true);
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.messageSubject.next(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        this.socket.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.errorSubject.next(event);
          this.connectionStatusSubject.next(false);
          observer.error(event);
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.connectionStatusSubject.next(false);
          
          if (event.code !== 1000) { // Not a normal closure
            observer.error(new Error(`WebSocket closed with code ${event.code}: ${event.reason}`));
          } else {
            observer.complete();
          }
        };
        
      } catch (error) {
        observer.error(error);
      }
      
      return () => {
        if (this.socket) {
          this.socket.close();
        }
      };
    });
  }
  
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
  
  getConnectionState(): number {
    return this.socket?.readyState || WebSocket.CLOSED;
  }
}
```