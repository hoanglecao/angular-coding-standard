import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

export interface AuthUser {
  readonly id: number;
  readonly email: string;
  readonly roles: string[];
  readonly permissions: string[];
  readonly isActive: boolean;
  readonly lastLogin: Date;
  readonly profile: UserProfile;
  readonly settings: UserSettings;
}

export interface UserProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly avatar?: string;
  readonly department: string;
  readonly position: string;
  readonly phoneNumber?: string;
  readonly address?: Address;
}

export interface UserSettings {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly language: string;
  readonly timezone: string;
  readonly notifications: NotificationSettings;
  readonly privacy: PrivacySettings;
}

export interface NotificationSettings {
  readonly email: boolean;
  readonly push: boolean;
  readonly sms: boolean;
  readonly inApp: boolean;
  readonly frequency: 'immediate' | 'daily' | 'weekly';
}

export interface PrivacySettings {
  readonly profileVisibility: 'public' | 'private' | 'contacts';
  readonly showOnlineStatus: boolean;
  readonly allowDirectMessages: boolean;
  readonly shareAnalytics: boolean;
}

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
}

export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly user: AuthUser | null;
  readonly token: string | null;
  readonly refreshToken: string | null;
  readonly expiresAt: Date | null;
  readonly loginTime: Date | null;
  readonly lastActivity: Date | null;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
  readonly deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  readonly userAgent: string;
  readonly platform: string;
  readonly language: string;
  readonly timezone: string;
}

export interface LoginResponse {
  readonly success: boolean;
  readonly message?: string;
  readonly user: AuthUser;
  readonly token: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly permissions: string[];
  readonly sessionId: string;
}

export interface RefreshTokenResponse {
  readonly success: boolean;
  readonly token: string;
  readonly expiresAt: string;
  readonly sessionId: string;
}

export interface LogoutRequest {
  readonly token: string;
  readonly sessionId?: string;
  readonly reason?: 'user_logout' | 'session_timeout' | 'security_logout';
}

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private loggingService: LoggingService
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuthentication(state.url, route.data);
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }
  
  private checkAuthentication(url: string, routeData?: any): Observable<boolean> {
    return this.authService.getCurrentAuthState().pipe(
      map(authState => this.validateAuthState(authState, routeData, url)),
      tap(isValid => {
        if (!isValid) {
          this.handleAuthFailure(url, routeData);
        } else {
          this.updateLastActivity();
        }
      }),
      catchError(error => {
        this.loggingService.logError('Authentication check failed', error, { url, routeData });
        this.handleAuthError(error, url);
        return of(false);
      })
    );
  }
  
  private validateAuthState(authState: AuthState, routeData?: any, url?: string): boolean {
    if (!authState.isAuthenticated || !authState.user) {
      this.loggingService.logWarning('User not authenticated', { url, authState: !!authState });
      return false;
    }
    
    if (!authState.user.isActive) {
      this.notificationService.showError(
        'Account Suspended',
        'Your account has been suspended. Please contact support.'
      );
      this.loggingService.logWarning('Inactive user attempted access', { 
        userId: authState.user.id, 
        url 
      });
      return false;
    }
    
    if (this.isTokenExpired(authState.expiresAt)) {
      this.loggingService.logInfo('Token expired', { 
        userId: authState.user.id, 
        expiresAt: authState.expiresAt 
      });
      return false;
    }
    
    if (this.isSessionExpired(authState.lastActivity)) {
      this.loggingService.logInfo('Session expired due to inactivity', { 
        userId: authState.user.id, 
        lastActivity: authState.lastActivity 
      });
      this.notificationService.showWarning(
        'Session Expired',
        'Your session has expired due to inactivity. Please log in again.'
      );
      return false;
    }
    
    if (routeData?.requiredRoles && !this.hasRequiredRoles(authState.user, routeData.requiredRoles)) {
      this.loggingService.logWarning('User lacks required roles', {
        userId: authState.user.id,
        userRoles: authState.user.roles,
        requiredRoles: routeData.requiredRoles,
        url
      });
      return false;
    }
    
    if (routeData?.requiredPermissions && !this.hasRequiredPermissions(authState.user, routeData.requiredPermissions)) {
      this.loggingService.logWarning('User lacks required permissions', {
        userId: authState.user.id,
        userPermissions: authState.user.permissions,
        requiredPermissions: routeData.requiredPermissions,
        url
      });
      return false;
    }
    
    if (routeData?.requiresSecureAccess && !this.hasSecureAccess(authState)) {
      this.loggingService.logWarning('Secure access required but not available', {
        userId: authState.user.id,
        url
      });
      return false;
    }
    
    return true;
  }
  
  private isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) {
      return true;
    }
    
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return now.getTime() >= (expiresAt.getTime() - bufferTime);
  }
  
  private isSessionExpired(lastActivity: Date | null): boolean {
    if (!lastActivity) {
      return false; // New session, not expired
    }
    
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes
    return (now.getTime() - lastActivity.getTime()) > maxInactiveTime;
  }
  
  private hasRequiredRoles(user: AuthUser, requiredRoles: string[]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    return requiredRoles.every(role => user.roles.includes(role));
  }
  
  private hasRequiredPermissions(user: AuthUser, requiredPermissions: string[]): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    
    return requiredPermissions.every(permission => user.permissions.includes(permission));
  }
  
  private hasSecureAccess(authState: AuthState): boolean {
    // Check if login was recent (within last hour for secure operations)
    if (!authState.loginTime) {
      return false;
    }
    
    const now = new Date();
    const secureAccessWindow = 60 * 60 * 1000; // 1 hour
    return (now.getTime() - authState.loginTime.getTime()) < secureAccessWindow;
  }
  
  private updateLastActivity(): void {
    this.authService.updateLastActivity();
  }
  
  private handleAuthFailure(url: string, routeData?: any): void {
    if (routeData?.requiredRoles || routeData?.requiredPermissions) {
      this.notificationService.showError(
        'Access Denied',
        'You do not have permission to access this resource.'
      );
      this.router.navigate(['/dashboard']);
    } else if (routeData?.requiresSecureAccess) {
      this.notificationService.showWarning(
        'Secure Access Required',
        'Please log in again to access this secure area.'
      );
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: url, secureAccess: 'required' }
      });
    } else {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: url }
      });
    }
  }
  
  private handleAuthError(error: any, url: string): void {
    this.notificationService.showError(
      'Authentication Error',
      'An error occurred while checking authentication. Please try again.'
    );
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: url, error: 'auth_check_failed' }
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    expiresAt: null,
    loginTime: null,
    lastActivity: null
  });
  
  private refreshTokenTimer?: number;
  private activityCheckTimer?: number;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private loggingService: LoggingService,
    private notificationService: NotificationService
  ) {
    this.initializeAuthState();
    this.setupActivityMonitoring();
  }
  
  getCurrentAuthState(): Observable<AuthState> {
    return this.authStateSubject.asObservable();
  }
  
  async login(loginRequest: LoginRequest): Promise<AuthState> {
    try {
      this.loggingService.logInfo('Login attempt started', { email: loginRequest.email });
      
      const response = await this.http.post<LoginResponse>('/api/auth/login', {
        ...loginRequest,
        deviceInfo: this.getDeviceInfo()
      }).toPromise();
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Login failed');
      }
      
      const authState: AuthState = {
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        refreshToken: response.refreshToken,
        expiresAt: new Date(response.expiresAt),
        loginTime: new Date(),
        lastActivity: new Date()
      };
      
      this.updateAuthState(authState);
      this.scheduleTokenRefresh(authState.expiresAt);
      
      this.loggingService.logInfo('Login successful', { 
        userId: response.user.id,
        sessionId: response.sessionId
      });
      
      return authState;
    } catch (error) {
      this.loggingService.logError('Login failed', error, { email: loginRequest.email });
      throw new Error('Login failed. Please check your credentials.');
    }
  }
  
  async logout(reason: 'user_logout' | 'session_timeout' | 'security_logout' = 'user_logout'): Promise<void> {
    try {
      const currentState = this.authStateSubject.value;
      
      if (currentState.token) {
        const logoutRequest: LogoutRequest = {
          token: currentState.token,
          reason
        };
        
        await this.http.post('/api/auth/logout', logoutRequest).toPromise();
        
        this.loggingService.logInfo('Logout successful', {
          userId: currentState.user?.id,
          reason
        });
      }
    } catch (error) {
      this.loggingService.logError('Logout request failed', error);
    } finally {
      this.clearAuthState();
      this.clearTimers();
      this.router.navigate(['/login']);
    }
  }
  
  async refreshToken(): Promise<AuthState> {
    try {
      const currentState = this.authStateSubject.value;
      if (!currentState.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await this.http.post<RefreshTokenResponse>('/api/auth/refresh', {
        refreshToken: currentState.refreshToken
      }).toPromise();
      
      if (!response || !response.success) {
        throw new Error('Token refresh failed');
      }
      
      const newAuthState: AuthState = {
        ...currentState,
        token: response.token,
        expiresAt: new Date(response.expiresAt),
        lastActivity: new Date()
      };
      
      this.updateAuthState(newAuthState);
      this.scheduleTokenRefresh(newAuthState.expiresAt);
      
      this.loggingService.logInfo('Token refresh successful', {
        userId: currentState.user?.id,
        sessionId: response.sessionId
      });
      
      return newAuthState;
    } catch (error) {
      this.loggingService.logError('Token refresh failed', error);
      this.clearAuthState();
      throw error;
    }
  }
  
  updateLastActivity(): void {
    const currentState = this.authStateSubject.value;
    if (currentState.isAuthenticated) {
      const updatedState: AuthState = {
        ...currentState,
        lastActivity: new Date()
      };
      this.authStateSubject.next(updatedState);
    }
  }
  
  clearAuthState(): void {
    const clearedState: AuthState = {
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      expiresAt: null,
      loginTime: null,
      lastActivity: null
    };
    
    this.updateAuthState(clearedState);
    this.clearStoredAuth();
  }
  
  private initializeAuthState(): void {
    try {
      const storedAuth = localStorage.getItem('auth-state');
      if (storedAuth) {
        const parsedAuth = JSON.parse(storedAuth);
        const authState: AuthState = {
          ...parsedAuth,
          expiresAt: parsedAuth.expiresAt ? new Date(parsedAuth.expiresAt) : null,
          loginTime: parsedAuth.loginTime ? new Date(parsedAuth.loginTime) : null,
          lastActivity: parsedAuth.lastActivity ? new Date(parsedAuth.lastActivity) : null
        };
        
        if (this.isValidStoredAuth(authState)) {
          this.authStateSubject.next(authState);
          this.scheduleTokenRefresh(authState.expiresAt);
          this.loggingService.logInfo('Auth state restored from storage', {
            userId: authState.user?.id
          });
        } else {
          this.clearAuthState();
          this.loggingService.logInfo('Invalid stored auth state cleared');
        }
      }
    } catch (error) {
      this.loggingService.logError('Failed to initialize auth state', error);
      this.clearAuthState();
    }
  }
  
  private isValidStoredAuth(authState: AuthState): boolean {
    return !!(
      authState.isAuthenticated &&
      authState.user &&
      authState.token &&
      authState.expiresAt &&
      authState.expiresAt > new Date()
    );
  }
  
  private updateAuthState(authState: AuthState): void {
    this.authStateSubject.next(authState);
    this.storeAuthState(authState);
  }
  
  private storeAuthState(authState: AuthState): void {
    try {
      const stateToStore = {
        ...authState,
        // Don't store sensitive data in localStorage for security
        token: authState.isAuthenticated ? authState.token : null,
        refreshToken: authState.isAuthenticated ? authState.refreshToken : null
      };
      localStorage.setItem('auth-state', JSON.stringify(stateToStore));
    } catch (error) {
      this.loggingService.logError('Failed to store auth state', error);
    }
  }
  
  private clearStoredAuth(): void {
    try {
      localStorage.removeItem('auth-state');
    } catch (error) {
      this.loggingService.logError('Failed to clear stored auth', error);
    }
  }
  
  private scheduleTokenRefresh(expiresAt: Date | null): void {
    this.clearRefreshTimer();
    
    if (!expiresAt) return;
    
    const now = new Date();
    const refreshTime = expiresAt.getTime() - now.getTime() - (10 * 60 * 1000); // 10 minutes before expiry
    
    if (refreshTime > 0) {
      this.refreshTokenTimer = window.setTimeout(() => {
        this.refreshToken().catch(error => {
          this.loggingService.logError('Scheduled token refresh failed', error);
          this.logout('session_timeout');
        });
      }, refreshTime);
    }
  }
  
  private setupActivityMonitoring(): void {
    // Check for session timeout every minute
    this.activityCheckTimer = window.setInterval(() => {
      const currentState = this.authStateSubject.value;
      if (currentState.isAuthenticated && currentState.lastActivity) {
        const now = new Date();
        const maxInactiveTime = 30 * 60 * 1000; // 30 minutes
        
        if ((now.getTime() - currentState.lastActivity.getTime()) > maxInactiveTime) {
          this.notificationService.showWarning(
            'Session Expired',
            'Your session has expired due to inactivity.'
          );
          this.logout('session_timeout');
        }
      }
    }, 60000); // Check every minute
  }
  
  private clearTimers(): void {
    this.clearRefreshTimer();
    this.clearActivityTimer();
  }
  
  private clearRefreshTimer(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = undefined;
    }
  }
  
  private clearActivityTimer(): void {
    if (this.activityCheckTimer) {
      clearInterval(this.activityCheckTimer);
      this.activityCheckTimer = undefined;
    }
  }
  
  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

// Mock services for compilation
@Injectable({ providedIn: 'root' })
export class NotificationService {
  showError(title: string, message: string): void {}
  showWarning(title: string, message: string): void {}
}

@Injectable({ providedIn: 'root' })
export class LoggingService {
  logInfo(message: string, data?: any): void {}
  logWarning(message: string, data?: any): void {}
  logError(message: string, error: any, data?: any): void {}
}