import { stateManager } from './StateManager';
import { stateValidator } from './StateValidator';
import { cursorStabilityManager } from './CursorStabilityManager';

export interface MonitorMetrics {
  operationsPerMinute: number;
  averageOperationTime: number;
  errorRate: number;
  healthScore: number;
  lastUpdate: number;
}

export interface AlertThresholds {
  maxOperationsPerMinute: number;
  maxOperationTime: number;
  maxErrorRate: number;
  minHealthScore: number;
}

/**
 * Fort Knox State Monitor
 * Real-time monitoring and alerting for state management health
 */
export class StateMonitor {
  private static instance: StateMonitor | null = null;
  private monitoringActive = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private metrics: MonitorMetrics = {
    operationsPerMinute: 0,
    averageOperationTime: 0,
    errorRate: 0,
    healthScore: 100,
    lastUpdate: Date.now()
  };
  
  private operationHistory: Array<{ timestamp: number; duration: number; success: boolean }> = [];
  private alerts: string[] = [];
  
  private thresholds: AlertThresholds = {
    maxOperationsPerMinute: 120,
    maxOperationTime: 1000,
    maxErrorRate: 0.1,
    minHealthScore: 70
  };

  static getInstance(): StateMonitor {
    if (!this.instance) {
      this.instance = new StateMonitor();
    }
    return this.instance;
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    console.log('StateMonitor: Starting health monitoring');
    
    // Monitor every 5 seconds
    this.monitorInterval = setInterval(() => {
      this.performHealthCheck();
    }, 5000);
    
    // Immediate check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoringActive) return;
    
    this.monitoringActive = false;
    console.log('StateMonitor: Stopping health monitoring');
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Perform comprehensive health check
   */
  private performHealthCheck(): void {
    const now = Date.now();
    this.alerts = [];
    
    // Update metrics
    this.updateMetrics();
    
    // Check state manager health
    const stateHealth = stateManager.getHealth();
    if (!stateHealth.isHealthy) {
      this.alerts.push(`State manager unhealthy: ${stateHealth.issues.join(', ')}`);
    }
    
    // Check cursor stability health
    const cursorDiagnostics = cursorStabilityManager.getDiagnostics();
    if (cursorDiagnostics.queueLength > 10) {
      this.alerts.push(`High cursor operation queue: ${cursorDiagnostics.queueLength} items`);
    }
    
    // Check state manager diagnostics
    const stateDiagnostics = stateManager.getDiagnostics();
    if (stateDiagnostics.queueLength > 5) {
      this.alerts.push(`High state operation queue: ${stateDiagnostics.queueLength} items`);
    }
    
    // Check performance metrics
    if (this.metrics.operationsPerMinute > this.thresholds.maxOperationsPerMinute) {
      this.alerts.push(`High operation rate: ${this.metrics.operationsPerMinute}/min`);
    }
    
    if (this.metrics.averageOperationTime > this.thresholds.maxOperationTime) {
      this.alerts.push(`Slow operations: ${this.metrics.averageOperationTime}ms average`);
    }
    
    if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
      this.alerts.push(`High error rate: ${(this.metrics.errorRate * 100).toFixed(1)}%`);
    }
    
    // Calculate health score
    this.calculateHealthScore();
    
    if (this.metrics.healthScore < this.thresholds.minHealthScore) {
      this.alerts.push(`Low health score: ${this.metrics.healthScore}%`);
    }
    
    // Log alerts if any
    if (this.alerts.length > 0) {
      console.warn('StateMonitor: Health alerts:', this.alerts);
    }
    
    this.metrics.lastUpdate = now;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Filter recent operations
    const recentOps = this.operationHistory.filter(op => op.timestamp > oneMinuteAgo);
    
    // Calculate metrics
    this.metrics.operationsPerMinute = recentOps.length;
    
    if (recentOps.length > 0) {
      const totalDuration = recentOps.reduce((sum, op) => sum + op.duration, 0);
      this.metrics.averageOperationTime = totalDuration / recentOps.length;
      
      const failures = recentOps.filter(op => !op.success).length;
      this.metrics.errorRate = failures / recentOps.length;
    } else {
      this.metrics.averageOperationTime = 0;
      this.metrics.errorRate = 0;
    }
    
    // Clean old history (keep last hour)
    const oneHourAgo = now - 3600000;
    this.operationHistory = this.operationHistory.filter(op => op.timestamp > oneHourAgo);
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(): void {
    let score = 100;
    
    // Deduct for high operation rate
    if (this.metrics.operationsPerMinute > this.thresholds.maxOperationsPerMinute) {
      score -= 20;
    }
    
    // Deduct for slow operations
    if (this.metrics.averageOperationTime > this.thresholds.maxOperationTime) {
      const penalty = Math.min(30, (this.metrics.averageOperationTime / this.thresholds.maxOperationTime - 1) * 30);
      score -= penalty;
    }
    
    // Deduct for errors
    if (this.metrics.errorRate > 0) {
      const penalty = Math.min(40, this.metrics.errorRate * 100);
      score -= penalty;
    }
    
    // Check component health
    const stateHealth = stateManager.getHealth();
    if (!stateHealth.isHealthy) {
      score -= 25;
    }
    
    // Deduct for alerts
    score -= Math.min(15, this.alerts.length * 3);
    
    this.metrics.healthScore = Math.max(0, Math.round(score));
  }

  /**
   * Record operation performance
   */
  recordOperation(duration: number, success: boolean): void {
    this.operationHistory.push({
      timestamp: Date.now(),
      duration,
      success
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current alerts
   */
  getAlerts(): string[] {
    return [...this.alerts];
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('StateMonitor: Updated alert thresholds');
  }

  /**
   * Force immediate health check
   */
  forceHealthCheck(): void {
    this.performHealthCheck();
  }

  /**
   * Get comprehensive diagnostics
   */
  getDiagnostics() {
    return {
      monitoring: this.monitoringActive,
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      thresholds: this.thresholds,
      operationHistorySize: this.operationHistory.length,
      stateManagerHealth: stateManager.getHealth(),
      stateDiagnostics: stateManager.getDiagnostics(),
      cursorDiagnostics: cursorStabilityManager.getDiagnostics()
    };
  }
}

export const stateMonitor = StateMonitor.getInstance();
