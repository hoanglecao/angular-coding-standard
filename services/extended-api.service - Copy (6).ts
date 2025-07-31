import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, timeout, finalize } from 'rxjs/operators';

// Extended version with additional methods and interfaces
export interface ExtendedApiRequestConfig {
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  readonly body?: any;
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string>;
  readonly timeout?: number;
  readonly retries?: number;
  readonly cache?: boolean;
  readonly validateStatus?: (status: number) => boolean;
  readonly transformRequest?: (data: any) => any;
  readonly transformResponse?: (data: any) => any;
}

export interface ExtendedApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
  readonly timestamp: Date;
  readonly requestId: string;
  readonly version: string;
  readonly metadata?: Record<string, any>;
}

export interface ExtendedPaginatedResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
  readonly totalPages: number;
  readonly firstPage: number;
  readonly lastPage: number;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly filters?: Record<string, any>;
}

export interface SearchRequest {
  readonly query: string;
  readonly filters?: Record<string, any>;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
  readonly page?: number;
  readonly pageSize?: number;
  readonly includeMetadata?: boolean;
}

export interface SearchResponse<T> {
  readonly results: T[];
  readonly total: number;
  readonly query: string;
  readonly searchTime: number;
  readonly suggestions?: string[];
  readonly facets?: Record<string, any>;
  readonly highlights?: Record<string, string[]>;
}

export interface BatchRequest<T> {
  readonly operations: BatchOperation<T>[];
  readonly transactional?: boolean;
  readonly continueOnError?: boolean;
}

export interface BatchOperation<T> {
  readonly id: string;
  readonly method: 'CREATE' | 'UPDATE' | 'DELETE';
  readonly data: T;
  readonly endpoint?: string;
}

export interface BatchResponse<T> {
  readonly results: BatchResult<T>[];
  readonly successful: number;
  readonly failed: number;
  readonly errors: BatchError[];
}

export interface BatchResult<T> {
  readonly id: string;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export interface BatchError {
  readonly operationId: string;
  readonly error: string;
  readonly code: string;
}

export class ExtendedApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: any,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ExtendedApiError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExtendedApiService {
  private readonly baseUrl = 'https://api.example.com';
  private readonly defaultTimeout = 30000;
  private readonly defaultRetries = 2;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly requestCache = new Map<string, any>();
  
  constructor(private http: HttpClient) {}
  
  get isLoading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }
  
  async get<T>(endpoint: string, params?: Record<string, string>, options?: Partial<ExtendedApiRequestConfig>): Promise<T> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'GET',
      params,
      ...options
    };
    
    return this.executeRequest<T>(config);
  }
  
  async post<T>(endpoint: string, body: any, headers?: Record<string, string>, options?: Partial<ExtendedApiRequestConfig>): Promise<T> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'POST',
      body,
      headers,
      ...options
    };
    
    return this.executeRequest<T>(config);
  }
  
  async put<T>(endpoint: string, body: any, headers?: Record<string, string>, options?: Partial<ExtendedApiRequestConfig>): Promise<T> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'PUT',
      body,
      headers,
      ...options
    };
    
    return this.executeRequest<T>(config);
  }
  
  async delete<T>(endpoint: string, params?: Record<string, string>, options?: Partial<ExtendedApiRequestConfig>): Promise<T> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'DELETE',
      params,
      ...options
    };
    
    return this.executeRequest<T>(config);
  }
  
  async patch<T>(endpoint: string, body: any, headers?: Record<string, string>, options?: Partial<ExtendedApiRequestConfig>): Promise<T> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'PATCH',
      body,
      headers,
      ...options
    };
    
    return this.executeRequest<T>(config);
  }
  
  async head(endpoint: string, params?: Record<string, string>, options?: Partial<ExtendedApiRequestConfig>): Promise<void> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'HEAD',
      params,
      ...options
    };
    
    await this.executeRequest<void>(config);
  }
  
  async options(endpoint: string, options?: Partial<ExtendedApiRequestConfig>): Promise<any> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'OPTIONS',
      ...options
    };
    
    return this.executeRequest<any>(config);
  }
  
  async search<T>(endpoint: string, searchRequest: SearchRequest): Promise<SearchResponse<T>> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}/search`,
      method: 'POST',
      body: searchRequest
    };
    
    try {
      const response = await this.executeRequest<SearchResponse<T>>(config);
      return response;
    } catch (error) {
      throw new ExtendedApiError(`Search failed: ${error}`, 500);
    }
  }
  
  async batch<T>(endpoint: string, batchRequest: BatchRequest<T>): Promise<BatchResponse<T>> {
    const config: ExtendedApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}/batch`,
      method: 'POST',
      body: batchRequest,
      timeout: 60000 // Longer timeout for batch operations
    };
    
    try {
      const response = await this.executeRequest<BatchResponse<T>>(config);
      return response;
    } catch (error) {
      throw new ExtendedApiError(`Batch operation failed: ${error}`, 500);
    }
  }
  
  async executeRequest<T>(config: ExtendedApiRequestConfig): Promise<T> {
    // Check cache first if enabled
    if (config.cache && config.method === 'GET') {
      const cacheKey = this.generateCacheKey(config);
      const cached = this.requestCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    this.setLoading(true);
    
    try {
      const headers = this.buildHeaders(config.headers);
      const params = this.buildParams(config.params);
      const timeoutMs = config.timeout || this.defaultTimeout;
      const retries = config.retries || this.defaultRetries;
      
      // Transform request data if transformer provided
      let requestBody = config.body;
      if (config.transformRequest && requestBody) {
        requestBody = config.transformRequest(requestBody);
      }
      
      let request: Observable<ExtendedApiResponse<T>>;
      
      switch (config.method) {
        case 'GET':
          request = this.http.get<ExtendedApiResponse<T>>(config.url, { headers, params });
          break;
        case 'POST':
          request = this.http.post<ExtendedApiResponse<T>>(config.url, requestBody, { headers, params });
          break;
        case 'PUT':
          request = this.http.put<ExtendedApiResponse<T>>(config.url, requestBody, { headers, params });
          break;
        case 'DELETE':
          request = this.http.delete<ExtendedApiResponse<T>>(config.url, { headers, params });
          break;
        case 'PATCH':
          request = this.http.patch<ExtendedApiResponse<T>>(config.url, requestBody, { headers, params });
          break;
        case 'HEAD':
          request = this.http.head<ExtendedApiResponse<T>>(config.url, { headers, params });
          break;
        case 'OPTIONS':
          request = this.http.options<ExtendedApiResponse<T>>(config.url, { headers });
          break;
        default:
          throw new ExtendedApiError('Unsupported HTTP method', 400);
      }
      
      const response = await request
        .pipe(
          timeout(timeoutMs),
          retry(retries),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        )
        .toPromise() as ExtendedApiResponse<T>;
      
      // Validate status if validator provided
      if (config.validateStatus && !config.validateStatus(200)) {
        throw new ExtendedApiError('Response validation failed', 400);
      }
      
      if (!response.success) {
        throw new ExtendedApiError(
          response.message || 'Request failed',
          400,
          undefined,
          response.metadata,
          response.requestId
        );
      }
      
      // Transform response data if transformer provided
      let responseData = response.data;
      if (config.transformResponse) {
        responseData = config.transformResponse(responseData);
      }
      
      // Cache response if caching enabled
      if (config.cache && config.method === 'GET') {
        const cacheKey = this.generateCacheKey(config);
        this.requestCache.set(cacheKey, responseData);
        
        // Auto-expire cache after 5 minutes
        setTimeout(() => {
          this.requestCache.delete(cacheKey);
        }, 5 * 60 * 1000);
      }
      
      return responseData;
    } catch (error) {
      this.setLoading(false);
      if (error instanceof ExtendedApiError) {
        throw error;
      }
      throw new ExtendedApiError(`Request failed: ${error}`, 500);
    }
  }
  
  async getPaginated<T>(
    endpoint: string,
    page = 1,
    pageSize = 10,
    params?: Record<string, string>,
    sortBy?: string,
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Promise<ExtendedPaginatedResponse<T>> {
    const paginationParams = {
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(sortBy && { sortBy }),
      ...(sortDirection && { sortDirection }),
      ...params
    };
    
    try {
      const response = await this.get<ExtendedPaginatedResponse<T>>(endpoint, paginationParams);
      return response;
    } catch (error) {
      throw new ExtendedApiError(`Failed to fetch paginated data: ${error}`, 500);
    }
  }
  
  async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    this.setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (additionalData) {
        Object.keys(additionalData).forEach(key => {
          formData.append(key, additionalData[key]);
        });
      }
      
      const request = this.http.post<ExtendedApiResponse<any>>(`${this.baseUrl}${endpoint}`, formData, {
        reportProgress: true,
        observe: 'events'
      });
      
      return new Promise((resolve, reject) => {
        request.subscribe({
          next: (event: any) => {
            if (event.type === 1 && onProgress) { // UploadProgress
              const progress = Math.round(100 * event.loaded / event.total);
              onProgress(progress);
            } else if (event.type === 4) { // Response
              const response = event.body as ExtendedApiResponse<any>;
              if (response.success) {
                resolve(response.data);
              } else {
                reject(new ExtendedApiError(response.message || 'File upload failed', 400));
              }
            }
          },
          error: (error) => {
            reject(new ExtendedApiError(`File upload failed: ${error}`, 500));
          },
          complete: () => {
            this.setLoading(false);
          }
        });
      });
    } catch (error) {
      this.setLoading(false);
      if (error instanceof ExtendedApiError) {
        throw error;
      }
      throw new ExtendedApiError(`File upload failed: ${error}`, 500);
    }
  }
  
  async downloadFile(endpoint: string, filename: string, params?: Record<string, string>): Promise<Blob> {
    this.setLoading(true);
    
    try {
      const httpParams = this.buildParams(params);
      
      const response = await this.http.get(`${this.baseUrl}${endpoint}`, {
        params: httpParams,
        responseType: 'blob'
      }).pipe(
        timeout(60000), // Longer timeout for downloads
        finalize(() => this.setLoading(false))
      ).toPromise() as Blob;
      
      return response;
    } catch (error) {
      this.setLoading(false);
      throw new ExtendedApiError(`File download failed: ${error}`, 500);
    }
  }
  
  clearCache(): void {
    this.requestCache.clear();
  }
  
  getCacheSize(): number {
    return this.requestCache.size;
  }
  
  private generateCacheKey(config: ExtendedApiRequestConfig): string {
    const keyData = {
      url: config.url,
      method: config.method,
      params: config.params,
      body: config.body
    };
    return btoa(JSON.stringify(keyData));
  }
  
  private buildHeaders(customHeaders?: Record<string, string>): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    });
    
    if (customHeaders) {
      Object.keys(customHeaders).forEach(key => {
        headers = headers.set(key, customHeaders[key]);
      });
    }
    
    return headers;
  }
  
  private buildParams(customParams?: Record<string, string>): HttpParams {
    let params = new HttpParams();
    
    if (customParams) {
      Object.keys(customParams).forEach(key => {
        if (customParams[key] !== null && customParams[key] !== undefined) {
          params = params.set(key, customParams[key]);
        }
      });
    }
    
    return params;
  }
  
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    let errorCode: string | undefined;
    let requestId: string | undefined;
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      statusCode = error.status;
      errorMessage = error.error?.message || `Server error: ${error.status} - ${error.message}`;
      errorCode = error.error?.code;
      requestId = error.error?.requestId;
    }
    
    console.error('Extended API Error:', {
      status: statusCode,
      message: errorMessage,
      code: errorCode,
      requestId: requestId,
      url: error.url,
      timestamp: new Date().toISOString()
    });
    
    return throwError(() => new ExtendedApiError(errorMessage, statusCode, errorCode, error.error, requestId));
  };
  
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
}