import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, combineLatest, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';

export interface DashboardMetric {
  readonly id: string;
  readonly title: string;
  readonly value: number;
  readonly previousValue: number;
  readonly unit: string;
  readonly trend: 'up' | 'down' | 'stable';
  readonly changePercentage: number;
  readonly icon: string;
  readonly color: string;
}

export interface ChartData {
  readonly labels: string[];
  readonly datasets: ChartDataset[];
}

export interface ChartDataset {
  readonly label: string;
  readonly data: number[];
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly borderWidth: number;
}

export interface ActivityItem {
  readonly id: string;
  readonly type: 'user_action' | 'system_event' | 'alert';
  readonly title: string;
  readonly description: string;
  readonly timestamp: Date;
  readonly user?: string;
  readonly severity?: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  metrics: DashboardMetric[] = [];
  chartData: ChartData | null = null;
  recentActivity: ActivityItem[] = [];
  loading = false;
  lastUpdated: Date | null = null;
  autoRefresh = true;
  refreshInterval = 30000; // 30 seconds
  
  readonly metricCards = [
    { id: 'users', title: 'Active Users', icon: 'users', color: '#3b82f6' },
    { id: 'revenue', title: 'Revenue', icon: 'dollar-sign', color: '#10b981' },
    { id: 'orders', title: 'Orders', icon: 'shopping-cart', color: '#f59e0b' },
    { id: 'conversion', title: 'Conversion Rate', icon: 'trending-up', color: '#8b5cf6' }
  ];
  
  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.loadDashboardData();
    this.setupAutoRefresh();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private async loadDashboardData(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    
    try {
      const [metrics, chartData, activity] = await Promise.all([
        this.dashboardService.getMetrics(),
        this.dashboardService.getChartData(),
        this.dashboardService.getRecentActivity()
      ]);
      
      this.metrics = metrics;
      this.chartData = chartData;
      this.recentActivity = activity;
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
  
  private setupAutoRefresh(): void {
    if (!this.autoRefresh) {
      return;
    }
    
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.loadDashboardData()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
  
  async onRefresh(): Promise<void> {
    await this.loadDashboardData();
  }
  
  onToggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    }
  }
  
  onMetricClick(metric: DashboardMetric): void {
    console.log('Metric clicked:', metric);
  }
  
  onActivityItemClick(item: ActivityItem): void {
    console.log('Activity item clicked:', item);
  }
  
  trackByMetricId(index: number, metric: DashboardMetric): string {
    return metric.id;
  }
  
  trackByActivityId(index: number, activity: ActivityItem): string {
    return activity.id;
  }
  
  getMetricTrendIcon(trend: string): string {
    switch (trend) {
      case 'up': return 'arrow-up';
      case 'down': return 'arrow-down';
      default: return 'minus';
    }
  }
  
  getMetricTrendClass(trend: string): string {
    switch (trend) {
      case 'up': return 'trend-up';
      case 'down': return 'trend-down';
      default: return 'trend-stable';
    }
  }
  
  getActivityIcon(type: string): string {
    switch (type) {
      case 'user_action': return 'user';
      case 'system_event': return 'settings';
      case 'alert': return 'alert-triangle';
      default: return 'info';
    }
  }
  
  getActivityClass(severity?: string): string {
    switch (severity) {
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return 'severity-normal';
    }
  }
  
  formatMetricValue(value: number, unit: string): string {
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    } else if (unit === '$') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US').format(value);
    }
  }
  
  formatChangePercentage(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }
  
  getTimeSinceLastUpdate(): string {
    if (!this.lastUpdated) {
      return 'Never';
    }
    
    const now = new Date();
    const diff = now.getTime() - this.lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes === 1) {
      return '1 minute ago';
    } else {
      return `${minutes} minutes ago`;
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  
  constructor(private http: HttpClient) {}
  
  async getMetrics(): Promise<DashboardMetric[]> {
    try {
      const response = await this.http.get<ApiResponse<DashboardMetric[]>>('/api/dashboard/metrics').toPromise();
      return response?.data || [];
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return this.getMockMetrics();
    }
  }
  
  async getChartData(): Promise<ChartData> {
    try {
      const response = await this.http.get<ApiResponse<ChartData>>('/api/dashboard/chart').toPromise();
      return response?.data || this.getMockChartData();
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      return this.getMockChartData();
    }
  }
  
  async getRecentActivity(): Promise<ActivityItem[]> {
    try {
      const response = await this.http.get<ApiResponse<ActivityItem[]>>('/api/dashboard/activity').toPromise();
      return response?.data || [];
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      return this.getMockActivity();
    }
  }
  
  private getMockMetrics(): DashboardMetric[] {
    return [
      {
        id: 'users',
        title: 'Active Users',
        value: 1234,
        previousValue: 1180,
        unit: '',
        trend: 'up',
        changePercentage: 4.6,
        icon: 'users',
        color: '#3b82f6'
      },
      {
        id: 'revenue',
        title: 'Revenue',
        value: 45678,
        previousValue: 42300,
        unit: '$',
        trend: 'up',
        changePercentage: 8.0,
        icon: 'dollar-sign',
        color: '#10b981'
      }
    ];
  }
  
  private getMockChartData(): ChartData {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Revenue',
        data: [12000, 19000, 15000, 25000, 22000, 30000],
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: '#3b82f6',
        borderWidth: 2
      }]
    };
  }
  
  private getMockActivity(): ActivityItem[] {
    return [
      {
        id: '1',
        type: 'user_action',
        title: 'New user registered',
        description: 'John Doe created an account',
        timestamp: new Date(),
        user: 'John Doe'
      }
    ];
  }
}

interface ApiResponse<T> {
  readonly data: T;
  readonly success: boolean;
  readonly message?: string;
}