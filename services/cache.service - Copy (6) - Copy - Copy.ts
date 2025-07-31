import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface CacheItem<T> {
  readonly key: string;
  readonly data: T;
  readonly timestamp: Date;
  readonly expiresAt: Date;
  readonly accessCount: number;
  readonly lastAccessed: Date;
}

export interface CacheConfig {
  readonly defaultTtl: number;
  readonly maxSize: number;
  readonly cleanupInterval: number;
  readonly enablePersistence: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly cacheSubject = new BehaviorSubject<Map<string, CacheItem<any>>>(new Map());
  private cleanupTimer?: number;
  
  private readonly config: CacheConfig = {
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    cleanupInterval: 60 * 1000, // 1 minute
    enablePersistence: true
  };
  
  constructor() {
    this.startCleanupTimer();
    this.loadFromStorage();
  }
  
  set<T>(key: string, data: T, ttl?: number): void {
    const expirationTime = ttl || this.config.defaultTtl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationTime);
    
    const item: CacheItem<T> = {
      key,
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now
    };
    
    this.cache.set(key, item);
    this.enforceMaxSize();
    this.notifyChange();
    this.saveToStorage();
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.notifyChange();
      return null;
    }
    
    // Update access statistics
    const updatedItem: CacheItem<T> = {
      ...item,
      accessCount: item.accessCount + 1,
      lastAccessed: new Date()
    };
    
    this.cache.set(key, updatedItem);
    this.notifyChange();
    
    return item.data;
  }
  
  getOrSet<T>(key: string, factory: () => Observable<T>, ttl?: number): Observable<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return of(cached);
    }
    
    return factory().pipe(
      tap(data => this.set(key, data, ttl))
    );
  }
  
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.notifyChange();
      return false;
    }
    
    return true;
  }
  
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.notifyChange();
      this.saveToStorage();
    }
    return deleted;
  }
  
  clear(): void {
    this.cache.clear();
    this.notifyChange();
    this.saveToStorage();
  }
  
  keys(): string[] {
    this.cleanup();
    return Array.from(this.cache.keys());
  }
  
  size(): number {
    this.cleanup();
    return this.cache.size;
  }
  
  getStats(): CacheStats {
    this.cleanup();
    
    const items = Array.from(this.cache.values());
    const totalAccess = items.reduce((sum, item) => sum + item.accessCount, 0);
    const avgAccess = items.length > 0 ? totalAccess / items.length : 0;
    
    return {
      totalItems: items.length,
      totalAccessCount: totalAccess,
      averageAccessCount: avgAccess,
      oldestItem: this.getOldestItem(),
      newestItem: this.getNewestItem(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  getCacheObservable(): Observable<Map<string, CacheItem<any>>> {
    return this.cacheSubject.asObservable();
  }
  
  private isExpired(item: CacheItem<any>): boolean {
    return new Date() > item.expiresAt;
  }
  
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.notifyChange();
      this.saveToStorage();
    }
  }
  
  private enforceMaxSize(): void {
    if (this.cache.size <= this.config.maxSize) {
      return;
    }
    
    // Remove least recently used items
    const items = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
    
    const itemsToRemove = items.slice(0, this.cache.size - this.config.maxSize);
    itemsToRemove.forEach(([key]) => this.cache.delete(key));
  }
  
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  private notifyChange(): void {
    this.cacheSubject.next(new Map(this.cache));
  }
  
  private saveToStorage(): void {
    if (!this.config.enablePersistence) {
      return;
    }
    
    try {
      const serializable = Array.from(this.cache.entries()).map(([key, item]) => [
        key,
        {
          ...item,
          timestamp: item.timestamp.toISOString(),
          expiresAt: item.expiresAt.toISOString(),
          lastAccessed: item.lastAccessed.toISOString()
        }
      ]);
      
      localStorage.setItem('cache-service', JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }
  
  private loadFromStorage(): void {
    if (!this.config.enablePersistence) {
      return;
    }
    
    try {
      const stored = localStorage.getItem('cache-service');
      if (!stored) {
        return;
      }
      
      const parsed = JSON.parse(stored);
      const now = new Date();
      
      parsed.forEach(([key, item]: [string, any]) => {
        const expiresAt = new Date(item.expiresAt);
        
        if (expiresAt > now) {
          const cacheItem: CacheItem<any> = {
            ...item,
            timestamp: new Date(item.timestamp),
            expiresAt,
            lastAccessed: new Date(item.lastAccessed)
          };
          
          this.cache.set(key, cacheItem);
        }
      });
      
      this.notifyChange();
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }
  
  private getOldestItem(): CacheItem<any> | null {
    if (this.cache.size === 0) {
      return null;
    }
    
    return Array.from(this.cache.values())
      .reduce((oldest, current) => 
        current.timestamp < oldest.timestamp ? current : oldest
      );
  }
  
  private getNewestItem(): CacheItem<any> | null {
    if (this.cache.size === 0) {
      return null;
    }
    
    return Array.from(this.cache.values())
      .reduce((newest, current) => 
        current.timestamp > newest.timestamp ? current : newest
      );
  }
  
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    this.cache.forEach((item, key) => {
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += JSON.stringify(item.data).length * 2;
      totalSize += 200; // Estimated overhead for dates and metadata
    });
    
    return totalSize;
  }
}

export interface CacheStats {
  readonly totalItems: number;
  readonly totalAccessCount: number;
  readonly averageAccessCount: number;
  readonly oldestItem: CacheItem<any> | null;
  readonly newestItem: CacheItem<any> | null;
  readonly memoryUsage: number;
}