export interface UserModel {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly isActive: boolean;
}

export type UserRole = 'admin' | 'user' | 'moderator';

export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
}