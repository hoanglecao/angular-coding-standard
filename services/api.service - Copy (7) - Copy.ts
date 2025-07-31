import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, timeout, finalize } from 'rxjs/operators';

export interface ApiRequestConfig {
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly body?: any;
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string>;
  readonly timeout?: number;
  readonly retries?: number;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
  readonly timestamp: Date;
}

export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'https://api.example.com';
  private readonly defaultTimeout = 30000;
  private readonly defaultRetries = 2;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  
  constructor(private http: HttpClient) {}
  
  get isLoading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }
  
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const config: ApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'GET',
      params
    };
    
    return this.executeRequest<T>(config);
  }
  
  async post<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
    const config: ApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'POST',
      body,
      headers
    };
    
    return this.executeRequest<T>(config);
  }
  
  async put<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
    const config: ApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'PUT',
      body,
      headers
    };
    
    return this.executeRequest<T>(config);
  }
  
  async delete<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const config: ApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'DELETE',
      params
    };
    
    return this.executeRequest<T>(config);
  }
  
  async patch<T>(endpoint: string, body: any, headers?: Record<string, string>): Promise<T> {
    const config: ApiRequestConfig = {
      url: `${this.baseUrl}${endpoint}`,
      method: 'PATCH',
      body,
      headers
    };
    
    return this.executeRequest<T>(config);
  }
  
  async executeRequest<T>(config: ApiRequestConfig): Promise<T> {
    this.setLoading(true);
    
    try {
      const headers = this.buildHeaders(config.headers);
      const params = this.buildParams(config.params);
      const timeoutMs = config.timeout || this.defaultTimeout;
      const retries = config.retries || this.defaultRetries;
      
      let request: Observable<ApiResponse<T>>;
      
      switch (config.method) {
        case 'GET':
          request = this.http.get<ApiResponse<T>>(config.url, { headers, params });
          break;
        case 'POST':
          request = this.http.post<ApiResponse<T>>(config.url, config.body, { headers, params });
          break;
        case 'PUT':
          request = this.http.put<ApiResponse<T>>(config.url, config.body, { headers, params });
          break;
        case 'DELETE':
          request = this.http.delete<ApiResponse<T>>(config.url, { headers, params });
          break;
        case 'PATCH':
          request = this.http.patch<ApiResponse<T>>(config.url, config.body, { headers, params });
          break;
        default:
          throw new ApiError('Unsupported HTTP method', 400);
      }
      
      const response = await request
        .pipe(
          timeout(timeoutMs),
          retry(retries),
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        )
        .toPromise() as ApiResponse<T>;
      
      if (!response.success) {
        throw new ApiError(response.message || 'Request failed', 400);
      }
      
      return response.data;
    } catch (error) {
      this.setLoading(false);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Request failed: ${error}`, 500);
    }
  }
  
  async getPaginated<T>(
    endpoint: string,
    page = 1,
    pageSize = 10,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<T>> {
    const paginationParams = {
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...params
    };
    
    try {
      const response = await this.get<PaginatedResponse<T>>(endpoint, paginationParams);
      return response;
    } catch (error) {
      throw new ApiError(`Failed to fetch paginated data: ${error}`, 500);
    }
  }
  
  async uploadFile(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<any> {
    this.setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (additionalData) {
        Object.keys(additionalData).forEach(key => {
          formData.append(key, additionalData[key]);
        });
      }
      
      const response = await this.http.post<ApiResponse<any>>(`${this.baseUrl}${endpoint}`, formData)
        .pipe(
          timeout(60000), // Longer timeout for file uploads
          catchError(this.handleError),
          finalize(() => this.setLoading(false))
        )
        .toPromise() as ApiResponse<any>;
      
      if (!response.success) {
        throw new ApiError(response.message || 'File upload failed', 400);
      }
      
      return response.data;
    } catch (error) {
      this.setLoading(false);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`File upload failed: ${error}`, 500);
    }
  }
  
  private buildHeaders(customHeaders?: Record<string, string>): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
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
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      statusCode = error.status;
      errorMessage = error.error?.message || `Server error: ${error.status} - ${error.message}`;
    }
    
    console.error('API Error:', {
      status: statusCode,
      message: errorMessage,
      url: error.url,
      timestamp: new Date().toISOString()
    });
    
    return throwError(() => new ApiError(errorMessage, statusCode));
  };
  
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
}