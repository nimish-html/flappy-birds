import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AnswerHandler, AnswerFeedback } from '../../utils/AnswerHandler';
import { ScoringSystem } from '../../utils/ScoringSystem';
import { ParticleSystem } from '../../components/ParticleSystem';

// Mock the ParticleSystem
vi.mock('../../components/ParticleSystem', () => ({
  ParticleSystem: vi.fn().mockImplementation(() => ({
    createCollisionParticles: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    clear: vi.fn()
  }))
}));

describe('AnswerHandler', () => {
  let answerHandler: AnswerHandler;
  let scoringSystem: ScoringSystem;
  let particleSystem: ParticleSystem;
  let mockFeedbackCallback: Mock;

  beforeEach(() => {
    scoringSystem = new ScoringSystem();
    particleSystem = new ParticleSystem();
    mockFeedbackCallback = vi.fn();
    
    answerHandler = new AnswerHandler(
      scoringSystem,
      particleSystem,
      {
        onFeedbackUpdate: mockFeedbackCallback
      }
    );
  });

  describe('validateCorrectAnswer', () => {
    it('should process correct answer and return appropriate feedback', () => {
      // Act
      const feedback = answerHandler.validateCorrectAnswer(100, 200);

      // Assert
      expect(feedback.type).toBe('correct');
      expect(feedback.points).toBe(10);
      expect(feedback.message).toBe('Correct! +10 points');
      expect(feedback.duration).toBe(1000);
      expect(mockFeedbackCallback).toHaveBeenCalledWith(feedback);
    });

    it('should create visual feedback effects for correct answer', () => {
      // Act
      answerHandler.validateCorrectAnswer(100, 200);

      // Assert
      expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
        100, 200, '#00FF00', 15
      );
    });

    it('should return streak bonus feedback when streak reaches 5', () => {
      // Arrange - get to 4 correct answers first
      for (let i = 0; i < 4; i++) {
        answerHandler.validateCorrectAnswer(100, 200);
      }

      // Act - 5th correct answer should trigger bonus
      const feedback = answerHandler.validateCorrectAnswer(100, 200);

      // Assert
      expect(feedback.type).toBe('streak_bonus');
      expect(feedback.points).toBe(60); // 10 + 50 bonus
      expect(feedback.message).toBe('Streak Bonus! +60 points!');
      expect(feedback.duration).toBe(2000);
    });

    it('should create special effects for streak bonus', () => {
      // Arrange - get to 4 correct answers first
      for (let i = 0; i < 4; i++) {
        answerHandler.validateCorrectAnswer(100, 200);
      }

      // Clear previous calls
      vi.clearAllMocks();

      // Act - 5th correct answer should trigger bonus
      answerHandler.validateCorrectAnswer(100, 200);

      // Assert - should create gold particles
      expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
        100, 200, '#FFD700', 25
      );
    });
  });

  describe('handleIncorrectAnswer', () => {
    it('should process incorrect answer and return appropriate feedback', () => {
      // Arrange - add some points first
      scoringSystem.processCorrectAnswer();

      // Act
      const feedback = answerHandler.handleIncorrectAnswer(100, 200);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.points).toBe(-5);
      expect(feedback.message).toBe('Incorrect! -5 points');
      expect(feedback.duration).toBe(1500); // Updated duration for reading correct answer
      expect(mockFeedbackCallback).toHaveBeenCalledWith(feedback);
    });

    it('should create visual feedback effects for incorrect answer', () => {
      // Act
      answerHandler.handleIncorrectAnswer(100, 200);

      // Assert
      expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
        100, 200, '#FF0000', 10
      );
    });

    it('should handle case when no points to deduct', () => {
      // Act - no points to start with
      const feedback = answerHandler.handleIncorrectAnswer(100, 200);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.points).toBe(0);
      expect(feedback.message).toBe('Incorrect!');
      expect(feedback.duration).toBe(1500); // Updated duration
    });

    it('should reset streak on incorrect answer', () => {
      // Arrange - build up a streak
      answerHandler.validateCorrectAnswer(100, 200);
      answerHandler.validateCorrectAnswer(100, 200);
      expect(answerHandler.getScoreState().streak).toBe(2);

      // Act
      answerHandler.handleIncorrectAnswer(100, 200);

      // Assert
      expect(answerHandler.getScoreState().streak).toBe(0);
    });

    it('should include correct answer in feedback when provided (Requirement 4.5)', () => {
      // Arrange - add some points first
      scoringSystem.processCorrectAnswer();
      const correctAnswer = 42;

      // Act
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.points).toBe(-5);
      expect(feedback.message).toBe('Incorrect! -5 points (Correct: 42)');
      expect(feedback.correctAnswer).toBe(42);
      expect(feedback.duration).toBe(1500); // Longer duration to read correct answer
    });

    it('should handle incorrect answer without correct answer provided', () => {
      // Arrange - add some points first
      scoringSystem.processCorrectAnswer();

      // Act
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, undefined);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.points).toBe(-5);
      expect(feedback.message).toBe('Incorrect! -5 points');
      expect(feedback.correctAnswer).toBeUndefined();
      expect(feedback.duration).toBe(1500);
    });

    it('should include correct answer when no points to deduct', () => {
      // Act - no points to start with, but provide correct answer
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, 15);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.points).toBe(0);
      expect(feedback.message).toBe('Incorrect! (Correct: 15)');
      expect(feedback.correctAnswer).toBe(15);
    });
  });

  describe('updateFeedback', () => {
    it('should clear feedback after duration expires', () => {
      // Arrange
      const feedback = answerHandler.validateCorrectAnswer(100, 200);
      const startTime = performance.now();
      
      // Act - update with time beyond feedback duration
      answerHandler.updateFeedback(startTime + feedback.duration + 100);

      // Assert
      expect(answerHandler.getActiveFeedback()).toBeNull();
      expect(mockFeedbackCallback).toHaveBeenCalledWith(null);
    });

    it('should not clear feedback before duration expires', () => {
      // Arrange
      const feedback = answerHandler.validateCorrectAnswer(100, 200);
      const startTime = performance.now();
      
      // Act - update with time before feedback duration
      answerHandler.updateFeedback(startTime + feedback.duration - 100);

      // Assert
      expect(answerHandler.getActiveFeedback()).toBe(feedback);
    });

    it('should handle no active feedback gracefully', () => {
      // Act
      answerHandler.updateFeedback(1000);

      // Assert - should not throw error
      expect(answerHandler.getActiveFeedback()).toBeNull();
    });
  });

  describe('getActiveFeedback', () => {
    it('should return null when no feedback is active', () => {
      // Assert
      expect(answerHandler.getActiveFeedback()).toBeNull();
    });

    it('should return active feedback when present', () => {
      // Arrange
      const feedback = answerHandler.validateCorrectAnswer(100, 200);

      // Assert
      expect(answerHandler.getActiveFeedback()).toBe(feedback);
    });
  });

  describe('clearFeedback', () => {
    it('should clear active feedback', () => {
      // Arrange
      answerHandler.validateCorrectAnswer(100, 200);
      expect(answerHandler.getActiveFeedback()).not.toBeNull();

      // Act
      answerHandler.clearFeedback();

      // Assert
      expect(answerHandler.getActiveFeedback()).toBeNull();
      expect(mockFeedbackCallback).toHaveBeenCalledWith(null);
    });
  });

  describe('reset', () => {
    it('should clear active feedback on reset', () => {
      // Arrange
      answerHandler.validateCorrectAnswer(100, 200);
      expect(answerHandler.getActiveFeedback()).not.toBeNull();

      // Act
      answerHandler.reset();

      // Assert
      expect(answerHandler.getActiveFeedback()).toBeNull();
    });
  });

  describe('getScoreState', () => {
    it('should return current score state from scoring system', () => {
      // Arrange
      answerHandler.validateCorrectAnswer(100, 200);
      answerHandler.validateCorrectAnswer(100, 200);

      // Act
      const scoreState = answerHandler.getScoreState();

      // Assert
      expect(scoreState.points).toBe(20);
      expect(scoreState.streak).toBe(2);
      expect(scoreState.totalCorrect).toBe(2);
      expect(scoreState.totalIncorrect).toBe(0);
    });
  });

  describe('feedback timing requirements', () => {
    it('should not interfere with gameplay by having appropriate durations', () => {
      // Test correct answer feedback duration
      const correctFeedback = answerHandler.validateCorrectAnswer(100, 200);
      expect(correctFeedback.duration).toBe(1000); // 1 second

      // Test incorrect answer feedback duration (longer to read correct answer)
      answerHandler.clearFeedback();
      const incorrectFeedback = answerHandler.handleIncorrectAnswer(100, 200);
      expect(incorrectFeedback.duration).toBe(1500); // 1.5 seconds for reading correct answer

      // Test streak bonus feedback duration (longer for celebration)
      answerHandler.clearFeedback();
      for (let i = 0; i < 5; i++) {
        answerHandler.validateCorrectAnswer(100, 200);
      }
      const bonusFeedback = answerHandler.getActiveFeedback();
      expect(bonusFeedback?.duration).toBe(2000); // 2 seconds for bonus
    });

    it('should automatically clear feedback after specified duration', () => {
      // Arrange
      const feedback = answerHandler.validateCorrectAnswer(100, 200);
      const startTime = performance.now();

      // Act - simulate time passing beyond feedback duration
      answerHandler.updateFeedback(startTime + feedback.duration + 1);

      // Assert
      expect(answerHandler.getActiveFeedback()).toBeNull();
    });
  });

  describe('visual effects requirements', () => {
    it('should create appropriate particle effects for each feedback type', () => {
      // Test correct answer effects
      answerHandler.validateCorrectAnswer(100, 200);
      expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
        100, 200, '#00FF00', 15
      );

      // Clear and test incorrect answer effects
      vi.clearAllMocks();
      answerHandler.handleIncorrectAnswer(100, 200);
      expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
        100, 200, '#FF0000', 10
      );
    });

    it('should create multiple particle bursts for streak bonus', (done) => {
      // Arrange - get to streak bonus
      for (let i = 0; i < 5; i++) {
        answerHandler.validateCorrectAnswer(100, 200);
      }

      // Assert initial gold particles
      expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
        100, 200, '#FFD700', 25
      );

      // Wait for delayed particle effects
      setTimeout(() => {
        expect(particleSystem.createCollisionParticles).toHaveBeenCalledWith(
          100, 200, '#FFD700', 20
        );
        done();
      }, 150);
    });
  });
});