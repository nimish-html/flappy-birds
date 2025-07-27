import { GAME_CONFIG, COLLISION, ANIMATION_CONFIG } from '../utils/gameConfig';
import { Bounds } from '../types';
import { CollisionDetector } from '../utils/collision';

export class Obstacle {
  public x: number;
  public gapY: number = 0; // Initialize to avoid TypeScript error
  public gapHeight: number;
  public width: number;
  public passed: boolean;
  
  // Animation properties
  private animationTime: number = 0;

  constructor(x: number, gapY?: number) {
    this.x = x;
    this.width = GAME_CONFIG.OBSTACLE_WIDTH;
    this.gapHeight = GAME_CONFIG.OBSTACLE_GAP;
    this.passed = false;
    this.animationTime = 0;

    // If gapY is not provided, generate a random gap position
    if (gapY !== undefined) {
      this.gapY = gapY;
    } else {
      this.generateRandomGap();
    }
  }

  /**
   * Generate a random gap position ensuring the gap fits within screen bounds
   */
  private generateRandomGap(): void {
    const minGapY = this.gapHeight / 2 + GAME_CONFIG.OBSTACLE_MIN_HEIGHT;
    const maxGapY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - this.gapHeight / 2 - GAME_CONFIG.OBSTACLE_MIN_HEIGHT;
    
    this.gapY = Math.random() * (maxGapY - minGapY) + minGapY;
  }

  /**
   * Update obstacle position - move from right to left
   * @param deltaTime - Time elapsed since last update in milliseconds
   */
  public update(deltaTime: number): void {
    // Convert deltaTime from milliseconds to seconds for consistent movement
    const dt = deltaTime / 1000;
    
    // Move obstacle leftward at constant speed
    this.x -= GAME_CONFIG.OBSTACLE_SPEED * dt * 60; // Scale by 60 for 60fps consistency
    
    // Update animation time for subtle effects
    this.animationTime += deltaTime;
  }

  /**
   * Render the obstacle (top and bottom pipes) on the canvas with smooth animations
   * @param context - Canvas 2D rendering context
   */
  public render(context: CanvasRenderingContext2D): void {
    const topPipeHeight = this.gapY - this.gapHeight / 2;
    const bottomPipeY = this.gapY + this.gapHeight / 2;
    const bottomPipeHeight = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - bottomPipeY;

    // Calculate subtle wobble effect
    const wobbleOffset = Math.sin(this.animationTime * ANIMATION_CONFIG.OBSTACLE_WOBBLE_FREQUENCY) * 
                        ANIMATION_CONFIG.OBSTACLE_WOBBLE_AMPLITUDE;

    context.save();

    // Apply wobble transformation
    context.translate(wobbleOffset, 0);

    // Draw top pipe with gradient
    const topGradient = context.createLinearGradient(this.x, 0, this.x + this.width, 0);
    topGradient.addColorStop(0, '#2F4F2F'); // Dark green
    topGradient.addColorStop(0.3, '#228B22'); // Forest green
    topGradient.addColorStop(0.7, '#32CD32'); // Lime green
    topGradient.addColorStop(1, '#90EE90'); // Light green
    
    context.fillStyle = topGradient;
    context.fillRect(this.x, 0, this.width, topPipeHeight);

    // Draw top pipe cap with enhanced 3D effect
    const topCapGradient = context.createLinearGradient(this.x - 5, 0, this.x + this.width + 5, 0);
    topCapGradient.addColorStop(0, '#32CD32');
    topCapGradient.addColorStop(0.5, '#7CFC00'); // Lawn green
    topCapGradient.addColorStop(1, '#90EE90');
    
    context.fillStyle = topCapGradient;
    context.fillRect(this.x - 5, topPipeHeight - 25, this.width + 10, 25);

    // Draw bottom pipe with gradient
    const bottomGradient = context.createLinearGradient(this.x, 0, this.x + this.width, 0);
    bottomGradient.addColorStop(0, '#2F4F2F'); // Dark green
    bottomGradient.addColorStop(0.3, '#228B22'); // Forest green
    bottomGradient.addColorStop(0.7, '#32CD32'); // Lime green
    bottomGradient.addColorStop(1, '#90EE90'); // Light green
    
    context.fillStyle = bottomGradient;
    context.fillRect(this.x, bottomPipeY, this.width, bottomPipeHeight);

    // Draw bottom pipe cap with enhanced 3D effect
    const bottomCapGradient = context.createLinearGradient(this.x - 5, 0, this.x + this.width + 5, 0);
    bottomCapGradient.addColorStop(0, '#32CD32');
    bottomCapGradient.addColorStop(0.5, '#7CFC00'); // Lawn green
    bottomCapGradient.addColorStop(1, '#90EE90');
    
    context.fillStyle = bottomCapGradient;
    context.fillRect(this.x - 5, bottomPipeY, this.width + 10, 25);

    // Add animated highlights
    const highlightIntensity = 0.5 + 0.3 * Math.sin(this.animationTime * 0.003);
    context.fillStyle = `rgba(144, 238, 144, ${highlightIntensity})`;
    context.fillRect(this.x + 2, 0, 4, topPipeHeight);
    context.fillRect(this.x + 2, bottomPipeY, 4, bottomPipeHeight);

    // Add subtle shadow effects
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    context.fillRect(this.x + this.width - 3, 0, 3, topPipeHeight);
    context.fillRect(this.x + this.width - 3, bottomPipeY, 3, bottomPipeHeight);

    context.restore();
  }

  /**
   * Get collision bounds for both top and bottom pipes
   * @returns Array of Bounds objects for collision detection
   */
  public getBounds(): Bounds[] {
    const topPipeHeight = this.gapY - this.gapHeight / 2;
    const bottomPipeY = this.gapY + this.gapHeight / 2;
    const bottomPipeHeight = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - bottomPipeY;

    return [
      // Top pipe bounds
      {
        x: this.x + COLLISION.OBSTACLE_COLLISION_PADDING,
        y: 0,
        width: this.width - (COLLISION.OBSTACLE_COLLISION_PADDING * 2),
        height: topPipeHeight
      },
      // Bottom pipe bounds
      {
        x: this.x + COLLISION.OBSTACLE_COLLISION_PADDING,
        y: bottomPipeY,
        width: this.width - (COLLISION.OBSTACLE_COLLISION_PADDING * 2),
        height: bottomPipeHeight
      }
    ];
  }

  /**
   * Check if obstacle is completely off-screen (left side)
   * @returns True if obstacle should be removed
   */
  public isOffScreen(): boolean {
    return this.x + this.width <= 0;
  }

  /**
   * Check if bird has passed through this obstacle (for scoring)
   * @param birdX - Current x position of the bird
   * @returns True if bird has passed and this is the first time checking
   */
  public checkPassed(birdX: number): boolean {
    if (!this.passed && birdX > this.x + this.width) {
      this.passed = true;
      return true;
    }
    return false;
  }

  /**
   * Get the center x position of the obstacle
   * @returns Center x coordinate
   */
  public getCenterX(): number {
    return this.x + this.width / 2;
  }

  /**
   * Get the gap boundaries for debugging or advanced collision detection
   * @returns Object with gap top and bottom y coordinates
   */
  public getGapBounds(): { top: number; bottom: number } {
    return {
      top: this.gapY - this.gapHeight / 2,
      bottom: this.gapY + this.gapHeight / 2
    };
  }

  /**
   * Check if a bird collides with this obstacle
   * @param birdBounds - Bird's collision bounds
   * @returns True if collision detected
   */
  public checkBirdCollision(birdBounds: Bounds): boolean {
    return CollisionDetector.checkBirdObstacleCollision(birdBounds, this.getBounds());
  }
}