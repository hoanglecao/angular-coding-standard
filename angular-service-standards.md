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