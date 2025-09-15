/**
 * Performance optimization utility for Math Bird game
 * Provides adaptive performance settings based on device capabilities and performance metrics
 */

import { PerformanceMetrics } from './performanceMonitor';

export interface PerformanceSettings {
  // Rendering optimizations
  enableTextCaching: boolean;
  enableParticleEffects: boolean;
  maxParticleCount: number;
  
  // Frame rate optimizations
  targetFrameRate: number;
  enableFrameSkipping: boolean;
  
  // Visual quality settings
  enableShadows: boolean;
  enableGradients: boolean;
  textRenderQuality: 'low' | 'medium' | 'high';
  
  // Touch and mobile optimizations
  touchAreaMultiplier: number;
  enableHapticFeedback: boolean;
  
  // Memory management
  enableObjectPooling: boolean;
  maxCachedTexts: number;
}

export interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  screenScale: number;
  memoryLimit: number; // MB
  supportsTouchEvents: boolean;
}

export class PerformanceOptimizer {
  private currentSettings: PerformanceSettings;
  private deviceCapabilities: DeviceCapabilities;
  private performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 30; // Keep 30 samples for analysis

  constructor() {
    this.deviceCapabilities = this.detectDeviceCapabilities();
    this.currentSettings = this.generateOptimalSettings();
  }

  /**
   * Detect device capabilities for performance optimization
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenScale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
    
    // Estimate if device is low-end based on various factors
    const isLowEnd = this.detectLowEndDevice();
    
    // Estimate memory limit (rough approximation)
    const memoryLimit = this.estimateMemoryLimit();
    
    const supportsTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      isMobile,
      isLowEnd,
      screenScale,
      memoryLimit,
      supportsTouchEvents
    };
  }

  /**
   * Detect if device is likely low-end
   */
  private detectLowEndDevice(): boolean {
    // Check for low-end indicators
    const lowEndIndicators = [
      window.innerWidth <= 480, // Very small screen
      navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2, // Few CPU cores
      (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2, // Low RAM
      (navigator as any).connection && (navigator as any).connection.effectiveType === 'slow-2g' // Slow connection
    ];

    return lowEndIndicators.filter(Boolean).length >= 2;
  }

  /**
   * Estimate available memory limit
   */
  private estimateMemoryLimit(): number {
    if ((navigator as any).deviceMemory) {
      return (navigator as any).deviceMemory * 1024; // Convert GB to MB
    }
    
    // Fallback estimates based on device type - need to check after device capabilities are set
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = this.detectLowEndDevice();
    
    if (isMobile) {
      return isLowEnd ? 512 : 2048; // 512MB - 2GB
    }
    
    return 4096; // 4GB default for desktop
  }

  /**
   * Generate optimal performance settings based on device capabilities
   */
  private generateOptimalSettings(): PerformanceSettings {
    const { isMobile, isLowEnd, screenScale, supportsTouchEvents } = this.deviceCapabilities;

    if (isLowEnd) {
      return this.getLowEndSettings();
    } else if (isMobile) {
      return this.getMobileSettings();
    } else if (screenScale > 1.5) {
      return this.getHighEndSettings();
    } else {
      return this.getStandardSettings();
    }
  }

  /**
   * Settings for low-end devices
   */
  private getLowEndSettings(): PerformanceSettings {
    return {
      enableTextCaching: true,
      enableParticleEffects: false,
      maxParticleCount: 0,
      targetFrameRate: 30,
      enableFrameSkipping: true,
      enableShadows: false,
      enableGradients: false,
      textRenderQuality: 'low',
      touchAreaMultiplier: 1.5,
      enableHapticFeedback: false,
      enableObjectPooling: true,
      maxCachedTexts: 20
    };
  }

  /**
   * Settings for mobile devices
   */
  private getMobileSettings(): PerformanceSettings {
    return {
      enableTextCaching: true,
      enableParticleEffects: true,
      maxParticleCount: 4,
      targetFrameRate: 45,
      enableFrameSkipping: false,
      enableShadows: false,
      enableGradients: true,
      textRenderQuality: 'medium',
      touchAreaMultiplier: 1.3,
      enableHapticFeedback: true,
      enableObjectPooling: true,
      maxCachedTexts: 50
    };
  }

  /**
   * Settings for high-end devices
   */
  private getHighEndSettings(): PerformanceSettings {
    return {
      enableTextCaching: true,
      enableParticleEffects: true,
      maxParticleCount: 12,
      targetFrameRate: 60,
      enableFrameSkipping: false,
      enableShadows: true,
      enableGradients: true,
      textRenderQuality: 'high',
      touchAreaMultiplier: 1.0,
      enableHapticFeedback: true,
      enableObjectPooling: true,
      maxCachedTexts: 100
    };
  }

  /**
   * Standard settings for average devices
   */
  private getStandardSettings(): PerformanceSettings {
    return {
      enableTextCaching: true,
      enableParticleEffects: true,
      maxParticleCount: 8,
      targetFrameRate: 60,
      enableFrameSkipping: false,
      enableShadows: true,
      enableGradients: true,
      textRenderQuality: 'medium',
      touchAreaMultiplier: 1.0,
      enableHapticFeedback: false,
      enableObjectPooling: true,
      maxCachedTexts: 75
    };
  }

  /**
   * Update performance settings based on runtime performance metrics
   */
  public updateSettings(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    // Analyze performance and adjust settings if needed
    if (this.performanceHistory.length >= 10) {
      this.analyzeAndAdjustSettings();
    }
  }

  /**
   * Analyze performance history and adjust settings accordingly
   */
  private analyzeAndAdjustSettings(): void {
    const recentMetrics = this.performanceHistory.slice(-10);
    const avgFps = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
    const droppedFrameRate = recentMetrics.reduce((sum, m) => sum + m.droppedFrames, 0) / 
                            recentMetrics.reduce((sum, m) => sum + m.totalFrames, 0);

    // If performance is poor, reduce quality
    if (avgFps < this.currentSettings.targetFrameRate * 0.8 || droppedFrameRate > 0.1) {
      this.reduceQuality();
    }
    // If performance is excellent, we could increase quality (but be conservative)
    else if (avgFps > this.currentSettings.targetFrameRate * 0.95 && droppedFrameRate < 0.02) {
      this.increaseQuality();
    }
  }

  /**
   * Reduce quality settings to improve performance
   */
  private reduceQuality(): void {
    const settings = { ...this.currentSettings };
    
    // Progressive quality reduction
    if (settings.enableParticleEffects && settings.maxParticleCount > 0) {
      settings.maxParticleCount = Math.max(0, settings.maxParticleCount - 2);
      if (settings.maxParticleCount === 0) {
        settings.enableParticleEffects = false;
      }
    } else if (settings.enableShadows) {
      settings.enableShadows = false;
    } else if (settings.enableGradients) {
      settings.enableGradients = false;
    } else if (settings.textRenderQuality !== 'low') {
      settings.textRenderQuality = settings.textRenderQuality === 'high' ? 'medium' : 'low';
    } else if (settings.targetFrameRate > 30) {
      settings.targetFrameRate = Math.max(30, settings.targetFrameRate - 15);
      settings.enableFrameSkipping = true;
    }

    this.currentSettings = settings;
  }

  /**
   * Increase quality settings when performance allows
   */
  private increaseQuality(): void {
    const settings = { ...this.currentSettings };
    
    // Conservative quality increases
    if (!settings.enableParticleEffects && !this.deviceCapabilities.isLowEnd) {
      settings.enableParticleEffects = true;
      settings.maxParticleCount = 2;
    } else if (settings.enableParticleEffects && settings.maxParticleCount < 8) {
      settings.maxParticleCount = Math.min(8, settings.maxParticleCount + 1);
    }

    this.currentSettings = settings;
  }

  /**
   * Get current performance settings
   */
  public getSettings(): PerformanceSettings {
    return { ...this.currentSettings };
  }

  /**
   * Get device capabilities
   */
  public getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.deviceCapabilities };
  }

  /**
   * Get performance recommendations based on current state
   */
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const settings = this.currentSettings;
    const capabilities = this.deviceCapabilities;

    if (capabilities.isLowEnd) {
      recommendations.push('Low-end device detected - using optimized settings');
    }

    if (!settings.enableParticleEffects) {
      recommendations.push('Particle effects disabled for better performance');
    }

    if (settings.targetFrameRate < 60) {
      recommendations.push(`Target frame rate reduced to ${settings.targetFrameRate}fps`);
    }

    if (settings.enableFrameSkipping) {
      recommendations.push('Frame skipping enabled to maintain smooth gameplay');
    }

    if (settings.textRenderQuality === 'low') {
      recommendations.push('Text rendering quality reduced for performance');
    }

    if (capabilities.isMobile && settings.touchAreaMultiplier > 1.0) {
      recommendations.push('Touch areas enlarged for mobile-friendly interaction');
    }

    return recommendations;
  }

  /**
   * Reset settings to optimal defaults
   */
  public resetToOptimal(): void {
    this.currentSettings = this.generateOptimalSettings();
    this.performanceHistory = [];
  }

  /**
   * Check if a specific feature should be enabled based on current settings
   */
  public shouldEnable(feature: keyof PerformanceSettings): boolean {
    return Boolean(this.currentSettings[feature]);
  }

  /**
   * Get numeric setting value
   */
  public getSetting<K extends keyof PerformanceSettings>(setting: K): PerformanceSettings[K] {
    return this.currentSettings[setting];
  }
}