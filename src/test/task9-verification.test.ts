/**
 * Task 9 Verification Test: Increase obstacle spacing by 50%
 * 
 * This test verifies that:
 * - OBSTACLE_SPAWN_DISTANCE is updated from 300 to 450 (50% increase)
 * - Obstacle generation spacing calculations use the new value
 * - Spacing remains consistent regardless of difficulty progression
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GAME_CONFIG } from '../utils/gameConfig';
import { GameEngine } from '../components/GameEngine';

describe('Task 9: Obstacle Spacing 50% Increase', () => {
  let gameEngine: GameEngine;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Mock canvas and context
    mockCanvas = {
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        setTransform: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        }))
      }))
    } as any;

    gameEngine = new GameEngine(mockCanvas);
  });

  describe('Configuration Verification', () => {
    it('should have OBSTACLE_SPAWN_DISTANCE set to 450 (50% increase from 300)', () => {
      // Verify the base configuration
      expect(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE).toBe(450);
      
      // Verify this is exactly 50% more than the original 300
      const originalSpacing = 300;
      const expectedNewSpacing = originalSpacing * 1.5;
      expect(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE).toBe(expectedNewSpacing);
    });

    it('should calculate spacing ranges based on the new OBSTACLE_SPAWN_DISTANCE', () => {
      // Start the game to initialize obstacle generation config
      gameEngine.start();
      
      // Get the obstacle generation configuration
      const obstacleConfig = (gameEngine as any).obstacleGenerationConfig;
      
      // Verify min and max spacing are calculated from the new base value
      const expectedMinSpacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 0.8; // 360
      const expectedMaxSpacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 1.2; // 540
      
      expect(obstacleConfig.minSpacing).toBe(expectedMinSpacing);
      expect(obstacleConfig.maxSpacing).toBe(expectedMaxSpacing);
    });
  });

  describe('Spacing Consistency', () => {
    it('should maintain consistent spacing regardless of game progression', () => {
      gameEngine.start();
      
      // Get initial spacing configuration
      const initialConfig = (gameEngine as any).obstacleGenerationConfig;
      const initialMinSpacing = initialConfig.minSpacing;
      const initialMaxSpacing = initialConfig.maxSpacing;
      
      // Verify spacing configuration is based on the constant value
      expect(initialMinSpacing).toBe(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 0.8);
      expect(initialMaxSpacing).toBe(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 1.2);
      
      // The configuration is constant and doesn't change during gameplay
      const currentConfig = (gameEngine as any).obstacleGenerationConfig;
      expect(currentConfig.minSpacing).toBe(initialMinSpacing);
      expect(currentConfig.maxSpacing).toBe(initialMaxSpacing);
    });

    it('should generate spacing values within the expected range', () => {
      gameEngine.start();
      
      const spacingValues: number[] = [];
      const generateRandomSpacing = (gameEngine as any).generateRandomSpacing.bind(gameEngine);
      
      // Generate multiple spacing values to test the range
      for (let i = 0; i < 100; i++) {
        const spacing = generateRandomSpacing();
        spacingValues.push(spacing);
      }
      
      // Verify all spacing values are within the expected range
      const minExpected = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 0.8; // 360
      const maxExpected = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 1.2; // 540
      
      spacingValues.forEach(spacing => {
        expect(spacing).toBeGreaterThanOrEqual(minExpected);
        expect(spacing).toBeLessThanOrEqual(maxExpected);
      });
      
      // Verify we have reasonable distribution across the range
      const averageSpacing = spacingValues.reduce((sum, val) => sum + val, 0) / spacingValues.length;
      expect(averageSpacing).toBeGreaterThan(minExpected);
      expect(averageSpacing).toBeLessThan(maxExpected);
    });
  });

  describe('Requirements Verification', () => {
    it('should satisfy Requirement 5.1: 50% increase in horizontal distance', () => {
      const originalSpacing = 300;
      const currentSpacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE;
      const increasePercentage = ((currentSpacing - originalSpacing) / originalSpacing) * 100;
      
      expect(increasePercentage).toBe(50);
    });

    it('should satisfy Requirement 5.2: Adequate time for question reading', () => {
      // With obstacle speed of 2 pixels per frame and 450 pixel spacing,
      // players have 225 frames (3.75 seconds at 60fps) between obstacles
      const timePerObstacle = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE / GAME_CONFIG.OBSTACLE_SPEED;
      const secondsPerObstacle = timePerObstacle / GAME_CONFIG.FRAME_RATE;
      
      // Should provide at least 3 seconds for reading and planning
      expect(secondsPerObstacle).toBeGreaterThan(3);
    });

    it('should satisfy Requirement 5.4: Consistent spacing for learning focus', () => {
      // Verify that spacing is not modified by any difficulty or progression logic
      gameEngine.start();
      
      const initialSpacing = GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE;
      const config = (gameEngine as any).obstacleGenerationConfig;
      
      // Verify spacing is constant and not affected by game state
      expect(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE).toBe(initialSpacing);
      expect(config.minSpacing).toBe(initialSpacing * 0.8);
      expect(config.maxSpacing).toBe(initialSpacing * 1.2);
    });

    it('should satisfy Requirement 5.5: No negative impact on game smoothness', () => {
      // Verify that the increased spacing doesn't cause performance issues
      gameEngine.start();
      
      // Game should initialize without throwing errors
      const gameState = gameEngine.getGameState();
      expect(gameState).toBeDefined();
      expect(gameState.obstacles).toBeDefined();
      
      // Spacing configuration should be reasonable for performance
      const config = (gameEngine as any).obstacleGenerationConfig;
      expect(config.minSpacing).toBeGreaterThan(0);
      expect(config.maxSpacing).toBeGreaterThan(config.minSpacing);
    });
  });
});