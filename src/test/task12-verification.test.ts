import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine, GameState, GameOverData } from '../components/GameEngine';
import { GAME_CONFIG } from '../utils/gameConfig';

/**
 * Task 12 Verification Tests: Enhance game over statistics display
 * 
 * Requirements:
 * - 6.5: Final score matches accumulated gameplay score
 * - 6.6: Highest streak tracking throughout the session
 * - Verify all statistics are accurately reflected in GameOverScreen
 */
describe('Task 12: Enhanced Game Over Statistics Display', () => {
  let gameEngine: GameEngine;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let gameOverData: GameOverData | null = null;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = {
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      getContext: vi.fn(() => mockContext)
    } as unknown as HTMLCanvasElement;

    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'top' as CanvasTextBaseline
    } as unknown as CanvasRenderingContext2D;

    // Create game engine
    gameEngine = new GameEngine();
    gameOverData = null;

    // Initialize with mock canvas and capture game over data
    gameEngine.initialize(mockCanvas, {
      onGameOver: (data: GameOverData) => {
        gameOverData = data;
      },
      onScoreUpdate: vi.fn(),
      onMathScoreUpdate: vi.fn(),
      onQuestionUpdate: vi.fn(),
      onGameStart: vi.fn(),
      onError: vi.fn(),
      onFeedbackUpdate: vi.fn()
    });
  });

  describe('Final Score Accuracy (Requirement 6.5)', () => {
    it('should ensure final score matches accumulated gameplay score', () => {
      // Start the game
      gameEngine.start();
      
      // Simulate gameplay with score accumulation
      const gameState = gameEngine.getGameState();
      
      // Simulate passing obstacles to accumulate score
      // Each obstacle passed should add POINTS_PER_OBSTACLE (1 point)
      const initialScore = gameState.score;
      
      // Force game over to capture final statistics
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify that the final score in game over data matches the accumulated score
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(gameState.score);
      
      // The score should be the same as what was accumulated during gameplay
      expect(gameOverData!.score).toBe(initialScore);
    });

    it('should maintain score consistency across multiple obstacle passes', () => {
      gameEngine.start();
      
      // Get initial game state
      let currentGameState = gameEngine.getGameState();
      const initialScore = currentGameState.score;
      
      // Simulate multiple obstacle passes by directly updating the score
      // This simulates what happens when the bird passes obstacles
      const obstaclesPassed = 5;
      for (let i = 0; i < obstaclesPassed; i++) {
        gameEngine['gameState'].score += GAME_CONFIG.POINTS_PER_OBSTACLE;
      }
      
      const expectedFinalScore = initialScore + (obstaclesPassed * GAME_CONFIG.POINTS_PER_OBSTACLE);
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify final score matches accumulated score
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(expectedFinalScore);
      expect(gameOverData!.score).toBe(gameEngine.getGameState().score);
    });

    it('should handle zero score correctly', () => {
      gameEngine.start();
      
      // Immediately trigger game over without any score accumulation
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify zero score is handled correctly
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(0);
      expect(gameOverData!.score).toBe(gameEngine.getGameState().score);
    });

    it('should handle negative scores correctly', () => {
      gameEngine.start();
      
      // Simulate negative score (from incorrect math answers)
      gameEngine['gameState'].score = -10;
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify negative score is preserved
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(-10);
      expect(gameOverData!.score).toBe(gameEngine.getGameState().score);
    });
  });

  describe('Highest Streak Tracking (Requirement 6.6)', () => {
    it('should track highest streak achieved during the session', () => {
      gameEngine.start();
      
      // Get the scoring system to simulate correct answers and build streak
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Simulate a streak of correct answers
      scoringSystem.processCorrectAnswer(); // streak = 1
      scoringSystem.processCorrectAnswer(); // streak = 2
      scoringSystem.processCorrectAnswer(); // streak = 3
      
      // Verify highest streak is tracked
      let scoreState = scoringSystem.getScoreState();
      expect(scoreState.highestStreak).toBe(3);
      
      // Break the streak with an incorrect answer
      scoringSystem.processIncorrectAnswer(); // streak = 0
      
      // Verify highest streak is preserved
      scoreState = scoringSystem.getScoreState();
      expect(scoreState.streak).toBe(0);
      expect(scoreState.highestStreak).toBe(3); // Should still be 3
      
      // Build a new, higher streak
      for (let i = 0; i < 5; i++) {
        scoringSystem.processCorrectAnswer();
      }
      
      // Verify new highest streak
      scoreState = scoringSystem.getScoreState();
      expect(scoreState.streak).toBe(5);
      expect(scoreState.highestStreak).toBe(5); // Should now be 5
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify highest streak is correctly reported in game over data
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.highestStreak).toBe(5);
      expect(gameOverData!.streak).toBe(5); // Current streak at game over
    });

    it('should maintain highest streak across multiple streak cycles', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // First streak cycle
      scoringSystem.processCorrectAnswer(); // streak = 1
      scoringSystem.processCorrectAnswer(); // streak = 2
      scoringSystem.processCorrectAnswer(); // streak = 3
      scoringSystem.processIncorrectAnswer(); // streak = 0, highestStreak = 3
      
      // Second streak cycle (lower than first)
      scoringSystem.processCorrectAnswer(); // streak = 1
      scoringSystem.processCorrectAnswer(); // streak = 2
      scoringSystem.processIncorrectAnswer(); // streak = 0, highestStreak should still be 3
      
      // Third streak cycle (higher than first)
      for (let i = 0; i < 7; i++) {
        scoringSystem.processCorrectAnswer(); // streak = 7
      }
      
      const scoreState = scoringSystem.getScoreState();
      expect(scoreState.highestStreak).toBe(7);
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify highest streak from entire session is reported
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.highestStreak).toBe(7);
    });

    it('should handle zero streak correctly', () => {
      gameEngine.start();
      
      // Immediately trigger game over without any correct answers
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify zero streak is handled correctly
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.streak).toBe(0);
      expect(gameOverData!.highestStreak).toBe(0);
    });

    it('should handle single correct answer streak', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Single correct answer
      scoringSystem.processCorrectAnswer(); // streak = 1, highestStreak = 1
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify single answer streak is tracked
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.streak).toBe(1);
      expect(gameOverData!.highestStreak).toBe(1);
    });
  });

  describe('Complete Statistics Accuracy', () => {
    it('should accurately reflect all statistics in game over data', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Simulate a complete game session with mixed results
      // 3 correct answers (building streak)
      scoringSystem.processCorrectAnswer(); // +10 points, streak = 1
      scoringSystem.processCorrectAnswer(); // +10 points, streak = 2
      scoringSystem.processCorrectAnswer(); // +10 points, streak = 3
      
      // 1 incorrect answer (breaking streak)
      scoringSystem.processIncorrectAnswer(); // -5 points, streak = 0
      
      // 2 more correct answers (new streak)
      scoringSystem.processCorrectAnswer(); // +10 points, streak = 1
      scoringSystem.processCorrectAnswer(); // +10 points, streak = 2
      
      // Add some obstacle passing score
      gameEngine['gameState'].score += 5; // 5 obstacles passed
      
      // Get expected values
      const scoreState = scoringSystem.getScoreState();
      const expectedMathScore = scoreState.points; // Should be 45 (5*10 - 5)
      const expectedTotalCorrect = 5;
      const expectedTotalIncorrect = 1;
      const expectedAccuracy = (5 / 6) * 100; // 83.3%
      const expectedHighestStreak = 3;
      const expectedCurrentStreak = 2;
      const expectedFinalScore = gameEngine.getGameState().score;
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify all statistics are accurate
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(expectedFinalScore);
      expect(gameOverData!.mathScore).toBe(expectedMathScore);
      expect(gameOverData!.totalCorrect).toBe(expectedTotalCorrect);
      expect(gameOverData!.totalIncorrect).toBe(expectedTotalIncorrect);
      expect(gameOverData!.accuracy).toBeCloseTo(expectedAccuracy, 1);
      expect(gameOverData!.highestStreak).toBe(expectedHighestStreak);
      expect(gameOverData!.streak).toBe(expectedCurrentStreak);
    });

    it('should maintain consistency between different score sources', () => {
      gameEngine.start();
      
      // Simulate gameplay
      const scoringSystem = gameEngine['scoringSystem'];
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      scoringSystem.processIncorrectAnswer();
      
      // Add obstacle score
      gameEngine['gameState'].score += 3;
      
      // Get scores from different sources
      const gameStateScore = gameEngine.getGameState().score;
      const mathPerformanceData = gameEngine.getMathPerformanceData();
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify consistency across all sources
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(gameStateScore);
      expect(gameOverData!.mathScore).toBe(mathPerformanceData.mathScore);
      expect(gameOverData!.totalCorrect).toBe(mathPerformanceData.totalCorrect);
      expect(gameOverData!.totalIncorrect).toBe(mathPerformanceData.totalIncorrect);
      expect(gameOverData!.accuracy).toBe(mathPerformanceData.accuracy);
      expect(gameOverData!.highestStreak).toBe(mathPerformanceData.highestStreak);
      expect(gameOverData!.streak).toBe(mathPerformanceData.streak);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very high scores correctly', () => {
      gameEngine.start();
      
      // Set a very high score
      gameEngine['gameState'].score = 999999;
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify high score is preserved
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.score).toBe(999999);
    });

    it('should handle very high streaks correctly', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Build a very high streak
      for (let i = 0; i < 100; i++) {
        scoringSystem.processCorrectAnswer();
      }
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify high streak is preserved
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.streak).toBe(100);
      expect(gameOverData!.highestStreak).toBe(100);
    });

    it('should handle precision in accuracy calculations', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Create a scenario that results in a decimal accuracy
      scoringSystem.processCorrectAnswer(); // 1 correct
      scoringSystem.processCorrectAnswer(); // 2 correct
      scoringSystem.processIncorrectAnswer(); // 1 incorrect
      // Total: 2 correct out of 3 = 66.666...%
      
      // Force game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify accuracy is properly rounded to 1 decimal place
      expect(gameOverData).not.toBeNull();
      expect(gameOverData!.accuracy).toBe(66.7); // Should be rounded to 1 decimal
    });
  });
});