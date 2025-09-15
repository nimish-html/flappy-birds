import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringSystem } from '../utils/ScoringSystem';
import { AnswerHandler } from '../utils/AnswerHandler';
import { ParticleSystem } from '../components/ParticleSystem';

describe('Task 11: Statistics Tracking Accuracy', () => {
  let scoringSystem: ScoringSystem;
  let answerHandler: AnswerHandler;
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    scoringSystem = new ScoringSystem();
    particleSystem = new ParticleSystem();
    answerHandler = new AnswerHandler(scoringSystem, particleSystem);
  });

  describe('Real-time Statistics Calculation', () => {
    it('should prevent accumulation errors in totalCorrect/totalIncorrect counting', () => {
      // Simulate a series of answers
      const answers = [true, false, true, true, false, true, false, true, true, true];
      let expectedCorrect = 0;
      let expectedIncorrect = 0;

      answers.forEach((isCorrect) => {
        if (isCorrect) {
          answerHandler.validateCorrectAnswer(100, 100);
          expectedCorrect++;
        } else {
          answerHandler.handleIncorrectAnswer(100, 100, 42);
          expectedIncorrect++;
        }

        // Verify counts are accurate after each answer
        const scoreState = answerHandler.getScoreState();
        expect(scoreState.totalCorrect).toBe(expectedCorrect);
        expect(scoreState.totalIncorrect).toBe(expectedIncorrect);
        expect(scoreState.totalCorrect + scoreState.totalIncorrect).toBe(expectedCorrect + expectedIncorrect);
      });

      // Final verification - count the trues and falses in the array
      const correctCount = answers.filter(answer => answer === true).length;
      const incorrectCount = answers.filter(answer => answer === false).length;
      
      const finalState = answerHandler.getScoreState();
      expect(finalState.totalCorrect).toBe(correctCount);
      expect(finalState.totalIncorrect).toBe(incorrectCount);
      expect(finalState.totalCorrect + finalState.totalIncorrect).toBe(answers.length);
    });

    it('should calculate accuracy percentage correctly (correct/total * 100)', () => {
      // Test case 1: 3 correct out of 5 total = 60%
      answerHandler.validateCorrectAnswer(100, 100); // 1 correct
      answerHandler.validateCorrectAnswer(100, 100); // 2 correct
      answerHandler.handleIncorrectAnswer(100, 100, 42); // 1 incorrect
      answerHandler.validateCorrectAnswer(100, 100); // 3 correct
      answerHandler.handleIncorrectAnswer(100, 100, 42); // 2 incorrect

      const state1 = answerHandler.getScoreState();
      const accuracy1 = (state1.totalCorrect / (state1.totalCorrect + state1.totalIncorrect)) * 100;
      expect(accuracy1).toBe(60);
      expect(state1.totalCorrect).toBe(3);
      expect(state1.totalIncorrect).toBe(2);

      // Test case 2: Add more answers to verify continued accuracy
      answerHandler.validateCorrectAnswer(100, 100); // 4 correct
      answerHandler.validateCorrectAnswer(100, 100); // 5 correct
      answerHandler.handleIncorrectAnswer(100, 100, 42); // 3 incorrect

      const state2 = answerHandler.getScoreState();
      const accuracy2 = (state2.totalCorrect / (state2.totalCorrect + state2.totalIncorrect)) * 100;
      expect(accuracy2).toBeCloseTo(62.5); // 5/8 = 62.5%
      expect(state2.totalCorrect).toBe(5);
      expect(state2.totalIncorrect).toBe(3);
    });

    it('should handle edge case of zero answers without division by zero', () => {
      const initialState = answerHandler.getScoreState();
      const totalAnswers = initialState.totalCorrect + initialState.totalIncorrect;
      const accuracy = totalAnswers > 0 ? (initialState.totalCorrect / totalAnswers) * 100 : 0;
      
      expect(totalAnswers).toBe(0);
      expect(accuracy).toBe(0);
      expect(initialState.totalCorrect).toBe(0);
      expect(initialState.totalIncorrect).toBe(0);
    });

    it('should handle 100% accuracy correctly', () => {
      // All correct answers
      for (let i = 0; i < 5; i++) {
        answerHandler.validateCorrectAnswer(100, 100);
      }

      const state = answerHandler.getScoreState();
      const accuracy = (state.totalCorrect / (state.totalCorrect + state.totalIncorrect)) * 100;
      expect(accuracy).toBe(100);
      expect(state.totalCorrect).toBe(5);
      expect(state.totalIncorrect).toBe(0);
    });

    it('should handle 0% accuracy correctly', () => {
      // All incorrect answers
      for (let i = 0; i < 5; i++) {
        answerHandler.handleIncorrectAnswer(100, 100, 42);
      }

      const state = answerHandler.getScoreState();
      const accuracy = (state.totalCorrect / (state.totalCorrect + state.totalIncorrect)) * 100;
      expect(accuracy).toBe(0);
      expect(state.totalCorrect).toBe(0);
      expect(state.totalIncorrect).toBe(5);
    });
  });

  describe('Highest Streak Tracking', () => {
    it('should track highest streak achieved during session', () => {
      // Build initial streak
      answerHandler.validateCorrectAnswer(100, 100); // streak: 1
      answerHandler.validateCorrectAnswer(100, 100); // streak: 2
      answerHandler.validateCorrectAnswer(100, 100); // streak: 3
      
      let state = answerHandler.getScoreState();
      expect(state.streak).toBe(3);
      expect(state.highestStreak).toBe(3);

      // Break streak
      answerHandler.handleIncorrectAnswer(100, 100, 42);
      state = answerHandler.getScoreState();
      expect(state.streak).toBe(0);
      expect(state.highestStreak).toBe(3); // Should remain 3

      // Build higher streak
      for (let i = 0; i < 5; i++) {
        answerHandler.validateCorrectAnswer(100, 100);
      }
      
      state = answerHandler.getScoreState();
      expect(state.streak).toBe(5);
      expect(state.highestStreak).toBe(5); // Should update to 5
    });

    it('should maintain highest streak across multiple streak cycles', () => {
      // First cycle: streak of 4
      for (let i = 0; i < 4; i++) {
        answerHandler.validateCorrectAnswer(100, 100);
      }
      answerHandler.handleIncorrectAnswer(100, 100, 42);
      
      let state = answerHandler.getScoreState();
      expect(state.highestStreak).toBe(4);

      // Second cycle: streak of 2 (lower than highest)
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.handleIncorrectAnswer(100, 100, 42);
      
      state = answerHandler.getScoreState();
      expect(state.highestStreak).toBe(4); // Should remain 4

      // Third cycle: streak of 6 (higher than highest)
      for (let i = 0; i < 6; i++) {
        answerHandler.validateCorrectAnswer(100, 100);
      }
      
      state = answerHandler.getScoreState();
      expect(state.highestStreak).toBe(6); // Should update to 6
    });
  });

  describe('Statistics Consistency', () => {
    it('should maintain consistent statistics across complex gameplay scenarios', () => {
      const gameplaySequence = [
        { correct: true, expectedCorrect: 1, expectedIncorrect: 0 },
        { correct: false, expectedCorrect: 1, expectedIncorrect: 1 },
        { correct: true, expectedCorrect: 2, expectedIncorrect: 1 },
        { correct: true, expectedCorrect: 3, expectedIncorrect: 1 },
        { correct: false, expectedCorrect: 3, expectedIncorrect: 2 },
        { correct: true, expectedCorrect: 4, expectedIncorrect: 2 },
        { correct: true, expectedCorrect: 5, expectedIncorrect: 2 },
        { correct: true, expectedCorrect: 6, expectedIncorrect: 2 },
        { correct: false, expectedCorrect: 6, expectedIncorrect: 3 },
        { correct: true, expectedCorrect: 7, expectedIncorrect: 3 }
      ];

      gameplaySequence.forEach((step, index) => {
        if (step.correct) {
          answerHandler.validateCorrectAnswer(100, 100);
        } else {
          answerHandler.handleIncorrectAnswer(100, 100, 42);
        }

        const state = answerHandler.getScoreState();
        expect(state.totalCorrect).toBe(step.expectedCorrect);
        expect(state.totalIncorrect).toBe(step.expectedIncorrect);
        
        // Verify total count
        const totalAnswers = state.totalCorrect + state.totalIncorrect;
        expect(totalAnswers).toBe(index + 1);
        
        // Verify accuracy calculation
        const expectedAccuracy = (step.expectedCorrect / (step.expectedCorrect + step.expectedIncorrect)) * 100;
        const actualAccuracy = (state.totalCorrect / totalAnswers) * 100;
        expect(actualAccuracy).toBeCloseTo(expectedAccuracy, 10);
      });
    });

    it('should reset all statistics correctly', () => {
      // Build up some statistics
      for (let i = 0; i < 3; i++) {
        answerHandler.validateCorrectAnswer(100, 100);
      }
      for (let i = 0; i < 2; i++) {
        answerHandler.handleIncorrectAnswer(100, 100, 42);
      }

      let state = answerHandler.getScoreState();
      expect(state.totalCorrect).toBe(3);
      expect(state.totalIncorrect).toBe(2);
      expect(state.highestStreak).toBe(3);
      expect(state.points).toBeGreaterThan(0);

      // Reset and verify all statistics are cleared
      scoringSystem.reset();
      state = answerHandler.getScoreState();
      expect(state.totalCorrect).toBe(0);
      expect(state.totalIncorrect).toBe(0);
      expect(state.highestStreak).toBe(0);
      expect(state.points).toBe(0);
      expect(state.streak).toBe(0);
    });
  });

  describe('Precision and Rounding', () => {
    it('should handle accuracy percentage rounding correctly', () => {
      // Create scenario that results in repeating decimal
      // 1 correct out of 3 total = 33.333...%
      answerHandler.validateCorrectAnswer(100, 100);
      answerHandler.handleIncorrectAnswer(100, 100, 42);
      answerHandler.handleIncorrectAnswer(100, 100, 42);

      const state = answerHandler.getScoreState();
      const accuracy = (state.totalCorrect / (state.totalCorrect + state.totalIncorrect)) * 100;
      const roundedAccuracy = Math.round(accuracy * 10) / 10; // Round to 1 decimal place
      
      expect(roundedAccuracy).toBe(33.3);
      expect(state.totalCorrect).toBe(1);
      expect(state.totalIncorrect).toBe(2);
    });

    it('should handle large numbers without precision loss', () => {
      // Simulate many answers to test large number handling
      const correctAnswers = 67;
      const incorrectAnswers = 33;
      
      for (let i = 0; i < correctAnswers; i++) {
        answerHandler.validateCorrectAnswer(100, 100);
      }
      for (let i = 0; i < incorrectAnswers; i++) {
        answerHandler.handleIncorrectAnswer(100, 100, 42);
      }

      const state = answerHandler.getScoreState();
      expect(state.totalCorrect).toBe(correctAnswers);
      expect(state.totalIncorrect).toBe(incorrectAnswers);
      
      const totalAnswers = state.totalCorrect + state.totalIncorrect;
      expect(totalAnswers).toBe(100);
      
      const accuracy = (state.totalCorrect / totalAnswers) * 100;
      expect(accuracy).toBe(67);
    });
  });
});