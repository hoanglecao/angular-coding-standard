import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface NotificationModel {
  readonly id: string;
  readonly type: 'success' | 'error' | 'warning' | 'info';
  readonly title: string;
  readonly message: string;
  readonly duration?: number;
  readonly dismissible?: boolean;
  readonly timestamp: Date;
}

export interface CreateNotificationRequest {
  readonly type: NotificationModel['type'];
  readonly title: string;
  readonly message: string;
  readonly duration?: number;
  readonly dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notifications$ = new BehaviorSubject<NotificationModel[]>([]);
  private readonly maxNotifications = 5;
  private readonly defaultDuration = 5000;
  
  constructor() {}
  
  getNotifications(): Observable<NotificationModel[]> {
    return this.notifications$.asObservable();
  }
  
  async showSuccess(title: string, message: string, duration?: number): Promise<void> {
    await this.addNotification({
      type: 'success',
      title,
      message,
      duration,
      dismissible: true
    });
  }
  
  async showError(title: string, message: string, duration?: number): Promise<void> {
    await this.addNotification({
      type: 'error',
      title,
      message,
      duration: duration || 0, // Errors don't auto-dismiss by default
      dismissible: true
    });
  }
  
  async showWarning(title: string, message: string, duration?: number): Promise<void> {
    await this.addNotification({
      type: 'warning',
      title,
      message,
      duration,
      dismissible: true
    });
  }
  
  async showInfo(title: string, message: string, duration?: number): Promise<void> {
    await this.addNotification({
      type: 'info',
      title,
      message,
      duration,
      dismissible: true
    });
  }
  
  async addNotification(request: CreateNotificationRequest): Promise<void> {
    try {
      const notification: NotificationModel = {
        id: this.generateId(),
        type: request.type,
        title: request.title,
        message: request.message,
        duration: request.duration ?? this.defaultDuration,
        dismissible: request.dismissible ?? true,
        timestamp: new Date()
      };
      
      const currentNotifications = this.notifications$.value;
      const updatedNotifications = [notification, ...currentNotifications]
        .slice(0, this.maxNotifications);
      
      this.notifications$.next(updatedNotifications);
      
      if (notification.duration && notification.duration > 0) {
        this.scheduleAutoDismiss(notification.id, notification.duration);
      }
    } catch (error) {
      console.error('Failed to add notification:', error);
      throw new Error('Failed to add notification');
    }
  }
  
  async dismissNotification(id: string): Promise<void> {
    try {
      const currentNotifications = this.notifications$.value;
      const updatedNotifications = currentNotifications.filter(n => n.id !== id);
      this.notifications$.next(updatedNotifications);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      throw new Error('Failed to dismiss notification');
    }
  }
  
  async clearAllNotifications(): Promise<void> {
    try {
      this.notifications$.next([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw new Error('Failed to clear notifications');
    }
  }
  
  private scheduleAutoDismiss(id: string, duration: number): void {
    timer(duration)
      .pipe(
        takeUntil(this.notifications$.pipe())
      )
      .subscribe(() => {
        this.dismissNotification(id).catch(error => {
          console.error('Auto-dismiss failed:', error);
        });
      });
  }
  
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getNotificationsByType(type: NotificationModel['type']): Observable<NotificationModel[]> {
    return new Observable(observer => {
      this.notifications$.subscribe(notifications => {
        const filtered = notifications.filter(n => n.type === type);
        observer.next(filtered);
      });
    });
  }
  
  hasNotifications(): Observable<boolean> {
    return new Observable(observer => {
      this.notifications$.subscribe(notifications => {
        observer.next(notifications.length > 0);
      });
    });
  }
  
  getNotificationCount(): Observable<number> {
    return new Observable(observer => {
      this.notifications$.subscribe(notifications => {
        observer.next(notifications.length);
      });
    });
  }
}