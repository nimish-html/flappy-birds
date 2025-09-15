import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceOptimizer } from '../../utils/performanceOptimizer';
import { PerformanceMetrics } from '../../utils/performanceMonitor';

// Mock navigator properties
const mockNavigator = (overrides: Partial<Navigator> = {}) => {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      hardwareConcurrency: 4,
      maxTouchPoints: 0,
      ...overrides
    },
    configurable: true
  });
};

// Mock window properties
const mockWindow = (overrides: Partial<Window> = {}) => {
  Object.defineProperty(global, 'window', {
    value: {
      innerWidth: 1920,
      innerHeight: 1080,
      ...overrides
    },
    configurable: true
  });
};

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    // Reset to default desktop environment
    mockNavigator();
    mockWindow();
  });

  describe('Device Detection', () => {
    it('should detect desktop devices correctly', () => {
      mockNavigator();
      mockWindow({ innerWidth: 1920, innerHeight: 1080 });
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities.isMobile).toBe(false);
      expect(capabilities.isLowEnd).toBe(false);
      expect(capabilities.supportsTouchEvents).toBe(false);
    });

    it('should detect mobile devices correctly', () => {
      mockNavigator({ 
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        maxTouchPoints: 5
      });
      mockWindow({ innerWidth: 375, innerHeight: 667 });
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities.isMobile).toBe(true);
      expect(capabilities.supportsTouchEvents).toBe(true);
    });

    it('should detect low-end devices correctly', () => {
      mockNavigator({ 
        userAgent: 'Mozilla/5.0 (Android 4.4; Mobile)',
        hardwareConcurrency: 2,
        deviceMemory: 1
      } as any);
      mockWindow({ innerWidth: 320, innerHeight: 568 });
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities.isLowEnd).toBe(true);
    });

    it('should calculate screen scale correctly', () => {
      mockWindow({ innerWidth: 400, innerHeight: 300 });
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      // Scale should be min(400/800, 300/600) = min(0.5, 0.5) = 0.5
      expect(capabilities.screenScale).toBe(0.5);
    });
  });

  describe('Performance Settings Generation', () => {
    it('should generate high-end settings for powerful devices', () => {
      mockNavigator();
      mockWindow({ innerWidth: 2560, innerHeight: 1440 });
      
      optimizer = new PerformanceOptimizer();
      const settings = optimizer.getSettings();
      
      expect(settings.targetFrameRate).toBe(60);
      expect(settings.enableParticleEffects).toBe(true);
      expect(settings.maxParticleCount).toBe(12);
      expect(settings.enableShadows).toBe(true);
      expect(settings.textRenderQuality).toBe('high');
    });

    it('should generate mobile settings for mobile devices', () => {
      mockNavigator({ 
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        maxTouchPoints: 5
      });
      mockWindow({ innerWidth: 375, innerHeight: 667 });
      
      optimizer = new PerformanceOptimizer();
      const settings = optimizer.getSettings();
      
      expect(settings.targetFrameRate).toBe(45);
      expect(settings.maxParticleCount).toBe(4);
      expect(settings.touchAreaMultiplier).toBe(1.3);
      expect(settings.enableHapticFeedback).toBe(true);
      expect(settings.textRenderQuality).toBe('medium');
    });

    it('should generate low-end settings for weak devices', () => {
      mockNavigator({ 
        userAgent: 'Mozilla/5.0 (Android 4.4; Mobile)',
        hardwareConcurrency: 2,
        deviceMemory: 1
      } as any);
      mockWindow({ innerWidth: 320, innerHeight: 568 });
      
      optimizer = new PerformanceOptimizer();
      const settings = optimizer.getSettings();
      
      expect(settings.targetFrameRate).toBe(30);
      expect(settings.enableParticleEffects).toBe(false);
      expect(settings.maxParticleCount).toBe(0);
      expect(settings.enableFrameSkipping).toBe(true);
      expect(settings.textRenderQuality).toBe('low');
      expect(settings.touchAreaMultiplier).toBe(1.5);
    });

    it('should generate standard settings for average devices', () => {
      mockNavigator();
      mockWindow({ innerWidth: 1024, innerHeight: 768 });
      
      optimizer = new PerformanceOptimizer();
      const settings = optimizer.getSettings();
      
      expect(settings.targetFrameRate).toBe(60);
      expect(settings.enableParticleEffects).toBe(true);
      expect(settings.maxParticleCount).toBe(8);
      expect(settings.enableShadows).toBe(true);
      expect(settings.textRenderQuality).toBe('medium');
      expect(settings.touchAreaMultiplier).toBe(1.0);
    });
  });

  describe('Adaptive Performance Adjustment', () => {
    beforeEach(() => {
      mockNavigator();
      mockWindow();
      optimizer = new PerformanceOptimizer();
    });

    it('should reduce quality when performance is poor', () => {
      const initialSettings = optimizer.getSettings();
      const initialParticleCount = initialSettings.maxParticleCount;
      
      // Simulate poor performance metrics
      for (let i = 0; i < 10; i++) {
        const poorMetrics: PerformanceMetrics = {
          fps: 25, // Below target
          averageFps: 25,
          frameTime: 40,
          droppedFrames: 15,
          totalFrames: 100,
          isLowPerformance: true
        };
        optimizer.updateSettings(poorMetrics);
      }
      
      const adjustedSettings = optimizer.getSettings();
      expect(adjustedSettings.maxParticleCount).toBeLessThan(initialParticleCount);
    });

    it('should increase quality when performance is excellent', () => {
      // Start with reduced settings
      for (let i = 0; i < 10; i++) {
        const poorMetrics: PerformanceMetrics = {
          fps: 25,
          averageFps: 25,
          frameTime: 40,
          droppedFrames: 15,
          totalFrames: 100,
          isLowPerformance: true
        };
        optimizer.updateSettings(poorMetrics);
      }
      
      const reducedSettings = optimizer.getSettings();
      const reducedParticleCount = reducedSettings.maxParticleCount;
      
      // Now simulate excellent performance
      for (let i = 0; i < 10; i++) {
        const excellentMetrics: PerformanceMetrics = {
          fps: 60,
          averageFps: 60,
          frameTime: 16.67,
          droppedFrames: 0,
          totalFrames: 600,
          isLowPerformance: false
        };
        optimizer.updateSettings(excellentMetrics);
      }
      
      const improvedSettings = optimizer.getSettings();
      // Quality should improve or at least not get worse
      expect(improvedSettings.maxParticleCount).toBeGreaterThan(0);
      expect(improvedSettings.enableParticleEffects).toBe(true);
    });

    it('should maintain stable settings with consistent performance', () => {
      const initialSettings = optimizer.getSettings();
      
      // Simulate consistent good performance
      for (let i = 0; i < 20; i++) {
        const goodMetrics: PerformanceMetrics = {
          fps: 58,
          averageFps: 58,
          frameTime: 17.2,
          droppedFrames: 1,
          totalFrames: 580,
          isLowPerformance: false
        };
        optimizer.updateSettings(goodMetrics);
      }
      
      const finalSettings = optimizer.getSettings();
      expect(finalSettings.maxParticleCount).toBe(initialSettings.maxParticleCount);
      expect(finalSettings.targetFrameRate).toBe(initialSettings.targetFrameRate);
    });
  });

  describe('Feature Queries', () => {
    beforeEach(() => {
      mockNavigator();
      mockWindow();
      optimizer = new PerformanceOptimizer();
    });

    it('should correctly report feature enablement', () => {
      expect(optimizer.shouldEnable('enableParticleEffects')).toBe(true);
      expect(optimizer.shouldEnable('enableShadows')).toBe(true);
      expect(optimizer.shouldEnable('enableFrameSkipping')).toBe(false);
    });

    it('should return correct setting values', () => {
      expect(optimizer.getSetting('targetFrameRate')).toBe(60);
      expect(optimizer.getSetting('textRenderQuality')).toBe('high'); // High-end device with large screen
      expect(optimizer.getSetting('maxParticleCount')).toBe(12); // High-end device
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for low-end devices', () => {
      mockNavigator({ 
        hardwareConcurrency: 2,
        deviceMemory: 1
      } as any);
      mockWindow({ innerWidth: 320, innerHeight: 568 });
      
      optimizer = new PerformanceOptimizer();
      const recommendations = optimizer.getRecommendations();
      
      expect(recommendations).toContain('Low-end device detected - using optimized settings');
      expect(recommendations).toContain('Particle effects disabled for better performance');
      expect(recommendations).toContain('Target frame rate reduced to 30fps');
    });

    it('should provide mobile-specific recommendations', () => {
      mockNavigator({ 
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        maxTouchPoints: 5
      });
      mockWindow({ innerWidth: 375, innerHeight: 667 });
      
      optimizer = new PerformanceOptimizer();
      const recommendations = optimizer.getRecommendations();
      
      expect(recommendations).toContain('Touch areas enlarged for mobile-friendly interaction');
    });

    it('should provide minimal recommendations for high-end devices', () => {
      mockNavigator();
      mockWindow({ innerWidth: 2560, innerHeight: 1440 });
      
      optimizer = new PerformanceOptimizer();
      const recommendations = optimizer.getRecommendations();
      
      // High-end devices should have fewer optimization recommendations
      expect(recommendations.length).toBeLessThan(3);
    });
  });

  describe('Settings Reset', () => {
    beforeEach(() => {
      mockNavigator();
      mockWindow();
      optimizer = new PerformanceOptimizer();
    });

    it('should reset to optimal settings', () => {
      // Degrade performance first
      for (let i = 0; i < 10; i++) {
        const poorMetrics: PerformanceMetrics = {
          fps: 20,
          averageFps: 20,
          frameTime: 50,
          droppedFrames: 20,
          totalFrames: 100,
          isLowPerformance: true
        };
        optimizer.updateSettings(poorMetrics);
      }
      
      const degradedSettings = optimizer.getSettings();
      expect(degradedSettings.maxParticleCount).toBeLessThan(12); // Started with high-end settings
      
      // Reset to optimal
      optimizer.resetToOptimal();
      
      const resetSettings = optimizer.getSettings();
      expect(resetSettings.maxParticleCount).toBe(12); // High-end setting for large screen
      expect(resetSettings.targetFrameRate).toBe(60);
    });
  });

  describe('Memory Estimation', () => {
    it('should estimate memory correctly when deviceMemory is available', () => {
      mockNavigator({ deviceMemory: 4 } as any);
      mockWindow();
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities.memoryLimit).toBe(4096); // 4GB in MB
    });

    it('should provide fallback memory estimates for mobile', () => {
      mockNavigator({ 
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        hardwareConcurrency: 2
      });
      mockWindow({ innerWidth: 375, innerHeight: 667 });
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities.memoryLimit).toBeGreaterThan(0);
      expect(capabilities.memoryLimit).toBeLessThanOrEqual(2048); // Mobile range
      expect(capabilities.isMobile).toBe(true); // Ensure it's detected as mobile
    });

    it('should provide desktop fallback memory estimate', () => {
      mockNavigator();
      mockWindow();
      
      optimizer = new PerformanceOptimizer();
      const capabilities = optimizer.getDeviceCapabilities();
      
      expect(capabilities.memoryLimit).toBe(4096); // Desktop default
    });
  });
});