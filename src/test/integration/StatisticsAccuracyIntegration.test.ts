import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine, GameState } from '../../components/GameEngine';
import { GAME_CONFIG } from '../../utils/gameConfig';
import { afterEach } from 'node:test';

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
  width: GAME_CONFIG.CANVAS_WIDTH,
  height: GAME_CONFIG.CANVAS_HEIGHT
} as unknown as HTMLCanvasElement;

describe('Statistics Accuracy Integration Tests', () => {
  let gameEngine: GameEngine;
  let onGameOver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gameEngine = new GameEngine();
    onGameOver = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
    mockRequestAnimationFrame.mockImplementation((callback) => {
      setTimeout(callback, 16.67);
      return 1;
    });

    gameEngine.initialize(mockCanvas, {
      onGameOver
    });
  });

  afterEach(() => {
    gameEngine.destroy();
  });

  describe('Single Source of Truth for Statistics', () => {
    it('should use ScoringSystem as single source of truth for all statistics', () => {
      gameEngine.start();

      // Get initial math performance data
      const initialData = gameEngine.getMathPerformanceData();
      expect(initialData.totalCorrect).toBe(0);
      expect(initialData.totalIncorrect).toBe(0);
      expect(initialData.highestStreak).toBe(0);
      expect(initialData.streak).toBe(0);
      expect(initialData.mathScore).toBe(0);
      expect(initialData.accuracy).toBe(0);

      // Simulate correct answers by directly calling the answer handler
      const answerHandler = (gameEngine as any).answerHandler;
      
      // Process 3 correct answers
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);

      // Verify statistics are consistent
      const afterCorrectData = gameEngine.getMathPerformanceData();
      expect(afterCorrectData.totalCorrect).toBe(3);
      expect(afterCorrectData.totalIncorrect).toBe(0);
      expect(afterCorrectData.streak).toBe(3);
      expect(afterCorrectData.highestStreak).toBe(3);
      expect(afterCorrectData.mathScore).toBe(30); // 3 * 10 points
      expect(afterCorrectData.accuracy).toBe(100);

      // Process 1 incorrect answer
      answerHandler.handleIncorrectAnswer(100, 100, 42);

      // Verify statistics are still consistent
      const afterIncorrectData = gameEngine.getMathPerformanceData();
      expect(afterIncorrectData.totalCorrect).toBe(3);
      expect(afterIncorrectData.totalIncorrect).toBe(1);
      expect(afterIncorrectData.streak).toBe(0); // Reset by incorrect answer
      expect(afterIncorrectData.highestStreak).toBe(3); // Should remain 3
      expect(afterIncorrectData.mathScore).toBe(25); // 30 - 5 points
      expect(afterIncorrectData.accuracy).toBe(75); // 3/4 = 75%
    });

    it('should maintain statistics consistency during game over', () => {
      gameEngine.start();

      // Simulate some gameplay
      const answerHandler = (gameEngine as any).answerHandler;
      
      // Build up statistics
      answerHandler.validateCorrectAnswer(100, 100); // 1 correct, streak: 1
      answerHandler.validateCorrectAnswer(100, 100); // 2 correct, streak: 2
      answerHandler.validateCorrectAnswer(100, 100); // 3 correct, streak: 3
      answerHandler.handleIncorrectAnswer(100, 100, 42); // 1 incorrect, streak: 0 (reset)
      answerHandler.validateCorrectAnswer(100, 100); // 4 correct, streak: 1
      answerHandler.validateCorrectAnswer(100, 100); // 5 correct, streak: 2

      // Get data before game over
      const beforeGameOverData = gameEngine.getMathPerformanceData();
      expect(beforeGameOverData.totalCorrect).toBe(5);
      expect(beforeGameOverData.totalIncorrect).toBe(1);
      expect(beforeGameOverData.highestStreak).toBe(3); // Highest was 3 before the incorrect answer
      expect(beforeGameOverData.mathScore).toBe(45); // 50 base - 5 penalty = 45

      // Force game over
      const gameState = gameEngine.getGameState();
      gameState.bird.kill();

      // Trigger game over by running game loop
      const gameLoopCallback = mockRequestAnimationFrame.mock.calls[0][0];
      gameLoopCallback(33.34);

      // Verify game over callback was called with consistent data
      expect(onGameOver).toHaveBeenCalledWith({
        score: expect.any(Number),
        mathScore: 45,
        streak: 2, // Current streak at end
        highestStreak: 3, // Highest streak achieved during session
        totalCorrect: 5,
        totalIncorrect: 1,
        accuracy: 83.3 // 5/6 = 83.333... rounded to 83.3
      });
    });

    it('should handle statistics reset correctly', () => {
      gameEngine.start();

      // Build up some statistics
      const answerHandler = (gameEngine as any).answerHandler;
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.handleIncorrectAnswer(100, 100, 42);

      // Verify statistics exist
      const beforeResetData = gameEngine.getMathPerformanceData();
      expect(beforeResetData.totalCorrect).toBe(2);
      expect(beforeResetData.totalIncorrect).toBe(1);
      expect(beforeResetData.highestStreak).toBe(2);

      // Reset the game
      gameEngine.reset();

      // Verify all statistics are reset
      const afterResetData = gameEngine.getMathPerformanceData();
      expect(afterResetData.totalCorrect).toBe(0);
      expect(afterResetData.totalIncorrect).toBe(0);
      expect(afterResetData.highestStreak).toBe(0);
      expect(afterResetData.streak).toBe(0);
      expect(afterResetData.mathScore).toBe(0);
      expect(afterResetData.accuracy).toBe(0);
    });

    it('should maintain accuracy calculation precision', () => {
      gameEngine.start();

      const answerHandler = (gameEngine as any).answerHandler;

      // Create scenario with repeating decimal: 1 correct out of 3 total = 33.333...%
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.handleIncorrectAnswer(100, 100, 42);
      answerHandler.handleIncorrectAnswer(100, 100, 42);

      const data = gameEngine.getMathPerformanceData();
      expect(data.totalCorrect).toBe(1);
      expect(data.totalIncorrect).toBe(2);
      expect(data.accuracy).toBe(33.3); // Should be rounded to 1 decimal place

      // Test another precision case: 2 correct out of 3 total = 66.666...%
      answerHandler.validateCorrectAnswer(100, 100);

      const updatedData = gameEngine.getMathPerformanceData();
      expect(updatedData.totalCorrect).toBe(2);
      expect(updatedData.totalIncorrect).toBe(2);
      expect(updatedData.accuracy).toBe(50.0); // 2/4 = 50%
    });

    it('should handle edge cases correctly', () => {
      gameEngine.start();

      // Test zero answers case
      let data = gameEngine.getMathPerformanceData();
      expect(data.accuracy).toBe(0); // Should not cause division by zero

      const answerHandler = (gameEngine as any).answerHandler;

      // Test 100% accuracy
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);

      data = gameEngine.getMathPerformanceData();
      expect(data.accuracy).toBe(100);

      // Test 0% accuracy after reset and only incorrect answers
      gameEngine.reset();
      gameEngine.start();

      const newAnswerHandler = (gameEngine as any).answerHandler;
      newAnswerHandler.handleIncorrectAnswer(100, 100, 42);
      newAnswerHandler.handleIncorrectAnswer(100, 100, 42);

      data = gameEngine.getMathPerformanceData();
      expect(data.accuracy).toBe(0);
      expect(data.totalCorrect).toBe(0);
      expect(data.totalIncorrect).toBe(2);
    });

    it('should track highest streak across multiple streak cycles', () => {
      gameEngine.start();

      const answerHandler = (gameEngine as any).answerHandler;

      // First streak cycle: build to 4
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);

      let data = gameEngine.getMathPerformanceData();
      expect(data.streak).toBe(4);
      expect(data.highestStreak).toBe(4);

      // Break streak
      answerHandler.handleIncorrectAnswer(100, 100, 42);

      data = gameEngine.getMathPerformanceData();
      expect(data.streak).toBe(0);
      expect(data.highestStreak).toBe(4); // Should remain 4

      // Second streak cycle: build to 2 (lower than highest)
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);

      data = gameEngine.getMathPerformanceData();
      expect(data.streak).toBe(2);
      expect(data.highestStreak).toBe(4); // Should remain 4

      // Third streak cycle: build to 6 (higher than highest)
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);

      data = gameEngine.getMathPerformanceData();
      expect(data.streak).toBe(6);
      expect(data.highestStreak).toBe(6); // Should update to 6
    });
  });

  describe('Real-time Statistics Updates', () => {
    it('should update statistics in real-time without accumulation errors', () => {
      gameEngine.start();

      const answerHandler = (gameEngine as any).answerHandler;
      const answerSequence = [true, false, true, true, false, true, false, true, true, true];
      
      let expectedCorrect = 0;
      let expectedIncorrect = 0;

      answerSequence.forEach((isCorrect, index) => {
        if (isCorrect) {
          answerHandler.validateCorrectAnswer(100, 100);
          expectedCorrect++;
        } else {
          answerHandler.handleIncorrectAnswer(100, 100, 42);
          expectedIncorrect++;
        }

        // Verify statistics are accurate after each answer
        const data = gameEngine.getMathPerformanceData();
        expect(data.totalCorrect).toBe(expectedCorrect);
        expect(data.totalIncorrect).toBe(expectedIncorrect);
        expect(data.totalCorrect + data.totalIncorrect).toBe(index + 1);

        // Verify accuracy calculation
        const expectedAccuracy = expectedCorrect + expectedIncorrect > 0 
          ? Math.round((expectedCorrect / (expectedCorrect + expectedIncorrect)) * 100 * 10) / 10
          : 0;
        expect(data.accuracy).toBe(expectedAccuracy);
      });
    });
  });
});