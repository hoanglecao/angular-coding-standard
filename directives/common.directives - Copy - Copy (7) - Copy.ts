import { Directive, ElementRef, Input, OnInit, OnDestroy, HostListener, Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Directive({
  selector: '[appClickOutside]'
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  @Input() appClickOutside!: () => void;
  
  constructor(private elementRef: ElementRef) {}
  
  ngOnInit(): void {
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }
  
  private onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.appClickOutside();
    }
  }
}

@Directive({
  selector: '[appAutoFocus]'
})
export class AutoFocusDirective implements OnInit {
  @Input() appAutoFocus = true;
  @Input() delay = 0;
  
  constructor(private elementRef: ElementRef) {}
  
  ngOnInit(): void {
    if (this.appAutoFocus) {
      setTimeout(() => {
        this.elementRef.nativeElement.focus();
      }, this.delay);
    }
  }
}

@Directive({
  selector: '[appDebounceClick]'
})
export class DebounceClickDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly clickSubject = new Subject<Event>();
  
  @Input() debounceTime = 300;
  @Input() appDebounceClick!: (event: Event) => void;
  
  constructor() {}
  
  ngOnInit(): void {
    this.clickSubject.pipe(
      debounceTime(this.debounceTime),
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.appDebounceClick(event);
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.preventDefault();
    this.clickSubject.next(event);
  }
}

@Directive({
  selector: '[appHighlight]'
})
export class HighlightDirective implements OnInit {
  @Input() appHighlight = 'yellow';
  @Input() defaultColor = 'transparent';
  
  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {}
  
  ngOnInit(): void {
    this.renderer.setStyle(
      this.elementRef.nativeElement,
      'backgroundColor',
      this.defaultColor
    );
  }
  
  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.renderer.setStyle(
      this.elementRef.nativeElement,
      'backgroundColor',
      this.appHighlight
    );
  }
  
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.renderer.setStyle(
      this.elementRef.nativeElement,
      'backgroundColor',
      this.defaultColor
    );
  }
}

@Directive({
  selector: '[appLazyLoad]'
})
export class LazyLoadDirective implements OnInit, OnDestroy {
  @Input() appLazyLoad!: () => void;
  @Input() rootMargin = '50px';
  @Input() threshold = 0.1;
  
  private observer?: IntersectionObserver;
  
  constructor(private elementRef: ElementRef) {}
  
  ngOnInit(): void {
    this.createObserver();
  }
  
  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  
  private createObserver(): void {
    const options = {
      rootMargin: this.rootMargin,
      threshold: this.threshold
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.appLazyLoad();
          this.observer?.unobserve(entry.target);
        }
      });
    }, options);
    
    this.observer.observe(this.elementRef.nativeElement);
  }
}