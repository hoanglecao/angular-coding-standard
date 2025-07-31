import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { UserModel, CreateUserRequest, ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = 'https://api.example.com/users';
  
  constructor(private http: HttpClient) {}
  
  async getUsers(): Promise<UserModel[]> {
    try {
      const response = await this.http.get<ApiResponse<UserModel[]>>(`${this.apiUrl}`)
        .pipe(
          retry(2),
          catchError(this.handleError)
        ).toPromise() as ApiResponse<UserModel[]>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }
  
  async getUserById(id: number): Promise<UserModel> {
    try {
      const response = await this.http.get<ApiResponse<UserModel>>(`${this.apiUrl}/${id}`)
        .pipe(
          retry(2),
          catchError(this.handleError)
        ).toPromise() as ApiResponse<UserModel>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user ${id}: ${error}`);
    }
  }
  
  async createUser(userData: CreateUserRequest): Promise<UserModel> {
    try {
      const response = await this.http.post<ApiResponse<UserModel>>(`${this.apiUrl}`, userData)
        .pipe(
          catchError(this.handleError)
        ).toPromise() as ApiResponse<UserModel>;
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      errorMessage = `Server error: ${error.status} - ${error.message}`;
    }
    
    console.error('UserService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}