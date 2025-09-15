import { MathQuestion } from '../types';
import { MathQuestionManager } from './MathQuestionManager';

/**
 * QuestionSyncManager handles question-obstacle synchronization to ensure
 * questions remain stable until player interaction with the associated obstacle.
 * 
 * Requirements addressed:
 * - 1.1: Questions remain unchanged until player passes through corresponding obstacle
 * - 1.2: New obstacles are paired with current displayed question
 * - 1.3: Question changes only after obstacle interaction
 * - 1.4: Only closest obstacle is associated with current question
 * - 1.5: First question displayed before first obstacle appears
 */
export class QuestionSyncManager {
  private mathQuestionManager: MathQuestionManager;
  private currentQuestion: MathQuestion | null = null;
  private isQuestionLocked: boolean = false;
  private associatedObstacleId: string | null = null;
  private obstacleQuestionMap: Map<string, string> = new Map();
  private questionObstacleMap: Map<string, string> = new Map();
  private onQuestionUpdate?: (question: MathQuestion | null) => void;

  constructor(mathQuestionManager: MathQuestionManager, callbacks?: {
    onQuestionUpdate?: (question: MathQuestion | null) => void;
  }) {
    this.mathQuestionManager = mathQuestionManager;
    this.onQuestionUpdate = callbacks?.onQuestionUpdate;
  }

  /**
   * Initialize the sync manager with the first question
   * Requirement 1.5: First question displayed before first obstacle appears
   */
  public initialize(): void {
    this.loadAndLockNextQuestion();
  }

  /**
   * Lock the current question to prevent changes until obstacle interaction
   * Requirement 1.1: Questions remain unchanged until player passes through obstacle
   */
  public lockCurrentQuestion(): void {
    if (this.currentQuestion) {
      this.isQuestionLocked = true;
      console.log(`Question locked: ${this.currentQuestion.question}`);
    }
  }

  /**
   * Unlock the current question and advance to the next one
   * Requirement 1.3: Question changes only after obstacle interaction
   */
  public unlockAndAdvance(): void {
    if (this.isQuestionLocked) {
      this.isQuestionLocked = false;
      this.associatedObstacleId = null;
      
      // Clear the association maps for the current question
      if (this.currentQuestion) {
        const obstacleId = this.questionObstacleMap.get(this.currentQuestion.id);
        if (obstacleId) {
          this.obstacleQuestionMap.delete(obstacleId);
          this.questionObstacleMap.delete(this.currentQuestion.id);
        }
      }
      
      // Load and lock the next question
      this.loadAndLockNextQuestion();
      
      console.log('Question unlocked and advanced to next question');
    }
  }

  /**
   * Get the current question ID for association tracking
   */
  public getCurrentQuestionId(): string {
    return this.currentQuestion?.id || '';
  }

  /**
   * Get the current question
   */
  public getCurrentQuestion(): MathQuestion | null {
    return this.currentQuestion;
  }

  /**
   * Associate the current question with the closest obstacle
   * Requirement 1.4: Only closest obstacle is associated with current question
   * Requirement 1.2: New obstacles are paired with current displayed question
   */
  public associateWithClosestObstacle(obstacleId: string): void {
    if (!this.currentQuestion || !this.isQuestionLocked) {
      console.warn('Cannot associate obstacle: no locked question available');
      return;
    }

    // Clear any existing association for this obstacle
    const existingQuestionId = this.obstacleQuestionMap.get(obstacleId);
    if (existingQuestionId) {
      this.questionObstacleMap.delete(existingQuestionId);
    }

    // Clear any existing association for this question
    const existingObstacleId = this.questionObstacleMap.get(this.currentQuestion.id);
    if (existingObstacleId) {
      this.obstacleQuestionMap.delete(existingObstacleId);
    }

    // Create new association
    this.obstacleQuestionMap.set(obstacleId, this.currentQuestion.id);
    this.questionObstacleMap.set(this.currentQuestion.id, obstacleId);
    this.associatedObstacleId = obstacleId;

    console.log(`Question "${this.currentQuestion.question}" associated with obstacle ${obstacleId}`);
  }

  /**
   * Check if a question is currently locked
   */
  public isCurrentQuestionLocked(): boolean {
    return this.isQuestionLocked;
  }

  /**
   * Get the obstacle ID associated with the current question
   */
  public getAssociatedObstacleId(): string | null {
    return this.associatedObstacleId;
  }

  /**
   * Get the question ID associated with a specific obstacle
   */
  public getQuestionIdForObstacle(obstacleId: string): string | null {
    return this.obstacleQuestionMap.get(obstacleId) || null;
  }

  /**
   * Check if an obstacle is associated with the current question
   */
  public isObstacleAssociatedWithCurrentQuestion(obstacleId: string): boolean {
    if (!this.currentQuestion) {
      return false;
    }
    return this.obstacleQuestionMap.get(obstacleId) === this.currentQuestion.id;
  }

  /**
   * Handle obstacle interaction - unlock and advance if it's the associated obstacle
   */
  public handleObstacleInteraction(obstacleId: string): boolean {
    if (this.isObstacleAssociatedWithCurrentQuestion(obstacleId)) {
      this.unlockAndAdvance();
      return true;
    }
    return false;
  }

  /**
   * Remove obstacle association when obstacle is destroyed/off-screen
   */
  public removeObstacleAssociation(obstacleId: string): void {
    const questionId = this.obstacleQuestionMap.get(obstacleId);
    if (questionId) {
      this.obstacleQuestionMap.delete(obstacleId);
      this.questionObstacleMap.delete(questionId);
      
      // If this was the associated obstacle, clear the association
      if (this.associatedObstacleId === obstacleId) {
        this.associatedObstacleId = null;
      }
      
      console.log(`Removed association for obstacle ${obstacleId}`);
    }
  }

  /**
   * Reset the sync manager to initial state
   */
  public reset(): void {
    this.currentQuestion = null;
    this.isQuestionLocked = false;
    this.associatedObstacleId = null;
    this.obstacleQuestionMap.clear();
    this.questionObstacleMap.clear();
    
    // Notify UI that question has been cleared
    this.onQuestionUpdate?.(null);
    
    console.log('QuestionSyncManager reset');
  }

  /**
   * Load and lock the next question from the question manager
   * Private helper method to ensure consistent question loading
   */
  private loadAndLockNextQuestion(): void {
    try {
      this.currentQuestion = this.mathQuestionManager.getNextQuestion();
      this.lockCurrentQuestion();
      
      // Notify UI of question update
      this.onQuestionUpdate?.(this.currentQuestion);
      
      console.log(`Loaded and locked question: ${this.currentQuestion.question}`);
    } catch (error) {
      console.error('Failed to load next question:', error);
      this.currentQuestion = null;
      this.isQuestionLocked = false;
    }
  }

  /**
   * Get debug information about current sync state
   */
  public getDebugInfo(): {
    currentQuestion: MathQuestion | null;
    isLocked: boolean;
    associatedObstacleId: string | null;
    associationCount: number;
  } {
    return {
      currentQuestion: this.currentQuestion,
      isLocked: this.isQuestionLocked,
      associatedObstacleId: this.associatedObstacleId,
      associationCount: this.obstacleQuestionMap.size
    };
  }
}