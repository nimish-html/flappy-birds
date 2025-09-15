import { describe, it, expect, beforeEach } from 'vitest';
import { MathQuestionManager } from '../../utils/MathQuestionManager';
import { MATH_QUESTION_DATABASE } from '../../utils/mathQuestionDatabase';

describe('MathQuestionManager', () => {
  let manager: MathQuestionManager;

  beforeEach(() => {
    manager = new MathQuestionManager();
  });

  describe('Question Database Validation', () => {
    it('should have exactly 200 questions in the database', () => {
      expect(MATH_QUESTION_DATABASE).toHaveLength(200);
    });

    it('should have exactly 50 questions for each category', () => {
      const categories = ['addition', 'subtraction', 'multiplication', 'division'] as const;
      
      categories.forEach(category => {
        const categoryQuestions = MATH_QUESTION_DATABASE.filter(q => q.category === category);
        expect(categoryQuestions).toHaveLength(50);
      });
    });

    it('should have unique question IDs', () => {
      const ids = MATH_QUESTION_DATABASE.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(MATH_QUESTION_DATABASE.length);
    });

    it('should have valid difficulty levels (1-4)', () => {
      MATH_QUESTION_DATABASE.forEach(question => {
        expect(question.difficulty).toBeGreaterThanOrEqual(1);
        expect(question.difficulty).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize with all 200 questions available', () => {
      const status = manager.getPoolStatus();
      expect(status.availableCount).toBe(200);
      expect(status.usedCount).toBe(0);
      expect(status.totalCount).toBe(200);
    });

    it('should have no current question initially', () => {
      expect(manager.getCurrentQuestion()).toBeNull();
    });
  });

  describe('Question Selection', () => {
    it('should return a valid question when calling getNextQuestion', () => {
      const question = manager.getNextQuestion();
      
      expect(question).toBeDefined();
      expect(question.id).toBeDefined();
      expect(question.category).toBeDefined();
      expect(question.question).toBeDefined();
      expect(question.correctAnswer).toBeDefined();
      expect(question.difficulty).toBeDefined();
    });

    it('should move question from available to used pool', () => {
      const initialStatus = manager.getPoolStatus();
      
      manager.getNextQuestion();
      
      const afterStatus = manager.getPoolStatus();
      expect(afterStatus.availableCount).toBe(initialStatus.availableCount - 1);
      expect(afterStatus.usedCount).toBe(initialStatus.usedCount + 1);
    });

    it('should set current question when getting next question', () => {
      const question = manager.getNextQuestion();
      const currentQuestion = manager.getCurrentQuestion();
      
      expect(currentQuestion).toEqual(question);
    });

    it('should not repeat questions until all are used', () => {
      const usedQuestions = new Set<string>();
      
      // Use 200 questions (all available)
      for (let i = 0; i < 200; i++) {
        const question = manager.getNextQuestion();
        expect(usedQuestions.has(question.id)).toBe(false);
        usedQuestions.add(question.id);
      }
      
      expect(usedQuestions.size).toBe(200);
    });
  });

  describe('Pool Reset Functionality', () => {
    it('should reset pool when all questions are used', () => {
      // Use all 200 questions
      for (let i = 0; i < 200; i++) {
        manager.getNextQuestion();
      }
      
      // Pool should be empty now
      let status = manager.getPoolStatus();
      expect(status.availableCount).toBe(0);
      expect(status.usedCount).toBe(200);
      
      // Getting next question should trigger reset
      manager.getNextQuestion();
      
      status = manager.getPoolStatus();
      expect(status.availableCount).toBe(199); // 200 - 1 (just selected)
      expect(status.usedCount).toBe(1);
    });

    it('should manually reset pool correctly', () => {
      // Use some questions
      for (let i = 0; i < 50; i++) {
        manager.getNextQuestion();
      }
      
      manager.resetPool();
      
      const status = manager.getPoolStatus();
      expect(status.availableCount).toBe(200);
      expect(status.usedCount).toBe(0);
    });
  });

  describe('Answer Validation', () => {
    it('should validate correct answers', () => {
      const question = manager.getNextQuestion();
      const isCorrect = manager.validateAnswer(question.correctAnswer);
      
      expect(isCorrect).toBe(true);
    });

    it('should reject incorrect answers', () => {
      const question = manager.getNextQuestion();
      const wrongAnswer = question.correctAnswer + 1;
      const isCorrect = manager.validateAnswer(wrongAnswer);
      
      expect(isCorrect).toBe(false);
    });

    it('should return false when no current question', () => {
      const newManager = new MathQuestionManager();
      const isCorrect = newManager.validateAnswer(42);
      
      expect(isCorrect).toBe(false);
    });
  });

  describe('Category Filtering', () => {
    it('should return correct number of questions by category', () => {
      const categories = ['addition', 'subtraction', 'multiplication', 'division'] as const;
      
      categories.forEach(category => {
        const questions = manager.getQuestionsByCategory(category);
        expect(questions).toHaveLength(50);
        questions.forEach(q => expect(q.category).toBe(category));
      });
    });
  });

  describe('Difficulty Filtering', () => {
    it('should return questions by difficulty level', () => {
      for (let difficulty = 1; difficulty <= 4; difficulty++) {
        const questions = manager.getQuestionsByDifficulty(difficulty);
        expect(questions.length).toBeGreaterThan(0);
        questions.forEach(q => expect(q.difficulty).toBe(difficulty));
      }
    });
  });

  describe('Randomization', () => {
    it('should provide different question orders across multiple instances', () => {
      const manager1 = new MathQuestionManager();
      const manager2 = new MathQuestionManager();
      
      const sequence1: string[] = [];
      const sequence2: string[] = [];
      
      // Get first 10 questions from each manager
      for (let i = 0; i < 10; i++) {
        sequence1.push(manager1.getNextQuestion().id);
        sequence2.push(manager2.getNextQuestion().id);
      }
      
      // Sequences should be different (very high probability)
      expect(sequence1).not.toEqual(sequence2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple resets correctly', () => {
      manager.resetPool();
      manager.resetPool();
      manager.resetPool();
      
      const status = manager.getPoolStatus();
      expect(status.availableCount).toBe(200);
      expect(status.usedCount).toBe(0);
    });

    it('should maintain question integrity after multiple operations', () => {
      // Perform various operations
      for (let i = 0; i < 50; i++) {
        manager.getNextQuestion();
      }
      
      manager.resetPool();
      
      for (let i = 0; i < 100; i++) {
        manager.getNextQuestion();
      }
      
      manager.resetPool();
      
      // Should still have all questions available
      const status = manager.getPoolStatus();
      expect(status.totalCount).toBe(200);
      expect(status.availableCount).toBe(200);
      expect(status.usedCount).toBe(0);
    });
  });

  describe('Question Content Validation', () => {
    it('should have non-empty question text for all questions', () => {
      MATH_QUESTION_DATABASE.forEach(question => {
        expect(question.question.trim()).not.toBe('');
      });
    });

    it('should have positive correct answers', () => {
      MATH_QUESTION_DATABASE.forEach(question => {
        expect(question.correctAnswer).toBeGreaterThan(0);
      });
    });

    it('should have proper mathematical symbols in questions', () => {
      const additionQuestions = MATH_QUESTION_DATABASE.filter(q => q.category === 'addition');
      const subtractionQuestions = MATH_QUESTION_DATABASE.filter(q => q.category === 'subtraction');
      const multiplicationQuestions = MATH_QUESTION_DATABASE.filter(q => q.category === 'multiplication');
      const divisionQuestions = MATH_QUESTION_DATABASE.filter(q => q.category === 'division');

      additionQuestions.forEach(q => expect(q.question).toContain('+'));
      subtractionQuestions.forEach(q => expect(q.question).toContain('-'));
      multiplicationQuestions.forEach(q => expect(q.question).toContain('×'));
      divisionQuestions.forEach(q => expect(q.question).toContain('÷'));
    });
  });
});