import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

export interface FormFieldConfig {
  readonly key: string;
  readonly type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea';
  readonly label: string;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly validators?: any[];
  readonly options?: SelectOption[];
  readonly disabled?: boolean;
  readonly description?: string;
}

export interface SelectOption {
  readonly value: any;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface FormValidationError {
  readonly field: string;
  readonly message: string;
}

@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly valueChanges$ = new Subject<any>();
  
  @Input() fields: FormFieldConfig[] = [];
  @Input() initialValues: Record<string, any> = {};
  @Input() submitButtonText = 'Submit';
  @Input() resetButtonText = 'Reset';
  @Input() showResetButton = true;
  @Input() disabled = false;
  
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formReset = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<any>();
  @Output() validationChange = new EventEmitter<FormValidationError[]>();
  
  dynamicForm!: FormGroup;
  isSubmitting = false;
  validationErrors: FormValidationError[] = [];
  
  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.buildForm();
    this.setupValueChangeListener();
    this.setupValidationListener();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.valueChanges$.complete();
  }
  
  private buildForm(): void {
    const formControls: Record<string, FormControl> = {};
    
    this.fields.forEach(field => {
      const validators = this.buildValidators(field);
      const initialValue = this.initialValues[field.key] || this.getDefaultValue(field);
      
      formControls[field.key] = new FormControl({
        value: initialValue,
        disabled: field.disabled || this.disabled
      }, validators);
    });
    
    this.dynamicForm = this.fb.group(formControls);
  }
  
  private buildValidators(field: FormFieldConfig): any[] {
    const validators: any[] = [];
    
    if (field.required) {
      validators.push(Validators.required);
    }
    
    switch (field.type) {
      case 'email':
        validators.push(Validators.email);
        break;
      case 'number':
        validators.push(Validators.pattern(/^\d+$/));
        break;
    }
    
    if (field.validators) {
      validators.push(...field.validators);
    }
    
    return validators;
  }
  
  private getDefaultValue(field: FormFieldConfig): any {
    switch (field.type) {
      case 'checkbox':
        return false;
      case 'number':
        return 0;
      default:
        return '';
    }
  }
  
  private setupValueChangeListener(): void {
    this.dynamicForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.valueChange.emit(value);
        this.valueChanges$.next(value);
      });
  }
  
  private setupValidationListener(): void {
    this.dynamicForm.statusChanges
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateValidationErrors();
        this.cdr.markForCheck();
      });
  }
  
  private updateValidationErrors(): void {
    this.validationErrors = [];
    
    Object.keys(this.dynamicForm.controls).forEach(key => {
      const control = this.dynamicForm.get(key);
      if (control && control.invalid && (control.dirty || control.touched)) {
        const field = this.fields.find(f => f.key === key);
        if (field) {
          const message = this.getValidationMessage(key, control.errors);
          this.validationErrors.push({
            field: key,
            message
          });
        }
      }
    });
    
    this.validationChange.emit(this.validationErrors);
  }
  
  private getValidationMessage(fieldKey: string, errors: any): string {
    const field = this.fields.find(f => f.key === fieldKey);
    const fieldLabel = field?.label || fieldKey;
    
    if (errors?.['required']) {
      return `${fieldLabel} is required`;
    }
    if (errors?.['email']) {
      return `${fieldLabel} must be a valid email address`;
    }
    if (errors?.['pattern']) {
      return `${fieldLabel} format is invalid`;
    }
    if (errors?.['minlength']) {
      return `${fieldLabel} must be at least ${errors['minlength'].requiredLength} characters`;
    }
    if (errors?.['maxlength']) {
      return `${fieldLabel} cannot exceed ${errors['maxlength'].requiredLength} characters`;
    }
    
    return `${fieldLabel} is invalid`;
  }
  
  async onSubmit(): Promise<void> {
    if (this.dynamicForm.invalid) {
      this.markAllFieldsAsTouched();
      this.updateValidationErrors();
      return;
    }
    
    this.isSubmitting = true;
    this.cdr.markForCheck();
    
    try {
      const formValue = this.dynamicForm.value;
      this.formSubmit.emit(formValue);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }
  
  onReset(): void {
    this.dynamicForm.reset();
    this.validationErrors = [];
    this.formReset.emit();
    this.cdr.markForCheck();
  }
  
  private markAllFieldsAsTouched(): void {
    Object.keys(this.dynamicForm.controls).forEach(key => {
      const control = this.dynamicForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
  
  isFieldInvalid(fieldKey: string): boolean {
    const control = this.dynamicForm.get(fieldKey);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  
  getFieldError(fieldKey: string): string {
    const error = this.validationErrors.find(e => e.field === fieldKey);
    return error?.message || '';
  }
  
  trackByFieldKey(index: number, field: FormFieldConfig): string {
    return field.key;
  }
  
  getFormValue(): any {
    return this.dynamicForm.value;
  }
  
  updateFieldValue(fieldKey: string, value: any): void {
    const control = this.dynamicForm.get(fieldKey);
    if (control) {
      control.setValue(value);
      this.cdr.markForCheck();
    }
  }
  
  setFieldDisabled(fieldKey: string, disabled: boolean): void {
    const control = this.dynamicForm.get(fieldKey);
    if (control) {
      if (disabled) {
        control.disable();
      } else {
        control.enable();
      }
      this.cdr.markForCheck();
    }
  }
}