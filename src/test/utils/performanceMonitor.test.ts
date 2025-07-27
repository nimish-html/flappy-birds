import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../utils/performanceMonitor';

// Mock performance.now
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10 // 10MB
    }
  },
  writable: true
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let onLowPerformance: ReturnType<typeof vi.fn>;
  let onPerformanceRecovered: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLowPerformance = vi.fn();
    onPerformanceRecovered = vi.fn();
    
    performanceMonitor = new PerformanceMonitor(
      {
        targetFps: 60,
        lowPerformanceFps: 45,
        criticalPerformanceFps: 30,
        maxFrameTime: 16.67
      },
      {
        onLowPerformance,
        onPerformanceRecovered
      }
    );
    
    mockPerformanceNow.mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create performance monitor with default thresholds', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeDefined();
    });

    it('should create performance monitor with custom thresholds', () => {
      const monitor = new PerformanceMonitor({
        targetFps: 30,
        lowPerformanceFps: 20
      });
      expect(monitor).toBeDefined();
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      performanceMonitor.start();
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.totalFrames).toBe(0);
    });

    it('should stop monitoring', () => {
      performanceMonitor.start();
      performanceMonitor.stop();
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.fps).toBe(0);
    });

    it('should reset metrics', () => {
      performanceMonitor.start();
      mockPerformanceNow.mockReturnValue(16.67);
      performanceMonitor.update();
      
      performanceMonitor.reset();
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.totalFrames).toBe(0);
    });
  });

  describe('performance metrics calculation', () => {
    beforeEach(() => {
      performanceMonitor.start();
    });

    it('should calculate FPS correctly for 60fps', () => {
      mockPerformanceNow.mockReturnValue(16.67); // ~60fps frame time
      const metrics = performanceMonitor.update();
      
      expect(metrics.fps).toBeCloseTo(60, 0);
      expect(metrics.frameTime).toBeCloseTo(16.67, 2);
    });

    it('should calculate FPS correctly for 30fps', () => {
      mockPerformanceNow.mockReturnValue(33.33); // ~30fps frame time
      const metrics = performanceMonitor.update();
      
      expect(metrics.fps).toBeCloseTo(30, 1);
      expect(metrics.frameTime).toBeCloseTo(33.33, 2);
    });

    it('should track average FPS over multiple frames', () => {
      // Simulate varying frame times
      const frameTimes = [16.67, 20, 16.67, 25, 16.67]; // Mix of 60fps and slower
      let currentTime = 0;
      
      frameTimes.forEach(frameTime => {
        currentTime += frameTime;
        mockPerformanceNow.mockReturnValue(currentTime);
        performanceMonitor.update();
      });
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.averageFps).toBeGreaterThan(40);
      expect(metrics.averageFps).toBeLessThan(60);
    });

    it('should count dropped frames', () => {
      // Simulate a dropped frame (>25ms frame time)
      mockPerformanceNow.mockReturnValue(30); // Slow frame
      const metrics = performanceMonitor.update();
      
      expect(metrics.droppedFrames).toBe(1);
      expect(metrics.totalFrames).toBe(1);
    });

    it('should track memory usage when available', () => {
      mockPerformanceNow.mockReturnValue(16.67);
      const metrics = performanceMonitor.update();
      
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage).toBeCloseTo(10, 1); // 10MB
    });
  });

  describe('performance threshold detection', () => {
    beforeEach(() => {
      performanceMonitor.start();
    });

    it('should detect low performance', () => {
      // Simulate consistently low FPS
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue((i + 1) * 25); // 40fps
        performanceMonitor.update();
      }
      
      expect(onLowPerformance).toHaveBeenCalled();
      const metrics = onLowPerformance.mock.calls[0][0];
      expect(metrics.isLowPerformance).toBe(true);
    });

    it('should detect performance recovery', () => {
      // First, trigger low performance
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue((i + 1) * 25); // 40fps
        performanceMonitor.update();
      }
      
      expect(onLowPerformance).toHaveBeenCalled();
      
      // Then simulate recovery
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue(250 + (i + 1) * 16.67); // 60fps
        performanceMonitor.update();
      }
      
      expect(onPerformanceRecovered).toHaveBeenCalled();
    });

    it('should not trigger callbacks repeatedly for same state', () => {
      // Trigger low performance multiple times
      for (let i = 0; i < 20; i++) {
        mockPerformanceNow.mockReturnValue((i + 1) * 25); // 40fps
        performanceMonitor.update();
      }
      
      // Should only be called once
      expect(onLowPerformance).toHaveBeenCalledTimes(1);
    });
  });

  describe('optimization recommendations', () => {
    beforeEach(() => {
      performanceMonitor.start();
    });

    it('should provide recommendations for critical performance', () => {
      mockPerformanceNow.mockReturnValue(40); // 25fps
      const metrics = performanceMonitor.update();
      
      const recommendations = performanceMonitor.getOptimizationRecommendations(metrics);
      expect(recommendations).toContain('Critical performance issue detected');
      expect(recommendations).toContain('Consider reducing particle effects');
    });

    it('should provide recommendations for low performance', () => {
      mockPerformanceNow.mockReturnValue(25); // 40fps
      const metrics = performanceMonitor.update();
      
      const recommendations = performanceMonitor.getOptimizationRecommendations(metrics);
      expect(recommendations).toContain('Low performance detected');
      expect(recommendations).toContain('Consider reducing particle count');
    });

    it('should provide recommendations for high frame drops', () => {
      // Simulate many dropped frames
      for (let i = 0; i < 10; i++) {
        mockPerformanceNow.mockReturnValue((i + 1) * 30); // Many slow frames
        performanceMonitor.update();
      }
      
      const metrics = performanceMonitor.getCurrentMetrics();
      const recommendations = performanceMonitor.getOptimizationRecommendations(metrics);
      expect(recommendations).toContain('High frame drop rate detected');
    });

    it('should provide recommendations for high memory usage', () => {
      // Mock high memory usage
      Object.defineProperty(global.performance, 'memory', {
        value: {
          usedJSHeapSize: 1024 * 1024 * 60 // 60MB
        },
        configurable: true
      });
      
      mockPerformanceNow.mockReturnValue(16.67);
      const metrics = performanceMonitor.update();
      
      const recommendations = performanceMonitor.getOptimizationRecommendations(metrics);
      expect(recommendations).toContain('High memory usage detected');
    });
  });

  describe('browser support detection', () => {
    it('should detect performance API support', () => {
      expect(PerformanceMonitor.isSupported()).toBe(true);
    });

    it('should handle missing performance API', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;
      
      expect(PerformanceMonitor.isSupported()).toBe(false);
      
      global.performance = originalPerformance;
    });
  });

  describe('edge cases', () => {
    it('should handle zero frame time', () => {
      performanceMonitor.start();
      mockPerformanceNow.mockReturnValue(0); // Same time as start
      
      const metrics = performanceMonitor.update();
      expect(metrics.fps).toBe(0);
    });

    it('should handle very high frame times', () => {
      performanceMonitor.start();
      mockPerformanceNow.mockReturnValue(1000); // 1 second frame time
      
      const metrics = performanceMonitor.update();
      expect(metrics.fps).toBe(1);
      expect(metrics.droppedFrames).toBe(1);
    });

    it('should limit history size', () => {
      performanceMonitor.start();
      
      // Add more than maxHistorySize frames
      for (let i = 0; i < 100; i++) {
        mockPerformanceNow.mockReturnValue((i + 1) * 16.67);
        performanceMonitor.update();
      }
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.totalFrames).toBe(100);
      // Average should be calculated from limited history, not all frames
    });
  });
});