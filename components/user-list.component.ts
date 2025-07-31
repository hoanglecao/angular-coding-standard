import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { UserModel, CreateUserRequest, UserRole } from '../models/user.model';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  users: UserModel[] = [];
  loading = false;
  isSubmitting = false;
  userForm: FormGroup;
  
  readonly userRoles: UserRole[] = ['admin', 'user', 'moderator'];
  
  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.createUserForm();
  }
  
  ngOnInit(): void {
    this.loadUsers();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private createUserForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required]
    });
  }
  
  private async loadUsers(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    
    try {
      this.users = await this.userService.getUsers();
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
  
  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      return;
    }
    
    this.isSubmitting = true;
    this.cdr.markForCheck();
    
    try {
      const userData: CreateUserRequest = this.userForm.value;
      const newUser = await this.userService.createUser(userData);
      this.users = [...this.users, newUser];
      this.userForm.reset({ role: 'user' });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }
  
  trackByUserId(index: number, user: UserModel): number {
    return user.id;
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  
  onUserSelect(user: UserModel): void {
    console.log('Selected user:', user);
  }
}