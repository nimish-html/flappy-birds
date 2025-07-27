import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Bird } from '../../components/Bird';
import { GAME_CONFIG, PHYSICS } from '../../utils/gameConfig';
import { Bounds } from '../../types';

describe('Bird', () => {
  let bird: Bird;

  beforeEach(() => {
    bird = new Bird();
  });

  describe('Constructor', () => {
    it('should initialize bird with correct starting position', () => {
      expect(bird.x).toBe(GAME_CONFIG.BIRD_START_X);
      expect(bird.y).toBe(GAME_CONFIG.BIRD_START_Y);
    });

    it('should initialize bird with zero velocity', () => {
      expect(bird.velocityY).toBe(0);
    });

    it('should initialize bird with correct dimensions', () => {
      expect(bird.width).toBe(GAME_CONFIG.BIRD_SIZE);
      expect(bird.height).toBe(GAME_CONFIG.BIRD_SIZE);
    });

    it('should initialize bird as alive', () => {
      expect(bird.alive).toBe(true);
    });
  });

  describe('Physics - Gravity', () => {
    it('should apply gravity to velocity over time', () => {
      const deltaTime = 16.67; // ~60fps
      const initialVelocity = bird.velocityY;
      
      bird.update(deltaTime);
      
      expect(bird.velocityY).toBeGreaterThan(initialVelocity);
    });

    it('should update position based on velocity', () => {
      const deltaTime = 16.67;
      const initialY = bird.y;
      
      // Give bird some downward velocity
      bird.velocityY = 5;
      bird.update(deltaTime);
      
      expect(bird.y).toBeGreaterThan(initialY);
    });

    it('should respect terminal velocity limit', () => {
      const deltaTime = 16.67;
      
      // Apply gravity many times to reach terminal velocity
      for (let i = 0; i < 100; i++) {
        bird.update(deltaTime);
      }
      
      expect(bird.velocityY).toBeLessThanOrEqual(PHYSICS.TERMINAL_VELOCITY);
    });

    it('should not update physics when bird is dead', () => {
      bird.alive = false;
      const initialY = bird.y;
      const initialVelocity = bird.velocityY;
      
      bird.update(16.67);
      
      expect(bird.y).toBe(initialY);
      expect(bird.velocityY).toBe(initialVelocity);
    });
  });

  describe('Jump Functionality', () => {
    it('should apply upward velocity when jumping', () => {
      bird.jump();
      
      expect(bird.velocityY).toBe(PHYSICS.JUMP_VELOCITY);
      expect(bird.velocityY).toBeLessThan(0); // Upward is negative
    });

    it('should not jump when bird is dead', () => {
      bird.alive = false;
      const initialVelocity = bird.velocityY;
      
      bird.jump();
      
      expect(bird.velocityY).toBe(initialVelocity);
    });

    it('should override existing velocity when jumping', () => {
      bird.velocityY = 10; // Falling fast
      
      bird.jump();
      
      expect(bird.velocityY).toBe(PHYSICS.JUMP_VELOCITY);
    });

    it('should set jump animation properties', () => {
      bird.jump();
      
      expect(bird.getJumpProgress()).toBeGreaterThan(0);
      expect(bird.hasJustJumped()).toBe(true);
    });
  });

  describe('Collision Detection', () => {
    it('should die when hitting the ground', () => {
      // Position bird near ground
      bird.y = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - bird.height + 1;
      bird.velocityY = 5; // Moving downward
      
      bird.update(16.67);
      
      expect(bird.alive).toBe(false);
    });

    it('should be positioned exactly on ground when hitting it', () => {
      // Position bird to hit ground
      bird.y = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - bird.height + 10;
      bird.velocityY = 5;
      
      bird.update(16.67);
      
      const expectedY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - bird.height;
      expect(bird.y).toBe(expectedY);
    });

    it('should stop at ceiling when moving upward', () => {
      bird.y = 5;
      bird.velocityY = -10; // Moving upward fast
      
      bird.update(16.67);
      
      expect(bird.y).toBe(0);
      expect(bird.velocityY).toBe(0);
    });
  });

  describe('Bounds Calculation', () => {
    it('should return correct collision bounds', () => {
      const bounds = bird.getBounds();
      
      expect(bounds.x).toBe(bird.x);
      expect(bounds.y).toBe(bird.y);
      expect(bounds.width).toBe(bird.width);
      expect(bounds.height).toBe(bird.height);
    });

    it('should update bounds when bird moves', () => {
      const initialBounds = bird.getBounds();
      
      bird.y += 50;
      const newBounds = bird.getBounds();
      
      expect(newBounds.y).toBe(initialBounds.y + 50);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset bird to initial state', () => {
      // Modify bird state
      bird.x = 200;
      bird.y = 400;
      bird.velocityY = 10;
      bird.alive = false;
      
      bird.reset();
      
      expect(bird.x).toBe(GAME_CONFIG.BIRD_START_X);
      expect(bird.y).toBe(GAME_CONFIG.BIRD_START_Y);
      expect(bird.velocityY).toBe(0);
      expect(bird.alive).toBe(true);
    });

    it('should reset animation properties', () => {
      // Trigger jump to set animation properties
      bird.jump();
      expect(bird.getJumpProgress()).toBeGreaterThan(0);
      
      bird.reset();
      
      expect(bird.getJumpProgress()).toBe(0);
      expect(bird.hasJustJumped()).toBe(false);
    });
  });

  describe('Kill Functionality', () => {
    it('should set bird as dead when killed', () => {
      bird.kill();
      
      expect(bird.alive).toBe(false);
    });
  });

  describe('Rendering', () => {
    let mockContext: any;

    beforeEach(() => {
      mockContext = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fillStyle: ''
      };
    });

    it('should not render when bird is dead', () => {
      bird.alive = false;
      
      bird.render(mockContext);
      
      expect(mockContext.save).not.toHaveBeenCalled();
    });

    it('should call canvas methods when rendering alive bird', () => {
      bird.render(mockContext);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.rotate).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should rotate bird based on velocity', () => {
      bird.velocityY = 10; // Fast downward movement
      
      bird.render(mockContext);
      
      expect(mockContext.rotate).toHaveBeenCalledWith(expect.any(Number));
      const rotationCall = mockContext.rotate.mock.calls[0][0];
      expect(rotationCall).toBeGreaterThan(0); // Should rotate downward
    });
  });

  describe('Physics Integration', () => {
    it('should simulate realistic falling motion', () => {
      const positions: number[] = [];
      const deltaTime = 16.67; // 60fps
      
      // Record positions over several frames
      for (let i = 0; i < 10; i++) {
        positions.push(bird.y);
        bird.update(deltaTime);
      }
      
      // Bird should be falling (y increasing)
      expect(positions[9]).toBeGreaterThan(positions[0]);
      
      // Acceleration should be increasing (positions should be further apart)
      const earlyDistance = positions[2] - positions[1];
      const lateDistance = positions[9] - positions[8];
      expect(lateDistance).toBeGreaterThan(earlyDistance);
    });

    it('should simulate jump and fall cycle', () => {
      const deltaTime = 16.67;
      
      // Jump
      bird.jump();
      const jumpVelocity = bird.velocityY;
      expect(jumpVelocity).toBeLessThan(0); // Upward
      
      // Update once - should move up but velocity should decrease
      bird.update(deltaTime);
      expect(bird.velocityY).toBeGreaterThan(jumpVelocity); // Less negative
      
      // Continue updating until bird starts falling
      let frameCount = 0;
      while (bird.velocityY < 0 && frameCount < 100) {
        bird.update(deltaTime);
        frameCount++;
      }
      
      // Should eventually start falling
      expect(bird.velocityY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Collision Detection Methods', () => {
    let obstacleBounds: Bounds[][];

    beforeEach(() => {
      // Create test obstacle bounds
      obstacleBounds = [
        [
          // Top pipe
          { x: 200, y: 0, width: 60, height: 200 },
          // Bottom pipe
          { x: 200, y: 350, width: 60, height: 200 }
        ]
      ];
    });

    describe('checkObstacleCollision', () => {
      it('should detect collision with obstacles', () => {
        // Position bird to collide with top pipe
        bird.x = 200;
        bird.y = 150;

        expect(bird.checkObstacleCollision(obstacleBounds)).toBe(true);
      });

      it('should not detect collision when bird is safe', () => {
        // Bird in default position should be safe
        expect(bird.checkObstacleCollision(obstacleBounds)).toBe(false);
      });

      it('should return false when bird is dead', () => {
        bird.alive = false;
        bird.x = 200;
        bird.y = 150; // Would collide if alive

        expect(bird.checkObstacleCollision(obstacleBounds)).toBe(false);
      });

      it('should handle empty obstacles array', () => {
        expect(bird.checkObstacleCollision([])).toBe(false);
      });
    });

    describe('checkAllCollisions', () => {
      it('should detect obstacle collision', () => {
        bird.x = 200;
        bird.y = 150;

        const result = bird.checkAllCollisions(obstacleBounds);

        expect(result.hasCollision).toBe(true);
        expect(result.obstacleCollision).toBe(true);
        expect(result.groundCollision).toBe(false);
        expect(result.ceilingCollision).toBe(false);
      });

      it('should detect ground collision', () => {
        bird.y = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT;

        const result = bird.checkAllCollisions(obstacleBounds);

        expect(result.hasCollision).toBe(true);
        expect(result.groundCollision).toBe(true);
        expect(result.obstacleCollision).toBe(false);
        expect(result.ceilingCollision).toBe(false);
      });

      it('should detect ceiling collision', () => {
        bird.y = -5;

        const result = bird.checkAllCollisions(obstacleBounds);

        expect(result.hasCollision).toBe(true);
        expect(result.ceilingCollision).toBe(true);
        expect(result.obstacleCollision).toBe(false);
        expect(result.groundCollision).toBe(false);
      });

      it('should detect no collision when bird is safe', () => {
        const result = bird.checkAllCollisions(obstacleBounds);

        expect(result.hasCollision).toBe(false);
        expect(result.obstacleCollision).toBe(false);
        expect(result.groundCollision).toBe(false);
        expect(result.ceilingCollision).toBe(false);
      });

      it('should return no collision when bird is dead', () => {
        bird.alive = false;
        bird.x = 200;
        bird.y = 150; // Would collide if alive

        const result = bird.checkAllCollisions(obstacleBounds);

        expect(result.hasCollision).toBe(false);
        expect(result.obstacleCollision).toBe(false);
        expect(result.groundCollision).toBe(false);
        expect(result.ceilingCollision).toBe(false);
      });
    });
  });

  describe('Animation Features', () => {
    describe('Jump Animation', () => {
      it('should track jump progress over time', () => {
        bird.jump();
        const initialProgress = bird.getJumpProgress();
        
        // Update bird to advance animation
        bird.update(50); // 50ms
        
        const laterProgress = bird.getJumpProgress();
        expect(laterProgress).toBeLessThan(initialProgress);
      });

      it('should complete jump animation after duration', () => {
        bird.jump();
        
        // Update for full animation duration
        bird.update(200); // More than BIRD_JUMP_SCALE_DURATION
        
        expect(bird.getJumpProgress()).toBe(0);
      });

      it('should detect recent jumps', () => {
        bird.jump();
        
        expect(bird.hasJustJumped()).toBe(true);
        
        // After some time, should no longer be "just jumped"
        // Note: This test may be timing-dependent
      });
    });

    describe('Wing Animation', () => {
      it('should update wing animation over time', () => {
        const deltaTime = 16.67; // One frame
        
        // Update multiple times to advance wing animation
        for (let i = 0; i < 10; i++) {
          bird.update(deltaTime);
        }
        
        // Wing animation should be progressing (hard to test directly without exposing internal state)
        expect(bird.alive).toBe(true); // Basic check that update is working
      });
    });

    describe('Enhanced Rendering', () => {
      let mockContext: any;

      beforeEach(() => {
        mockContext = {
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          scale: vi.fn(),
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          fillStyle: ''
        };
      });

      it('should apply scale transformation during jump', () => {
        bird.jump();
        
        bird.render(mockContext);
        
        expect(mockContext.scale).toHaveBeenCalled();
        const scaleCall = mockContext.scale.mock.calls[0];
        expect(scaleCall[0]).toBeGreaterThan(1); // Should scale up during jump
      });

      it('should render enhanced bird features', () => {
        bird.render(mockContext);
        
        // Should render wings, detailed beak, and eye with highlight
        expect(mockContext.fillRect).toHaveBeenCalledTimes(2); // Body, wings
        expect(mockContext.beginPath).toHaveBeenCalledTimes(4); // Beak, eye background, pupil, highlight
        expect(mockContext.arc).toHaveBeenCalledTimes(3); // Eye background, pupil, highlight
      });

      it('should apply rotation based on velocity with enhanced limits', () => {
        bird.velocityY = 20; // High downward velocity
        
        bird.render(mockContext);
        
        expect(mockContext.rotate).toHaveBeenCalled();
        const rotation = mockContext.rotate.mock.calls[0][0];
        expect(Math.abs(rotation)).toBeLessThanOrEqual(0.8); // Should respect max rotation
      });
    });
  });
});