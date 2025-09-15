import { Bird } from './Bird';
import { Obstacle } from './Obstacle';
import { MathObstacle } from './MathObstacle';
import { ParticleSystem } from './ParticleSystem';
import { GAME_CONFIG, ANIMATION_CONFIG, RESPONSIVE_CONFIG } from '../utils/gameConfig';
import { PerformanceMonitor, PerformanceMetrics } from '../utils/performanceMonitor';
import { MathQuestionManager } from '../utils/MathQuestionManager';
import { QuestionSyncManager } from '../utils/QuestionSyncManager';
import { ScoringSystem } from '../utils/ScoringSystem';
import { AnswerHandler, AnswerFeedback } from '../utils/AnswerHandler';
import { Bounds, MathQuestion, AnswerZone } from '../types';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
  PAUSED = 'paused'
}

export interface GameOverData {
  score: number;
  mathScore: number;
  streak: number;
  highestStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number;
}

export interface GameEngineState {
  state: GameState;
  score: number;
  bird: Bird;
  obstacles: Obstacle[];
  lastTime: number;
  nextObstacleX: number;
  currentQuestion: MathQuestion | null;
  mathScore: number;
  streak: number;
  totalCorrect: number;
  totalIncorrect: number;
}

interface ObstaclePool {
  active: Obstacle[];
  inactive: Obstacle[];
}

interface MathObstaclePool {
  active: MathObstacle[];
  inactive: MathObstacle[];
}

interface ObstacleGenerationConfig {
  minSpacing: number;
  maxSpacing: number;
  minGapHeight: number;
  maxGapHeight: number;
  minGapY: number;
  maxGapY: number;
}

interface VisualEffects {
  collisionFlashTime: number;
  screenShakeIntensity: number;
  screenShakeTime: number;
}

export class GameEngine {
  private gameState: GameEngineState;
  private animationId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private onScoreUpdate?: (score: number) => void;
  private onGameOver?: (gameOverData: GameOverData) => void;
  private onGameStart?: () => void;
  private onError?: (error: Error) => void;
  private onQuestionUpdate?: (question: MathQuestion | null) => void;
  private onMathScoreUpdate?: (score: number, streak: number) => void;
  private onFeedbackUpdate?: (feedback: AnswerFeedback | null) => void;
  
  // Math system
  private mathQuestionManager: MathQuestionManager;
  private questionSyncManager: QuestionSyncManager;
  private scoringSystem: ScoringSystem;
  private answerHandler: AnswerHandler;
  private currentQuestion: MathQuestion | null = null;
  private pendingAnswerValidation: { obstacle: MathObstacle; zone: AnswerZone } | null = null;
  
  // Visual effects
  private particleSystem: ParticleSystem;
  private visualEffects: VisualEffects;
  
  // Obstacle generation system
  private obstaclePool: ObstaclePool;
  private mathObstaclePool: MathObstaclePool;
  private obstacleGenerationConfig: ObstacleGenerationConfig;
  private lastObstacleSpawnTime: number = 0;
  
  // Performance monitoring
  private performanceMonitor: PerformanceMonitor;
  private performanceOptimizations: {
    reducedParticles: boolean;
    disabledScreenShake: boolean;
    reducedVisualEffects: boolean;
  } = {
    reducedParticles: false,
    disabledScreenShake: false,
    reducedVisualEffects: false
  };
  
  // Error handling
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly maxErrorsPerMinute = 10;

  constructor(canvas?: HTMLCanvasElement) {
    this.gameState = this.createInitialState();
    this.particleSystem = new ParticleSystem();
    
    // Initialize with canvas if provided
    if (canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
    }
    this.visualEffects = {
      collisionFlashTime: 0,
      screenShakeIntensity: 0,
      screenShakeTime: 0
    };
    
    // Initialize math system
    this.mathQuestionManager = new MathQuestionManager();
    this.questionSyncManager = new QuestionSyncManager(this.mathQuestionManager, {
      onQuestionUpdate: (question) => this.handleQuestionUpdate(question)
    });
    this.scoringSystem = new ScoringSystem();
    this.answerHandler = new AnswerHandler(
      this.scoringSystem, 
      this.particleSystem,
      {
        onFeedbackUpdate: (feedback) => this.onFeedbackUpdate?.(feedback)
      }
    );
    
    // Initialize obstacle generation system
    this.obstaclePool = {
      active: [],
      inactive: []
    };
    
    this.mathObstaclePool = {
      active: [],
      inactive: []
    };
    
    this.obstacleGenerationConfig = {
      minSpacing: GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 0.8,
      maxSpacing: GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE * 1.2,
      minGapHeight: GAME_CONFIG.OBSTACLE_GAP * 0.9,
      maxGapHeight: GAME_CONFIG.OBSTACLE_GAP * 1.1,
      minGapY: GAME_CONFIG.OBSTACLE_GAP / 2 + GAME_CONFIG.OBSTACLE_MIN_HEIGHT,
      maxGapY: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.OBSTACLE_GAP / 2 - GAME_CONFIG.OBSTACLE_MIN_HEIGHT
    };
    
    this.lastObstacleSpawnTime = 0;
    
    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor(
      {
        targetFps: GAME_CONFIG.FRAME_RATE,
        lowPerformanceFps: 45,
        criticalPerformanceFps: 30,
        maxFrameTime: 1000 / GAME_CONFIG.FRAME_RATE
      },
      {
        onLowPerformance: this.handleLowPerformance.bind(this),
        onPerformanceRecovered: this.handlePerformanceRecovered.bind(this)
      }
    );
  }

  /**
   * Create the initial game state
   */
  private createInitialState(): GameEngineState {
    return {
      state: GameState.MENU,
      score: 0,
      bird: new Bird(),
      obstacles: [],
      lastTime: 0,
      nextObstacleX: GAME_CONFIG.CANVAS_WIDTH, // Start with first obstacle at screen edge
      currentQuestion: null,
      mathScore: 0,
      streak: 0,
      totalCorrect: 0,
      totalIncorrect: 0
    };
  }

  /**
   * Initialize the game engine with canvas and event callbacks
   */
  public initialize(
    canvas: HTMLCanvasElement,
    callbacks?: {
      onScoreUpdate?: (score: number) => void;
      onGameOver?: (gameOverData: GameOverData) => void;
      onGameStart?: () => void;
      onError?: (error: Error) => void;
      onQuestionUpdate?: (question: MathQuestion | null) => void;
      onMathScoreUpdate?: (score: number, streak: number) => void;
      onFeedbackUpdate?: (feedback: AnswerFeedback | null) => void;
      isMobile?: boolean;
      scale?: number;
    }
  ): void {
    try {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
      
      if (!this.context) {
        throw new Error('Failed to get 2D rendering context from canvas');
      }

      // Check for WebGL support as fallback indicator
      const webglSupported = this.checkWebGLSupport();
      if (!webglSupported) {
        console.warn('WebGL not supported, performance may be limited');
      }

      // Set up canvas size (use actual canvas dimensions for responsive support)
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Store callbacks and mobile settings
      this.onScoreUpdate = callbacks?.onScoreUpdate;
      this.onGameOver = callbacks?.onGameOver;
      this.onGameStart = callbacks?.onGameStart;
      this.onError = callbacks?.onError;
      this.onQuestionUpdate = callbacks?.onQuestionUpdate;
      this.onMathScoreUpdate = callbacks?.onMathScoreUpdate;
      this.onFeedbackUpdate = callbacks?.onFeedbackUpdate;
      
      // Apply mobile optimizations if needed
      const isMobile = callbacks?.isMobile ?? false;
      const scale = callbacks?.scale ?? 1;
      
      if (isMobile || scale < 0.7) {
        this.applyMobileOptimizations();
      }
      
      // Start performance monitoring
      this.performanceMonitor.start();
      
    } catch (error) {
      this.handleError(error as Error, 'Failed to initialize game engine');
      throw error;
    }
  }

  /**
   * Handle question updates from QuestionSyncManager
   */
  private handleQuestionUpdate(question: MathQuestion | null): void {
    this.currentQuestion = question;
    this.gameState.currentQuestion = question;
    this.onQuestionUpdate?.(question);
  }

  /**
   * Start the game and begin the game loop
   */
  public start(): void {
    try {
      if (this.gameState.state === GameState.PLAYING) {
        return; // Already playing
      }

      this.gameState.state = GameState.PLAYING;
      this.gameState.lastTime = performance.now();
      
      // Initialize question sync manager with first question
      // Requirement 1.5: First question displayed before first obstacle appears
      this.questionSyncManager.initialize();
      
      this.onGameStart?.();
      this.startGameLoop();
      
    } catch (error) {
      this.handleError(error as Error, 'Failed to start game');
    }
  }

  /**
   * Start the main game loop using requestAnimationFrame
   */
  private startGameLoop(): void {
    const gameLoop = (currentTime: number) => {
      try {
        if (this.gameState.state !== GameState.PLAYING) {
          return; // Stop the loop if not playing
        }

        const deltaTime = currentTime - this.gameState.lastTime;
        this.gameState.lastTime = currentTime;

        // Update performance metrics
        const performanceMetrics = this.performanceMonitor.update();

        // Update game state
        this.update(deltaTime);

        // Render the game
        this.render();

        // Continue the loop
        this.animationId = requestAnimationFrame(gameLoop);
        
      } catch (error) {
        this.handleError(error as Error, 'Error in game loop');
        
        // Try to recover by resetting the game state
        if (this.shouldAttemptRecovery()) {
          console.warn('Attempting to recover from game loop error');
          this.reset();
        } else {
          // Stop the game loop to prevent cascading errors
          this.handleGameOver();
        }
      }
    };

    this.animationId = requestAnimationFrame(gameLoop);
  }

  /**
   * Update game physics and state
   */
  private update(deltaTime: number): void {
    if (this.gameState.state !== GameState.PLAYING) {
      return;
    }

    // Update bird physics
    this.gameState.bird.update(deltaTime);

    // Update obstacles
    this.updateObstacles(deltaTime);

    // Update nextObstacleX to move with obstacles (this is the key fix!)
    if (deltaTime && !isNaN(deltaTime) && deltaTime > 0) {
      const dt = deltaTime / 1000;
      this.gameState.nextObstacleX -= GAME_CONFIG.OBSTACLE_SPEED * dt * 60;
    }

    // Generate new obstacles
    this.generateObstacles();

    // Update closest obstacle association as obstacles move
    // Requirement 1.4: Only closest obstacle is associated with current question
    this.updateClosestObstacleAssociation();

    // Check answer selection before collision detection
    this.checkAnswerSelection();

    // Check collisions
    this.checkCollisions();

    // Update score
    this.updateScore();

    // Clean up off-screen obstacles
    this.cleanupObstacles();

    // Update visual effects
    this.updateVisualEffects(deltaTime);

    // Update particle system
    this.particleSystem.update(deltaTime);

    // Update answer feedback timing
    this.answerHandler.updateFeedback(this.gameState.lastTime);

    // Create jump particles if bird just jumped
    if (this.gameState.bird.hasJustJumped()) {
      this.particleSystem.createJumpParticles(
        this.gameState.bird.x + this.gameState.bird.width / 2,
        this.gameState.bird.y + this.gameState.bird.height
      );
    }
  }

  /**
   * Update all obstacles
   */
  private updateObstacles(deltaTime: number): void {
    const beforePositions = this.gameState.obstacles.map(o => o.x);
    
    for (const obstacle of this.gameState.obstacles) {
      obstacle.update(deltaTime);
    }
    
    const afterPositions = this.gameState.obstacles.map(o => o.x);
    
    // Debug logging for obstacle movement
    if (this.gameState.obstacles.length > 0) {
      console.log('DEBUG - updateObstacles:', {
        obstacleCount: this.gameState.obstacles.length,
        beforePositions: beforePositions.slice(0, 3), // Show first 3
        afterPositions: afterPositions.slice(0, 3), // Show first 3
        movement: beforePositions.length > 0 && afterPositions.length > 0 ? 
          (beforePositions[0] || 0) - (afterPositions[0] || 0) : 0
      });
    }
  }

  /**
   * Generate new obstacles with proper spacing and random heights
   * Requirement 1.2: New obstacles are paired with current displayed question
   */
  private generateObstacles(): void {
    const currentTime = performance.now();
    
    // Debug logging
    console.log('DEBUG - generateObstacles:', {
      nextObstacleX: this.gameState.nextObstacleX?.toFixed?.(2) || this.gameState.nextObstacleX,
      canvasWidth: GAME_CONFIG.CANVAS_WIDTH,
      condition: this.gameState.nextObstacleX <= GAME_CONFIG.CANVAS_WIDTH,
      obstacleCount: this.gameState.obstacles.length,
      obstaclePositions: this.gameState.obstacles.map(o => o.x?.toFixed?.(2) || o.x),
      currentQuestionLocked: this.questionSyncManager.isCurrentQuestionLocked()
    });
    
    // Check if we need to spawn a new obstacle based on spacing
    if (this.gameState.nextObstacleX <= GAME_CONFIG.CANVAS_WIDTH) {
      // Ensure we have a locked question before creating obstacles
      if (!this.questionSyncManager.isCurrentQuestionLocked()) {
        console.warn('Cannot generate obstacle: no locked question available');
        return;
      }

      // Generate random spacing within configured range
      const spacing = this.generateRandomSpacing();
      
      // Generate random gap configuration
      const gapConfig = this.generateRandomGapConfiguration();
      
      // Create math obstacle with current locked question
      const mathObstacle = this.getMathObstacleFromPool(this.gameState.nextObstacleX, gapConfig.gapY);
      
      // Configure the obstacle with random gap height
      mathObstacle.gapHeight = gapConfig.gapHeight;
      mathObstacle.gapY = gapConfig.gapY;
      mathObstacle.passed = false;
      
      console.log('DEBUG - random gap config:', {
        gapHeight: gapConfig.gapHeight,
        gapY: gapConfig.gapY,
        minGapHeight: this.obstacleGenerationConfig.minGapHeight,
        maxGapHeight: this.obstacleGenerationConfig.maxGapHeight,
        minGapY: this.obstacleGenerationConfig.minGapY,
        maxGapY: this.obstacleGenerationConfig.maxGapY
      });
      
      // Add to active obstacles
      this.mathObstaclePool.active.push(mathObstacle);
      this.gameState.obstacles.push(mathObstacle);
      
      // Update closest obstacle association after adding to obstacles list
      // Requirement 1.4: Only closest obstacle is associated with current question
      this.updateClosestObstacleAssociation();
      
      // Update next obstacle position with random spacing
      const oldNextObstacleX = this.gameState.nextObstacleX;
      this.gameState.nextObstacleX += spacing;
      this.lastObstacleSpawnTime = currentTime;
      
      console.log('DEBUG - math obstacle generated:', {
        obstacleX: mathObstacle.x,
        spacing: spacing,
        oldNextObstacleX: oldNextObstacleX,
        newNextObstacleX: this.gameState.nextObstacleX,
        canvasWidth: GAME_CONFIG.CANVAS_WIDTH,
        question: this.currentQuestion?.question,
        obstacleId: (mathObstacle as any).id
      });
      

    }
  }
  
  /**
   * Generate random spacing between obstacles
   */
  private generateRandomSpacing(): number {
    const { minSpacing, maxSpacing } = this.obstacleGenerationConfig;
    return Math.random() * (maxSpacing - minSpacing) + minSpacing;
  }
  
  /**
   * Generate random gap configuration for obstacles
   */
  private generateRandomGapConfiguration(): { gapHeight: number; gapY: number } {
    const { minGapHeight, maxGapHeight, minGapY, maxGapY } = this.obstacleGenerationConfig;
    
    // Generate random gap height
    const gapHeight = Math.random() * (maxGapHeight - minGapHeight) + minGapHeight;
    
    // Generate random gap Y position, ensuring it fits within bounds
    const adjustedMinGapY = Math.max(minGapY, gapHeight / 2 + GAME_CONFIG.OBSTACLE_MIN_HEIGHT);
    const adjustedMaxGapY = Math.min(maxGapY, GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - gapHeight / 2 - GAME_CONFIG.OBSTACLE_MIN_HEIGHT);
    
    const gapY = Math.random() * (adjustedMaxGapY - adjustedMinGapY) + adjustedMinGapY;
    
    return { gapHeight, gapY };
  }
  
  /**
   * Get obstacle from pool or create new one (object pooling for performance)
   */
  private getObstacleFromPool(x: number, gapY?: number): Obstacle {
    // Try to reuse an inactive obstacle
    if (this.obstaclePool.inactive.length > 0) {
      const obstacle = this.obstaclePool.inactive.pop()!;
      obstacle.x = x;
      if (gapY !== undefined) {
        obstacle.gapY = gapY;
      }
      return obstacle;
    }
    
    // Create new obstacle if pool is empty
    return new Obstacle(x, gapY);
  }

  /**
   * Get math obstacle from pool or create new one with current question
   * Requirement 1.2: New obstacles are paired with current displayed question
   */
  private getMathObstacleFromPool(x: number, gapY?: number): MathObstacle {
    // Get current question from sync manager (already locked)
    const currentQuestion = this.questionSyncManager.getCurrentQuestion();
    
    if (!currentQuestion) {
      throw new Error('No current question available for obstacle creation');
    }

    // Create new math obstacle with current question
    const mathObstacle = new MathObstacle(x, currentQuestion, gapY);
    
    // Generate unique obstacle ID for association tracking
    const obstacleId = `obstacle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (mathObstacle as any).id = obstacleId;
    
    // Note: Association with closest obstacle will be handled after adding to obstacles list
    // This ensures proper distance calculation for closest obstacle determination

    return mathObstacle;
  }

  /**
   * Update the closest obstacle association with the current question
   * Requirement 1.4: Only closest obstacle is associated with current question
   */
  private updateClosestObstacleAssociation(): void {
    if (!this.questionSyncManager.isCurrentQuestionLocked()) {
      return;
    }

    // Find the closest obstacle to the bird
    let closestObstacle: MathObstacle | null = null;
    let closestDistance = Infinity;
    const birdX = this.gameState.bird.x;

    for (const obstacle of this.gameState.obstacles) {
      if (obstacle instanceof MathObstacle) {
        const obstacleId = (obstacle as any).id;
        if (obstacleId) {
          // Calculate distance from bird to obstacle
          const distance = Math.abs(obstacle.x - birdX);
          
          // Only consider obstacles that are ahead of the bird
          if (obstacle.x > birdX && distance < closestDistance) {
            closestDistance = distance;
            closestObstacle = obstacle;
          }
        }
      }
    }

    // Associate the closest obstacle with the current question
    if (closestObstacle) {
      const obstacleId = (closestObstacle as any).id;
      if (obstacleId) {
        this.questionSyncManager.associateWithClosestObstacle(obstacleId);
        console.log(`Updated closest obstacle association: ${obstacleId} at distance ${closestDistance.toFixed(2)}`);
      }
    }
  }

  /**
   * Check for answer selection when bird passes through answer zones
   * Requirement 2.4: Detect which answer was chosen
   * 
   * FIXED: Prevent multiple answer selections from the same obstacle
   */
  private checkAnswerSelection(): void {
    if (!this.gameState.bird.alive) {
      return;
    }

    const birdBounds = {
      x: this.gameState.bird.x,
      y: this.gameState.bird.y,
      width: this.gameState.bird.width,
      height: this.gameState.bird.height
    };

    // Check each math obstacle for answer selection
    for (const obstacle of this.gameState.obstacles) {
      if (obstacle instanceof MathObstacle) {
        const obstacleId = (obstacle as any).id;
        
        // CRITICAL FIX: Check if this obstacle has already been answered
        if ((obstacle as any).hasBeenAnswered) {
          continue; // Skip obstacles that have already been answered
        }
        
        const selectedZone = obstacle.checkAnswerSelection(birdBounds);
        
        if (selectedZone && !this.pendingAnswerValidation) {
          // Check if this obstacle is associated with the current question
          if (obstacleId && this.questionSyncManager.isObstacleAssociatedWithCurrentQuestion(obstacleId)) {
            // Mark this obstacle as answered to prevent multiple selections
            (obstacle as any).hasBeenAnswered = true;
            
            // Store the answer selection for validation
            this.pendingAnswerValidation = { obstacle, zone: selectedZone };
            
            // Process the answer immediately
            this.handleAnswerSelection(selectedZone.answer, selectedZone.isCorrect, obstacleId);
            
            break; // Only process one answer selection per frame
          }
        }
      }
    }
  }

  /**
   * Handle answer selection and update scoring
   * Requirements 4.1-4.6: Process correct/incorrect answers and update score/streak
   * Requirement 1.3: Question changes only after obstacle interaction
   */
  private handleAnswerSelection(answer: number, isCorrect: boolean, obstacleId?: string): void {
    const birdX = this.gameState.bird.x + this.gameState.bird.width / 2;
    const birdY = this.gameState.bird.y + this.gameState.bird.height / 2;

    let feedback: AnswerFeedback;

    if (isCorrect) {
      feedback = this.answerHandler.validateCorrectAnswer(birdX, birdY);
      console.log(`Correct answer! +${feedback.points} points`);
    } else {
      // Get correct answer from current question for enhanced feedback (Requirement 4.5)
      const correctAnswer = this.currentQuestion?.correctAnswer;
      feedback = this.answerHandler.handleIncorrectAnswer(birdX, birdY, correctAnswer);
      console.log(`Incorrect answer! ${feedback.points} points`);
    }

    // Update game state with math scoring from single source of truth (ScoringSystem)
    const scoreState = this.answerHandler.getScoreState();
    this.gameState.mathScore = scoreState.points;
    this.gameState.streak = scoreState.streak;
    this.gameState.totalCorrect = scoreState.totalCorrect;
    this.gameState.totalIncorrect = scoreState.totalIncorrect;

    // Handle obstacle interaction with QuestionSyncManager
    // Requirement 1.3: Question changes only after obstacle interaction
    if (obstacleId) {
      const questionChanged = this.questionSyncManager.handleObstacleInteraction(obstacleId);
      if (questionChanged) {
        // Update current question reference after change
        this.currentQuestion = this.questionSyncManager.getCurrentQuestion();
        this.gameState.currentQuestion = this.currentQuestion;
        
        console.log('Question changed after obstacle interaction:', {
          newQuestion: this.currentQuestion?.question,
          obstacleId: obstacleId
        });
      }
    }

    // Notify callbacks
    this.onMathScoreUpdate?.(scoreState.points, scoreState.streak);

    // Clear pending validation
    this.pendingAnswerValidation = null;
  }





  /**
   * Check for collisions and handle game over
   */
  private checkCollisions(): void {
    if (!this.gameState.bird.alive) {
      this.handleGameOver();
      return;
    }

    // Get all obstacle bounds for collision detection
    const obstacleBounds: Bounds[][] = this.gameState.obstacles.map(obstacle => 
      obstacle.getBounds()
    );

    // Check all collisions
    const collisionResult = this.gameState.bird.checkAllCollisions(obstacleBounds);

    if (collisionResult.hasCollision) {
      // Create collision visual effects
      this.createCollisionEffects();
      
      this.gameState.bird.kill();
      this.handleGameOver();
    }
  }

  /**
   * Create visual effects for collision
   */
  private createCollisionEffects(): void {
    // Create collision particles
    this.particleSystem.createCollisionParticles(
      this.gameState.bird.x + this.gameState.bird.width / 2,
      this.gameState.bird.y + this.gameState.bird.height / 2,
      '#FF4500' // Orange-red for collision
    );

    // Trigger screen flash
    this.visualEffects.collisionFlashTime = ANIMATION_CONFIG.COLLISION_FLASH_DURATION;
    
    // Trigger screen shake
    this.visualEffects.screenShakeIntensity = 5;
    this.visualEffects.screenShakeTime = 300;
  }

  /**
   * Update visual effects
   */
  private updateVisualEffects(deltaTime: number): void {
    // Update collision flash
    if (this.visualEffects.collisionFlashTime > 0) {
      this.visualEffects.collisionFlashTime -= deltaTime;
      if (this.visualEffects.collisionFlashTime < 0) {
        this.visualEffects.collisionFlashTime = 0;
      }
    }

    // Update screen shake
    if (this.visualEffects.screenShakeTime > 0) {
      this.visualEffects.screenShakeTime -= deltaTime;
      if (this.visualEffects.screenShakeTime <= 0) {
        this.visualEffects.screenShakeTime = 0;
        this.visualEffects.screenShakeIntensity = 0;
      } else {
        // Decay shake intensity over time
        const progress = this.visualEffects.screenShakeTime / 300;
        this.visualEffects.screenShakeIntensity = 5 * progress;
      }
    }
  }

  /**
   * Update the score when bird passes obstacles
   */
  private updateScore(): void {
    for (const obstacle of this.gameState.obstacles) {
      if (obstacle.checkPassed(this.gameState.bird.x)) {
        this.gameState.score += GAME_CONFIG.POINTS_PER_OBSTACLE;
        this.onScoreUpdate?.(this.gameState.score);
      }
    }
  }

  /**
   * Remove obstacles that are off-screen and return them to pool
   */
  private cleanupObstacles(): void {
    const onScreenObstacles: Obstacle[] = [];
    
    for (const obstacle of this.gameState.obstacles) {
      if (obstacle.isOffScreen()) {
        // Remove obstacle association from QuestionSyncManager
        const obstacleId = (obstacle as any).id;
        if (obstacleId) {
          this.questionSyncManager.removeObstacleAssociation(obstacleId);
        }
        
        // Return obstacle to appropriate pool for reuse
        if (obstacle instanceof MathObstacle) {
          this.returnMathObstacleToPool(obstacle);
        } else {
          this.returnObstacleToPool(obstacle);
        }
      } else {
        onScreenObstacles.push(obstacle);
      }
    }
    
    this.gameState.obstacles = onScreenObstacles;
    
    // Update active pools to match game state obstacles
    this.obstaclePool.active = this.gameState.obstacles.filter(o => !(o instanceof MathObstacle)) as Obstacle[];
    this.mathObstaclePool.active = this.gameState.obstacles.filter(o => o instanceof MathObstacle) as MathObstacle[];
  }
  
  /**
   * Return obstacle to inactive pool for reuse
   */
  private returnObstacleToPool(obstacle: Obstacle): void {
    // Reset obstacle state
    obstacle.passed = false;
    
    // Add to inactive pool if not already there and pool isn't too large
    if (!this.obstaclePool.inactive.includes(obstacle) && this.obstaclePool.inactive.length < 10) {
      this.obstaclePool.inactive.push(obstacle);
    }
    
    // Remove from active pool
    const activeIndex = this.obstaclePool.active.indexOf(obstacle);
    if (activeIndex !== -1) {
      this.obstaclePool.active.splice(activeIndex, 1);
    }
  }

  /**
   * Return math obstacle to inactive pool for reuse
   */
  private returnMathObstacleToPool(obstacle: MathObstacle): void {
    // Reset obstacle state
    obstacle.passed = false;
    
    // FIXED: Reset the answered flag when cleaning up obstacles
    (obstacle as any).hasBeenAnswered = false;
    
    // Note: Math obstacles contain questions, so we don't reuse them
    // as the question context changes. Just remove from active pool.
    const activeIndex = this.mathObstaclePool.active.indexOf(obstacle);
    if (activeIndex !== -1) {
      this.mathObstaclePool.active.splice(activeIndex, 1);
    }
  }

  /**
   * Handle game over state
   * Requirements 3.1, 3.2: Maintain traditional collision detection and display final stats
   */
  private handleGameOver(): void {
    this.gameState.state = GameState.GAME_OVER;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Calculate final game over data with math performance stats using single source of truth
    const scoreState = this.answerHandler.getScoreState();
    const totalAnswers = scoreState.totalCorrect + scoreState.totalIncorrect;
    const accuracy = totalAnswers > 0 ? (scoreState.totalCorrect / totalAnswers) * 100 : 0;

    const gameOverData: GameOverData = {
      score: this.gameState.score,
      mathScore: scoreState.points,
      streak: scoreState.streak,
      highestStreak: scoreState.highestStreak,
      totalCorrect: scoreState.totalCorrect,
      totalIncorrect: scoreState.totalIncorrect,
      accuracy: Math.round(accuracy * 10) / 10 // Round to 1 decimal place
    };

    this.onGameOver?.(gameOverData);
  }

  /**
   * Render the game with visual effects
   */
  public render(): void {
    if (!this.context) {
      return;
    }

    // Apply screen shake if active
    this.context.save();
    if (this.visualEffects.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.visualEffects.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.visualEffects.screenShakeIntensity;
      this.context.translate(shakeX, shakeY);
    }

    // Clear the canvas
    this.context.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Draw background
    this.drawBackground();

    // Draw obstacles
    for (const obstacle of this.gameState.obstacles) {
      obstacle.render(this.context);
    }

    // Draw bird
    this.gameState.bird.render(this.context);

    // Draw particles
    this.particleSystem.render(this.context);

    // Draw ground
    this.drawGround();

    this.context.restore();

    // Apply collision flash effect
    if (this.visualEffects.collisionFlashTime > 0) {
      const flashAlpha = this.visualEffects.collisionFlashTime / ANIMATION_CONFIG.COLLISION_FLASH_DURATION;
      this.context.save();
      this.context.globalAlpha = flashAlpha * 0.3;
      this.context.fillStyle = '#FF0000';
      this.context.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      this.context.restore();
    }
  }

  /**
   * Draw the background
   */
  private drawBackground(): void {
    if (!this.context) return;

    // Sky gradient
    const gradient = this.context.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(1, '#98FB98'); // Pale green

    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
  }

  /**
   * Draw the ground
   */
  private drawGround(): void {
    if (!this.context) return;

    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT;
    
    // Ground
    this.context.fillStyle = '#8B4513'; // Saddle brown
    this.context.fillRect(0, groundY, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.GROUND_HEIGHT);

    // Grass line
    this.context.fillStyle = '#228B22'; // Forest green
    this.context.fillRect(0, groundY, GAME_CONFIG.CANVAS_WIDTH, 5);
  }

  /**
   * Handle input (bird jump)
   */
  public handleInput(): void {
    if (this.gameState.state === GameState.PLAYING) {
      this.gameState.bird.jump();
    } else if (this.gameState.state === GameState.MENU || this.gameState.state === GameState.GAME_OVER) {
      this.start();
    }
  }

  /**
   * Reset the game to initial state
   * Requirements 3.3, 3.4: Add game restart functionality that resets math state appropriately
   */
  public reset(): void {
    // Cancel any running animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Reset game state (this will reset all math tracking)
    this.gameState = this.createInitialState();
    
    // Reset math system
    this.scoringSystem.reset();
    this.mathQuestionManager.resetPool();
    this.questionSyncManager.reset();
    this.answerHandler.reset();
    this.currentQuestion = null;
    this.pendingAnswerValidation = null;
    
    // Reset visual effects
    this.particleSystem.clear();
    this.visualEffects = {
      collisionFlashTime: 0,
      screenShakeIntensity: 0,
      screenShakeTime: 0
    };
    
    // Reset obstacle generation system
    this.resetObstacleGeneration();

    // Notify UI that question has been cleared
    this.onQuestionUpdate?.(null);
    this.onMathScoreUpdate?.(0, 0);
    this.onFeedbackUpdate?.(null);
  }
  
  /**
   * Reset obstacle generation system
   */
  private resetObstacleGeneration(): void {
    // Move all active obstacles to inactive pool
    for (const obstacle of this.obstaclePool.active) {
      this.returnObstacleToPool(obstacle);
    }
    
    // Clear math obstacles (don't reuse due to question context)
    for (const obstacle of this.mathObstaclePool.active) {
      this.returnMathObstacleToPool(obstacle);
    }
    
    // Clear active obstacles
    this.obstaclePool.active = [];
    this.mathObstaclePool.active = [];
    this.lastObstacleSpawnTime = 0;
    
    // Reset next obstacle position to start at screen edge
    this.gameState.nextObstacleX = GAME_CONFIG.CANVAS_WIDTH;
  }

  /**
   * Pause the game
   */
  public pause(): void {
    if (this.gameState.state === GameState.PLAYING) {
      this.gameState.state = GameState.PAUSED;
      
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }

  /**
   * Resume the game from pause
   */
  public resume(): void {
    if (this.gameState.state === GameState.PAUSED) {
      this.gameState.state = GameState.PLAYING;
      this.gameState.lastTime = performance.now();
      this.startGameLoop();
    }
  }

  /**
   * Get current game state
   */
  public getGameState(): GameEngineState {
    return { ...this.gameState };
  }

  /**
   * Get current score
   */
  public getScore(): number {
    return this.gameState.score;
  }

  /**
   * Get current math score and streak
   */
  public getMathScore(): { score: number; streak: number } {
    const scoreState = this.scoringSystem.getScoreState();
    return {
      score: scoreState.points,
      streak: scoreState.streak
    };
  }

  /**
   * Get complete math performance data
   * Requirements 3.4: Provide comprehensive math performance stats
   */
  public getMathPerformanceData(): {
    mathScore: number;
    streak: number;
    totalCorrect: number;
    totalIncorrect: number;
    accuracy: number;
    highestStreak: number;
  } {
    const scoreState = this.answerHandler.getScoreState();
    const totalAnswers = scoreState.totalCorrect + scoreState.totalIncorrect;
    const accuracy = totalAnswers > 0 ? (scoreState.totalCorrect / totalAnswers) * 100 : 0;

    return {
      mathScore: scoreState.points,
      streak: scoreState.streak,
      totalCorrect: scoreState.totalCorrect,
      totalIncorrect: scoreState.totalIncorrect,
      accuracy: Math.round(accuracy * 10) / 10,
      highestStreak: scoreState.highestStreak
    };
  }

  /**
   * Get current question
   */
  public getCurrentQuestion(): MathQuestion | null {
    return this.currentQuestion;
  }

  /**
   * Get current answer feedback
   */
  public getCurrentFeedback(): AnswerFeedback | null {
    return this.answerHandler.getActiveFeedback();
  }

  /**
   * Check if game is playing
   */
  public isPlaying(): boolean {
    return this.gameState.state === GameState.PLAYING;
  }

  /**
   * Check if game is over
   */
  public isGameOver(): boolean {
    return this.gameState.state === GameState.GAME_OVER;
  }

  /**
   * Get obstacle generation statistics for debugging/testing
   */
  public getObstacleStats(): {
    activeCount: number;
    inactiveCount: number;
    totalGenerated: number;
    lastSpawnTime: number;
  } {
    const totalActive = this.obstaclePool.active.length + this.mathObstaclePool.active.length;
    const totalInactive = this.obstaclePool.inactive.length + this.mathObstaclePool.inactive.length;
    
    return {
      activeCount: totalActive,
      inactiveCount: totalInactive,
      totalGenerated: totalActive + totalInactive,
      lastSpawnTime: this.lastObstacleSpawnTime
    };
  }

  /**
   * Get current obstacles for testing purposes
   */
  public getObstacles(): Obstacle[] {
    return [...this.gameState.obstacles];
  }

  /**
   * Set game difficulty for testing purposes
   */
  public setDifficulty(level: number): void {
    // For now, difficulty doesn't change obstacle spacing as per requirement 5.4
    // This method is provided for testing purposes but maintains consistent spacing
    console.log(`Difficulty set to level ${level} - spacing remains consistent for educational focus`);
  }
  
  /**
   * Force obstacle generation for testing purposes
   */
  public forceObstacleGeneration(): void {
    if (this.gameState.state === GameState.PLAYING) {
      // Set nextObstacleX to a value that will trigger generation
      this.gameState.nextObstacleX = Math.min(this.gameState.nextObstacleX, GAME_CONFIG.CANVAS_WIDTH);
      this.generateObstacles();
    }
  }
  
  /**
   * Get obstacle pool for testing purposes
   */
  public getObstaclePool(): ObstaclePool {
    return {
      active: [...this.obstaclePool.active],
      inactive: [...this.obstaclePool.inactive]
    };
  }

  /**
   * Destroy the game engine and clean up resources
   */
  public destroy(): void {
    // Cancel any running animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Stop performance monitoring
    this.performanceMonitor.stop();

    // Clear all systems
    this.particleSystem.clear();
    this.answerHandler.reset();
    
    // Clear callbacks to prevent memory leaks
    this.onScoreUpdate = undefined;
    this.onGameOver = undefined;
    this.onGameStart = undefined;
    this.onError = undefined;
    this.onQuestionUpdate = undefined;
    this.onMathScoreUpdate = undefined;
    this.onFeedbackUpdate = undefined;

    // Clear canvas reference
    this.canvas = null;
    this.context = null;
  }


  /**
   * Handle low performance by applying optimizations
   */
  private handleLowPerformance(metrics: PerformanceMetrics): void {
    console.warn('Low performance detected, applying optimizations:', metrics);
    
    // Reduce particle effects
    if (!this.performanceOptimizations.reducedParticles) {
      this.particleSystem.setMaxParticles(Math.max(2, RESPONSIVE_CONFIG.MOBILE_PARTICLE_COUNT / 2));
      this.performanceOptimizations.reducedParticles = true;
    }
    
    // Disable screen shake
    if (!this.performanceOptimizations.disabledScreenShake) {
      this.visualEffects.screenShakeIntensity = 0;
      this.visualEffects.screenShakeTime = 0;
      this.performanceOptimizations.disabledScreenShake = true;
    }
    
    // Reduce visual effects
    if (!this.performanceOptimizations.reducedVisualEffects && metrics.averageFps < 30) {
      this.visualEffects.collisionFlashTime = 0;
      this.performanceOptimizations.reducedVisualEffects = true;
    }
  }
  
  /**
   * Handle performance recovery by restoring effects
   */
  private handlePerformanceRecovered(metrics: PerformanceMetrics): void {
    console.log('Performance recovered, restoring effects:', metrics);
    
    // Restore particle effects gradually
    if (this.performanceOptimizations.reducedParticles && metrics.averageFps > 50) {
      this.particleSystem.setMaxParticles(ANIMATION_CONFIG.PARTICLE_COUNT);
      this.performanceOptimizations.reducedParticles = false;
    }
    
    // Re-enable screen shake
    if (this.performanceOptimizations.disabledScreenShake && metrics.averageFps > 45) {
      this.performanceOptimizations.disabledScreenShake = false;
    }
    
    // Restore visual effects
    if (this.performanceOptimizations.reducedVisualEffects && metrics.averageFps > 40) {
      this.performanceOptimizations.reducedVisualEffects = false;
    }
  }
  
  /**
   * Apply mobile-specific optimizations
   */
  private applyMobileOptimizations(): void {
    // Reduce particle count for mobile performance
    this.particleSystem.setMaxParticles(RESPONSIVE_CONFIG.MOBILE_PARTICLE_COUNT);
    
    // Pre-apply some optimizations for mobile
    this.performanceOptimizations.reducedParticles = true;
  }

  
  /**
   * Handle errors with rate limiting and recovery attempts
   */
  private handleError(error: Error, context: string): void {
    const currentTime = Date.now();
    
    // Rate limit error reporting
    if (currentTime - this.lastErrorTime < 60000) {
      this.errorCount++;
    } else {
      this.errorCount = 1;
      this.lastErrorTime = currentTime;
    }
    
    // Log error with context
    console.error(`Game Engine Error (${context}):`, error);
    
    // Report to callback if available
    this.onError?.(error);
    
    // If too many errors, stop trying to recover
    if (this.errorCount > this.maxErrorsPerMinute) {
      console.error('Too many errors detected, stopping game');
      this.handleGameOver();
    }
  }
  
  /**
   * Determine if we should attempt error recovery
   */
  private shouldAttemptRecovery(): boolean {
    return this.errorCount < 3 && this.gameState.state === GameState.PLAYING;
  }
  
  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getCurrentMetrics();
  }
  
  /**
   * Get performance optimization status
   */
  public getOptimizationStatus(): {
    reducedParticles: boolean;
    disabledScreenShake: boolean;
    reducedVisualEffects: boolean;
    recommendations: string[];
  } {
    const metrics = this.performanceMonitor.getCurrentMetrics();
    return {
      ...this.performanceOptimizations,
      recommendations: this.performanceMonitor.getOptimizationRecommendations(metrics)
    };
  }
  
  /**
   * Force performance optimization for testing
   */
  public forceOptimization(type: 'particles' | 'shake' | 'effects' | 'all'): void {
    switch (type) {
      case 'particles':
        this.handleLowPerformance({ averageFps: 40 } as PerformanceMetrics);
        break;
      case 'shake':
        this.performanceOptimizations.disabledScreenShake = true;
        break;
      case 'effects':
        this.performanceOptimizations.reducedVisualEffects = true;
        break;
      case 'all':
        this.handleLowPerformance({ averageFps: 25 } as PerformanceMetrics);
        break;
    }
  }

  /**
   * Check browser support for game features
   */
  public static checkBrowserSupport(): {
    supported: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for Canvas support
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) {
      issues.push('Canvas not supported');
    } else {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        issues.push('2D Canvas context not available');
      }
    }

    // Check for requestAnimationFrame
    if (!window.requestAnimationFrame) {
      issues.push('requestAnimationFrame not supported');
      recommendations.push('Update to a modern browser');
    }

    // Check for performance.now
    if (!window.performance || !window.performance.now) {
      issues.push('High-resolution timing not available');
      recommendations.push('Update browser for better performance');
    }

    return {
      supported: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Check WebGL support as fallback indicator
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }
}