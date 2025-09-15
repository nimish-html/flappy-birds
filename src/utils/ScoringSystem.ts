export interface ScoreState {
  points: number;
  streak: number;
  totalCorrect: number;
  totalIncorrect: number;
  highestStreak: number;
}

export class ScoringSystem {
  private scoreState: ScoreState;

  constructor() {
    this.scoreState = {
      points: 0,
      streak: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      highestStreak: 0
    };
  }

  /**
   * Process a correct answer: award 10 points and increment streak
   * @returns The points awarded (including any streak bonus)
   */
  public processCorrectAnswer(): number {
    this.scoreState.points += 10;
    this.scoreState.streak += 1;
    this.scoreState.totalCorrect += 1;

    // Update highest streak if current streak is higher
    if (this.scoreState.streak > this.scoreState.highestStreak) {
      this.scoreState.highestStreak = this.scoreState.streak;
    }

    let pointsAwarded = 10;

    // Check for streak bonus at 5 correct answers
    if (this.scoreState.streak === 5) {
      const bonus = this.calculateStreakBonus();
      this.scoreState.points += bonus;
      pointsAwarded += bonus;
    }

    return pointsAwarded;
  }

  /**
   * Process an incorrect answer: deduct 5 points (minimum 0) and reset streak
   * @returns The points deducted
   */
  public processIncorrectAnswer(): number {
    const pointsToDeduct = Math.min(5, this.scoreState.points);
    this.scoreState.points = Math.max(0, this.scoreState.points - 5);
    this.scoreState.streak = 0;
    this.scoreState.totalIncorrect += 1;

    return pointsToDeduct;
  }

  /**
   * Calculate streak bonus (50 points at 5 correct answers)
   * @returns The bonus points awarded
   */
  public calculateStreakBonus(): number {
    return 50;
  }

  /**
   * Get the current score state
   * @returns A copy of the current score state
   */
  public getScoreState(): ScoreState {
    return { ...this.scoreState };
  }

  /**
   * Reset the scoring system to initial state
   */
  public reset(): void {
    this.scoreState = {
      points: 0,
      streak: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      highestStreak: 0
    };
  }

  /**
   * Get current points
   * @returns Current points
   */
  public getPoints(): number {
    return this.scoreState.points;
  }

  /**
   * Get current streak
   * @returns Current streak count
   */
  public getStreak(): number {
    return this.scoreState.streak;
  }
}