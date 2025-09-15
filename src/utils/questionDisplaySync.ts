import { MathQuestion } from '../types';

export interface QuestionDisplaySyncOptions {
  preloadTime?: number; // Time in ms to preload question before obstacle appears
  displayDuration?: number; // Minimum time in ms to display question
  transitionDelay?: number; // Delay between question changes
}

export interface QuestionSyncState {
  isReady: boolean;
  shouldDisplay: boolean;
  timeRemaining: number;
}

export class QuestionDisplaySync {
  private options: Required<QuestionDisplaySyncOptions>;
  private currentState: QuestionSyncState;
  private startTime: number = 0;
  private lastUpdateTime: number = 0;

  constructor(options: QuestionDisplaySyncOptions = {}) {
    this.options = {
      preloadTime: 1000, // 1 second preload
      displayDuration: 2000, // 2 seconds minimum display
      transitionDelay: 300, // 300ms transition delay
      ...options
    };

    this.currentState = {
      isReady: false,
      shouldDisplay: false,
      timeRemaining: 0
    };
  }

  /**
   * Start the synchronization cycle for a new question
   */
  public startQuestionCycle(question: MathQuestion): void {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    
    this.currentState = {
      isReady: true,
      shouldDisplay: true,
      timeRemaining: this.options.displayDuration
    };
  }

  /**
   * Update the sync state based on elapsed time
   */
  public update(): QuestionSyncState {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    if (this.currentState.isReady && this.currentState.timeRemaining > 0) {
      this.currentState.timeRemaining = Math.max(0, this.currentState.timeRemaining - deltaTime);
    }

    return { ...this.currentState };
  }

  /**
   * Check if enough time has passed to load the next question
   */
  public canLoadNextQuestion(): boolean {
    if (!this.currentState.isReady) {
      return true;
    }

    const elapsedTime = Date.now() - this.startTime;
    return elapsedTime >= this.options.displayDuration;
  }

  /**
   * Check if the question should be preloaded before obstacle generation
   */
  public shouldPreloadQuestion(obstacleDistance: number, gameSpeed: number): boolean {
    if (gameSpeed <= 0) {
      return false;
    }
    
    // Calculate time until obstacle reaches bird position (in milliseconds)
    const timeToObstacleMs = (obstacleDistance / gameSpeed) * 1000;
    return timeToObstacleMs <= this.options.preloadTime;
  }

  /**
   * Reset the sync state
   */
  public reset(): void {
    this.currentState = {
      isReady: false,
      shouldDisplay: false,
      timeRemaining: 0
    };
    this.startTime = 0;
    this.lastUpdateTime = 0;
  }

  /**
   * Get the current sync state
   */
  public getState(): QuestionSyncState {
    return { ...this.currentState };
  }

  /**
   * Check if the display is ready for a new question
   */
  public isReadyForNewQuestion(): boolean {
    return !this.currentState.isReady || this.canLoadNextQuestion();
  }

  /**
   * Force the display to be ready for a new question
   */
  public forceReady(): void {
    this.currentState.isReady = false;
    this.currentState.timeRemaining = 0;
  }

  /**
   * Get timing configuration
   */
  public getTimingConfig(): Required<QuestionDisplaySyncOptions> {
    return { ...this.options };
  }

  /**
   * Update timing configuration
   */
  public updateTimingConfig(options: Partial<QuestionDisplaySyncOptions>): void {
    this.options = { ...this.options, ...options };
  }
}