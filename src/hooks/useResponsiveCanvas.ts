import { useState, useEffect, useCallback } from 'react';
import { GAME_CONFIG } from '../utils/gameConfig';

export interface CanvasDimensions {
  width: number;
  height: number;
  scale: number;
}

export interface ResponsiveCanvasOptions {
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  minScale?: number;
  maxScale?: number;
}

/**
 * Hook for managing responsive canvas dimensions
 * Maintains aspect ratio while adapting to different screen sizes
 */
export const useResponsiveCanvas = (options: ResponsiveCanvasOptions = {}) => {
  const {
    maxWidth = GAME_CONFIG.CANVAS_WIDTH,
    maxHeight = GAME_CONFIG.CANVAS_HEIGHT,
    aspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT,
    minScale = 0.3,
    maxScale = 1.5
  } = options;

  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: maxWidth,
    height: maxHeight,
    scale: 1
  });

  const [isMobile, setIsMobile] = useState(false);

  const calculateDimensions = useCallback(() => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Account for UI elements and padding
    const availableWidth = Math.min(viewportWidth * 0.95, viewportWidth - 40);
    const availableHeight = Math.min(viewportHeight * 0.8, viewportHeight - 200);
    
    // Calculate scale based on available space
    const scaleByWidth = availableWidth / maxWidth;
    const scaleByHeight = availableHeight / maxHeight;
    const scale = Math.min(scaleByWidth, scaleByHeight, maxScale);
    
    // Ensure minimum scale
    const finalScale = Math.max(scale, minScale);
    
    // Calculate final dimensions maintaining aspect ratio
    const width = Math.floor(maxWidth * finalScale);
    const height = Math.floor(maxHeight * finalScale);
    
    // Detect mobile devices
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                          viewportWidth <= 768;
    
    setDimensions({ width, height, scale: finalScale });
    setIsMobile(isMobileDevice);
  }, [maxWidth, maxHeight, minScale, maxScale]);

  // Handle window resize
  useEffect(() => {
    calculateDimensions();
    
    const handleResize = () => {
      // Debounce resize events
      setTimeout(calculateDimensions, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [calculateDimensions]);

  return {
    dimensions,
    isMobile,
    isSmallScreen: dimensions.scale < 0.7,
    isLargeScreen: dimensions.scale > 1.2
  };
};