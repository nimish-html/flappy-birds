import { MathQuestion, QuestionPool } from '../types';
import { MATH_QUESTION_DATABASE } from './mathQuestionDatabase';

/**
 * MathQuestionManager handles question pool management, selection, and validation
 * Implements requirements 5.1-5.5 and 6.1-6.5 for question management
 */
export class MathQuestionManager {
  private questionPool: QuestionPool;
  private currentQuestion: MathQuestion | null = null;

  constructor() {
    this.questionPool = {
      available: [],
      used: []
    };
    this.loadQuestions();
  }

  /**
   * Load all questions into the available pool
   * Requirement 5.1: Initialize with 200 pre-defined math questions
   * Requirement 6.4: All 200 questions available for selection at start
   */
  public loadQuestions(): void {
    this.questionPool.available = [...MATH_QUESTION_DATABASE];
    this.questionPool.used = [];
    this.shuffleAvailableQuestions();
  }

  /**
   * Get the next random question from the available pool
   * Requirements 5.4, 6.1, 6.3: No repeats until all used, random selection
   */
  public getNextQuestion(): MathQuestion {
    // If no available questions, reset the pool
    if (this.questionPool.available.length === 0) {
      this.resetPool();
    }

    // Get random question from available pool
    const randomIndex = Math.floor(Math.random() * this.questionPool.available.length);
    const selectedQuestion = this.questionPool.available[randomIndex];

    // Move question from available to used
    this.questionPool.available.splice(randomIndex, 1);
    this.questionPool.used.push(selectedQuestion);

    this.currentQuestion = selectedQuestion;
    return selectedQuestion;
  }

  /**
   * Validate if the provided answer is correct for the current question
   * Used for answer validation in the game
   */
  public validateAnswer(answer: number): boolean {
    if (!this.currentQuestion) {
      return false;
    }
    return this.currentQuestion.correctAnswer === answer;
  }

  /**
   * Get the current question
   */
  public getCurrentQuestion(): MathQuestion | null {
    return this.currentQuestion;
  }

  /**
   * Reset the question pool by moving all used questions back to available
   * Requirement 5.5, 6.2: Reset and reshuffle when all questions used
   */
  public resetPool(): void {
    // Always restore all questions to available pool
    this.questionPool.available = [...MATH_QUESTION_DATABASE];
    this.questionPool.used = [];
    this.shuffleAvailableQuestions();
  }

  /**
   * Shuffle the available questions to ensure random order
   * Requirement 6.5: Prevent immediate repetition through shuffling
   */
  private shuffleAvailableQuestions(): void {
    for (let i = this.questionPool.available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.questionPool.available[i], this.questionPool.available[j]] = 
        [this.questionPool.available[j], this.questionPool.available[i]];
    }
  }

  /**
   * Get questions by category for testing or specific use cases
   * Requirement 5.2: 50 questions each for Addition, Subtraction, Multiplication, Division
   */
  public getQuestionsByCategory(category: MathQuestion['category']): MathQuestion[] {
    return MATH_QUESTION_DATABASE.filter(q => q.category === category);
  }

  /**
   * Get current pool status for debugging/testing
   */
  public getPoolStatus(): { availableCount: number; usedCount: number; totalCount: number } {
    return {
      availableCount: this.questionPool.available.length,
      usedCount: this.questionPool.used.length,
      totalCount: MATH_QUESTION_DATABASE.length
    };
  }

  /**
   * Get questions by difficulty level
   * Requirement 5.3: Questions follow smooth difficulty curve
   */
  public getQuestionsByDifficulty(difficulty: number): MathQuestion[] {
    return MATH_QUESTION_DATABASE.filter(q => q.difficulty === difficulty);
  }
}