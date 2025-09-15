import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnswerHandler, AnswerFeedback } from '../utils/AnswerHandler';
import { ScoringSystem } from '../utils/ScoringSystem';
import { ParticleSystem } from '../components/ParticleSystem';

describe('Task 8: Correct Answer Display for Incorrect Selections', () => {
  let answerHandler: AnswerHandler;
  let scoringSystem: ScoringSystem;
  let particleSystem: ParticleSystem;
  let mockFeedbackCallback: vi.Mock;

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

  describe('Requirement 4.2: Provide negative feedback for incorrect answers', () => {
    it('should include correct answer in feedback message when provided', () => {
      const correctAnswer = 42;
      const birdX = 100;
      const birdY = 200;

      const feedback = answerHandler.handleIncorrectAnswer(birdX, birdY, correctAnswer);

      expect(feedback.type).toBe('incorrect');
      expect(feedback.message).toContain('Incorrect!');
      expect(feedback.message).toContain('(Correct: 42)');
      expect(feedback.correctAnswer).toBe(42);
    });

    it('should handle incorrect answer without correct answer provided', () => {
      const birdX = 100;
      const birdY = 200;

      const feedback = answerHandler.handleIncorrectAnswer(birdX, birdY);

      expect(feedback.type).toBe('incorrect');
      expect(feedback.message).toContain('Incorrect!');
      expect(feedback.message).not.toContain('(Correct:');
      expect(feedback.correctAnswer).toBeUndefined();
    });

    it('should include correct answer even when no points are deducted', () => {
      // Deplete points first so no points can be deducted
      for (let i = 0; i < 10; i++) {
        answerHandler.handleIncorrectAnswer(100, 200);
      }

      const correctAnswer = 15;
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);

      expect(feedback.type).toBe('incorrect');
      expect(feedback.message).toContain('Incorrect!');
      expect(feedback.message).toContain('(Correct: 15)');
      expect(feedback.correctAnswer).toBe(15);
      expect(feedback.points).toBe(0); // No points deducted
    });
  });

  describe('Requirement 4.5: Show correct answer when player was wrong', () => {
    it('should provide educational value by showing what the correct answer was', () => {
      const testCases = [
        { correctAnswer: 25 },
        { correctAnswer: 100 },
        { correctAnswer: 7 }
      ];

      testCases.forEach(({ correctAnswer }) => {
        // Reset scoring system for consistent point deduction
        scoringSystem.reset();
        
        const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);
        
        // Verify the message contains the correct answer
        expect(feedback.message).toContain('Incorrect!');
        expect(feedback.message).toContain(`(Correct: ${correctAnswer})`);
        expect(feedback.correctAnswer).toBe(correctAnswer);
        expect(feedback.duration).toBe(1500); // Slightly longer duration for reading
      });
    });

    it('should maintain feedback structure for integration with FeedbackDisplay', () => {
      const correctAnswer = 88;
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);

      // Verify the feedback object has all required properties for FeedbackDisplay
      expect(feedback).toHaveProperty('type', 'incorrect');
      expect(feedback).toHaveProperty('points');
      expect(feedback).toHaveProperty('message');
      expect(feedback).toHaveProperty('duration', 1500);
      expect(feedback).toHaveProperty('correctAnswer', correctAnswer);
    });
  });

  describe('Educational Value Enhancement', () => {
    it('should provide longer duration for incorrect feedback to allow reading correct answer', () => {
      const correctFeedback = answerHandler.validateCorrectAnswer(100, 200);
      const incorrectFeedback = answerHandler.handleIncorrectAnswer(100, 200, 42);

      expect(incorrectFeedback.duration).toBeGreaterThan(correctFeedback.duration);
      expect(incorrectFeedback.duration).toBe(1500); // 1.5 seconds for reading
    });

    it('should call feedback update callback with correct answer information', () => {
      const correctAnswer = 33;
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);

      expect(mockFeedbackCallback).toHaveBeenCalledWith(feedback);
      expect(mockFeedbackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'incorrect',
          correctAnswer: correctAnswer,
          message: expect.stringContaining('(Correct: 33)')
        })
      );
    });
  });

  describe('Integration with GameEngine', () => {
    it('should work correctly when GameEngine passes current question correct answer', () => {
      // Simulate how GameEngine calls this method
      const currentQuestionCorrectAnswer = 144; // e.g., 12 × 12 = 144
      
      const feedback = answerHandler.handleIncorrectAnswer(
        150, // birdX
        250, // birdY
        currentQuestionCorrectAnswer
      );

      expect(feedback.correctAnswer).toBe(currentQuestionCorrectAnswer);
      expect(feedback.message).toContain('(Correct: 144)');
      expect(feedback.type).toBe('incorrect');
    });
  });
});