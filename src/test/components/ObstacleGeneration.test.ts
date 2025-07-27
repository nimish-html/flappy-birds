import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine, GameState } from '../../components/GameEngine';
import { Obstacle } from '../../components/Obstacle';
import { GAME_CONFIG } from '../../utils/gameConfig';

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();

Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true
});

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => 16.67)
  },
  writable: true
});

// Mock HTMLCanvasElement and CanvasRenderingContext2D
const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  globalAlpha: 0,
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  }))
};

const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  width: 0,
  height: 0
} as unknown as HTMLCanvasElement;

describe('Obstacle Generation System', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
    gameEngine.initialize(mockCanvas);
    
    // Reset mocks
    vi.clearAllMocks();
    mockRequestAnimationFrame.mockImplementation((callback) => {
      setTimeout(callback, 16.67);
      return 1;
    });
  });

  afterEach(() => {
    gameEngine.destroy();
  });

  describe('Obstacle Spawning Logic', () => {
    it('should generate obstacles with proper spacing', () => {
      gameEngine.start();
      
      // Force obstacle generation
      gameEngine.forceObstacleGeneration();
      
      const state = gameEngine.getGameState();
      expect(state.obstacles.length).toBeGreaterThan(0);
      
      const firstObstacle = state.obstacles[0];
      expect(firstObstacle.x).toBe(GAME_CONFIG.CANVAS_WIDTH);
    });

    it('should generate obstacles with random spacing within configured range', () => {
      gameEngine.start();
      
      // Test the spacing generation by running the game loop naturally
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      const spacings: number[] = [];
      let lastNextX = gameEngine.getGameState().nextObstacleX;
      
      // Run game loop to generate obstacles and measure spacing
      for (let i = 0; i < 50; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * (i + 1));
        gameLoopCallback(16.67 * (i + 1));
        
        const currentNextX = gameEngine.getGameState().nextObstacleX;
        if (currentNextX !== lastNextX) {
          const spacing = currentNextX - lastNextX;
          spacings.push(spacing);
          lastNextX = currentNextX;
        }
        
        if (spacings.length >= 3) break; // Get at least 3 spacing measurements
      }
      
      expect(spacings.length).toBeGreaterThanOrEqual(1);
      
      // Check that spacings are within expected range
      const minExpectedSpacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 0.8;
      const maxExpectedSpacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 1.2;
      
      spacings.forEach(spacing => {
        expect(spacing).toBeGreaterThanOrEqual(minExpectedSpacing);
        expect(spacing).toBeLessThanOrEqual(maxExpectedSpacing);
      });
    });

    it('should generate obstacles continuously during gameplay', async () => {
      gameEngine.start();
      
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate multiple game loop iterations
      for (let i = 0; i < 10; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * i);
        gameLoopCallback(16.67 * i);
      }
      
      const state = gameEngine.getGameState();
      expect(state.obstacles.length).toBeGreaterThan(0);
    });

    it('should not generate obstacles when game is not playing', () => {
      // Don't start the game
      gameEngine.forceObstacleGeneration();
      
      const state = gameEngine.getGameState();
      expect(state.obstacles.length).toBe(0);
    });
  });

  describe('Random Height Generation', () => {
    it('should generate obstacles with random gap heights', () => {
      gameEngine.start();
      
      const gapHeights: number[] = [];
      
      // Generate multiple obstacles
      for (let i = 0; i < 10; i++) {
        gameEngine.forceObstacleGeneration();
        const obstacles = gameEngine.getGameState().obstacles;
        if (obstacles.length > i) {
          gapHeights.push(obstacles[i].gapHeight);
        }
      }
      
      // Check that gap heights vary
      const uniqueGapHeights = new Set(gapHeights);
      expect(uniqueGapHeights.size).toBeGreaterThan(1);
      
      // Check that all gap heights are within expected range
      const minGapHeight = GAME_CONFIG.OBSTACLE_GAP * 0.9;
      const maxGapHeight = GAME_CONFIG.OBSTACLE_GAP * 1.1;
      
      gapHeights.forEach(height => {
        expect(height).toBeGreaterThanOrEqual(minGapHeight);
        expect(height).toBeLessThanOrEqual(maxGapHeight);
      });
    });

    it('should generate obstacles with random gap Y positions', () => {
      gameEngine.start();
      
      const gapYPositions: number[] = [];
      
      // Generate multiple obstacles
      for (let i = 0; i < 10; i++) {
        gameEngine.forceObstacleGeneration();
        const obstacles = gameEngine.getGameState().obstacles;
        if (obstacles.length > i) {
          gapYPositions.push(obstacles[i].gapY);
        }
      }
      
      // Check that gap Y positions vary
      const uniqueGapYPositions = new Set(gapYPositions);
      expect(uniqueGapYPositions.size).toBeGreaterThan(1);
      
      // Check that all gap Y positions are within screen bounds
      const minGapY = GAME_CONFIG.OBSTACLE_GAP / 2 + GAME_CONFIG.OBSTACLE_MIN_HEIGHT;
      const maxGapY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.OBSTACLE_GAP / 2 - GAME_CONFIG.OBSTACLE_MIN_HEIGHT;
      
      gapYPositions.forEach(gapY => {
        expect(gapY).toBeGreaterThanOrEqual(minGapY);
        expect(gapY).toBeLessThanOrEqual(maxGapY);
      });
    });

    it('should ensure gap fits within screen bounds', () => {
      gameEngine.start();
      
      // Generate many obstacles to test edge cases
      for (let i = 0; i < 20; i++) {
        gameEngine.forceObstacleGeneration();
      }
      
      const obstacles = gameEngine.getGameState().obstacles;
      
      obstacles.forEach(obstacle => {
        const gapTop = obstacle.gapY - obstacle.gapHeight / 2;
        const gapBottom = obstacle.gapY + obstacle.gapHeight / 2;
        
        // Gap top should be below minimum height
        expect(gapTop).toBeGreaterThanOrEqual(GAME_CONFIG.OBSTACLE_MIN_HEIGHT);
        
        // Gap bottom should be above ground with minimum height
        expect(gapBottom).toBeLessThanOrEqual(
          GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.OBSTACLE_MIN_HEIGHT
        );
      });
    });
  });

  describe('Obstacle Cleanup', () => {
    it('should remove obstacles when they move off-screen', async () => {
      gameEngine.start();
      
      // Generate an obstacle
      gameEngine.forceObstacleGeneration();
      
      const initialObstacleCount = gameEngine.getGameState().obstacles.length;
      expect(initialObstacleCount).toBeGreaterThan(0);
      
      // Simulate many game loop iterations to move obstacles off-screen
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      for (let i = 0; i < 200; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * i);
        gameLoopCallback(16.67 * i);
      }
      
      // Check that off-screen obstacles were cleaned up
      const finalObstacles = gameEngine.getGameState().obstacles;
      const offScreenObstacles = finalObstacles.filter(obstacle => obstacle.isOffScreen());
      expect(offScreenObstacles.length).toBe(0);
    });

    it('should keep on-screen obstacles', () => {
      gameEngine.start();
      
      // Generate obstacles
      for (let i = 0; i < 3; i++) {
        gameEngine.forceObstacleGeneration();
      }
      
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate a few game loop iterations (not enough to move all obstacles off-screen)
      for (let i = 0; i < 10; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * i);
        gameLoopCallback(16.67 * i);
      }
      
      const obstacles = gameEngine.getGameState().obstacles;
      const onScreenObstacles = obstacles.filter(obstacle => !obstacle.isOffScreen());
      expect(onScreenObstacles.length).toBeGreaterThan(0);
    });

    it('should clean up obstacles immediately when they go off-screen', () => {
      gameEngine.start();
      
      // Generate a normal obstacle first
      gameEngine.forceObstacleGeneration();
      
      // Create a mock obstacle that is already off-screen
      const offScreenObstacle = new Obstacle(-200); // Far off-screen to the left
      
      // Add it to the game state
      const state = gameEngine.getGameState();
      state.obstacles.push(offScreenObstacle);
      
      const initialCount = state.obstacles.length;
      expect(initialCount).toBeGreaterThan(1); // Should have at least 2 obstacles
      
      // Run one game loop iteration to trigger cleanup
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      vi.mocked(performance.now).mockReturnValue(50);
      gameLoopCallback(50);
      
      const finalCount = gameEngine.getGameState().obstacles.length;
      expect(finalCount).toBeLessThan(initialCount);
    });
  });

  describe('Obstacle Pooling', () => {
    it('should initialize with empty obstacle pools', () => {
      const stats = gameEngine.getObstacleStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.inactiveCount).toBe(0);
      expect(stats.totalGenerated).toBe(0);
    });

    it('should reuse obstacles from inactive pool', async () => {
      gameEngine.start();
      
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Run game loop to generate and then clean up obstacles
      for (let i = 0; i < 500; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * (i + 1));
        gameLoopCallback(16.67 * (i + 1));
      }
      
      const stats = gameEngine.getObstacleStats();
      
      // Should have generated obstacles and some should be in inactive pool
      expect(stats.totalGenerated).toBeGreaterThan(0);
      
      // The key test: total generated should be less than what would be created without pooling
      // In 500 iterations, without pooling we'd create many more obstacles
      expect(stats.totalGenerated).toBeLessThan(20); // Reasonable number with pooling
    });

    it('should limit inactive pool size', () => {
      gameEngine.start();
      
      // Generate many obstacles to test pool size limit
      for (let i = 0; i < 15; i++) {
        gameEngine.forceObstacleGeneration();
      }
      
      // Move all obstacles off-screen
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      for (let i = 0; i < 300; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * i);
        gameLoopCallback(16.67 * i);
      }
      
      const stats = gameEngine.getObstacleStats();
      expect(stats.inactiveCount).toBeLessThanOrEqual(10); // Pool size limit
    });

    it('should reset obstacle pools on game reset', () => {
      gameEngine.start();
      
      // Generate obstacles
      for (let i = 0; i < 3; i++) {
        gameEngine.forceObstacleGeneration();
      }
      
      const statsBeforeReset = gameEngine.getObstacleStats();
      expect(statsBeforeReset.activeCount).toBeGreaterThan(0);
      
      // Reset game
      gameEngine.reset();
      
      const statsAfterReset = gameEngine.getObstacleStats();
      expect(statsAfterReset.activeCount).toBe(0);
      expect(statsAfterReset.totalGenerated).toBeGreaterThan(0); // Inactive pool should contain obstacles
    });

    it('should properly manage pool during continuous gameplay', async () => {
      gameEngine.start();
      
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate extended gameplay
      for (let i = 0; i < 1000; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * (i + 1));
        gameLoopCallback(16.67 * (i + 1));
      }
      
      const stats = gameEngine.getObstacleStats();
      
      // Should have active obstacles on screen
      expect(stats.activeCount).toBeGreaterThan(0);
      
      // Total generated should be reasonable (pooling prevents excessive object creation)
      expect(stats.totalGenerated).toBeLessThan(30);
      
      // Should have reasonable number of active obstacles
      expect(stats.activeCount).toBeLessThan(10);
    });
  });

  describe('Performance Optimization', () => {
    it('should maintain reasonable obstacle count during extended gameplay', async () => {
      gameEngine.start();
      
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate very long gameplay session
      for (let i = 0; i < 1000; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * i);
        gameLoopCallback(16.67 * i);
      }
      
      const obstacles = gameEngine.getGameState().obstacles;
      
      // Should not accumulate too many obstacles
      expect(obstacles.length).toBeLessThan(10);
      
      // All obstacles should be on-screen or close to it
      obstacles.forEach(obstacle => {
        expect(obstacle.x).toBeGreaterThan(-GAME_CONFIG.OBSTACLE_WIDTH);
      });
    });

    it('should not create excessive objects during gameplay', () => {
      gameEngine.start();
      
      const initialStats = gameEngine.getObstacleStats();
      
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      
      // Simulate moderate gameplay
      for (let i = 0; i < 200; i++) {
        vi.mocked(performance.now).mockReturnValue(16.67 * i);
        gameLoopCallback(16.67 * i);
      }
      
      const finalStats = gameEngine.getObstacleStats();
      
      // Should not create too many new objects
      const totalObjectsCreated = finalStats.totalGenerated - initialStats.totalGenerated;
      expect(totalObjectsCreated).toBeLessThan(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid game resets without memory leaks', () => {
      for (let i = 0; i < 10; i++) {
        gameEngine.start();
        gameEngine.forceObstacleGeneration();
        gameEngine.reset();
      }
      
      const stats = gameEngine.getObstacleStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.totalGenerated).toBeGreaterThan(0);
    });

    it('should handle obstacle generation when canvas is at edge cases', () => {
      gameEngine.start();
      
      // Force nextObstacleX to exactly canvas width
      const state = gameEngine.getGameState();
      state.nextObstacleX = GAME_CONFIG.CANVAS_WIDTH;
      
      gameEngine.forceObstacleGeneration();
      
      expect(state.obstacles.length).toBeGreaterThan(0);
      expect(state.obstacles[state.obstacles.length - 1].x).toBe(GAME_CONFIG.CANVAS_WIDTH);
    });

    it('should maintain obstacle generation timing consistency', () => {
      gameEngine.start();
      
      const initialStats = gameEngine.getObstacleStats();
      expect(initialStats.lastSpawnTime).toBe(0);
      
      gameEngine.forceObstacleGeneration();
      
      const updatedStats = gameEngine.getObstacleStats();
      expect(updatedStats.lastSpawnTime).toBeGreaterThan(0);
    });
  });
});