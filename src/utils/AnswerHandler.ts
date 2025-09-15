import { ScoringSystem, ScoreState } from './ScoringSystem';
import { ParticleSystem } from '../components/ParticleSystem';

export interface AnswerFeedback {
  type: 'correct' | 'incorrect' | 'streak_bonus';
  points: number;
  message: string;
  duration: number;
  correctAnswer?: number; // Added for Requirement 4.5: Show correct answer when wrong
}

export interface FeedbackEffects {
  visual: {
    particleColor: string;
    particleCount: number;
    flashColor?: string;
    flashDuration?: number;
  };
  audio?: {
    soundType: 'correct' | 'incorrect' | 'bonus';
    volume: number;
  };
}

export class AnswerHandler {
  private scoringSystem: ScoringSystem;
  private particleSystem: ParticleSystem;
  private activeFeedback: AnswerFeedback | null = null;
  private feedbackStartTime: number = 0;
  private onFeedbackUpdate?: (feedback: AnswerFeedback | null) => void;

  constructor(
    scoringSystem: ScoringSystem, 
    particleSystem: ParticleSystem,
    callbacks?: {
      onFeedbackUpdate?: (feedback: AnswerFeedback | null) => void;
    }
  ) {
    this.scoringSystem = scoringSystem;
    this.particleSystem = particleSystem;
    this.onFeedbackUpdate = callbacks?.onFeedbackUpdate;
  }

  /**
   * Process correct answer selection
   * Requirements 8.1: Provide positive feedback for correct answers
   */
  public validateCorrectAnswer(birdX: number, birdY: number): AnswerFeedback {
    // Award points and update streak through scoring system
    const pointsAwarded = this.scoringSystem.processCorrectAnswer();
    const scoreState = this.scoringSystem.getScoreState();
    
    // Determine if this was a streak bonus
    const isStreakBonus = scoreState.streak === 5;
    
    // Create feedback object
    const feedback: AnswerFeedback = {
      type: isStreakBonus ? 'streak_bonus' : 'correct',
      points: pointsAwarded,
      message: isStreakBonus ? `Streak Bonus! +${pointsAwarded} points!` : `Correct! +${pointsAwarded} points`,
      duration: isStreakBonus ? 2000 : 1000 // Longer duration for bonus
    };

    // Create visual effects
    this.createVisualFeedback(birdX, birdY, feedback.type);
    
    // Set active feedback with timing
    this.setActiveFeedback(feedback);
    
    return feedback;
  }

  /**
   * Process incorrect answer selection
   * Requirements 4.2: Provide negative feedback for incorrect answers
   * Requirements 4.5: Show correct answer when player was wrong
   */
  public handleIncorrectAnswer(birdX: number, birdY: number, correctAnswer?: number): AnswerFeedback {
    // Deduct points and reset streak through scoring system
    const pointsDeducted = this.scoringSystem.processIncorrectAnswer();
    
    // Create enhanced feedback message with correct answer (Requirement 4.5)
    let message = pointsDeducted > 0 ? `Incorrect! -${pointsDeducted} points` : 'Incorrect!';
    if (correctAnswer !== undefined) {
      message += ` (Correct: ${correctAnswer})`;
    }
    
    // Create feedback object
    const feedback: AnswerFeedback = {
      type: 'incorrect',
      points: pointsDeducted > 0 ? -pointsDeducted : 0,
      message: message,
      duration: 1500, // Slightly longer duration to read correct answer (Requirement 4.4)
      correctAnswer: correctAnswer // Include correct answer for display (Requirement 4.5)
    };

    // Create visual effects
    this.createVisualFeedback(birdX, birdY, feedback.type);
    
    // Set active feedback with timing
    this.setActiveFeedback(feedback);
    
    return feedback;
  }

  /**
   * Update feedback timing and clear expired feedback
   * Requirements 8.4: Ensure feedback doesn't interfere with gameplay
   */
  public updateFeedback(currentTime: number): void {
    if (this.activeFeedback && this.feedbackStartTime > 0) {
      const elapsed = currentTime - this.feedbackStartTime;
      
      if (elapsed >= this.activeFeedback.duration) {
        // Clear expired feedback
        this.clearActiveFeedback();
      }
    }
  }

  /**
   * Get current active feedback
   */
  public getActiveFeedback(): AnswerFeedback | null {
    return this.activeFeedback;
  }

  /**
   * Create visual feedback effects based on answer type
   * Requirements 8.1, 8.2, 8.3: Visual feedback for different answer types
   */
  private createVisualFeedback(x: number, y: number, type: 'correct' | 'incorrect' | 'streak_bonus'): void {
    const effects = this.getFeedbackEffects(type);
    
    // Create particle effects
    this.particleSystem.createCollisionParticles(
      x, 
      y, 
      effects.visual.particleColor,
      effects.visual.particleCount
    );

    // Create additional effects for streak bonus
    if (type === 'streak_bonus') {
      // Create secondary particle burst with gold color
      setTimeout(() => {
        this.particleSystem.createCollisionParticles(x, y, '#FFD700', 20);
      }, 100);
      
      // Create third particle burst for extra celebration
      setTimeout(() => {
        this.particleSystem.createCollisionParticles(x, y, '#FFA500', 15);
      }, 200);
    }
  }

  /**
   * Get feedback effects configuration for different answer types
   */
  private getFeedbackEffects(type: 'correct' | 'incorrect' | 'streak_bonus'): FeedbackEffects {
    switch (type) {
      case 'correct':
        return {
          visual: {
            particleColor: '#00FF00', // Green
            particleCount: 15,
            flashColor: '#90EE90',
            flashDuration: 200
          },
          audio: {
            soundType: 'correct',
            volume: 0.5
          }
        };
      
      case 'incorrect':
        return {
          visual: {
            particleColor: '#FF0000', // Red
            particleCount: 10,
            flashColor: '#FFB6C1',
            flashDuration: 300
          },
          audio: {
            soundType: 'incorrect',
            volume: 0.4
          }
        };
      
      case 'streak_bonus':
        return {
          visual: {
            particleColor: '#FFD700', // Gold
            particleCount: 25,
            flashColor: '#FFFF00',
            flashDuration: 500
          },
          audio: {
            soundType: 'bonus',
            volume: 0.7
          }
        };
      
      default:
        return {
          visual: {
            particleColor: '#FFFFFF',
            particleCount: 5
          }
        };
    }
  }

  /**
   * Set active feedback and notify callbacks
   * Requirements 8.4: Manage feedback timing
   */
  private setActiveFeedback(feedback: AnswerFeedback): void {
    this.activeFeedback = feedback;
    this.feedbackStartTime = performance.now();
    this.onFeedbackUpdate?.(feedback);
  }

  /**
   * Clear active feedback and notify callbacks
   */
  private clearActiveFeedback(): void {
    this.activeFeedback = null;
    this.feedbackStartTime = 0;
    this.onFeedbackUpdate?.(null);
  }

  /**
   * Force clear any active feedback (useful for game reset)
   */
  public clearFeedback(): void {
    this.clearActiveFeedback();
  }

  /**
   * Get current score state from scoring system
   */
  public getScoreState(): ScoreState {
    return this.scoringSystem.getScoreState();
  }

  /**
   * Reset the answer handler (useful for game restart)
   */
  public reset(): void {
    this.clearActiveFeedback();
  }
}