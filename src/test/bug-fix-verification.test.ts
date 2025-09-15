/**
 * Test to verify the obstacle generation bug fix
 * 
 * This test ensures that:
 * 1. nextObstacleX remains stationary until obstacles are spawned
 * 2. Obstacles are generated with the correct question timing
 * 3. No premature obstacle generation occurs
 */

import { GameEngine, GameState } from '../components/GameEngine';
import { GAME_CONFIG } from '../utils/gameConfig';

describe('Obstacle Generation Bug Fix', () => {
  let gameEngine: GameEngine;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = {
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      getContext: jest.fn(() => mockContext)
    } as unknown as HTMLCanvasElement;

    mockContext = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top'
    } as unknown as CanvasRenderingContext2D;

    gameEngine = new GameEngine();
    gameEngine.initialize(mockCanvas);
  });

  test('nextObstacleX should not move during game updates', () => {
    // Start the game
    gameEngine.start();
    
    // Get initial nextObstacleX value
    const initialNextObstacleX = (gameEngine as any).gameState.nextObstacleX;
    
    // Simulate several game update cycles
    const deltaTime = 16.67; // ~60fps
    for (let i = 0; i < 10; i++) {
      (gameEngine as any).update(deltaTime);
    }
    
    // Get nextObstacleX after updates
    const finalNextObstacleX = (gameEngine as any).gameState.nextObstacleX;
    
    // nextObstacleX should only change when obstacles are actually spawned
    // It should NOT decrease due to obstacle movement
    expect(finalNextObstacleX).toBeGreaterThanOrEqual(initialNextObstacleX);
  });

  test('obstacles should be generated with proper spacing', () => {
    // Start the game
    gameEngine.start();
    
    // Force nextObstacleX to be at canvas edge to trigger generation
    (gameEngine as any).gameState.nextObstacleX = GAME_CONFIG.CANVAS_WIDTH;
    
    // Update game to trigger obstacle generation
    (gameEngine as any).update(16.67);
    
    // Check that obstacle was generated
    const obstacles = (gameEngine as any).gameState.obstacles;
    expect(obstacles.length).toBe(1);
    
    // Check that nextObstacleX was properly updated with spacing
    const newNextObstacleX = (gameEngine as any).gameState.nextObstacleX;
    expect(newNextObstacleX).toBeGreaterThan(GAME_CONFIG.CANVAS_WIDTH);
    
    // The spacing should be reasonable (not too small, not too large)
    const spacing = newNextObstacleX - GAME_CONFIG.CANVAS_WIDTH;
    expect(spacing).toBeGreaterThan(200); // Minimum reasonable spacing
    expect(spacing).toBeLessThan(1000); // Maximum reasonable spacing
  });

  test('multiple obstacles should not be generated prematurely', () => {
    // Start the game
    gameEngine.start();
    
    // Set nextObstacleX to just trigger first obstacle
    (gameEngine as any).gameState.nextObstacleX = GAME_CONFIG.CANVAS_WIDTH;
    
    // Update game to generate first obstacle
    (gameEngine as any).update(16.67);
    
    // Should have exactly 1 obstacle
    let obstacles = (gameEngine as any).gameState.obstacles;
    expect(obstacles.length).toBe(1);
    
    // Run many more updates - should not generate more obstacles
    // because nextObstacleX should now be far off-screen
    for (let i = 0; i < 100; i++) {
      (gameEngine as any).update(16.67);
    }
    
    // Should still have only 1 obstacle (or maybe 2 if the first moved far enough)
    obstacles = (gameEngine as any).gameState.obstacles;
    expect(obstacles.length).toBeLessThanOrEqual(2);
  });

  test('obstacle cleanup should reset hasBeenAnswered flag', () => {
    // Start the game
    gameEngine.start();
    
    // Create a mock obstacle with hasBeenAnswered flag
    const mockObstacle = {
      x: -100, // Off-screen to the left
      isOffScreen: () => true,
      passed: false
    };
    (mockObstacle as any).hasBeenAnswered = true;
    
    // Add to obstacles
    (gameEngine as any).gameState.obstacles.push(mockObstacle);
    (gameEngine as any).mathObstaclePool.active.push(mockObstacle);
    
    // Update game to trigger cleanup
    (gameEngine as any).update(16.67);
    
    // The obstacle should be cleaned up and flag reset
    expect((mockObstacle as any).hasBeenAnswered).toBe(false);
  });
});