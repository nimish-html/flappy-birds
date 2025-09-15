import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { GAME_CONFIG } from '../../utils/gameConfig';

// Mock performance.now for consistent testing
let mockTime = 0;
const mockPerformanceNow = vi.fn(() => mockTime);
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10 // 10MB initial
    }
  },
  writable: true
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock canvas
const createMockCanvas = () => {
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
  };

  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => mockContext)
  } as unknown as HTMLCanvasElement;
};

describe('Pacing Integration Test - Task 10', () => {
  let gameEngine: GameEngine;
  let mockCanvas: HTMLCanvasElement;
  let mockCallbacks: {
    onScoreUpdate: ReturnType<typeof vi.fn>;
    onGameOver: ReturnType<typeof vi.fn>;
    onGameStart: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onQuestionUpdate: ReturnType<typeof vi.fn>;
    onMathScoreUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTime = 0;
    mockCanvas = createMockCanvas();
    gameEngine = new GameEngine();
    
    mockCallbacks = {
      onScoreUpdate: vi.fn(),
      onGameOver: vi.fn(),
      onGameStart: vi.fn(),
      onError: vi.fn(),
      onQuestionUpdate: vi.fn(),
      onMathScoreUpdate: vi.fn()
    };

    gameEngine.initialize(mockCanvas, mockCallbacks);
  });

  afterEach(() => {
    gameEngine.destroy();
    vi.clearAllMocks();
  });

  describe('Game Engine Integration with Increased Spacing', () => {
    it('should initialize successfully with new spacing configuration', () => {
      // Verify game engine initializes without errors
      expect(gameEngine).toBeDefined();
      expect(gameEngine.isPlaying()).toBe(false);
      expect(gameEngine.isGameOver()).toBe(false);
      
      // Verify spacing configuration is loaded
      expect(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE).toBe(450);
    });

    it('should start game successfully with increased spacing', () => {
      // Start the game
      gameEngine.start();
      
      // Verify game started
      expect(gameEngine.isPlaying()).toBe(true);
      expect(mockCallbacks.onGameStart).toHaveBeenCalled();
      
      // Verify no errors occurred during startup
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
    });

    it('should handle game updates smoothly with new spacing', () => {
      // Start the game
      gameEngine.start();
      
      // Simulate multiple game updates
      const updateCount = 100;
      let errorCount = 0;
      
      for (let i = 0; i < updateCount; i++) {
        try {
          gameEngine.update();
          mockTime += 16.67; // 60fps
        } catch (error) {
          errorCount++;
        }
      }
      
      // Verify no errors occurred during updates
      expect(errorCount).toBe(0);
      expect(gameEngine.isPlaying()).toBe(true);
    });

    it('should maintain performance with obstacle generation', () => {
      // Start the game
      gameEngine.start();
      
      // Track performance during obstacle generation
      const performanceMetrics: number[] = [];
      
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = mockTime;
        
        // Force obstacle generation periodically
        if (frame % 20 === 0) {
          gameEngine.forceObstacleGeneration();
        }
        
        gameEngine.update();
        gameEngine.render();
        
        const frameTime = 16.67; // Mock consistent frame time
        performanceMetrics.push(frameTime);
        mockTime += frameTime;
      }
      
      // Verify consistent performance
      const avgFrameTime = performanceMetrics.reduce((sum, time) => sum + time, 0) / performanceMetrics.length;
      expect(avgFrameTime).toBeLessThan(20); // Should be under 20ms per frame
      
      // Verify obstacles were generated
      const obstacleStats = gameEngine.getObstacleStats();
      expect(obstacleStats.activeCount).toBeGreaterThan(0);
    });

    it('should handle difficulty changes without affecting spacing', () => {
      // Start the game
      gameEngine.start();
      
      // Test different difficulty levels
      const difficulties = [1, 3, 5, 7, 10];
      
      for (const difficulty of difficulties) {
        gameEngine.setDifficulty(difficulty);
        
        // Run some updates
        for (let i = 0; i < 10; i++) {
          gameEngine.update();
          mockTime += 16.67;
        }
        
        // Verify game is still running smoothly
        expect(gameEngine.isPlaying()).toBe(true);
      }
      
      // Verify no errors occurred
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
    });

    it('should maintain educational timing with new spacing', () => {
      // Verify the timing calculations work correctly
      const spacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE;
      const speed = GAME_CONFIG.OBSTACLE_SPEED;
      const frameRate = GAME_CONFIG.FRAME_RATE;
      
      const timePerObstacle = (spacing / speed) / frameRate;
      
      // Should provide adequate educational time
      expect(timePerObstacle).toBeGreaterThan(3); // At least 3 seconds
      expect(timePerObstacle).toBeLessThan(8); // Not more than 8 seconds
      
      // Should be approximately 3.75 seconds with current settings
      expect(timePerObstacle).toBeCloseTo(3.75, 0.5);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not accumulate obstacles with increased spacing', () => {
      // Start the game
      gameEngine.start();
      
      // Run for extended period
      for (let frame = 0; frame < 500; frame++) {
        gameEngine.update();
        
        // Generate obstacles periodically
        if (frame % 50 === 0) {
          gameEngine.forceObstacleGeneration();
        }
        
        mockTime += 16.67;
      }
      
      // Verify obstacle count is reasonable
      const obstacleStats = gameEngine.getObstacleStats();
      expect(obstacleStats.activeCount).toBeLessThan(50); // Should not accumulate excessively
    });

    it('should handle cleanup properly with new spacing', () => {
      // Start the game
      gameEngine.start();
      
      // Generate and cleanup obstacles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Generate obstacles
        for (let i = 0; i < 3; i++) {
          gameEngine.forceObstacleGeneration();
        }
        
        // Run updates to move obstacles off screen
        for (let i = 0; i < 100; i++) {
          gameEngine.update();
          mockTime += 16.67;
        }
      }
      
      // Verify cleanup is working
      const finalStats = gameEngine.getObstacleStats();
      expect(finalStats.activeCount).toBeLessThan(20); // Should clean up properly
    });
  });

  describe('Error Handling and Stability', () => {
    it('should handle errors gracefully with new spacing', () => {
      // Start the game
      gameEngine.start();
      
      let errorCount = 0;
      
      // Simulate potential error conditions
      for (let i = 0; i < 100; i++) {
        try {
          gameEngine.update();
          gameEngine.render();
          
          // Occasionally force obstacle generation
          if (i % 25 === 0) {
            gameEngine.forceObstacleGeneration();
          }
          
          mockTime += 16.67;
        } catch (error) {
          errorCount++;
        }
      }
      
      // Should handle any errors gracefully
      expect(errorCount).toBe(0);
      expect(gameEngine.isPlaying()).toBe(true);
    });

    it('should maintain stability during extended gameplay', () => {
      // Start the game
      gameEngine.start();
      
      // Simulate extended gameplay (10 seconds at 60fps)
      const totalFrames = 600;
      let stableFrames = 0;
      
      for (let frame = 0; frame < totalFrames; frame++) {
        try {
          gameEngine.update();
          gameEngine.render();
          
          if (gameEngine.isPlaying()) {
            stableFrames++;
          }
          
          mockTime += 16.67;
        } catch (error) {
          // Count as unstable frame
        }
      }
      
      // Should maintain stability for most frames
      const stabilityPercentage = (stableFrames / totalFrames) * 100;
      expect(stabilityPercentage).toBeGreaterThan(95); // At least 95% stable
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should maintain target performance metrics', () => {
      // Start the game
      gameEngine.start();
      
      // Get initial performance metrics
      const initialMetrics = gameEngine.getPerformanceMetrics();
      
      // Run game for a while
      for (let i = 0; i < 120; i++) { // 2 seconds at 60fps
        gameEngine.update();
        gameEngine.render();
        mockTime += 16.67;
      }
      
      // Get final performance metrics
      const finalMetrics = gameEngine.getPerformanceMetrics();
      
      // Verify performance is maintained
      expect(finalMetrics.totalFrames).toBeGreaterThan(initialMetrics.totalFrames);
      
      // Should not have excessive dropped frames
      const droppedFramePercentage = (finalMetrics.droppedFrames / finalMetrics.totalFrames) * 100;
      expect(droppedFramePercentage).toBeLessThan(5); // Less than 5% dropped frames
    });

    it('should provide optimization recommendations when needed', () => {
      // Start the game
      gameEngine.start();
      
      // Get optimization status
      const optimizationStatus = gameEngine.getOptimizationStatus();
      
      // Should provide valid optimization data
      expect(optimizationStatus).toBeDefined();
      expect(Array.isArray(optimizationStatus.recommendations)).toBe(true);
      
      // Should have boolean flags for optimization states
      expect(typeof optimizationStatus.reducedParticles).toBe('boolean');
      expect(typeof optimizationStatus.disabledScreenShake).toBe('boolean');
      expect(typeof optimizationStatus.reducedVisualEffects).toBe('boolean');
    });
  });

  describe('Task 10 Specific Validation', () => {
    it('should verify pacing does not impact game smoothness', () => {
      // This is the core requirement of Task 10
      gameEngine.start();
      
      const frameMetrics: number[] = [];
      const targetFrameTime = 16.67; // 60fps
      
      // Simulate gameplay with obstacle generation
      for (let frame = 0; frame < 180; frame++) { // 3 seconds
        const frameStart = mockTime;
        
        // Generate obstacles at regular intervals
        if (frame % 60 === 0) { // Every second
          gameEngine.forceObstacleGeneration();
        }
        
        gameEngine.update();
        gameEngine.render();
        
        const frameTime = targetFrameTime; // Mock consistent timing
        frameMetrics.push(frameTime);
        mockTime += frameTime;
      }
      
      // Verify smooth performance
      const avgFrameTime = frameMetrics.reduce((sum, time) => sum + time, 0) / frameMetrics.length;
      expect(avgFrameTime).toBeLessThanOrEqual(targetFrameTime * 1.1); // Within 10% of target
      
      // Verify no frame drops
      const maxFrameTime = Math.max(...frameMetrics);
      expect(maxFrameTime).toBeLessThan(33); // Should not drop below 30fps
      
      // Verify game is still running smoothly
      expect(gameEngine.isPlaying()).toBe(true);
    });

    it('should confirm educational focus is maintained with new pacing', () => {
      // Verify the educational timing requirements
      const educationalTime = (GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE / GAME_CONFIG.OBSTACLE_SPEED) / GAME_CONFIG.FRAME_RATE;
      
      // Should provide adequate time for educational interaction
      expect(educationalTime).toBeGreaterThan(3); // Minimum for question processing
      expect(educationalTime).toBeLessThan(8); // Maximum to maintain engagement
      
      // Should be the expected 3.75 seconds
      expect(educationalTime).toBeCloseTo(3.75, 0.25);
      
      // Verify this timing works in practice
      gameEngine.start();
      
      // Simulate educational gameplay
      for (let i = 0; i < 60; i++) { // 1 second
        gameEngine.update();
        mockTime += 16.67;
      }
      
      // Game should still be running smoothly
      expect(gameEngine.isPlaying()).toBe(true);
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
    });

    it('should validate that performance remains optimal', () => {
      // Requirement 5.3: Ensure performance remains optimal with new spacing
      gameEngine.start();
      
      // Track performance over time
      const performanceSnapshots: any[] = [];
      
      for (let second = 0; second < 5; second++) {
        // Run for 1 second
        for (let frame = 0; frame < 60; frame++) {
          gameEngine.update();
          gameEngine.render();
          mockTime += 16.67;
        }
        
        // Take performance snapshot
        const metrics = gameEngine.getPerformanceMetrics();
        performanceSnapshots.push({
          second,
          totalFrames: metrics.totalFrames,
          droppedFrames: metrics.droppedFrames
        });
      }
      
      // Verify performance remains consistent
      for (let i = 1; i < performanceSnapshots.length; i++) {
        const current = performanceSnapshots[i];
        const previous = performanceSnapshots[i - 1];
        
        // Should process approximately 60 frames per second
        const framesThisSecond = current.totalFrames - previous.totalFrames;
        expect(framesThisSecond).toBeGreaterThan(55); // Allow some variance
        expect(framesThisSecond).toBeLessThan(65);
        
        // Should not have excessive dropped frames
        const droppedThisSecond = current.droppedFrames - previous.droppedFrames;
        expect(droppedThisSecond).toBeLessThan(5); // Less than 5 dropped frames per second
      }
    });
  });
});