# Angular Component Coding Standards

## Component Structure Requirements

### 1. Component Class Template
```typescript
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-[component-name]',
  templateUrl: './[component-name].component.html',
  styleUrls: ['./[component-name].component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class [ComponentName]Component implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    // Component initialization logic
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 2. Mandatory Requirements
- ALWAYS use OnPush change detection strategy
- ALWAYS implement OnDestroy interface
- ALWAYS use Subject for subscription cleanup
- ALWAYS use takeUntil operator for subscription management
- ALWAYS use readonly for private properties when possible
- ALWAYS inject ChangeDetectorRef for manual change detection

### 3. Naming Conventions
- Component files: [feature-name].component.ts
- Component classes: [FeatureName]Component (PascalCase)
- Component selectors: app-[feature-name] (kebab-case with app- prefix)
- Template files: [feature-name].component.html
- Style files: [feature-name].component.scss

### 4. Template Best Practices
- ALWAYS use trackBy functions in *ngFor loops
- ALWAYS use async pipe for observables
- ALWAYS use ng-template for conditional content
- NEVER put complex logic in templates

### 5. Performance Requirements
- Components must not exceed 300 lines of code
- Use lazy loading for feature modules
- Implement proper cleanup in ngOnDestroy
- Use OnPush change detection for better performance