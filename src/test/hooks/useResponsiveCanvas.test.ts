import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useResponsiveCanvas } from '../../hooks/useResponsiveCanvas';
import { GAME_CONFIG, RESPONSIVE_CONFIG } from '../../utils/gameConfig';

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// Mock navigator.userAgent
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: userAgent,
  });
};

describe('useResponsiveCanvas', () => {
  beforeEach(() => {
    // Reset to desktop defaults
    mockWindowDimensions(1200, 800);
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  });

  afterEach(() => {
    // Clean up event listeners
    vi.clearAllMocks();
  });

  describe('Desktop behavior', () => {
    it('should return full dimensions on large desktop screen', () => {
      mockWindowDimensions(1200, 800);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.dimensions.width).toBe(GAME_CONFIG.CANVAS_WIDTH);
      expect(result.current.dimensions.height).toBe(GAME_CONFIG.CANVAS_HEIGHT);
      expect(result.current.dimensions.scale).toBe(1);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isSmallScreen).toBe(false);
      expect(result.current.isLargeScreen).toBe(false);
    });

    it('should scale down on smaller desktop screen', () => {
      mockWindowDimensions(600, 400);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.dimensions.width).toBeLessThan(GAME_CONFIG.CANVAS_WIDTH);
      expect(result.current.dimensions.height).toBeLessThan(GAME_CONFIG.CANVAS_HEIGHT);
      expect(result.current.dimensions.scale).toBeLessThan(1);
      // 600px width is below mobile breakpoint, so it will be detected as mobile
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isSmallScreen).toBe(true);
    });
  });

  describe('Mobile behavior', () => {
    it('should detect mobile device by user agent', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      mockWindowDimensions(375, 667);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isSmallScreen).toBe(true);
    });

    it('should detect mobile device by screen width', () => {
      mockWindowDimensions(400, 600);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.isMobile).toBe(true);
    });

    it('should scale appropriately for mobile portrait', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      mockWindowDimensions(375, 667);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.dimensions.scale).toBeGreaterThan(RESPONSIVE_CONFIG.MIN_SCALE);
      expect(result.current.dimensions.scale).toBeLessThan(1);
      expect(result.current.dimensions.width).toBeLessThan(GAME_CONFIG.CANVAS_WIDTH);
      expect(result.current.dimensions.height).toBeLessThan(GAME_CONFIG.CANVAS_HEIGHT);
    });

    it('should scale appropriately for mobile landscape', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      mockWindowDimensions(667, 375);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.dimensions.scale).toBeGreaterThanOrEqual(RESPONSIVE_CONFIG.MIN_SCALE);
      expect(result.current.isMobile).toBe(true);
    });
  });

  describe('Custom options', () => {
    it('should respect custom max dimensions', () => {
      const customOptions = {
        maxWidth: 400,
        maxHeight: 300,
        minScale: 0.5,
        maxScale: 2
      };
      
      mockWindowDimensions(1200, 800);
      
      const { result } = renderHook(() => useResponsiveCanvas(customOptions));
      
      // With large screen, it should scale to fit but respect max scale
      expect(result.current.dimensions.width).toBeLessThanOrEqual(400 * customOptions.maxScale);
      expect(result.current.dimensions.height).toBeLessThanOrEqual(300 * customOptions.maxScale);
    });

    it('should respect minimum scale limit', () => {
      const customOptions = {
        minScale: 0.8
      };
      
      mockWindowDimensions(200, 150);
      
      const { result } = renderHook(() => useResponsiveCanvas(customOptions));
      
      expect(result.current.dimensions.scale).toBeGreaterThanOrEqual(0.8);
    });

    it('should respect maximum scale limit', () => {
      const customOptions = {
        maxScale: 0.8
      };
      
      mockWindowDimensions(2000, 1500);
      
      const { result } = renderHook(() => useResponsiveCanvas(customOptions));
      
      expect(result.current.dimensions.scale).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Resize handling', () => {
    it('should update dimensions on window resize', async () => {
      mockWindowDimensions(1200, 800);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      const initialWidth = result.current.dimensions.width;
      
      // Simulate window resize
      act(() => {
        mockWindowDimensions(600, 400);
        window.dispatchEvent(new Event('resize'));
      });
      
      // Wait for debounced update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      
      expect(result.current.dimensions.width).toBeLessThan(initialWidth);
    });

    it('should update dimensions on orientation change', async () => {
      mockWindowDimensions(375, 667);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      const initialDimensions = result.current.dimensions;
      
      // Simulate orientation change
      act(() => {
        mockWindowDimensions(667, 375);
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      // Wait for debounced update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });
      
      expect(result.current.dimensions).not.toEqual(initialDimensions);
    });
  });

  describe('Aspect ratio maintenance', () => {
    it('should maintain aspect ratio when scaling', () => {
      mockWindowDimensions(400, 300);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      const expectedAspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT;
      const actualAspectRatio = result.current.dimensions.width / result.current.dimensions.height;
      
      expect(Math.abs(actualAspectRatio - expectedAspectRatio)).toBeLessThan(0.01);
    });

    it('should handle extreme aspect ratios', () => {
      // Very wide screen
      mockWindowDimensions(2000, 400);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.dimensions.scale).toBeGreaterThan(RESPONSIVE_CONFIG.MIN_SCALE);
      expect(result.current.dimensions.scale).toBeLessThanOrEqual(RESPONSIVE_CONFIG.MAX_SCALE);
    });
  });

  describe('Performance flags', () => {
    it('should identify small screens correctly', () => {
      mockWindowDimensions(300, 200);
      
      const { result } = renderHook(() => useResponsiveCanvas());
      
      expect(result.current.isSmallScreen).toBe(true);
      expect(result.current.dimensions.scale).toBeLessThan(0.7);
    });

    it('should identify large screens correctly', () => {
      const customOptions = { maxScale: 2 };
      mockWindowDimensions(2000, 1500);
      
      const { result } = renderHook(() => useResponsiveCanvas(customOptions));
      
      expect(result.current.isLargeScreen).toBe(true);
      expect(result.current.dimensions.scale).toBeGreaterThan(1.2);
    });
  });
});