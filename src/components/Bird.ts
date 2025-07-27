import { GAME_CONFIG, PHYSICS, ANIMATION_CONFIG } from '../utils/gameConfig';
import { Bounds } from '../types';
import { CollisionDetector } from '../utils/collision';

export class Bird {
  public x: number;
  public y: number;
  public velocityY: number;
  public width: number;
  public height: number;
  public alive: boolean;
  
  // Animation properties
  private wingPhase: number = 0;
  private jumpTime: number = 0;
  private lastJumpTime: number = 0;

  constructor() {
    this.x = GAME_CONFIG.BIRD_START_X;
    this.y = GAME_CONFIG.BIRD_START_Y;
    this.velocityY = 0;
    this.width = GAME_CONFIG.BIRD_SIZE;
    this.height = GAME_CONFIG.BIRD_SIZE;
    this.alive = true;
    this.wingPhase = 0;
    this.jumpTime = 0;
    this.lastJumpTime = 0;
  }

  /**
   * Update bird physics - apply gravity and update position
   * @param deltaTime - Time elapsed since last update in milliseconds
   */
  public update(deltaTime: number): void {
    if (!this.alive) return;

    // Convert deltaTime from milliseconds to seconds for physics calculations
    const dt = deltaTime / 1000;

    // Apply gravity to velocity
    this.velocityY += PHYSICS.GRAVITY * dt * 60; // Scale by 60 for 60fps consistency

    // Apply terminal velocity limit
    if (this.velocityY > PHYSICS.TERMINAL_VELOCITY) {
      this.velocityY = PHYSICS.TERMINAL_VELOCITY;
    }

    // Update position based on velocity
    this.y += this.velocityY * dt * 60; // Scale by 60 for 60fps consistency

    // Update animation properties
    this.updateAnimations(deltaTime);

    // Check ground collision using collision detector
    if (CollisionDetector.checkGroundCollision(this.getBounds())) {
      this.y = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - this.height;
      this.alive = false;
    }

    // Check ceiling collision using collision detector
    if (CollisionDetector.checkCeilingCollision(this.getBounds())) {
      this.y = 0;
      this.velocityY = 0;
    }
  }

  /**
   * Update animation properties
   * @param deltaTime - Time elapsed since last update
   */
  private updateAnimations(deltaTime: number): void {
    // Update wing flapping animation
    this.wingPhase += ANIMATION_CONFIG.BIRD_WING_FLAP_SPEED * (deltaTime / 1000);
    if (this.wingPhase > Math.PI * 2) {
      this.wingPhase -= Math.PI * 2;
    }

    // Update jump animation timer
    if (this.jumpTime > 0) {
      this.jumpTime -= deltaTime;
      if (this.jumpTime < 0) {
        this.jumpTime = 0;
      }
    }
  }

  /**
   * Make the bird jump by applying upward velocity
   */
  public jump(): void {
    if (!this.alive) return;
    
    this.velocityY = PHYSICS.JUMP_VELOCITY;
    this.jumpTime = ANIMATION_CONFIG.BIRD_JUMP_SCALE_DURATION;
    this.lastJumpTime = performance.now();
  }

  /**
   * Render the bird on the canvas with smooth animations
   * @param context - Canvas 2D rendering context
   */
  public render(context: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    context.save();

    // Calculate smooth rotation based on velocity
    const targetRotation = Math.min(Math.max(
      this.velocityY * ANIMATION_CONFIG.BIRD_ROTATION_FACTOR, 
      ANIMATION_CONFIG.BIRD_MIN_ROTATION
    ), ANIMATION_CONFIG.BIRD_MAX_ROTATION);

    // Calculate jump scale effect
    const jumpProgress = Math.max(0, this.jumpTime / ANIMATION_CONFIG.BIRD_JUMP_SCALE_DURATION);
    const jumpScale = 1 + (ANIMATION_CONFIG.BIRD_JUMP_SCALE_FACTOR - 1) * jumpProgress;

    // Wing flap offset for animation
    const wingOffset = Math.sin(this.wingPhase) * 2;
    
    // Move to bird center for transformations
    context.translate(this.x + this.width / 2, this.y + this.height / 2);
    context.rotate(targetRotation);
    context.scale(jumpScale, jumpScale);

    // Draw bird body with wing animation
    context.fillStyle = '#FFD700'; // Golden yellow color
    context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw wings with flapping animation
    context.fillStyle = '#FFA500'; // Orange color for wings
    const wingY = -this.height / 4 + wingOffset;
    context.fillRect(-this.width / 2 - 3, wingY, this.width + 6, 8);

    // Add a more detailed beak
    context.fillStyle = '#FF8C00'; // Dark orange for beak
    context.beginPath();
    context.moveTo(this.width / 2, -2);
    context.lineTo(this.width / 2 + 8, 0);
    context.lineTo(this.width / 2, 2);
    context.closePath();
    context.fill();

    // Add eye with blink animation
    const eyeSize = 3 + Math.sin(this.wingPhase * 0.5) * 0.5;
    context.fillStyle = '#FFFFFF'; // White eye background
    context.beginPath();
    context.arc(-5, -5, eyeSize, 0, 2 * Math.PI);
    context.fill();
    
    context.fillStyle = '#000000'; // Black pupil
    context.beginPath();
    context.arc(-5, -5, eyeSize * 0.6, 0, 2 * Math.PI);
    context.fill();

    // Add highlight to eye
    context.fillStyle = '#FFFFFF';
    context.beginPath();
    context.arc(-6, -6, 1, 0, 2 * Math.PI);
    context.fill();

    context.restore();
  }

  /**
   * Get collision bounds for the bird
   * @returns Bounds object with position and dimensions
   */
  public getBounds(): Bounds {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Reset bird to initial state
   */
  public reset(): void {
    this.x = GAME_CONFIG.BIRD_START_X;
    this.y = GAME_CONFIG.BIRD_START_Y;
    this.velocityY = 0;
    this.alive = true;
    this.wingPhase = 0;
    this.jumpTime = 0;
    this.lastJumpTime = 0;
  }

  /**
   * Get the current jump animation progress (0-1)
   */
  public getJumpProgress(): number {
    return Math.max(0, this.jumpTime / ANIMATION_CONFIG.BIRD_JUMP_SCALE_DURATION);
  }

  /**
   * Check if bird just jumped (for particle effects)
   */
  public hasJustJumped(): boolean {
    return performance.now() - this.lastJumpTime < 50; // 50ms window
  }

  /**
   * Kill the bird (used for collision handling)
   */
  public kill(): void {
    this.alive = false;
  }

  /**
   * Check if the bird collides with any obstacles
   * @param obstacles - Array of obstacle bounds arrays
   * @returns True if collision detected
   */
  public checkObstacleCollision(obstacles: Bounds[][]): boolean {
    if (!this.alive) return false;
    
    return CollisionDetector.checkAllCollisions(this.getBounds(), obstacles).obstacleCollision;
  }

  /**
   * Check all types of collisions for the bird
   * @param obstacles - Array of obstacle bounds arrays
   * @returns Collision result object
   */
  public checkAllCollisions(obstacles: Bounds[][]): {
    hasCollision: boolean;
    groundCollision: boolean;
    ceilingCollision: boolean;
    obstacleCollision: boolean;
  } {
    if (!this.alive) {
      return {
        hasCollision: false,
        groundCollision: false,
        ceilingCollision: false,
        obstacleCollision: false
      };
    }
    
    return CollisionDetector.checkAllCollisions(this.getBounds(), obstacles);
  }
}