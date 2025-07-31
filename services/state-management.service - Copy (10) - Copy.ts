import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';

export interface AppState {
  readonly user: UserState;
  readonly ui: UiState;
  readonly data: DataState;
  readonly notifications: NotificationState;
}

export interface UserState {
  readonly currentUser: UserProfile | null;
  readonly isAuthenticated: boolean;
  readonly permissions: string[];
  readonly preferences: UserPreferences;
  readonly lastActivity: Date;
}

export interface UiState {
  readonly theme: 'light' | 'dark';
  readonly sidebarCollapsed: boolean;
  readonly loading: LoadingState;
  readonly modals: ModalState[];
  readonly breadcrumbs: BreadcrumbItem[];
}

export interface DataState {
  readonly cache: Record<string, CacheEntry>;
  readonly lastSync: Date;
  readonly syncInProgress: boolean;
  readonly offlineMode: boolean;
}

export interface NotificationState {
  readonly unreadCount: number;
  readonly items: NotificationItem[];
  readonly preferences: NotificationPreferences;
}

export interface UserProfile {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly avatar?: string;
  readonly role: string;
}

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly language: string;
  readonly timezone: string;
  readonly notifications: boolean;
}

export interface LoadingState {
  readonly global: boolean;
  readonly operations: Record<string, boolean>;
}

export interface ModalState {
  readonly id: string;
  readonly type: string;
  readonly data?: any;
  readonly isOpen: boolean;
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly url?: string;
  readonly icon?: string;
}

export interface CacheEntry {
  readonly key: string;
  readonly data: any;
  readonly timestamp: Date;
  readonly expiresAt: Date;
}

export interface NotificationItem {
  readonly id: string;
  readonly type: 'info' | 'success' | 'warning' | 'error';
  readonly title: string;
  readonly message: string;
  readonly read: boolean;
  readonly timestamp: Date;
}

export interface NotificationPreferences {
  readonly email: boolean;
  readonly push: boolean;
  readonly sound: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  private readonly initialState: AppState = {
    user: {
      currentUser: null,
      isAuthenticated: false,
      permissions: [],
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: true
      },
      lastActivity: new Date()
    },
    ui: {
      theme: 'light',
      sidebarCollapsed: false,
      loading: {
        global: false,
        operations: {}
      },
      modals: [],
      breadcrumbs: []
    },
    data: {
      cache: {},
      lastSync: new Date(),
      syncInProgress: false,
      offlineMode: false
    },
    notifications: {
      unreadCount: 0,
      items: [],
      preferences: {
        email: true,
        push: true,
        sound: false
      }
    }
  };
  
  private readonly stateSubject = new BehaviorSubject<AppState>(this.initialState);
  
  constructor() {
    this.loadStateFromStorage();
    this.setupAutoSave();
  }
  
  // State Selectors
  getState(): Observable<AppState> {
    return this.stateSubject.asObservable();
  }
  
  getUserState(): Observable<UserState> {
    return this.stateSubject.pipe(
      map(state => state.user),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getUiState(): Observable<UiState> {
    return this.stateSubject.pipe(
      map(state => state.ui),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getDataState(): Observable<DataState> {
    return this.stateSubject.pipe(
      map(state => state.data),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getNotificationState(): Observable<NotificationState> {
    return this.stateSubject.pipe(
      map(state => state.notifications),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getCurrentUser(): Observable<UserProfile | null> {
    return this.stateSubject.pipe(
      map(state => state.user.currentUser),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  isAuthenticated(): Observable<boolean> {
    return this.stateSubject.pipe(
      map(state => state.user.isAuthenticated),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getTheme(): Observable<'light' | 'dark'> {
    return this.stateSubject.pipe(
      map(state => state.ui.theme),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getLoadingState(): Observable<LoadingState> {
    return this.stateSubject.pipe(
      map(state => state.ui.loading),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  getUnreadNotificationCount(): Observable<number> {
    return this.stateSubject.pipe(
      map(state => state.notifications.unreadCount),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }
  
  // State Mutations
  async setCurrentUser(user: UserProfile | null): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        user: {
          ...currentState.user,
          currentUser: user,
          isAuthenticated: user !== null,
          lastActivity: new Date()
        }
      };
      
      this.stateSubject.next(newState);
      await this.saveStateToStorage();
    } catch (error) {
      console.error('Failed to set current user:', error);
      throw new Error('Failed to update user state');
    }
  }
  
  async setUserPermissions(permissions: string[]): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        user: {
          ...currentState.user,
          permissions: [...permissions]
        }
      };
      
      this.stateSubject.next(newState);
      await this.saveStateToStorage();
    } catch (error) {
      console.error('Failed to set user permissions:', error);
      throw new Error('Failed to update permissions');
    }
  }
  
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        user: {
          ...currentState.user,
          preferences: {
            ...currentState.user.preferences,
            ...preferences
          }
        }
      };
      
      this.stateSubject.next(newState);
      await this.saveStateToStorage();
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }
  
  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        ui: {
          ...currentState.ui,
          theme
        },
        user: {
          ...currentState.user,
          preferences: {
            ...currentState.user.preferences,
            theme
          }
        }
      };
      
      this.stateSubject.next(newState);
      await this.saveStateToStorage();
    } catch (error) {
      console.error('Failed to set theme:', error);
      throw new Error('Failed to update theme');
    }
  }
  
  async setSidebarCollapsed(collapsed: boolean): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        ui: {
          ...currentState.ui,
          sidebarCollapsed: collapsed
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to set sidebar state:', error);
      throw new Error('Failed to update sidebar state');
    }
  }
  
  async setGlobalLoading(loading: boolean): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        ui: {
          ...currentState.ui,
          loading: {
            ...currentState.ui.loading,
            global: loading
          }
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to set global loading:', error);
      throw new Error('Failed to update loading state');
    }
  }
  
  async setOperationLoading(operation: string, loading: boolean): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const operations = { ...currentState.ui.loading.operations };
      
      if (loading) {
        operations[operation] = true;
      } else {
        delete operations[operation];
      }
      
      const newState: AppState = {
        ...currentState,
        ui: {
          ...currentState.ui,
          loading: {
            ...currentState.ui.loading,
            operations
          }
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to set operation loading:', error);
      throw new Error('Failed to update operation loading state');
    }
  }
  
  async addNotification(notification: Omit<NotificationItem, 'id'>): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newNotification: NotificationItem = {
        ...notification,
        id: this.generateId()
      };
      
      const newState: AppState = {
        ...currentState,
        notifications: {
          ...currentState.notifications,
          items: [newNotification, ...currentState.notifications.items],
          unreadCount: currentState.notifications.unreadCount + 1
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to add notification:', error);
      throw new Error('Failed to add notification');
    }
  }
  
  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const items = currentState.notifications.items.map(item =>
        item.id === id ? { ...item, read: true } : item
      );
      
      const unreadCount = items.filter(item => !item.read).length;
      
      const newState: AppState = {
        ...currentState,
        notifications: {
          ...currentState.notifications,
          items,
          unreadCount
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error('Failed to update notification');
    }
  }
  
  async clearAllNotifications(): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const newState: AppState = {
        ...currentState,
        notifications: {
          ...currentState.notifications,
          items: [],
          unreadCount: 0
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw new Error('Failed to clear notifications');
    }
  }
  
  async setCacheEntry(key: string, data: any, expirationMinutes = 60): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      
      const cacheEntry: CacheEntry = {
        key,
        data,
        timestamp: new Date(),
        expiresAt
      };
      
      const newState: AppState = {
        ...currentState,
        data: {
          ...currentState.data,
          cache: {
            ...currentState.data.cache,
            [key]: cacheEntry
          }
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to set cache entry:', error);
      throw new Error('Failed to update cache');
    }
  }
  
  getCacheEntry(key: string): CacheEntry | null {
    const currentState = this.stateSubject.value;
    const entry = currentState.data.cache[key];
    
    if (!entry) {
      return null;
    }
    
    if (new Date() > entry.expiresAt) {
      this.removeCacheEntry(key);
      return null;
    }
    
    return entry;
  }
  
  async removeCacheEntry(key: string): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const cache = { ...currentState.data.cache };
      delete cache[key];
      
      const newState: AppState = {
        ...currentState,
        data: {
          ...currentState.data,
          cache
        }
      };
      
      this.stateSubject.next(newState);
    } catch (error) {
      console.error('Failed to remove cache entry:', error);
      throw new Error('Failed to remove cache entry');
    }
  }
  
  async resetState(): Promise<void> {
    try {
      this.stateSubject.next(this.initialState);
      await this.clearStoredState();
    } catch (error) {
      console.error('Failed to reset state:', error);
      throw new Error('Failed to reset application state');
    }
  }
  
  private loadStateFromStorage(): void {
    try {
      const storedState = localStorage.getItem('app-state');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        this.stateSubject.next({ ...this.initialState, ...parsedState });
      }
    } catch (error) {
      console.warn('Failed to load state from storage:', error);
    }
  }
  
  private async saveStateToStorage(): Promise<void> {
    try {
      const currentState = this.stateSubject.value;
      const stateToSave = {
        user: currentState.user,
        ui: {
          theme: currentState.ui.theme,
          sidebarCollapsed: currentState.ui.sidebarCollapsed
        },
        notifications: currentState.notifications
      };
      
      localStorage.setItem('app-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save state to storage:', error);
    }
  }
  
  private async clearStoredState(): Promise<void> {
    try {
      localStorage.removeItem('app-state');
    } catch (error) {
      console.error('Failed to clear stored state:', error);
    }
  }
  
  private setupAutoSave(): void {
    // Auto-save state changes every 30 seconds
    setInterval(() => {
      this.saveStateToStorage();
    }, 30000);
  }
  
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}