# Angular Service Coding Standards

## Service Structure Requirements

### 1. Service Class Template
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class [ServiceName]Service {
  private readonly apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  async getData(): Promise<DataModel[]> {
    try {
      return await this.http.get<DataModel[]>(`${this.apiUrl}/endpoint`)
        .pipe(
          retry(2),
          catchError(this.handleError)
        ).toPromise() as DataModel[];
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error}`);
    }
  }
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      errorMessage = `Server error: ${error.status} - ${error.message}`;
    }
    
    console.error('Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
```

### 2. Mandatory Requirements
- ALWAYS use @Injectable with providedIn: 'root'
- ALWAYS implement proper error handling with try-catch
- ALWAYS use async/await for HTTP operations
- ALWAYS implement retry logic for HTTP calls
- ALWAYS use typed responses (specify generic types)
- ALWAYS create private error handling methods
- ALWAYS use environment variables for API URLs

### 3. HTTP Best Practices
- Use HttpClient for all HTTP operations
- Implement proper timeout handling
- Use interceptors for authentication headers
- Handle loading states appropriately
- Implement proper logging for errors

### 4. Error Handling Standards
- Create specific error types for different scenarios
- Log errors with appropriate detail level
- Provide meaningful error messages to users
- Implement fallback mechanisms where appropriate

### 5. Service Naming Conventions
- Service files: [feature-name].service.ts
- Service classes: [FeatureName]Service (PascalCase)
- Method names: camelCase with descriptive verbs
- Private methods: prefix with underscore or use private keyword

### 6. Complete Service Examples

#### Example 1: CRUD Service with Caching
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, retry, map, tap, finalize, switchMap } from 'rxjs/operators';

interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
}

interface PaginatedResponse<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = environment.apiUrl + '/products';
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  
  readonly loading$ = this.loadingSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.startCacheCleanup();
  }
  
  async getProducts(page = 1, limit = 10, useCache = true): Promise<PaginatedResponse<Product>> {
    const cacheKey = `products_${page}_${limit}`;
    
    if (useCache) {
      const cached = this.getCachedData<PaginatedResponse<Product>>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    this.setLoading(true);
    
    try {
      const params = new HttpParams()
        .set('page', page.toString())
        .set('limit', limit.toString());
      
      const response = await this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}`, { params })
        .pipe(
          retry(2),
          tap(data => this.setCachedData(cacheKey, data)),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as PaginatedResponse<Product>;
      
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch products: ${error}`);
    }
  }
  
  async getProductById(id: number, useCache = true): Promise<Product> {
    const cacheKey = `product_${id}`;
    
    if (useCache) {
      const cached = this.getCachedData<Product>(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    this.setLoading(true);
    
    try {
      const response = await this.http.get<Product>(`${this.apiUrl}/${id}`)
        .pipe(
          retry(2),
          tap(data => this.setCachedData(cacheKey, data)),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as Product;
      
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch product ${id}: ${error}`);
    }
  }
  
  async createProduct(productData: CreateProductRequest): Promise<Product> {
    this.setLoading(true);
    
    try {
      const response = await this.http.post<Product>(`${this.apiUrl}`, productData)
        .pipe(
          tap(() => this.invalidateCache('products_')),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as Product;
      
      return response;
    } catch (error) {
      throw new Error(`Failed to create product: ${error}`);
    }
  }
  
  async updateProduct(id: number, productData: UpdateProductRequest): Promise<Product> {
    this.setLoading(true);
    
    try {
      const response = await this.http.put<Product>(`${this.apiUrl}/${id}`, productData)
        .pipe(
          tap(() => {
            this.invalidateCache('products_');
            this.invalidateCache(`product_${id}`);
          }),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise() as Product;
      
      return response;
    } catch (error) {
      throw new Error(`Failed to update product ${id}: ${error}`);
    }
  }
  
  async deleteProduct(id: number): Promise<void> {
    this.setLoading(true);
    
    try {
      await this.http.delete(`${this.apiUrl}/${id}`)
        .pipe(
          tap(() => {
            this.invalidateCache('products_');
            this.invalidateCache(`product_${id}`);
          }),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        ).toPromise();
    } catch (error) {
      throw new Error(`Failed to delete product ${id}: ${error}`);
    }
  }
  
  searchProducts(query: string, filters?: ProductFilters): Observable<Product[]> {
    let params = new HttpParams().set('search', query);
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof ProductFilters];
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<Product[]>(`${this.apiUrl}/search`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }
  
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCachedData<T>(key: string, data: T, ttl = this.defaultCacheTTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.cache.set(key, entry);
  }
  
  private invalidateCache(keyPrefix: string): void {
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith(keyPrefix));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.cache.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.cache.delete(key));
    }, 60000); // Clean up every minute
  }
  
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
      errorCode = 'CLIENT_ERROR';
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Bad request - please check your input';
          errorCode = 'BAD_REQUEST';
          break;
        case 401:
          errorMessage = 'Unauthorized - please log in';
          errorCode = 'UNAUTHORIZED';
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          errorMessage = 'Resource not found';
          errorCode = 'NOT_FOUND';
          break;
        case 409:
          errorMessage = 'Conflict - resource already exists';
          errorCode = 'CONFLICT';
          break;
        case 422:
          errorMessage = 'Validation error - please check your data';
          errorCode = 'VALIDATION_ERROR';
          break;
        case 429:
          errorMessage = 'Too many requests - please try again later';
          errorCode = 'RATE_LIMITED';
          break;
        case 500:
          errorMessage = 'Internal server error';
          errorCode = 'SERVER_ERROR';
          break;
        case 503:
          errorMessage = 'Service unavailable - please try again later';
          errorCode = 'SERVICE_UNAVAILABLE';
          break;
        default:
          errorMessage = `Server error: ${error.status} - ${error.message}`;
          errorCode = `HTTP_${error.status}`;
      }
    }
    
    console.error('ProductService Error:', {
      message: errorMessage,
      code: errorCode,
      status: error.status,
      url: error.url,
      timestamp: new Date().toISOString()
    });
    
    return throwError(() => ({
      message: errorMessage,
      code: errorCode,
      originalError: error
    }));
  }
}
```

#### Example 2: Real-time Data Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, timer, EMPTY } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { catchError, retry, retryWhen, delay, take, switchMap, tap } from 'rxjs/operators';

interface WebSocketMessage {
  readonly type: string;
  readonly payload: any;
  readonly timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeDataService {
  private readonly wsUrl = environment.wsUrl;
  private readonly reconnectInterval = 5000;
  private readonly maxReconnectAttempts = 5;
  
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;
  private readonly connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private readonly messagesSubject = new Subject<WebSocketMessage>();
  private readonly errorSubject = new Subject<any>();
  
  private reconnectAttempts = 0;
  
  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();
  readonly messages$ = this.messagesSubject.asObservable();
  readonly errors$ = this.errorSubject.asObservable();
  
  constructor(private http: HttpClient) {}
  
  connect(): Observable<boolean> {
    if (this.socket$) {
      return this.connectionStatus$;
    }
    
    return this.createConnection();
  }
  
  disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }
    this.connectionStatusSubject.next(false);
  }
  
  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    if (this.socket$ && this.connectionStatusSubject.value) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now()
      };
      this.socket$.next(fullMessage);
    } else {
      console.warn('WebSocket not connected. Message queued:', message);
      // Could implement message queuing here
    }
  }
  
  private createConnection(): Observable<boolean> {
    this.socket$ = webSocket({
      url: this.wsUrl,
      openObserver: {
        next: () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionStatusSubject.next(true);
        }
      },
      closeObserver: {
        next: () => {
          console.log('WebSocket disconnected');
          this.connectionStatusSubject.next(false);
          this.handleReconnection();
        }
      }
    });
    
    this.socket$
      .pipe(
        retry(),
        catchError(error => {
          console.error('WebSocket error:', error);
          this.errorSubject.next(error);
          this.connectionStatusSubject.next(false);
          return EMPTY;
        })
      )
      .subscribe(message => {
        this.messagesSubject.next(message);
      });
    
    return this.connectionStatus$;
  }
  
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      timer(this.reconnectInterval)
        .pipe(take(1))
        .subscribe(() => {
          this.socket$ = null;
          this.connect().subscribe();
        });
    } else {
      console.error('Max reconnection attempts reached');
      this.errorSubject.next(new Error('Connection failed after maximum retry attempts'));
    }
  }
  
  subscribeToChannel(channel: string): Observable<any> {
    return this.messages$.pipe(
      filter(message => message.type === 'channel_data' && message.payload.channel === channel),
      map(message => message.payload.data),
      catchError(error => {
        console.error(`Error in channel ${channel}:`, error);
        return EMPTY;
      })
    );
  }
  
  joinChannel(channel: string): void {
    this.send({
      type: 'join_channel',
      payload: { channel }
    });
  }
  
  leaveChannel(channel: string): void {
    this.send({
      type: 'leave_channel',
      payload: { channel }
    });
  }
  
  isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }
}
```