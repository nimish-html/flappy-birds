import { Obstacle } from './Obstacle';
import { MathQuestion, AnswerZone, Bounds } from '../types';
import { GAME_CONFIG, RESPONSIVE_CONFIG } from '../utils/gameConfig';

export class MathObstacle extends Obstacle {
  private upperAnswerZone!: AnswerZone;
  private lowerAnswerZone!: AnswerZone;
  private question: MathQuestion;
  private incorrectAnswer: number;
  
  // Global text rendering cache for performance
  private static globalTextCache: Map<string, { canvas: HTMLCanvasElement; width: number; height: number }> = new Map();

  constructor(x: number, question: MathQuestion, gapY?: number) {
    super(x, gapY);
    this.question = question;
    this.incorrectAnswer = this.generateIncorrectAnswer(question);
    this.setupAnswerZones();
  }

  /**
   * Generate an incorrect answer based on the question category
   */
  private generateIncorrectAnswer(question: MathQuestion): number {
    const correct = question.correctAnswer;
    let incorrect: number;

    switch (question.category) {
      case 'addition':
      case 'subtraction':
        // Generate answer that's ±1 to ±3 from correct answer
        const offset = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        incorrect = Math.random() < 0.5 ? correct + offset : correct - offset;
        // Ensure it's not negative and not the same as correct answer
        incorrect = Math.max(0, incorrect);
        if (incorrect === correct) {
          incorrect = correct + offset;
        }
        break;
      
      case 'multiplication':
        // Common multiplication errors (off by one factor)
        const factors = this.extractFactors(question.question);
        if (factors.length === 2) {
          incorrect = (factors[0] + 1) * factors[1]; // Add 1 to first factor
          if (incorrect === correct) {
            incorrect = factors[0] * (factors[1] + 1); // Add 1 to second factor
          }
        } else {
          incorrect = correct + Math.floor(Math.random() * 5) + 1;
        }
        break;
      
      case 'division':
        // Off-by-one errors or remainder confusion
        incorrect = correct + (Math.random() < 0.5 ? 1 : -1);
        incorrect = Math.max(1, incorrect); // Ensure positive
        break;
      
      default:
        incorrect = correct + Math.floor(Math.random() * 5) + 1;
    }

    return incorrect;
  }

  /**
   * Extract factors from multiplication question string
   */
  private extractFactors(questionStr: string): number[] {
    const matches = questionStr.match(/(\d+)\s*[×*]\s*(\d+)/);
    if (matches) {
      return [parseInt(matches[1]), parseInt(matches[2])];
    }
    return [];
  }

  /**
   * Setup answer zones with random positioning and mobile-friendly sizing
   * Enhanced with increased vertical separation for improved pass-through navigation
   */
  private setupAnswerZones(): void {
    const gapTop = this.gapY - this.gapHeight / 2;
    const gapBottom = this.gapY + this.gapHeight / 2;
    
    // Detect mobile for touch-friendly sizing
    const isMobile = this.isMobileDevice();
    const touchPadding = isMobile ? RESPONSIVE_CONFIG.MOBILE_TOUCH_AREA_PADDING : 10;
    
    // Enhanced touch-friendly sizing with increased minimum heights
    const minZoneHeight = isMobile ? 70 : 50; // Increased minimum height for better touch interaction
    
    // Significantly increased vertical separation between answer zones for clear pass-through navigation
    const passThroughGap = isMobile ? 60 : 50; // Increased gap for clearer navigation (was 40/30)
    const topBottomPadding = 8; // Padding from gap edges
    
    // Calculate available height for answer zones after accounting for separation and padding
    const availableHeight = this.gapHeight - passThroughGap - (topBottomPadding * 2);
    const maxZoneHeight = availableHeight / 2;
    
    // Ensure zones are touch-friendly but fit within available space
    // Prioritize the pass-through gap over maximum zone height
    const zoneHeight = Math.min(maxZoneHeight, minZoneHeight);
    
    // Enhanced touch-friendly width with better padding
    const horizontalPadding = isMobile ? touchPadding / 3 : touchPadding / 4;
    const zoneWidth = this.width - horizontalPadding;

    // Randomly assign correct answer to upper or lower zone
    const correctInUpper = Math.random() < 0.5;

    // Upper answer zone positioned with increased separation from center
    this.upperAnswerZone = {
      bounds: {
        x: this.x + (horizontalPadding / 2),
        y: gapTop + topBottomPadding,
        width: zoneWidth,
        height: zoneHeight
      },
      answer: correctInUpper ? this.question.correctAnswer : this.incorrectAnswer,
      isCorrect: correctInUpper,
      position: 'upper'
    };

    // Lower answer zone positioned with increased separation from center
    this.lowerAnswerZone = {
      bounds: {
        x: this.x + (horizontalPadding / 2),
        y: gapBottom - zoneHeight - topBottomPadding,
        width: zoneWidth,
        height: zoneHeight
      },
      answer: correctInUpper ? this.incorrectAnswer : this.question.correctAnswer,
      isCorrect: !correctInUpper,
      position: 'lower'
    };
  }

  /**
   * Detect if running on mobile device for touch-friendly optimizations
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= RESPONSIVE_CONFIG.MOBILE_BREAKPOINT;
  }

  /**
   * Update obstacle position and answer zone bounds
   */
  public update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Update answer zone positions as obstacle moves
    const deltaX = -GAME_CONFIG.OBSTACLE_SPEED * (deltaTime / 1000) * 60;
    this.upperAnswerZone.bounds.x += deltaX;
    this.lowerAnswerZone.bounds.x += deltaX;
  }

  /**
   * Check if bird has selected an answer by passing through an answer zone
   * Optimized collision detection with early exit and bounds caching
   * Now excludes the pass-through zone between answer areas
   */
  public checkAnswerSelection(birdBounds: Bounds): AnswerZone | null {
    // Early exit if bird is not in the horizontal range of the obstacle
    if (birdBounds.x + birdBounds.width < this.x || birdBounds.x > this.x + this.width) {
      return null;
    }

    // Check if bird is in the pass-through zone (middle area between answer zones)
    if (this.isInPassThroughZone(birdBounds)) {
      return null; // Allow passage without collision
    }

    // Check collision with upper answer zone first (more common path)
    if (this.isCollidingOptimized(birdBounds, this.upperAnswerZone.bounds)) {
      return this.upperAnswerZone;
    }
    
    // Check collision with lower answer zone
    if (this.isCollidingOptimized(birdBounds, this.lowerAnswerZone.bounds)) {
      return this.lowerAnswerZone;
    }

    return null;
  }

  /**
   * Optimized collision detection with early exits and reduced calculations
   */
  private isCollidingOptimized(bounds1: Bounds, bounds2: Bounds): boolean {
    // Early exit checks for performance
    if (bounds1.x >= bounds2.x + bounds2.width || bounds1.x + bounds1.width <= bounds2.x) {
      return false;
    }
    if (bounds1.y >= bounds2.y + bounds2.height || bounds1.y + bounds1.height <= bounds2.y) {
      return false;
    }
    return true;
  }

  /**
   * Check if the bird is in the pass-through zone between answer areas
   * This allows navigation between upper and lower answer zones without collision
   */
  private isInPassThroughZone(birdBounds: Bounds): boolean {
    // Define the pass-through zone as the area between the upper and lower answer zones
    const upperZoneBottom = this.upperAnswerZone.bounds.y + this.upperAnswerZone.bounds.height;
    const lowerZoneTop = this.lowerAnswerZone.bounds.y;
    
    // Check if bird is horizontally within the obstacle bounds
    const horizontallyInside = birdBounds.x < this.x + this.width && 
                              birdBounds.x + birdBounds.width > this.x;
    
    // Check if bird is vertically in the pass-through zone
    const verticallyInPassThrough = birdBounds.y >= upperZoneBottom && 
                                   birdBounds.y + birdBounds.height <= lowerZoneTop;
    
    // Only consider it pass-through if there's actually space between zones
    const hasPassThroughSpace = lowerZoneTop > upperZoneBottom;
    
    return horizontallyInside && verticallyInPassThrough && hasPassThroughSpace;
  }

  /**
   * Render the obstacle with answer choices
   */
  public render(context: CanvasRenderingContext2D): void {
    // Render the base obstacle (pipes)
    super.render(context);
    
    // Render answer choices
    this.renderAnswerChoices(context);
  }

  /**
   * Render answer choices within the obstacle gaps
   * No longer renders separator to allow pass-through navigation
   */
  public renderAnswerChoices(context: CanvasRenderingContext2D): void {
    context.save();

    // Set up text styling
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Render upper answer zone
    this.renderAnswerZone(context, this.upperAnswerZone);
    
    // Render lower answer zone
    this.renderAnswerZone(context, this.lowerAnswerZone);

    // Note: Separator removed to allow pass-through navigation between answer zones

    context.restore();
  }

  /**
   * Render a single answer zone with background and cached text
   * Uses uniform blue theme to remove visual indicators of correctness
   */
  private renderAnswerZone(context: CanvasRenderingContext2D, zone: AnswerZone): void {
    const { bounds, answer } = zone;

    // Uniform blue gradient background for all answer zones
    const gradient = context.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.height);
    gradient.addColorStop(0, 'rgba(173, 216, 230, 0.95)'); // Light blue
    gradient.addColorStop(1, 'rgba(135, 206, 250, 0.95)'); // Sky blue
    
    context.fillStyle = gradient;
    context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Uniform blue border for all answer zones
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    context.strokeStyle = '#4682B4'; // Steel blue - consistent for all answers
    context.lineWidth = 3;
    context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    context.restore();

    // Draw cached answer text with neutral styling
    this.renderCachedText(context, answer.toString(), bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  }

  /**
   * Render text using cached canvas for improved performance
   * Uses neutral dark blue color for all answer text
   */
  private renderCachedText(context: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    const color = '#1e3a8a'; // Dark blue - neutral for all answers
    const cacheKey = `${text}_28_bold_Arial_${color}`;
    let cached = MathObstacle.globalTextCache.get(cacheKey);
    
    if (!cached) {
      // Create cached text canvas
      const textCanvas = document.createElement('canvas');
      const textContext = textCanvas.getContext('2d')!;
      
      // Enhanced font properties for better readability
      textContext.font = 'bold 28px Arial';
      textContext.textAlign = 'center';
      textContext.textBaseline = 'middle';
      textContext.fillStyle = color;
      
      // Measure text
      const metrics = textContext.measureText(text);
      const width = Math.ceil(metrics.width) + 4; // Add padding
      const height = 32; // Approximate height for 28px font
      
      // Set canvas size
      textCanvas.width = width;
      textCanvas.height = height;
      
      // Re-apply font properties after canvas resize
      textContext.font = 'bold 28px Arial';
      textContext.textAlign = 'center';
      textContext.textBaseline = 'middle';
      textContext.fillStyle = color;
      
      // Draw text to cache canvas
      textContext.fillText(text, width / 2, height / 2);
      
      cached = { canvas: textCanvas, width, height };
      MathObstacle.globalTextCache.set(cacheKey, cached);
    }
    
    // Draw cached text
    context.drawImage(
      cached.canvas,
      x - cached.width / 2,
      y - cached.height / 2
    );
  }



  /**
   * Get the current question associated with this obstacle
   */
  public getQuestion(): MathQuestion {
    return this.question;
  }

  /**
   * Get both answer zones for testing purposes
   */
  public getAnswerZones(): { upper: AnswerZone; lower: AnswerZone } {
    return {
      upper: this.upperAnswerZone,
      lower: this.lowerAnswerZone
    };
  }

  /**
   * Check if the bird has passed through the gap without selecting an answer
   * This is used to detect when the player missed answering the question
   */
  public checkMissedAnswer(birdBounds: Bounds): boolean {
    // Check if bird is in the gap area but hasn't selected an answer
    const gapTop = this.gapY - this.gapHeight / 2;
    const gapBottom = this.gapY + this.gapHeight / 2;
    
    return birdBounds.x > this.x + this.width && 
           birdBounds.y > gapTop && 
           birdBounds.y + birdBounds.height < gapBottom &&
           !this.passed;
  }

  /**
   * Get the navigable pass-through area bounds for testing and debugging
   * This represents the area where the bird can pass without collision
   */
  public getNavigableArea(): Bounds {
    const upperZoneBottom = this.upperAnswerZone.bounds.y + this.upperAnswerZone.bounds.height;
    const lowerZoneTop = this.lowerAnswerZone.bounds.y;
    
    return {
      x: this.x,
      y: upperZoneBottom,
      width: this.width,
      height: lowerZoneTop - upperZoneBottom
    };
  }

  /**
   * Check if this obstacle has a pass-through zone between answer areas
   * Always returns true for MathObstacle as it now supports pass-through navigation
   */
  public hasPassThroughZone(): boolean {
    return true;
  }

  /**
   * Enhanced collision detection that excludes the pass-through gap
   * This method can be used by the game engine for obstacle collision detection
   */
  public checkBirdCollisionExcludingGap(birdBounds: Bounds): boolean {
    // If bird is in pass-through zone, no collision
    if (this.isInPassThroughZone(birdBounds)) {
      return false;
    }

    // For testing purposes and basic collision detection, check if bird hits answer zones
    return this.checkAnswerSelection(birdBounds) !== null;
  }
}