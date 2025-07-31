# Angular TypeScript Coding Standards

## TypeScript Configuration Requirements

### 1. Interface and Type Definitions
```typescript
// Always define interfaces for data models
interface UserModel {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

// Use type unions for specific values
type UserRole = 'admin' | 'user' | 'moderator';

// Use generic types for reusable interfaces
interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
}
```

### 2. Mandatory TypeScript Rules
- ALWAYS use strict TypeScript configuration
- ALWAYS define interfaces for all data models
- ALWAYS use readonly for immutable properties
- ALWAYS specify return types for methods
- ALWAYS use const assertions where appropriate
- NEVER use 'any' type - use 'unknown' instead
- ALWAYS use optional chaining (?.) and nullish coalescing (??)

### 3. Class and Method Standards
```typescript
class ExampleComponent {
  // Use readonly for properties that don't change
  private readonly componentId = 'example-component';
  
  // Always specify parameter and return types
  public processData(input: UserModel[]): ProcessedData[] {
    return input.map(user => this.transformUser(user));
  }
  
  // Use private methods for internal logic
  private transformUser(user: UserModel): ProcessedData {
    return {
      id: user.id,
      displayName: user.name,
      isActive: true
    };
  }
}
```

### 4. Import and Export Standards
- Use barrel exports (index.ts) for clean imports
- Group imports: Angular imports first, then third-party, then local
- Use absolute imports with path mapping when possible
- Always use named exports instead of default exports

### 5. Error Handling Types
```typescript
// Define custom error types
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Use Result pattern for error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

### 6. Utility Types Usage
- Use Partial<T> for optional updates
- Use Pick<T, K> for selecting specific properties
- Use Omit<T, K> for excluding properties
- Use Record<K, V> for key-value mappings