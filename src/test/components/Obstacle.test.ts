import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Obstacle } from '../../components/Obstacle';
import { GAME_CONFIG, COLLISION } from '../../utils/gameConfig';
import { Bounds } from '../../types';

describe('Obstacle', () => {
  let obstacle: Obstacle;
  const initialX = 800;
  const customGapY = 300;

  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create obstacle with specified position and gap', () => {
      obstacle = new Obstacle(initialX, customGapY);

      expect(obstacle.x).toBe(initialX);
      expect(obstacle.gapY).toBe(customGapY);
      expect(obstacle.width).toBe(GAME_CONFIG.OBSTACLE_WIDTH);
      expect(obstacle.gapHeight).toBe(GAME_CONFIG.OBSTACLE_GAP);
      expect(obstacle.passed).toBe(false);
    });

    it('should generate random gap when gapY is not provided', () => {
      obstacle = new Obstacle(initialX);

      expect(obstacle.x).toBe(initialX);
      expect(obstacle.gapY).toBeGreaterThan(GAME_CONFIG.OBSTACLE_GAP / 2 + GAME_CONFIG.OBSTACLE_MIN_HEIGHT);
      expect(obstacle.gapY).toBeLessThan(GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.OBSTACLE_GAP / 2 - GAME_CONFIG.OBSTACLE_MIN_HEIGHT);
      expect(obstacle.width).toBe(GAME_CONFIG.OBSTACLE_WIDTH);
      expect(obstacle.gapHeight).toBe(GAME_CONFIG.OBSTACLE_GAP);
      expect(obstacle.passed).toBe(false);
    });

    it('should generate different random gaps for multiple obstacles', () => {
      const obstacle1 = new Obstacle(initialX);
      const obstacle2 = new Obstacle(initialX);

      // While there's a small chance they could be equal, it's very unlikely
      // We'll run this test multiple times to be more confident
      const gaps = [];
      for (let i = 0; i < 10; i++) {
        gaps.push(new Obstacle(initialX).gapY);
      }

      // Check that not all gaps are the same
      const uniqueGaps = new Set(gaps);
      expect(uniqueGaps.size).toBeGreaterThan(1);
    });
  });

  describe('Movement', () => {
    beforeEach(() => {
      obstacle = new Obstacle(initialX, customGapY);
    });

    it('should move left when updated', () => {
      const deltaTime = 16.67; // ~60 FPS
      const expectedDistance = GAME_CONFIG.OBSTACLE_SPEED * (deltaTime / 1000) * 60;

      obstacle.update(deltaTime);

      expect(obstacle.x).toBe(initialX - expectedDistance);
    });

    it('should move consistently with different delta times', () => {
      const obstacle1 = new Obstacle(initialX, customGapY);
      const obstacle2 = new Obstacle(initialX, customGapY);

      // Update one obstacle with one large delta time
      obstacle1.update(33.33); // 30 FPS equivalent

      // Update another obstacle with two smaller delta times
      obstacle2.update(16.67); // 60 FPS equivalent
      obstacle2.update(16.67); // 60 FPS equivalent

      // Both should be at approximately the same position
      expect(Math.abs(obstacle1.x - obstacle2.x)).toBeLessThan(0.1);
    });

    it('should continue moving with multiple updates', () => {
      const deltaTime = 16.67;
      const initialPosition = obstacle.x;

      obstacle.update(deltaTime);
      const firstPosition = obstacle.x;

      obstacle.update(deltaTime);
      const secondPosition = obstacle.x;

      expect(firstPosition).toBeLessThan(initialPosition);
      expect(secondPosition).toBeLessThan(firstPosition);
    });
  });

  describe('Off-screen detection', () => {
    it('should not be off-screen when visible', () => {
      obstacle = new Obstacle(100, customGapY);
      expect(obstacle.isOffScreen()).toBe(false);
    });

    it('should not be off-screen when partially visible', () => {
      obstacle = new Obstacle(-30, customGapY); // Partially off-screen
      expect(obstacle.isOffScreen()).toBe(false);
    });

    it('should be off-screen when completely past left edge', () => {
      obstacle = new Obstacle(-GAME_CONFIG.OBSTACLE_WIDTH - 1, customGapY);
      expect(obstacle.isOffScreen()).toBe(true);
    });

    it('should be off-screen exactly at the boundary', () => {
      obstacle = new Obstacle(-GAME_CONFIG.OBSTACLE_WIDTH, customGapY);
      expect(obstacle.isOffScreen()).toBe(true);
    });
  });

  describe('Collision bounds', () => {
    beforeEach(() => {
      obstacle = new Obstacle(initialX, customGapY);
    });

    it('should return bounds for both top and bottom pipes', () => {
      const bounds = obstacle.getBounds();

      expect(bounds).toHaveLength(2);
      expect(bounds[0]).toHaveProperty('x');
      expect(bounds[0]).toHaveProperty('y');
      expect(bounds[0]).toHaveProperty('width');
      expect(bounds[0]).toHaveProperty('height');
      expect(bounds[1]).toHaveProperty('x');
      expect(bounds[1]).toHaveProperty('y');
      expect(bounds[1]).toHaveProperty('width');
      expect(bounds[1]).toHaveProperty('height');
    });

    it('should have correct top pipe bounds', () => {
      const bounds = obstacle.getBounds();
      const topPipe = bounds[0];
      const expectedHeight = customGapY - GAME_CONFIG.OBSTACLE_GAP / 2;

      expect(topPipe.x).toBe(initialX + COLLISION.OBSTACLE_COLLISION_PADDING);
      expect(topPipe.y).toBe(0);
      expect(topPipe.width).toBe(GAME_CONFIG.OBSTACLE_WIDTH - (COLLISION.OBSTACLE_COLLISION_PADDING * 2));
      expect(topPipe.height).toBe(expectedHeight);
    });

    it('should have correct bottom pipe bounds', () => {
      const bounds = obstacle.getBounds();
      const bottomPipe = bounds[1];
      const bottomPipeY = customGapY + GAME_CONFIG.OBSTACLE_GAP / 2;
      const expectedHeight = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - bottomPipeY;

      expect(bottomPipe.x).toBe(initialX + COLLISION.OBSTACLE_COLLISION_PADDING);
      expect(bottomPipe.y).toBe(bottomPipeY);
      expect(bottomPipe.width).toBe(GAME_CONFIG.OBSTACLE_WIDTH - (COLLISION.OBSTACLE_COLLISION_PADDING * 2));
      expect(bottomPipe.height).toBe(expectedHeight);
    });

    it('should update bounds when obstacle moves', () => {
      const initialBounds = obstacle.getBounds();
      const deltaTime = 16.67;

      obstacle.update(deltaTime);
      const updatedBounds = obstacle.getBounds();

      expect(updatedBounds[0].x).toBeLessThan(initialBounds[0].x);
      expect(updatedBounds[1].x).toBeLessThan(initialBounds[1].x);
      expect(updatedBounds[0].x).toBe(updatedBounds[1].x); // Both pipes should have same x
    });
  });

  describe('Scoring (passed detection)', () => {
    beforeEach(() => {
      obstacle = new Obstacle(initialX, customGapY);
    });

    it('should not be passed initially', () => {
      const birdX = GAME_CONFIG.BIRD_START_X;
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.passed).toBe(false);
    });

    it('should not be passed when bird is before obstacle', () => {
      const birdX = initialX - 50;
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.passed).toBe(false);
    });

    it('should not be passed when bird is within obstacle bounds', () => {
      const birdX = initialX + GAME_CONFIG.OBSTACLE_WIDTH / 2;
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.passed).toBe(false);
    });

    it('should be passed when bird moves past obstacle', () => {
      const birdX = initialX + GAME_CONFIG.OBSTACLE_WIDTH + 1;
      expect(obstacle.checkPassed(birdX)).toBe(true);
      expect(obstacle.passed).toBe(true);
    });

    it('should only return true once when passed', () => {
      const birdX = initialX + GAME_CONFIG.OBSTACLE_WIDTH + 1;
      
      // First check should return true
      expect(obstacle.checkPassed(birdX)).toBe(true);
      expect(obstacle.passed).toBe(true);

      // Subsequent checks should return false
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.checkPassed(birdX + 100)).toBe(false);
    });
  });

  describe('Utility methods', () => {
    beforeEach(() => {
      obstacle = new Obstacle(initialX, customGapY);
    });

    it('should return correct center X position', () => {
      const centerX = obstacle.getCenterX();
      expect(centerX).toBe(initialX + GAME_CONFIG.OBSTACLE_WIDTH / 2);
    });

    it('should update center X when obstacle moves', () => {
      const initialCenterX = obstacle.getCenterX();
      obstacle.update(16.67);
      const updatedCenterX = obstacle.getCenterX();

      expect(updatedCenterX).toBeLessThan(initialCenterX);
    });

    it('should return correct gap bounds', () => {
      const gapBounds = obstacle.getGapBounds();
      
      expect(gapBounds.top).toBe(customGapY - GAME_CONFIG.OBSTACLE_GAP / 2);
      expect(gapBounds.bottom).toBe(customGapY + GAME_CONFIG.OBSTACLE_GAP / 2);
      expect(gapBounds.bottom - gapBounds.top).toBe(GAME_CONFIG.OBSTACLE_GAP);
    });

    it('should detect bird collision correctly', () => {
      // Bird that collides with top pipe
      const collidingBirdBounds: Bounds = {
        x: initialX,
        y: 100, // In top pipe area
        width: 30,
        height: 30
      };

      expect(obstacle.checkBirdCollision(collidingBirdBounds)).toBe(true);

      // Bird that passes through gap safely
      const safeBirdBounds: Bounds = {
        x: initialX,
        y: customGapY, // In gap area
        width: 30,
        height: 30
      };

      expect(obstacle.checkBirdCollision(safeBirdBounds)).toBe(false);

      // Bird that is far away
      const farBirdBounds: Bounds = {
        x: 100,
        y: 300,
        width: 30,
        height: 30
      };

      expect(obstacle.checkBirdCollision(farBirdBounds)).toBe(false);
    });
  });

  describe('Rendering', () => {
    let mockContext: any;

    beforeEach(() => {
      obstacle = new Obstacle(initialX, customGapY);
      mockContext = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '',
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        }))
      };
    });

    it('should call canvas context methods for rendering', () => {
      obstacle.render(mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should render both top and bottom pipes', () => {
      obstacle.render(mockContext);

      // Should call fillRect multiple times for pipes, caps, highlights, and shadows
      expect(mockContext.fillRect).toHaveBeenCalledTimes(8); // 2 pipes + 2 caps + 2 highlights + 2 shadows
    });

    it('should set different fill styles for pipes and caps', () => {
      const fillStyles: string[] = [];
      Object.defineProperty(mockContext, 'fillStyle', {
        set: (value: string) => fillStyles.push(value),
        get: () => fillStyles[fillStyles.length - 1] || ''
      });

      obstacle.render(mockContext);

      // Should use gradients and various colors for enhanced rendering
      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(fillStyles.length).toBeGreaterThan(0);
    });
  });
});