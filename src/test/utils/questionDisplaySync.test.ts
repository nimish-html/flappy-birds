import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestionDisplaySync } from '../../utils/questionDisplaySync';
import { MathQuestion } from '../../types';

describe('QuestionDisplaySync', () => {
  let sync: QuestionDisplaySync;
  let mockQuestion: MathQuestion;

  beforeEach(() => {
    vi.useFakeTimers();
    sync = new QuestionDisplaySync();
    mockQuestion = {
      id: 'test_001',
      category: 'addition',
      question: '7 + 4',
      correctAnswer: 11,
      difficulty: 1
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const config = sync.getTimingConfig();
      
      expect(config.preloadTime).toBe(1000);
      expect(config.displayDuration).toBe(2000);
      expect(config.transitionDelay).toBe(300);
    });

    it('should initialize with custom options', () => {
      const customSync = new QuestionDisplaySync({
        preloadTime: 500,
        displayDuration: 1500,
        transitionDelay: 200
      });
      
      const config = customSync.getTimingConfig();
      expect(config.preloadTime).toBe(500);
      expect(config.displayDuration).toBe(1500);
      expect(config.transitionDelay).toBe(200);
    });

    it('should initialize with not ready state', () => {
      const state = sync.getState();
      
      expect(state.isReady).toBe(false);
      expect(state.shouldDisplay).toBe(false);
      expect(state.timeRemaining).toBe(0);
    });
  });

  describe('Question Cycle Management', () => {
    it('should start question cycle correctly', () => {
      sync.startQuestionCycle(mockQuestion);
      
      const state = sync.getState();
      expect(state.isReady).toBe(true);
      expect(state.shouldDisplay).toBe(true);
      expect(state.timeRemaining).toBe(2000);
    });

    it('should update time remaining correctly', () => {
      sync.startQuestionCycle(mockQuestion);
      
      vi.advanceTimersByTime(500);
      const state = sync.update();
      
      expect(state.timeRemaining).toBe(1500);
    });

    it('should not go below zero time remaining', () => {
      sync.startQuestionCycle(mockQuestion);
      
      vi.advanceTimersByTime(3000);
      const state = sync.update();
      
      expect(state.timeRemaining).toBe(0);
    });

    it('should handle multiple updates correctly', () => {
      sync.startQuestionCycle(mockQuestion);
      
      vi.advanceTimersByTime(300);
      sync.update();
      
      vi.advanceTimersByTime(400);
      const state = sync.update();
      
      expect(state.timeRemaining).toBe(1300);
    });
  });

  describe('Next Question Loading', () => {
    it('should allow loading next question initially', () => {
      expect(sync.canLoadNextQuestion()).toBe(true);
    });

    it('should not allow loading next question immediately after start', () => {
      sync.startQuestionCycle(mockQuestion);
      
      expect(sync.canLoadNextQuestion()).toBe(false);
    });

    it('should allow loading next question after display duration', () => {
      sync.startQuestionCycle(mockQuestion);
      
      vi.advanceTimersByTime(2000);
      
      expect(sync.canLoadNextQuestion()).toBe(true);
    });

    it('should check readiness for new question correctly', () => {
      expect(sync.isReadyForNewQuestion()).toBe(true);
      
      sync.startQuestionCycle(mockQuestion);
      expect(sync.isReadyForNewQuestion()).toBe(false);
      
      vi.advanceTimersByTime(2000);
      expect(sync.isReadyForNewQuestion()).toBe(true);
    });
  });

  describe('Preload Logic', () => {
    it('should determine preload timing based on obstacle distance and speed', () => {
      const obstacleDistance = 800; // pixels
      const gameSpeed = 200; // pixels per second
      
      // Time to obstacle = 800 / 200 = 4 seconds
      // Should not preload (4000ms > 1000ms preload time)
      expect(sync.shouldPreloadQuestion(obstacleDistance, gameSpeed)).toBe(false);
    });

    it('should trigger preload when obstacle is close enough', () => {
      const obstacleDistance = 150; // pixels
      const gameSpeed = 200; // pixels per second
      
      // Time to obstacle = 150 / 200 = 0.75 seconds = 750ms
      // Should preload (750ms <= 1000ms preload time)
      expect(sync.shouldPreloadQuestion(obstacleDistance, gameSpeed)).toBe(true);
    });

    it('should handle edge case of exact preload timing', () => {
      const obstacleDistance = 200; // pixels
      const gameSpeed = 200; // pixels per second
      
      // Time to obstacle = 200 / 200 = 1 second = 1000ms
      // Should preload (1000ms <= 1000ms preload time)
      expect(sync.shouldPreloadQuestion(obstacleDistance, gameSpeed)).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', () => {
      sync.startQuestionCycle(mockQuestion);
      vi.advanceTimersByTime(500);
      sync.update();
      
      sync.reset();
      
      const state = sync.getState();
      expect(state.isReady).toBe(false);
      expect(state.shouldDisplay).toBe(false);
      expect(state.timeRemaining).toBe(0);
    });

    it('should force ready state', () => {
      sync.startQuestionCycle(mockQuestion);
      
      expect(sync.isReadyForNewQuestion()).toBe(false);
      
      sync.forceReady();
      
      expect(sync.isReadyForNewQuestion()).toBe(true);
      const state = sync.getState();
      expect(state.isReady).toBe(false);
      expect(state.timeRemaining).toBe(0);
    });

    it('should return immutable state copies', () => {
      sync.startQuestionCycle(mockQuestion);
      
      const state1 = sync.getState();
      const state2 = sync.getState();
      
      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same values
      
      state1.isReady = false; // Modify copy
      expect(sync.getState().isReady).toBe(true); // Original unchanged
    });
  });

  describe('Configuration Updates', () => {
    it('should update timing configuration', () => {
      sync.updateTimingConfig({
        preloadTime: 1500,
        displayDuration: 3000
      });
      
      const config = sync.getTimingConfig();
      expect(config.preloadTime).toBe(1500);
      expect(config.displayDuration).toBe(3000);
      expect(config.transitionDelay).toBe(300); // Unchanged
    });

    it('should apply new configuration to question cycles', () => {
      sync.updateTimingConfig({ displayDuration: 1000 });
      sync.startQuestionCycle(mockQuestion);
      
      const state = sync.getState();
      expect(state.timeRemaining).toBe(1000);
    });

    it('should return immutable configuration copies', () => {
      const config1 = sync.getTimingConfig();
      const config2 = sync.getTimingConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
      
      config1.preloadTime = 999;
      expect(sync.getTimingConfig().preloadTime).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero game speed gracefully', () => {
      expect(() => {
        sync.shouldPreloadQuestion(100, 0);
      }).not.toThrow();
      
      // With zero speed, time to obstacle is Infinity, so should not preload
      expect(sync.shouldPreloadQuestion(100, 0)).toBe(false);
    });

    it('should handle negative obstacle distance', () => {
      expect(sync.shouldPreloadQuestion(-100, 200)).toBe(true);
      // Negative distance means obstacle has passed, so should preload
    });

    it('should handle very small time intervals', () => {
      sync.startQuestionCycle(mockQuestion);
      
      vi.advanceTimersByTime(1);
      const state = sync.update();
      
      expect(state.timeRemaining).toBe(1999);
    });

    it('should handle rapid consecutive updates', () => {
      sync.startQuestionCycle(mockQuestion);
      
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(100);
        sync.update();
      }
      
      const state = sync.getState();
      expect(state.timeRemaining).toBe(1000);
    });
  });
});