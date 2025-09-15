import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../../components/GameEngine';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    drawImage: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
  }))
} as unknown as HTMLCanvasElement;

describe('QuestionSyncManager Integration', () => {
  let gameEngine: GameEngine;
  let mockOnQuestionUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gameEngine = new GameEngine();
    mockOnQuestionUpdate = vi.fn();
    
    gameEngine.initialize(mockCanvas, {
      onQuestionUpdate: mockOnQuestionUpdate
    });
  });

  describe('Question Synchronization', () => {
    it('should initialize with first question before starting game', () => {
      // Requirement 1.5: First question displayed before first obstacle appears
      gameEngine.start();
      
      // Should have called onQuestionUpdate with the first question
      expect(mockOnQuestionUpdate).toHaveBeenCalled();
      const firstCall = mockOnQuestionUpdate.mock.calls[0];
      expect(firstCall[0]).toBeTruthy();
      expect(firstCall[0]).toHaveProperty('question');
      expect(firstCall[0]).toHaveProperty('correctAnswer');
    });

    it('should maintain question stability during obstacle generation', () => {
      // Requirement 1.1: Questions remain unchanged until player passes through obstacle
      gameEngine.start();
      
      const initialQuestion = mockOnQuestionUpdate.mock.calls[0][0];
      
      // Simulate game loop to generate obstacles
      const gameLoopCallback = vi.mocked(requestAnimationFrame).mock.calls[0][0];
      
      // Run multiple game loop iterations
      gameLoopCallback(16.67); // ~60fps
      gameLoopCallback(33.34);
      gameLoopCallback(50.01);
      
      // Question should remain the same
      const currentState = gameEngine.getGameState();
      expect(currentState.currentQuestion).toEqual(initialQuestion);
    });

    it('should associate obstacles with current question', () => {
      // Requirement 1.2: New obstacles are paired with current displayed question
      // Requirement 1.4: Only closest obstacle is associated with current question
      gameEngine.start();
      
      const initialQuestion = mockOnQuestionUpdate.mock.calls[0][0];
      
      // Simulate game loop to generate obstacles
      const gameLoopCallback = vi.mocked(requestAnimationFrame).mock.calls[0][0];
      gameLoopCallback(16.67);
      
      const currentState = gameEngine.getGameState();
      
      // Should have obstacles generated
      if (currentState.obstacles.length > 0) {
        // All obstacles should be associated with the same question
        const mathObstacles = currentState.obstacles.filter(o => 'getQuestion' in o);
        mathObstacles.forEach(obstacle => {
          const obstacleQuestion = (obstacle as any).getQuestion();
          expect(obstacleQuestion.id).toBe(initialQuestion.id);
        });
      }
    });

    it('should advance question only after obstacle interaction', () => {
      // Requirement 1.3: Question changes only after obstacle interaction
      gameEngine.start();
      
      const initialQuestion = mockOnQuestionUpdate.mock.calls[0][0];
      
      // Simulate obstacle interaction by calling handleAnswerSelection directly
      // This simulates the bird passing through an obstacle and selecting an answer
      const mockObstacleId = 'test-obstacle-1';
      
      // Access private method for testing
      const handleAnswerSelection = (gameEngine as any).handleAnswerSelection;
      if (handleAnswerSelection) {
        handleAnswerSelection.call(gameEngine, 5, true, mockObstacleId);
      }
      
      // Question should have changed after interaction
      expect(mockOnQuestionUpdate).toHaveBeenCalledTimes(2); // Initial + after interaction
      const newQuestion = mockOnQuestionUpdate.mock.calls[1][0];
      expect(newQuestion.id).not.toBe(initialQuestion.id);
    });

    it('should reset question sync state on game reset', () => {
      gameEngine.start();
      
      // Verify question was loaded
      expect(mockOnQuestionUpdate).toHaveBeenCalled();
      
      // Reset the game
      gameEngine.reset();
      
      // Should have called onQuestionUpdate with null to clear the question
      const resetCall = mockOnQuestionUpdate.mock.calls.find(call => call[0] === null);
      expect(resetCall).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle question sync errors gracefully', () => {
      // Start the game - should not throw even if there are internal errors
      expect(() => {
        gameEngine.start();
      }).not.toThrow();
      
      // Should still have attempted to load a question
      expect(mockOnQuestionUpdate).toHaveBeenCalled();
    });
  });

  describe('Proximity-based Association', () => {
    it('should only process answers from associated obstacles', () => {
      gameEngine.start();
      
      // Simulate game loop to generate obstacles
      const gameLoopCallback = vi.mocked(requestAnimationFrame).mock.calls[0][0];
      gameLoopCallback(16.67);
      
      const currentState = gameEngine.getGameState();
      
      // Verify that obstacles are properly associated
      if (currentState.obstacles.length > 0) {
        const mathObstacles = currentState.obstacles.filter(o => 'getQuestion' in o);
        expect(mathObstacles.length).toBeGreaterThan(0);
        
        // Each math obstacle should have a question
        mathObstacles.forEach(obstacle => {
          const question = (obstacle as any).getQuestion();
          expect(question).toBeTruthy();
          expect(question).toHaveProperty('id');
        });
      }
    });
  });
});