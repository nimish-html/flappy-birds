import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionSyncManager } from '../../utils/QuestionSyncManager';
import { MathQuestionManager } from '../../utils/MathQuestionManager';
import { MathQuestion } from '../../types';

// Mock MathQuestionManager
vi.mock('../../utils/MathQuestionManager');

describe('QuestionSyncManager', () => {
  let questionSyncManager: QuestionSyncManager;
  let mockMathQuestionManager: MathQuestionManager;
  let mockOnQuestionUpdate: ReturnType<typeof vi.fn>;

  const mockQuestion1: MathQuestion = {
    id: 'q1',
    category: 'addition',
    question: '2 + 3 = ?',
    correctAnswer: 5,
    difficulty: 1
  };

  const mockQuestion2: MathQuestion = {
    id: 'q2',
    category: 'subtraction',
    question: '8 - 3 = ?',
    correctAnswer: 5,
    difficulty: 1
  };

  beforeEach(() => {
    mockOnQuestionUpdate = vi.fn();
    mockMathQuestionManager = new MathQuestionManager();
    
    // Mock the getNextQuestion method
    vi.mocked(mockMathQuestionManager.getNextQuestion)
      .mockReturnValueOnce(mockQuestion1)
      .mockReturnValueOnce(mockQuestion2);

    questionSyncManager = new QuestionSyncManager(mockMathQuestionManager, {
      onQuestionUpdate: mockOnQuestionUpdate
    });
  });

  describe('Initialization', () => {
    it('should initialize with no current question', () => {
      expect(questionSyncManager.getCurrentQuestion()).toBeNull();
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(false);
    });

    it('should load and lock first question on initialize', () => {
      // Requirement 1.5: First question displayed before first obstacle appears
      questionSyncManager.initialize();

      expect(questionSyncManager.getCurrentQuestion()).toEqual(mockQuestion1);
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
      expect(mockOnQuestionUpdate).toHaveBeenCalledWith(mockQuestion1);
    });
  });

  describe('Question Locking', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should lock current question', () => {
      // Requirement 1.1: Questions remain unchanged until player passes through obstacle
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
      
      questionSyncManager.lockCurrentQuestion();
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
    });

    it('should unlock and advance to next question', () => {
      // Requirement 1.3: Question changes only after obstacle interaction
      const initialQuestion = questionSyncManager.getCurrentQuestion();
      
      questionSyncManager.unlockAndAdvance();
      
      expect(questionSyncManager.getCurrentQuestion()).toEqual(mockQuestion2);
      expect(questionSyncManager.getCurrentQuestion()).not.toEqual(initialQuestion);
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true); // Should be locked again
      expect(mockOnQuestionUpdate).toHaveBeenCalledWith(mockQuestion2);
    });

    it('should not advance question if not locked', () => {
      questionSyncManager.reset();
      const initialQuestion = questionSyncManager.getCurrentQuestion();
      
      questionSyncManager.unlockAndAdvance();
      
      expect(questionSyncManager.getCurrentQuestion()).toBe(initialQuestion);
    });
  });

  describe('Obstacle Association', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should associate current question with closest obstacle', () => {
      // Requirement 1.4: Only closest obstacle is associated with current question
      // Requirement 1.2: New obstacles are paired with current displayed question
      const obstacleId = 'obstacle-1';
      
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      expect(questionSyncManager.getAssociatedObstacleId()).toBe(obstacleId);
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId)).toBe(mockQuestion1.id);
      expect(questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId)).toBe(true);
    });

    it('should replace existing obstacle association', () => {
      const obstacleId1 = 'obstacle-1';
      const obstacleId2 = 'obstacle-2';
      
      questionSyncManager.associateWithClosestObstacle(obstacleId1);
      questionSyncManager.associateWithClosestObstacle(obstacleId2);
      
      expect(questionSyncManager.getAssociatedObstacleId()).toBe(obstacleId2);
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId1)).toBeNull();
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId2)).toBe(mockQuestion1.id);
    });

    it('should not associate if no locked question', () => {
      questionSyncManager.reset();
      const obstacleId = 'obstacle-1';
      
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      expect(questionSyncManager.getAssociatedObstacleId()).toBeNull();
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId)).toBeNull();
    });

    it('should handle obstacle interaction correctly', () => {
      const obstacleId = 'obstacle-1';
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      const result = questionSyncManager.handleObstacleInteraction(obstacleId);
      
      expect(result).toBe(true);
      expect(questionSyncManager.getCurrentQuestion()).toEqual(mockQuestion2);
    });

    it('should not handle interaction for non-associated obstacle', () => {
      const obstacleId1 = 'obstacle-1';
      const obstacleId2 = 'obstacle-2';
      
      questionSyncManager.associateWithClosestObstacle(obstacleId1);
      
      const result = questionSyncManager.handleObstacleInteraction(obstacleId2);
      
      expect(result).toBe(false);
      expect(questionSyncManager.getCurrentQuestion()).toEqual(mockQuestion1);
    });

    it('should remove obstacle association', () => {
      const obstacleId = 'obstacle-1';
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      questionSyncManager.removeObstacleAssociation(obstacleId);
      
      expect(questionSyncManager.getAssociatedObstacleId()).toBeNull();
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId)).toBeNull();
    });
  });

  describe('Question ID Management', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should return current question ID', () => {
      expect(questionSyncManager.getCurrentQuestionId()).toBe(mockQuestion1.id);
    });

    it('should return empty string if no current question', () => {
      questionSyncManager.reset();
      expect(questionSyncManager.getCurrentQuestionId()).toBe('');
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
      questionSyncManager.associateWithClosestObstacle('obstacle-1');
    });

    it('should reset all state', () => {
      questionSyncManager.reset();
      
      expect(questionSyncManager.getCurrentQuestion()).toBeNull();
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(false);
      expect(questionSyncManager.getAssociatedObstacleId()).toBeNull();
      expect(questionSyncManager.getCurrentQuestionId()).toBe('');
      expect(mockOnQuestionUpdate).toHaveBeenCalledWith(null);
    });
  });

  describe('Debug Information', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should provide debug information', () => {
      const obstacleId = 'obstacle-1';
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      const debugInfo = questionSyncManager.getDebugInfo();
      
      expect(debugInfo).toEqual({
        currentQuestion: mockQuestion1,
        isLocked: true,
        associatedObstacleId: obstacleId,
        associationCount: 1
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle question loading errors gracefully', () => {
      const errorMockManager = new MathQuestionManager();
      vi.mocked(errorMockManager.getNextQuestion).mockImplementation(() => {
        throw new Error('Question loading failed');
      });

      const errorSyncManager = new QuestionSyncManager(errorMockManager, {
        onQuestionUpdate: mockOnQuestionUpdate
      });

      // Should not throw error
      expect(() => errorSyncManager.initialize()).not.toThrow();
      
      expect(errorSyncManager.getCurrentQuestion()).toBeNull();
      expect(errorSyncManager.isCurrentQuestionLocked()).toBe(false);
    });
  });

  describe('Multiple Obstacle Scenarios', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should handle multiple obstacles with single question association', () => {
      const obstacleId1 = 'obstacle-1';
      const obstacleId2 = 'obstacle-2';
      
      // Associate with first obstacle
      questionSyncManager.associateWithClosestObstacle(obstacleId1);
      expect(questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId1)).toBe(true);
      expect(questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId2)).toBe(false);
      
      // Associate with second obstacle (should replace first)
      questionSyncManager.associateWithClosestObstacle(obstacleId2);
      expect(questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId1)).toBe(false);
      expect(questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId2)).toBe(true);
    });

    it('should clear associations when advancing questions', () => {
      const obstacleId = 'obstacle-1';
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      questionSyncManager.unlockAndAdvance();
      
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId)).toBeNull();
      expect(questionSyncManager.getAssociatedObstacleId()).toBeNull();
    });
  });

  describe('Proximity-Based Association Logic', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should prioritize closest obstacle for association', () => {
      // Requirement 1.4: Only closest obstacle is associated with current question
      const closestObstacleId = 'obstacle-closest';
      const fartherObstacleId = 'obstacle-farther';
      
      // Simulate associating with farther obstacle first
      questionSyncManager.associateWithClosestObstacle(fartherObstacleId);
      expect(questionSyncManager.getAssociatedObstacleId()).toBe(fartherObstacleId);
      
      // Then associate with closer obstacle (should replace)
      questionSyncManager.associateWithClosestObstacle(closestObstacleId);
      expect(questionSyncManager.getAssociatedObstacleId()).toBe(closestObstacleId);
      expect(questionSyncManager.getQuestionIdForObstacle(fartherObstacleId)).toBeNull();
    });

    it('should maintain question stability during obstacle transitions', () => {
      // Requirement 1.1: Questions remain unchanged until player passes through obstacle
      const initialQuestion = questionSyncManager.getCurrentQuestion();
      
      // Associate with multiple obstacles in sequence
      questionSyncManager.associateWithClosestObstacle('obstacle-1');
      questionSyncManager.associateWithClosestObstacle('obstacle-2');
      questionSyncManager.associateWithClosestObstacle('obstacle-3');
      
      // Question should remain the same throughout associations
      expect(questionSyncManager.getCurrentQuestion()).toEqual(initialQuestion);
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
    });
  });

  describe('Question-Obstacle Pairing Validation', () => {
    beforeEach(() => {
      questionSyncManager.initialize();
    });

    it('should ensure new obstacles are paired with current displayed question', () => {
      // Requirement 1.2: New obstacles are paired with current displayed question
      const currentQuestion = questionSyncManager.getCurrentQuestion();
      const obstacleId = 'new-obstacle';
      
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      expect(questionSyncManager.getQuestionIdForObstacle(obstacleId)).toBe(currentQuestion?.id);
      expect(questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId)).toBe(true);
    });

    it('should validate question changes only occur after obstacle interaction', () => {
      // Requirement 1.3: Question changes only after obstacle interaction
      const initialQuestion = questionSyncManager.getCurrentQuestion();
      const obstacleId = 'test-obstacle';
      
      questionSyncManager.associateWithClosestObstacle(obstacleId);
      
      // Question should not change just from association
      expect(questionSyncManager.getCurrentQuestion()).toEqual(initialQuestion);
      
      // Question should change only after interaction
      questionSyncManager.handleObstacleInteraction(obstacleId);
      expect(questionSyncManager.getCurrentQuestion()).not.toEqual(initialQuestion);
    });

    it('should handle first question display before first obstacle', () => {
      // Requirement 1.5: First question displayed before first obstacle appears
      
      // Create a fresh manager and mock for this test
      const freshMockManager = new MathQuestionManager();
      vi.mocked(freshMockManager.getNextQuestion).mockReturnValueOnce(mockQuestion1);
      
      const freshSyncManager = new QuestionSyncManager(freshMockManager, {
        onQuestionUpdate: mockOnQuestionUpdate
      });
      
      // Before initialization, no question should be displayed
      expect(freshSyncManager.getCurrentQuestion()).toBeNull();
      
      // After initialization, first question should be displayed and locked
      freshSyncManager.initialize();
      expect(freshSyncManager.getCurrentQuestion()).toEqual(mockQuestion1);
      expect(freshSyncManager.isCurrentQuestionLocked()).toBe(true);
    });
  });
});