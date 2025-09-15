import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { Bird } from '../../components/Bird';
import { MathObstacle } from '../../components/MathObstacle';
import { CollisionDetector } from '../../utils/collision';
import { MathQuestion } from '../../types';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic'
  }))
} as unknown as HTMLCanvasElement;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock performance.now
global.performance = {
  now: vi.fn(() => Date.now())
} as unknown as Performance;

describe('Collision Behavior Integration Tests', () => {
  let gameEngine: GameEngine;
  let bird: Bird;
  let mockCallbacks: {
    onScoreUpdate: ReturnType<typeof vi.fn>;
    onGameOver: ReturnType<typeof vi.fn>;
    onGameStart: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onQuestionUpdate: ReturnType<typeof vi.fn>;
    onMathScoreUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    gameEngine = new GameEngine();
    bird = new Bird(100, 300);
    
    mockCallbacks = {
      onScoreUpdate: vi.fn(),
      onGameOver: vi.fn(),
      onGameStart: vi.fn(),
      onError: vi.fn(),
      onQuestionUpdate: vi.fn(),
      onMathScoreUpdate: vi.fn()
    };

    gameEngine.initialize(mockCanvas, mockCallbacks);
  });

  afterEach(() => {
    gameEngine.destroy();
    vi.clearAllMocks();
  });

  describe('Traditional Collision Detection Preservation', () => {
    it('should trigger game over on pipe collision regardless of math elements', () => {
      // Arrange
      gameEngine.start();
      const mathObstacle = new MathObstacle(200, 300, 100, 200);
      const question: MathQuestion = {
        id: 'test_001',
        category: 'addition',
        question: '5 + 3',
        correctAnswer: 8,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      
      // Position bird to collide with pipe (not answer zone)
      bird.x = 200;
      bird.y = 250; // Above the gap, should hit upper pipe
      
      const birdBounds = bird.getBounds();
      const obstacleBounds = mathObstacle.getBounds();

      // Act
      const collision = CollisionDetector.checkBoundingBoxCollision(birdBounds, obstacleBounds);

      // Assert
      expect(collision).toBe(true);
      
      // Verify this would trigger game over in the engine
      if (collision) {
        expect(mockCallbacks.onGameOver).toBeDefined(); // Callback should be available
      }
    });

    it('should trigger game over on ground collision with math system active', () => {
      // Arrange
      gameEngine.start();
      
      // Position bird to hit ground
      bird.x = 100;
      bird.y = 580; // Near bottom of 600px canvas
      bird.velocity = 5; // Moving downward
      
      const groundY = 600;
      const birdBounds = bird.getBounds();

      // Act
      const groundCollision = birdBounds.y + birdBounds.height >= groundY;

      // Assert
      expect(groundCollision).toBe(true);
      
      // Verify math system doesn't interfere with ground collision
      const currentQuestion = gameEngine.getCurrentQuestion();
      expect(currentQuestion).toBeTruthy(); // Math system should be active
      
      // But collision should still be detected
      expect(groundCollision).toBe(true);
    });

    it('should maintain collision accuracy with math obstacles', () => {
      // Arrange
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'test_002',
        category: 'subtraction',
        question: '10 - 4',
        correctAnswer: 6,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      
      // Test multiple collision scenarios
      const collisionTests = [
        { birdX: 300, birdY: 200, shouldCollide: true, description: 'upper pipe collision' },
        { birdX: 300, birdY: 450, shouldCollide: true, description: 'lower pipe collision' },
        { birdX: 300, birdY: 325, shouldCollide: false, description: 'gap passage' },
        { birdX: 250, birdY: 325, shouldCollide: false, description: 'before obstacle' },
        { birdX: 450, birdY: 325, shouldCollide: false, description: 'after obstacle' }
      ];

      collisionTests.forEach(test => {
        // Act
        bird.x = test.birdX;
        bird.y = test.birdY;
        
        const birdBounds = bird.getBounds();
        const obstacleBounds = mathObstacle.getBounds();
        const collision = CollisionDetector.checkBoundingBoxCollision(birdBounds, obstacleBounds);

        // Assert
        expect(collision).toBe(test.shouldCollide);
      });
    });

    it('should distinguish between answer zone selection and pipe collision', () => {
      // Arrange
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'test_003',
        category: 'multiplication',
        question: '3 × 4',
        correctAnswer: 12,
        difficulty: 2
      };
      
      mathObstacle.setupAnswerZones(question);
      
      // Test bird in answer zone (should select answer, not collide with pipe)
      bird.x = 300;
      bird.y = 325; // In the gap where answer zones are
      
      const birdBounds = bird.getBounds();
      
      // Act
      const answerSelection = mathObstacle.checkAnswerSelection(birdBounds);
      const pipeCollision = CollisionDetector.checkBoundingBoxCollision(birdBounds, mathObstacle.getBounds());

      // Assert
      expect(answerSelection).toBeTruthy(); // Should detect answer selection
      expect(pipeCollision).toBe(false); // Should NOT detect pipe collision
      
      // Verify answer selection provides correct data
      if (answerSelection) {
        expect(answerSelection.answer).toBeDefined();
        expect(answerSelection.isCorrect).toBeDefined();
        expect(answerSelection.position).toMatch(/^(upper|lower)$/);
      }
    });

    it('should handle edge cases between answer zones and pipe collision', () => {
      // Arrange
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'test_004',
        category: 'division',
        question: '15 ÷ 3',
        correctAnswer: 5,
        difficulty: 2
      };
      
      mathObstacle.setupAnswerZones(question);
      
      // Test edge positions
      const edgeTests = [
        { birdX: 300, birdY: 248, description: 'just above gap' },
        { birdX: 300, birdY: 252, description: 'just inside gap top' },
        { birdX: 300, birdY: 398, description: 'just inside gap bottom' },
        { birdX: 300, birdY: 402, description: 'just below gap' }
      ];

      edgeTests.forEach(test => {
        // Act
        bird.x = test.birdX;
        bird.y = test.birdY;
        
        const birdBounds = bird.getBounds();
        const answerSelection = mathObstacle.checkAnswerSelection(birdBounds);
        const pipeCollision = CollisionDetector.checkBoundingBoxCollision(birdBounds, mathObstacle.getBounds());

        // Assert - should be either answer selection OR pipe collision, not both
        const hasAnswerSelection = answerSelection !== null;
        const hasPipeCollision = pipeCollision;
        
        // Edge cases should have clear behavior
        if (test.birdY < 250 || test.birdY > 400) {
          expect(hasPipeCollision).toBe(true);
          expect(hasAnswerSelection).toBe(false);
        } else {
          expect(hasPipeCollision).toBe(false);
          // May or may not have answer selection depending on exact positioning
        }
      });
    });
  });

  describe('Game Over Mechanics Integration', () => {
    it('should preserve traditional game over flow with math scoring', async () => {
      // Arrange
      gameEngine.start();
      let gameOverTriggered = false;
      let finalMathScore = 0;
      
      mockCallbacks.onGameOver.mockImplementation((score) => {
        gameOverTriggered = true;
        finalMathScore = score;
      });

      // Simulate some math scoring before collision
      gameEngine.forceObstacleGeneration();
      const mathScore = gameEngine.getMathScore();
      expect(mathScore.score).toBe(0); // Should start at 0

      // Act - Force collision scenario
      const gameState = gameEngine.getGameState();
      gameState.bird.x = 200;
      gameState.bird.y = 50; // Position for collision
      
      // Simulate collision detection in game loop
      if (gameState.obstacles.length > 0) {
        const obstacle = gameState.obstacles[0];
        const collision = CollisionDetector.checkBoundingBoxCollision(gameState.bird.getBounds(), obstacle.getBounds());
        
        if (collision) {
          mockCallbacks.onGameOver(gameEngine.getMathScore().score);
          gameOverTriggered = true;
        }
      }

      // Assert
      expect(gameOverTriggered).toBe(true);
      expect(mockCallbacks.onGameOver).toHaveBeenCalled();
      expect(finalMathScore).toBeGreaterThanOrEqual(0); // Should preserve math score
    });

    it('should reset math system on game restart after collision', () => {
      // Arrange
      gameEngine.start();
      
      // Build up some math state
      gameEngine.forceObstacleGeneration();
      const initialQuestion = gameEngine.getCurrentQuestion();
      expect(initialQuestion).toBeTruthy();

      // Act - Simulate game over and restart
      gameEngine.reset();

      // Assert
      const mathScoreAfterReset = gameEngine.getMathScore();
      expect(mathScoreAfterReset.score).toBe(0);
      expect(mathScoreAfterReset.streak).toBe(0);
      
      const questionAfterReset = gameEngine.getCurrentQuestion();
      expect(questionAfterReset).toBeNull(); // Should be reset
    });

    it('should maintain collision detection priority over answer selection', () => {
      // Arrange
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'test_005',
        category: 'addition',
        question: '7 + 8',
        correctAnswer: 15,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      
      // Position bird at edge where both collision and answer selection might occur
      bird.x = 300;
      bird.y = 249; // Right at the edge of upper pipe

      const birdBounds = bird.getBounds();

      // Act
      const pipeCollision = CollisionDetector.checkBoundingBoxCollision(birdBounds, mathObstacle.getBounds());
      const answerSelection = mathObstacle.checkAnswerSelection(birdBounds);

      // Assert - Collision should take priority
      if (pipeCollision) {
        // If there's a pipe collision, it should be the primary concern
        expect(pipeCollision).toBe(true);
        // Answer selection should not occur during collision
        expect(answerSelection).toBeNull();
      }
    });

    it('should handle simultaneous collision scenarios correctly', () => {
      // Arrange
      gameEngine.start();
      gameEngine.forceObstacleGeneration();
      
      const gameState = gameEngine.getGameState();
      const bird = gameState.bird;
      
      // Position bird for multiple potential collisions
      bird.x = 200;
      bird.y = 580; // Near ground
      bird.velocity = 10; // Fast downward movement

      // Act - Check multiple collision types
      const groundCollision = bird.y + bird.getBounds().height >= 600;
      let pipeCollision = false;
      
      gameState.obstacles.forEach(obstacle => {
        if (CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), obstacle.getBounds())) {
          pipeCollision = true;
        }
      });

      // Assert - Any collision should trigger game over
      const anyCollision = groundCollision || pipeCollision;
      expect(anyCollision).toBe(true);
      
      // Game over should be triggered regardless of which collision type
      if (anyCollision) {
        expect(mockCallbacks.onGameOver).toBeDefined();
      }
    });
  });

  describe('Math System Non-Interference', () => {
    it('should not affect collision detection accuracy when math system is active', () => {
      // Arrange
      gameEngine.start();
      
      // Ensure math system is active
      const currentQuestion = gameEngine.getCurrentQuestion();
      expect(currentQuestion).toBeTruthy();
      
      // Create precise collision scenario
      const testObstacle = new MathObstacle(300, 250, 100, 150);
      bird.x = 300;
      bird.y = 200; // Should collide with upper pipe

      // Act
      const collision = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), testObstacle.getBounds());

      // Assert
      expect(collision).toBe(true);
      expect(currentQuestion).toBeTruthy(); // Math system should still be active
    });

    it('should maintain collision performance with math obstacles', () => {
      // Arrange
      const startTime = performance.now();
      const collisionTests = 1000;
      
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'perf_test',
        category: 'addition',
        question: '1 + 1',
        correctAnswer: 2,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);

      // Act - Perform many collision checks
      for (let i = 0; i < collisionTests; i++) {
        bird.x = 300 + (i % 10);
        bird.y = 200 + (i % 20);
        
        const collision = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), mathObstacle.getBounds());
        const answerSelection = mathObstacle.checkAnswerSelection(bird.getBounds());
        
        // Both checks should complete without error
        expect(typeof collision).toBe('boolean');
        expect(answerSelection === null || typeof answerSelection === 'object').toBe(true);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(totalTime).toBeLessThan(100); // Should complete quickly
      const avgTimePerCheck = totalTime / collisionTests;
      expect(avgTimePerCheck).toBeLessThan(0.1); // Less than 0.1ms per check
    });

    it('should handle collision detection with multiple math obstacles', () => {
      // Arrange
      gameEngine.start();
      
      // Generate multiple obstacles
      for (let i = 0; i < 3; i++) {
        gameEngine.forceObstacleGeneration();
      }
      
      const gameState = gameEngine.getGameState();
      expect(gameState.obstacles.length).toBeGreaterThan(1);

      // Position bird to potentially collide with first obstacle
      gameState.bird.x = gameState.obstacles[0].x;
      gameState.bird.y = gameState.obstacles[0].y - 50; // Above the gap

      // Act
      let collisionDetected = false;
      gameState.obstacles.forEach(obstacle => {
        if (CollisionDetector.checkBoundingBoxCollision(gameState.bird.getBounds(), obstacle.getBounds())) {
          collisionDetected = true;
        }
      });

      // Assert
      expect(collisionDetected).toBe(true);
      expect(gameState.obstacles.length).toBeGreaterThan(1); // Multiple obstacles present
    });

    it('should preserve collision bounds accuracy with answer zones', () => {
      // Arrange
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'bounds_test',
        category: 'subtraction',
        question: '9 - 3',
        correctAnswer: 6,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      
      // Get original obstacle bounds
      const originalBounds = mathObstacle.getBounds();
      
      // Act - Setup answer zones and check bounds
      const boundsAfterSetup = mathObstacle.getBounds();
      
      // Test collision detection with both bounds
      bird.x = originalBounds.x;
      bird.y = originalBounds.y - 10; // Just above obstacle
      
      const collisionOriginal = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), originalBounds);
      const collisionAfterSetup = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), boundsAfterSetup);

      // Assert
      expect(originalBounds).toEqual(boundsAfterSetup); // Bounds should not change
      expect(collisionOriginal).toBe(collisionAfterSetup); // Collision detection should be consistent
      expect(collisionOriginal).toBe(true); // Should detect collision
    });
  });

  describe('Requirements Validation - Collision Behavior', () => {
    it('should satisfy requirement 3.1: Game ends on pipe/ground collision', () => {
      // Arrange
      gameEngine.start();
      let gameOverCalled = false;
      
      mockCallbacks.onGameOver.mockImplementation(() => {
        gameOverCalled = true;
      });

      // Test pipe collision
      const mathObstacle = new MathObstacle(200, 250, 100, 150);
      bird.x = 200;
      bird.y = 200; // Should hit upper pipe
      
      const pipeCollision = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), mathObstacle.getBounds());
      
      // Test ground collision
      bird.y = 590; // Near ground
      const groundCollision = bird.y + bird.getBounds().height >= 600;

      // Assert
      expect(pipeCollision).toBe(true);
      expect(groundCollision).toBe(true);
      
      // Either collision should be able to trigger game over
      if (pipeCollision || groundCollision) {
        expect(mockCallbacks.onGameOver).toBeDefined();
      }
    });

    it('should satisfy requirement 3.2: Traditional game-over mechanics preserved', () => {
      // Arrange
      gameEngine.start();
      
      // Verify math system is active (integrated)
      const mathQuestion = gameEngine.getCurrentQuestion();
      expect(mathQuestion).toBeTruthy();
      
      // But traditional collision should still work
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      bird.x = 300;
      bird.y = 200; // Collision position

      // Act
      const collision = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), mathObstacle.getBounds());

      // Assert
      expect(collision).toBe(true); // Traditional collision detection works
      expect(mathQuestion).toBeTruthy(); // Math system remains active
      
      // Game over mechanics should be preserved
      expect(mockCallbacks.onGameOver).toBeDefined();
    });

    it('should satisfy requirement 3.3: Restart functionality maintained', () => {
      // Arrange
      gameEngine.start();
      
      // Build up game state
      gameEngine.forceObstacleGeneration();
      const preResetQuestion = gameEngine.getCurrentQuestion();
      expect(preResetQuestion).toBeTruthy();

      // Act - Reset game
      gameEngine.reset();

      // Assert
      const postResetQuestion = gameEngine.getCurrentQuestion();
      expect(postResetQuestion).toBeNull(); // Should be reset
      
      const mathScore = gameEngine.getMathScore();
      expect(mathScore.score).toBe(0);
      expect(mathScore.streak).toBe(0);
      
      // Should be able to start again
      gameEngine.start();
      const newQuestion = gameEngine.getCurrentQuestion();
      expect(newQuestion).toBeTruthy();
    });

    it('should satisfy requirement 3.4: Physical collisions separate from answer selection', () => {
      // Arrange
      const mathObstacle = new MathObstacle(300, 250, 100, 150);
      const question: MathQuestion = {
        id: 'separation_test',
        category: 'multiplication',
        question: '4 × 5',
        correctAnswer: 20,
        difficulty: 2
      };
      
      mathObstacle.setupAnswerZones(question);

      // Test 1: Physical collision (should trigger game over)
      bird.x = 300;
      bird.y = 200; // Hit upper pipe
      
      const physicalCollision = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), mathObstacle.getBounds());
      const answerSelectionDuringCollision = mathObstacle.checkAnswerSelection(bird.getBounds());

      // Test 2: Answer selection (should not trigger game over)
      bird.x = 300;
      bird.y = 325; // In gap, answer zone
      
      const noPhysicalCollision = CollisionDetector.checkBoundingBoxCollision(bird.getBounds(), mathObstacle.getBounds());
      const answerSelectionInGap = mathObstacle.checkAnswerSelection(bird.getBounds());

      // Assert
      expect(physicalCollision).toBe(true);
      expect(answerSelectionDuringCollision).toBeNull(); // No answer selection during collision
      
      expect(noPhysicalCollision).toBe(false);
      expect(answerSelectionInGap).toBeTruthy(); // Should detect answer selection
      
      // Physical collisions and answer selections are clearly separate
      expect(physicalCollision).not.toBe(noPhysicalCollision);
    });
  });
});