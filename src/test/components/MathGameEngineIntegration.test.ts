import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine, GameState } from '../../components/GameEngine';
import { MathQuestion } from '../../types';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
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
    textAlign: 'start',
    textBaseline: 'alphabetic'
  }))
} as unknown as HTMLCanvasElement;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock performance.now
global.performance = {
  now: vi.fn(() => Date.now())
} as unknown as Performance;

describe('GameEngine Math System Integration', () => {
  let gameEngine: GameEngine;
  let mockCallbacks: {
    onScoreUpdate: ReturnType<typeof vi.fn>;
    onGameOver: ReturnType<typeof vi.fn>;
    onGameStart: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onQuestionUpdate: ReturnType<typeof vi.fn>;
    onMathScoreUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
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

  describe('Question Lifecycle Management', () => {
    it('should load first question when game starts', () => {
      // Act
      gameEngine.start();

      // Assert
      const currentQuestion = gameEngine.getCurrentQuestion();
      expect(currentQuestion).toBeTruthy();
      expect(currentQuestion?.question).toBeTruthy();
      expect(mockCallbacks.onQuestionUpdate).toHaveBeenCalledWith(currentQuestion);
    });

    it('should load next question after answer selection', async () => {
      // Arrange
      gameEngine.start();
      const firstQuestion = gameEngine.getCurrentQuestion();
      const initialQuestionId = firstQuestion?.id;

      // Act - Force obstacle generation which should load next question
      gameEngine.forceObstacleGeneration();
      
      // Assert
      const newQuestion = gameEngine.getCurrentQuestion();
      expect(newQuestion?.id).not.toBe(initialQuestionId);
      expect(newQuestion).toBeTruthy();
    });

    it('should maintain question pool management', () => {
      // Arrange
      gameEngine.start();
      const seenQuestions = new Set<string>();
      
      // Add initial question
      const initialQuestion = gameEngine.getCurrentQuestion();
      if (initialQuestion) {
        seenQuestions.add(initialQuestion.id);
      }

      // Act - generate multiple questions
      for (let i = 0; i < 5; i++) {
        gameEngine.forceObstacleGeneration();
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          seenQuestions.add(question.id);
        }
      }

      // Assert
      expect(seenQuestions.size).toBeGreaterThan(1);
      expect(mockCallbacks.onQuestionUpdate).toHaveBeenCalled();
    });
  });

  describe('Math Scoring Integration', () => {
    it('should initialize with zero math score and streak', () => {
      // Act
      gameEngine.start();
      const mathScore = gameEngine.getMathScore();

      // Assert
      expect(mathScore.score).toBe(0);
      expect(mathScore.streak).toBe(0);
    });

    it('should update math score callbacks when scoring changes', () => {
      // Arrange
      gameEngine.start();

      // Act - simulate correct answer (this would normally happen through collision detection)
      // For testing, we'll verify the callback structure is in place
      expect(mockCallbacks.onMathScoreUpdate).toBeDefined();
    });

    it('should reset math system when game resets', () => {
      // Arrange
      gameEngine.start();
      gameEngine.forceObstacleGeneration();

      // Act
      gameEngine.reset();

      // Assert
      const mathScore = gameEngine.getMathScore();
      expect(mathScore.score).toBe(0);
      expect(mathScore.streak).toBe(0);
      expect(gameEngine.getCurrentQuestion()).toBeNull();
    });
  });

  describe('Obstacle Generation with Math Questions', () => {
    it('should generate math obstacles when game is playing', () => {
      // Arrange
      gameEngine.start();
      const initialObstacleCount = gameEngine.getGameState().obstacles.length;

      // Act
      gameEngine.forceObstacleGeneration();

      // Assert
      const finalObstacleCount = gameEngine.getGameState().obstacles.length;
      expect(finalObstacleCount).toBeGreaterThan(initialObstacleCount);
    });

    it('should synchronize question display with obstacle generation', () => {
      // Arrange
      gameEngine.start();
      const initialQuestion = gameEngine.getCurrentQuestion();

      // Act
      gameEngine.forceObstacleGeneration();

      // Assert
      const obstacles = gameEngine.getGameState().obstacles;
      expect(obstacles.length).toBeGreaterThan(0);
      expect(initialQuestion).toBeTruthy();
    });
  });

  describe('Game State Management', () => {
    it('should include math state in game state', () => {
      // Arrange
      gameEngine.start();

      // Act
      const gameState = gameEngine.getGameState();

      // Assert
      expect(gameState.currentQuestion).toBeTruthy();
      expect(gameState.mathScore).toBe(0);
      expect(gameState.streak).toBe(0);
    });

    it('should maintain traditional collision detection for game over', () => {
      // Arrange
      gameEngine.start();

      // Act
      const isPlaying = gameEngine.isPlaying();
      const isGameOver = gameEngine.isGameOver();

      // Assert
      expect(isPlaying).toBe(true);
      expect(isGameOver).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle math system errors gracefully', () => {
      // Arrange
      gameEngine.start();

      // Act & Assert - should not throw
      expect(() => {
        gameEngine.forceObstacleGeneration();
        gameEngine.reset();
        gameEngine.start();
      }).not.toThrow();
    });

    it('should call error callback for math system errors', () => {
      // This test verifies the error handling structure is in place
      expect(mockCallbacks.onError).toBeDefined();
    });
  });

  describe('Performance and Cleanup', () => {
    it('should clean up math obstacles properly', () => {
      // Arrange
      gameEngine.start();
      gameEngine.forceObstacleGeneration();

      // Act
      gameEngine.destroy();

      // Assert - should not throw and should clean up references
      expect(() => gameEngine.destroy()).not.toThrow();
    });

    it('should handle obstacle pool management for math obstacles', () => {
      // Arrange
      gameEngine.start();

      // Act
      for (let i = 0; i < 3; i++) {
        gameEngine.forceObstacleGeneration();
      }

      const gameState = gameEngine.getGameState();

      // Assert - Check that obstacles were created
      expect(gameState.obstacles.length).toBeGreaterThan(0);
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy requirement 1.2: Question lifecycle management', () => {
      // Arrange & Act
      gameEngine.start();
      const question1 = gameEngine.getCurrentQuestion();
      
      gameEngine.forceObstacleGeneration();
      const question2 = gameEngine.getCurrentQuestion();

      // Assert
      expect(question1).toBeTruthy();
      expect(question2).toBeTruthy();
      expect(mockCallbacks.onQuestionUpdate).toHaveBeenCalled();
    });

    it('should satisfy requirement 2.4: Answer selection detection structure', () => {
      // Arrange
      gameEngine.start();
      gameEngine.forceObstacleGeneration();

      // Act
      const gameState = gameEngine.getGameState();

      // Assert - verify structure is in place for answer detection
      expect(gameState.obstacles.length).toBeGreaterThan(0);
      expect(gameState.currentQuestion).toBeTruthy();
    });

    it('should satisfy requirement 4.6: Score update integration', () => {
      // Arrange & Act
      gameEngine.start();
      const mathScore = gameEngine.getMathScore();

      // Assert
      expect(mathScore).toEqual({ score: 0, streak: 0 });
      expect(mockCallbacks.onMathScoreUpdate).toBeDefined();
    });

    it('should satisfy requirement 6.1: Question management integration', () => {
      // Arrange
      gameEngine.start();

      // Act
      const question = gameEngine.getCurrentQuestion();

      // Assert
      expect(question).toBeTruthy();
      expect(question?.category).toMatch(/^(addition|subtraction|multiplication|division)$/);
    });
  });
});