import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringSystem } from '../../utils/ScoringSystem';

describe('ScoringSystem', () => {
  let scoringSystem: ScoringSystem;

  beforeEach(() => {
    scoringSystem = new ScoringSystem();
  });

  describe('Initial State', () => {
    it('should initialize with zero points and streak', () => {
      const state = scoringSystem.getScoreState();
      expect(state.points).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.totalCorrect).toBe(0);
      expect(state.totalIncorrect).toBe(0);
      expect(state.highestStreak).toBe(0);
    });
  });

  describe('Correct Answer Processing', () => {
    it('should award 10 points for correct answer', () => {
      const pointsAwarded = scoringSystem.processCorrectAnswer();
      expect(pointsAwarded).toBe(10);
      expect(scoringSystem.getPoints()).toBe(10);
    });

    it('should increment streak for correct answer', () => {
      scoringSystem.processCorrectAnswer();
      expect(scoringSystem.getStreak()).toBe(1);
    });

    it('should increment total correct count', () => {
      scoringSystem.processCorrectAnswer();
      const state = scoringSystem.getScoreState();
      expect(state.totalCorrect).toBe(1);
    });

    it('should accumulate points for multiple correct answers', () => {
      scoringSystem.processCorrectAnswer(); // 10 points
      scoringSystem.processCorrectAnswer(); // 20 points
      scoringSystem.processCorrectAnswer(); // 30 points
      expect(scoringSystem.getPoints()).toBe(30);
      expect(scoringSystem.getStreak()).toBe(3);
    });
  });

  describe('Streak Bonus System', () => {
    it('should award 50-point bonus at 5 correct answers', () => {
      // Answer 4 questions correctly (no bonus yet)
      for (let i = 0; i < 4; i++) {
        const points = scoringSystem.processCorrectAnswer();
        expect(points).toBe(10); // Only base points
      }
      expect(scoringSystem.getPoints()).toBe(40);
      expect(scoringSystem.getStreak()).toBe(4);

      // 5th correct answer should trigger bonus
      const pointsWithBonus = scoringSystem.processCorrectAnswer();
      expect(pointsWithBonus).toBe(60); // 10 base + 50 bonus
      expect(scoringSystem.getPoints()).toBe(100); // 40 + 60
      expect(scoringSystem.getStreak()).toBe(5);
    });

    it('should calculate streak bonus correctly', () => {
      const bonus = scoringSystem.calculateStreakBonus();
      expect(bonus).toBe(50);
    });

    it('should continue awarding base points after streak bonus', () => {
      // Get to streak of 5 and receive bonus
      for (let i = 0; i < 5; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getPoints()).toBe(100); // 50 base + 50 bonus

      // 6th correct answer should only give base points
      const points = scoringSystem.processCorrectAnswer();
      expect(points).toBe(10);
      expect(scoringSystem.getPoints()).toBe(110);
      expect(scoringSystem.getStreak()).toBe(6);
    });
  });

  describe('Incorrect Answer Processing', () => {
    it('should deduct 5 points for incorrect answer', () => {
      // First get some points
      scoringSystem.processCorrectAnswer(); // 10 points
      scoringSystem.processCorrectAnswer(); // 20 points

      const pointsDeducted = scoringSystem.processIncorrectAnswer();
      expect(pointsDeducted).toBe(5);
      expect(scoringSystem.getPoints()).toBe(15);
    });

    it('should reset streak to 0 for incorrect answer', () => {
      // Build up a streak
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      expect(scoringSystem.getStreak()).toBe(3);

      // Incorrect answer should reset streak
      scoringSystem.processIncorrectAnswer();
      expect(scoringSystem.getStreak()).toBe(0);
    });

    it('should increment total incorrect count', () => {
      scoringSystem.processIncorrectAnswer();
      const state = scoringSystem.getScoreState();
      expect(state.totalIncorrect).toBe(1);
    });

    it('should not allow negative points (minimum 0)', () => {
      // Start with 3 points
      scoringSystem.processCorrectAnswer(); // 10 points
      scoringSystem.processIncorrectAnswer(); // -5 = 5 points
      scoringSystem.processIncorrectAnswer(); // -5 = 0 points (minimum)

      expect(scoringSystem.getPoints()).toBe(0);

      // Another incorrect answer should still keep points at 0
      const pointsDeducted = scoringSystem.processIncorrectAnswer();
      expect(pointsDeducted).toBe(0); // Can't deduct from 0
      expect(scoringSystem.getPoints()).toBe(0);
    });
  }); 
 describe('Edge Cases and Complex Scenarios', () => {
    it('should handle mixed correct and incorrect answers', () => {
      scoringSystem.processCorrectAnswer(); // 10 points, streak 1
      scoringSystem.processCorrectAnswer(); // 20 points, streak 2
      scoringSystem.processIncorrectAnswer(); // 15 points, streak 0
      scoringSystem.processCorrectAnswer(); // 25 points, streak 1
      scoringSystem.processCorrectAnswer(); // 35 points, streak 2

      expect(scoringSystem.getPoints()).toBe(35);
      expect(scoringSystem.getStreak()).toBe(2);
      
      const state = scoringSystem.getScoreState();
      expect(state.totalCorrect).toBe(4);
      expect(state.totalIncorrect).toBe(1);
    });

    it('should handle streak bonus interruption', () => {
      // Get to 4 correct answers
      for (let i = 0; i < 4; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getPoints()).toBe(40);
      expect(scoringSystem.getStreak()).toBe(4);

      // Incorrect answer resets streak before bonus
      scoringSystem.processIncorrectAnswer();
      expect(scoringSystem.getPoints()).toBe(35);
      expect(scoringSystem.getStreak()).toBe(0);

      // Need to build streak again for bonus
      for (let i = 0; i < 5; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getPoints()).toBe(135); // 35 + 50 + 50 bonus
      expect(scoringSystem.getStreak()).toBe(5);
    });

    it('should handle multiple streak bonuses', () => {
      // First streak bonus at 5
      for (let i = 0; i < 5; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getPoints()).toBe(100); // 50 base + 50 bonus

      // Continue to build another streak (no bonus at 10)
      for (let i = 0; i < 5; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getPoints()).toBe(150); // Previous 100 + 50 more
      expect(scoringSystem.getStreak()).toBe(10);
    });
  });

  describe('Highest Streak Tracking', () => {
    it('should track highest streak achieved', () => {
      // Build up a streak of 3
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      expect(scoringSystem.getScoreState().highestStreak).toBe(3);

      // Reset streak with incorrect answer
      scoringSystem.processIncorrectAnswer();
      expect(scoringSystem.getStreak()).toBe(0);
      expect(scoringSystem.getScoreState().highestStreak).toBe(3); // Should remain 3

      // Build a higher streak
      for (let i = 0; i < 5; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getScoreState().highestStreak).toBe(5);
    });

    it('should maintain highest streak even after reset', () => {
      // Build up a streak
      for (let i = 0; i < 7; i++) {
        scoringSystem.processCorrectAnswer();
      }
      expect(scoringSystem.getScoreState().highestStreak).toBe(7);

      // Reset should clear highest streak
      scoringSystem.reset();
      expect(scoringSystem.getScoreState().highestStreak).toBe(0);
    });

    it('should update highest streak only when current streak exceeds it', () => {
      // Build initial streak
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      expect(scoringSystem.getScoreState().highestStreak).toBe(2);

      // Reset and build lower streak
      scoringSystem.processIncorrectAnswer();
      scoringSystem.processCorrectAnswer();
      expect(scoringSystem.getScoreState().highestStreak).toBe(2); // Should remain 2

      // Build higher streak
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      expect(scoringSystem.getScoreState().highestStreak).toBe(4);
    });
  });

  describe('State Management', () => {
    it('should return a copy of score state', () => {
      scoringSystem.processCorrectAnswer();
      const state1 = scoringSystem.getScoreState();
      const state2 = scoringSystem.getScoreState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects
      
      // Modifying returned state shouldn't affect internal state
      state1.points = 999;
      expect(scoringSystem.getPoints()).toBe(10);
    });

    it('should reset to initial state', () => {
      // Build up some state
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      scoringSystem.processIncorrectAnswer();
      
      expect(scoringSystem.getPoints()).toBeGreaterThan(0);
      expect(scoringSystem.getScoreState().totalCorrect).toBeGreaterThan(0);
      
      // Reset should clear everything
      scoringSystem.reset();
      const state = scoringSystem.getScoreState();
      expect(state.points).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.totalCorrect).toBe(0);
      expect(state.totalIncorrect).toBe(0);
      expect(state.highestStreak).toBe(0);
    });
  });
});