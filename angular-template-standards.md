# Angular Template Coding Standards

## Template Structure Requirements

### 1. Template Best Practices
```html
<!-- ALWAYS use trackBy functions in *ngFor -->
<div *ngFor="let item of items; trackBy: trackByItemId" class="item">
  {{ item.name }}
</div>

<!-- ALWAYS use async pipe for observables -->
<div *ngIf="data$ | async as data">
  <p>{{ data.title }}</p>
</div>

<!-- ALWAYS use ng-template for conditional content -->
<div *ngIf="loading; else contentTemplate">
  <app-loading-spinner></app-loading-spinner>
</div>

<ng-template #contentTemplate>
  <div class="content">
    <!-- Content here -->
  </div>
</ng-template>

<!-- ALWAYS use safe navigation operator -->
<p>{{ user?.profile?.name || 'Unknown User' }}</p>
```

### 2. Mandatory Template Rules
- ALWAYS use trackBy functions in *ngFor loops
- ALWAYS use async pipe for observables in templates
- ALWAYS use ng-template for else conditions
- ALWAYS use safe navigation operator (?.) for nested properties
- NEVER put complex logic in templates
- ALWAYS use meaningful CSS classes
- ALWAYS use semantic HTML elements

### 3. Form Standards
```html
<!-- ALWAYS use reactive forms -->
<form [formGroup]="userForm" (ngSubmit)="onSubmit()">
  <div class="form-group">
    <label for="email">Email</label>
    <input 
      id="email"
      type="email"
      formControlName="email"
      class="form-control"
      [class.is-invalid]="isFieldInvalid('email')">
    
    <div *ngIf="isFieldInvalid('email')" class="invalid-feedback">
      <span *ngIf="userForm.get('email')?.errors?.['required']">
        Email is required
      </span>
      <span *ngIf="userForm.get('email')?.errors?.['email']">
        Please enter a valid email
      </span>
    </div>
  </div>
  
  <button 
    type="submit" 
    class="btn btn-primary"
    [disabled]="userForm.invalid || isSubmitting">
    {{ isSubmitting ? 'Submitting...' : 'Submit' }}
  </button>
</form>
```

### 4. Event Handling Standards
- Use descriptive method names for event handlers
- Pass only necessary data to event handlers
- Use proper event types for type safety
- Implement proper loading states for async operations

### 5. Accessibility Requirements
- ALWAYS include proper ARIA labels
- ALWAYS use semantic HTML elements
- ALWAYS provide alt text for images
- ALWAYS ensure keyboard navigation works
- ALWAYS maintain proper heading hierarchy

### 6. Performance Optimizations
```html
<!-- Use OnPush change detection with immutable data -->
<app-child-component 
  [data]="immutableData"
  (dataChange)="onDataChange($event)">
</app-child-component>

<!-- Lazy load images -->
<img 
  [src]="imageSrc" 
  [alt]="imageAlt"
  loading="lazy"
  class="responsive-image">

<!-- Use ng-container to avoid extra DOM elements -->
<ng-container *ngIf="showContent">
  <p>Content without wrapper element</p>
</ng-container>
```