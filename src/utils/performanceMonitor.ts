/**
 * Performance monitoring utility for the Brainy Bird game
 * Tracks frame rate, memory usage, and provides optimization recommendations
 */

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
  memoryUsage?: number;
  droppedFrames: number;
  totalFrames: number;
  isLowPerformance: boolean;
}

export interface PerformanceThresholds {
  targetFps: number;
  lowPerformanceFps: number;
  criticalPerformanceFps: number;
  maxFrameTime: number;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private droppedFrames = 0;
  private totalFrames = 0;
  private isMonitoring = false;
  
  private readonly maxHistorySize = 60; // Keep 1 second of history at 60fps
  private readonly thresholds: PerformanceThresholds;
  
  // Callbacks for performance events
  private onLowPerformance?: (metrics: PerformanceMetrics) => void;
  private onPerformanceRecovered?: (metrics: PerformanceMetrics) => void;
  private wasLowPerformance = false;

  constructor(
    thresholds: Partial<PerformanceThresholds> = {},
    callbacks?: {
      onLowPerformance?: (metrics: PerformanceMetrics) => void;
      onPerformanceRecovered?: (metrics: PerformanceMetrics) => void;
    }
  ) {
    this.thresholds = {
      targetFps: 60,
      lowPerformanceFps: 45,
      criticalPerformanceFps: 30,
      maxFrameTime: 16.67, // ~60fps
      ...thresholds
    };
    
    this.onLowPerformance = callbacks?.onLowPerformance;
    this.onPerformanceRecovered = callbacks?.onPerformanceRecovered;
  }

  /**
   * Start monitoring performance
   */
  public start(): void {
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.reset();
  }

  /**
   * Stop monitoring performance
   */
  public stop(): void {
    this.isMonitoring = false;
  }

  /**
   * Update performance metrics (call this every frame)
   */
  public update(): PerformanceMetrics {
    if (!this.isMonitoring) {
      return this.getDefaultMetrics();
    }

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    
    // Calculate FPS
    const fps = frameTime > 0 ? 1000 / frameTime : 0;
    
    // Track frame time and FPS history
    this.frameTimeHistory.push(frameTime);
    this.fpsHistory.push(fps);
    
    // Limit history size
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
      this.fpsHistory.shift();
    }
    
    // Count dropped frames (frames that took too long)
    if (frameTime > this.thresholds.maxFrameTime * 1.5) {
      this.droppedFrames++;
    }
    
    this.totalFrames++;
    this.lastTime = currentTime;
    
    const metrics = this.calculateMetrics(fps, frameTime);
    
    // Check for performance issues
    this.checkPerformanceThresholds(metrics);
    
    return metrics;
  }

  /**
   * Calculate current performance metrics
   */
  private calculateMetrics(currentFps: number, currentFrameTime: number): PerformanceMetrics {
    const averageFps = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
      : currentFps;
    
    const isLowPerformance = averageFps < this.thresholds.lowPerformanceFps;
    
    return {
      fps: Math.round(currentFps * 10) / 10,
      averageFps: Math.round(averageFps * 10) / 10,
      frameTime: Math.round(currentFrameTime * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames,
      isLowPerformance
    };
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100; // MB
    }
    return undefined;
  }

  /**
   * Check performance thresholds and trigger callbacks
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const isCurrentlyLowPerformance = metrics.isLowPerformance;
    
    // Trigger low performance callback
    if (isCurrentlyLowPerformance && !this.wasLowPerformance) {
      this.onLowPerformance?.(metrics);
    }
    
    // Trigger performance recovered callback
    if (!isCurrentlyLowPerformance && this.wasLowPerformance) {
      this.onPerformanceRecovered?.(metrics);
    }
    
    this.wasLowPerformance = isCurrentlyLowPerformance;
  }

  /**
   * Get default metrics when not monitoring
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      averageFps: 0,
      frameTime: 0,
      memoryUsage: undefined,
      droppedFrames: 0,
      totalFrames: 0,
      isLowPerformance: false
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.fpsHistory = [];
    this.droppedFrames = 0;
    this.totalFrames = 0;
    this.wasLowPerformance = false;
  }

  /**
   * Get current metrics without updating
   */
  public getCurrentMetrics(): PerformanceMetrics {
    if (!this.isMonitoring || this.fpsHistory.length === 0) {
      return this.getDefaultMetrics();
    }
    
    const latestFps = this.fpsHistory[this.fpsHistory.length - 1];
    const latestFrameTime = this.frameTimeHistory[this.frameTimeHistory.length - 1];
    
    return this.calculateMetrics(latestFps, latestFrameTime);
  }

  /**
   * Get performance recommendations based on current metrics
   */
  public getOptimizationRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.averageFps < this.thresholds.criticalPerformanceFps) {
      recommendations.push('Critical performance issue detected');
      recommendations.push('Consider reducing particle effects');
      recommendations.push('Disable visual enhancements');
      recommendations.push('Reduce canvas resolution');
    } else if (metrics.averageFps < this.thresholds.lowPerformanceFps) {
      recommendations.push('Low performance detected');
      recommendations.push('Consider reducing particle count');
      recommendations.push('Disable screen shake effects');
    }
    
    if (metrics.droppedFrames > metrics.totalFrames * 0.1) {
      recommendations.push('High frame drop rate detected');
      recommendations.push('Consider optimizing render operations');
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > 50) {
      recommendations.push('High memory usage detected');
      recommendations.push('Check for memory leaks');
      recommendations.push('Consider object pooling optimizations');
    }
    
    return recommendations;
  }

  /**
   * Check if browser supports performance monitoring
   */
  public static isSupported(): boolean {
    return typeof performance !== 'undefined' && 
           typeof performance.now === 'function';
  }
}