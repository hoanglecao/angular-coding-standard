export interface BaseEntity {
  readonly id: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isActive: boolean;
}

export interface AuditableEntity extends BaseEntity {
  readonly createdBy: number;
  readonly updatedBy: number;
}

export interface SoftDeletableEntity extends AuditableEntity {
  readonly deletedAt?: Date;
  readonly deletedBy?: number;
}

export interface PaginationRequest {
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy?: string;
  readonly sortDirection?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface SearchRequest extends PaginationRequest {
  readonly query: string;
  readonly filters?: Record<string, any>;
}

export interface FilterOption {
  readonly key: string;
  readonly label: string;
  readonly type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  readonly options?: SelectOption[];
}

export interface SelectOption {
  readonly value: any;
  readonly label: string;
  readonly disabled?: boolean;
  readonly group?: string;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface ApiError {
  readonly message: string;
  readonly code: string;
  readonly status: number;
  readonly timestamp: Date;
  readonly details?: Record<string, any>;
}

export interface FileUploadRequest {
  readonly file: File;
  readonly category?: string;
  readonly metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  readonly id: string;
  readonly filename: string;
  readonly originalName: string;
  readonly size: number;
  readonly mimeType: string;
  readonly url: string;
  readonly uploadedAt: Date;
}

export interface NotificationPreferences {
  readonly email: boolean;
  readonly push: boolean;
  readonly sms: boolean;
  readonly inApp: boolean;
}

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly language: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly notifications: NotificationPreferences;
}

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
}

export interface ContactInfo {
  readonly email: string;
  readonly phone?: string;
  readonly address?: Address;
}

export interface Permission {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly resource: string;
  readonly action: string;
}

export interface Role {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly permissions: Permission[];
  readonly isSystem: boolean;
}

export interface AuditLog extends BaseEntity {
  readonly entityType: string;
  readonly entityId: number;
  readonly action: 'CREATE' | 'UPDATE' | 'DELETE';
  readonly oldValues?: Record<string, any>;
  readonly newValues?: Record<string, any>;
  readonly userId: number;
  readonly ipAddress: string;
  readonly userAgent: string;
}

export interface SystemHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly services: ServiceHealth[];
  readonly timestamp: Date;
}

export interface ServiceHealth {
  readonly name: string;
  readonly status: 'up' | 'down' | 'degraded';
  readonly responseTime?: number;
  readonly lastCheck: Date;
  readonly details?: Record<string, any>;
}

export interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export interface RateLimitInfo {
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly retryAfter?: number;
}

export type EntityStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type SortDirection = 'asc' | 'desc';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ContentType = 'application/json' | 'application/xml' | 'text/plain' | 'multipart/form-data';