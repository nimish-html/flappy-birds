import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionDetector } from '../../utils/collision';
import { Bounds } from '../../types';
import { GAME_CONFIG, COLLISION } from '../../utils/gameConfig';

describe('CollisionDetector', () => {
  let birdBounds: Bounds;
  let obstacleBounds: Bounds[];

  beforeEach(() => {
    // Standard bird bounds for testing
    birdBounds = {
      x: 100,
      y: 300,
      width: 30,
      height: 30
    };

    // Standard obstacle bounds (top and bottom pipes)
    obstacleBounds = [
      // Top pipe
      {
        x: 200,
        y: 0,
        width: 60,
        height: 200
      },
      // Bottom pipe
      {
        x: 200,
        y: 350,
        width: 60,
        height: 200
      }
    ];
  });

  describe('checkBoundingBoxCollision', () => {
    it('should detect collision when boxes overlap', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 25, y: 25, width: 50, height: 50 };

      expect(CollisionDetector.checkBoundingBoxCollision(bounds1, bounds2)).toBe(true);
    });

    it('should not detect collision when boxes do not overlap', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 100, y: 100, width: 50, height: 50 };

      expect(CollisionDetector.checkBoundingBoxCollision(bounds1, bounds2)).toBe(false);
    });

    it('should detect collision when boxes touch at edges', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 49, y: 0, width: 50, height: 50 };

      expect(CollisionDetector.checkBoundingBoxCollision(bounds1, bounds2)).toBe(true);
    });

    it('should not detect collision when boxes are adjacent but not touching', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 50, y: 0, width: 50, height: 50 };

      expect(CollisionDetector.checkBoundingBoxCollision(bounds1, bounds2)).toBe(false);
    });

    it('should detect collision when one box is completely inside another', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const bounds2: Bounds = { x: 25, y: 25, width: 50, height: 50 };

      expect(CollisionDetector.checkBoundingBoxCollision(bounds1, bounds2)).toBe(true);
      expect(CollisionDetector.checkBoundingBoxCollision(bounds2, bounds1)).toBe(true);
    });
  });

  describe('checkBirdObstacleCollision', () => {
    it('should detect collision when bird hits top pipe', () => {
      const collidingBirdBounds: Bounds = {
        x: 200,
        y: 150,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkBirdObstacleCollision(collidingBirdBounds, obstacleBounds)).toBe(true);
    });

    it('should detect collision when bird hits bottom pipe', () => {
      const collidingBirdBounds: Bounds = {
        x: 200,
        y: 400,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkBirdObstacleCollision(collidingBirdBounds, obstacleBounds)).toBe(true);
    });

    it('should not detect collision when bird passes through gap', () => {
      const safeBirdBounds: Bounds = {
        x: 200,
        y: 275, // In the gap between pipes
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkBirdObstacleCollision(safeBirdBounds, obstacleBounds)).toBe(false);
    });

    it('should not detect collision when bird is far from obstacles', () => {
      expect(CollisionDetector.checkBirdObstacleCollision(birdBounds, obstacleBounds)).toBe(false);
    });

    it('should apply collision padding correctly', () => {
      // Bird that would collide without padding but not with padding
      const paddingTestBounds: Bounds = {
        x: 200 - COLLISION.BIRD_COLLISION_PADDING,
        y: 200 - COLLISION.BIRD_COLLISION_PADDING,
        width: 30,
        height: 30
      };

      // This should not collide due to padding
      expect(CollisionDetector.checkBirdObstacleCollision(paddingTestBounds, obstacleBounds)).toBe(false);
    });

    it('should handle empty obstacle bounds array', () => {
      expect(CollisionDetector.checkBirdObstacleCollision(birdBounds, [])).toBe(false);
    });
  });

  describe('checkGroundCollision', () => {
    it('should detect collision when bird touches ground', () => {
      const groundBirdBounds: Bounds = {
        x: 100,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - 30,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkGroundCollision(groundBirdBounds)).toBe(true);
    });

    it('should detect collision when bird is below ground level', () => {
      const belowGroundBounds: Bounds = {
        x: 100,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT + 10,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkGroundCollision(belowGroundBounds)).toBe(true);
    });

    it('should not detect collision when bird is above ground', () => {
      const aboveGroundBounds: Bounds = {
        x: 100,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - 50,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkGroundCollision(aboveGroundBounds)).toBe(false);
    });

    it('should handle bird at exact ground boundary', () => {
      const exactGroundBounds: Bounds = {
        x: 100,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - 30,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkGroundCollision(exactGroundBounds)).toBe(true);
    });
  });

  describe('checkCeilingCollision', () => {
    it('should detect collision when bird touches ceiling', () => {
      const ceilingBirdBounds: Bounds = {
        x: 100,
        y: 0,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkCeilingCollision(ceilingBirdBounds)).toBe(true);
    });

    it('should detect collision when bird is above ceiling', () => {
      const aboveCeilingBounds: Bounds = {
        x: 100,
        y: -10,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkCeilingCollision(aboveCeilingBounds)).toBe(true);
    });

    it('should not detect collision when bird is below ceiling', () => {
      const belowCeilingBounds: Bounds = {
        x: 100,
        y: 50,
        width: 30,
        height: 30
      };

      expect(CollisionDetector.checkCeilingCollision(belowCeilingBounds)).toBe(false);
    });
  });

  describe('checkAllCollisions', () => {
    it('should detect ground collision in comprehensive check', () => {
      const groundBirdBounds: Bounds = {
        x: 100,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT,
        width: 30,
        height: 30
      };

      const result = CollisionDetector.checkAllCollisions(groundBirdBounds, [obstacleBounds]);

      expect(result.hasCollision).toBe(true);
      expect(result.groundCollision).toBe(true);
      expect(result.ceilingCollision).toBe(false);
      expect(result.obstacleCollision).toBe(false);
    });

    it('should detect ceiling collision in comprehensive check', () => {
      const ceilingBirdBounds: Bounds = {
        x: 100,
        y: -5,
        width: 30,
        height: 30
      };

      const result = CollisionDetector.checkAllCollisions(ceilingBirdBounds, [obstacleBounds]);

      expect(result.hasCollision).toBe(true);
      expect(result.groundCollision).toBe(false);
      expect(result.ceilingCollision).toBe(true);
      expect(result.obstacleCollision).toBe(false);
    });

    it('should detect obstacle collision in comprehensive check', () => {
      const obstacleBirdBounds: Bounds = {
        x: 200,
        y: 150,
        width: 30,
        height: 30
      };

      const result = CollisionDetector.checkAllCollisions(obstacleBirdBounds, [obstacleBounds]);

      expect(result.hasCollision).toBe(true);
      expect(result.groundCollision).toBe(false);
      expect(result.ceilingCollision).toBe(false);
      expect(result.obstacleCollision).toBe(true);
    });

    it('should detect no collision when bird is safe', () => {
      const safeBirdBounds: Bounds = {
        x: 100,
        y: 300,
        width: 30,
        height: 30
      };

      const result = CollisionDetector.checkAllCollisions(safeBirdBounds, [obstacleBounds]);

      expect(result.hasCollision).toBe(false);
      expect(result.groundCollision).toBe(false);
      expect(result.ceilingCollision).toBe(false);
      expect(result.obstacleCollision).toBe(false);
    });

    it('should handle multiple obstacles', () => {
      const secondObstacleBounds: Bounds[] = [
        { x: 400, y: 0, width: 60, height: 150 },
        { x: 400, y: 300, width: 60, height: 250 }
      ];

      const birdHittingSecondObstacle: Bounds = {
        x: 400,
        y: 100,
        width: 30,
        height: 30
      };

      const result = CollisionDetector.checkAllCollisions(
        birdHittingSecondObstacle, 
        [obstacleBounds, secondObstacleBounds]
      );

      expect(result.hasCollision).toBe(true);
      expect(result.obstacleCollision).toBe(true);
    });

    it('should handle empty obstacles array', () => {
      const result = CollisionDetector.checkAllCollisions(birdBounds, []);

      expect(result.hasCollision).toBe(false);
      expect(result.groundCollision).toBe(false);
      expect(result.ceilingCollision).toBe(false);
      expect(result.obstacleCollision).toBe(false);
    });
  });

  describe('isPointInBounds', () => {
    const bounds: Bounds = { x: 10, y: 10, width: 50, height: 50 };

    it('should return true for point inside bounds', () => {
      expect(CollisionDetector.isPointInBounds({ x: 30, y: 30 }, bounds)).toBe(true);
    });

    it('should return false for point outside bounds', () => {
      expect(CollisionDetector.isPointInBounds({ x: 5, y: 5 }, bounds)).toBe(false);
      expect(CollisionDetector.isPointInBounds({ x: 70, y: 70 }, bounds)).toBe(false);
    });

    it('should return true for point on bounds edge', () => {
      expect(CollisionDetector.isPointInBounds({ x: 10, y: 10 }, bounds)).toBe(true);
      expect(CollisionDetector.isPointInBounds({ x: 60, y: 60 }, bounds)).toBe(true);
    });
  });

  describe('getDistance', () => {
    it('should calculate correct distance between two points', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };

      expect(CollisionDetector.getDistance(point1, point2)).toBe(5);
    });

    it('should return 0 for same points', () => {
      const point = { x: 10, y: 20 };

      expect(CollisionDetector.getDistance(point, point)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const point1 = { x: -3, y: -4 };
      const point2 = { x: 0, y: 0 };

      expect(CollisionDetector.getDistance(point1, point2)).toBe(5);
    });
  });

  describe('getBoundsCenter', () => {
    it('should calculate correct center point', () => {
      const bounds: Bounds = { x: 10, y: 20, width: 40, height: 60 };
      const center = CollisionDetector.getBoundsCenter(bounds);

      expect(center.x).toBe(30); // 10 + 40/2
      expect(center.y).toBe(50); // 20 + 60/2
    });

    it('should handle bounds at origin', () => {
      const bounds: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const center = CollisionDetector.getBoundsCenter(bounds);

      expect(center.x).toBe(50);
      expect(center.y).toBe(50);
    });
  });

  describe('checkMinimumOverlap', () => {
    it('should return true when overlap exceeds minimum', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 40, y: 40, width: 50, height: 50 };

      expect(CollisionDetector.checkMinimumOverlap(bounds1, bounds2, 5)).toBe(true);
    });

    it('should return false when overlap is less than minimum', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 48, y: 48, width: 50, height: 50 };

      expect(CollisionDetector.checkMinimumOverlap(bounds1, bounds2, 5)).toBe(false);
    });

    it('should return false when no overlap exists', () => {
      const bounds1: Bounds = { x: 0, y: 0, width: 50, height: 50 };
      const bounds2: Bounds = { x: 100, y: 100, width: 50, height: 50 };

      expect(CollisionDetector.checkMinimumOverlap(bounds1, bounds2, 1)).toBe(false);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle zero-sized bounds', () => {
      const zeroBounds: Bounds = { x: 10, y: 10, width: 0, height: 0 };
      const normalBounds: Bounds = { x: 5, y: 5, width: 20, height: 20 };

      // Zero-sized bounds at (10,10) should collide with bounds from (5,5) to (25,25)
      expect(CollisionDetector.checkBoundingBoxCollision(zeroBounds, normalBounds)).toBe(true);
      
      // Zero-sized bounds outside the normal bounds should not collide
      const zeroOutside: Bounds = { x: 30, y: 30, width: 0, height: 0 };
      expect(CollisionDetector.checkBoundingBoxCollision(zeroOutside, normalBounds)).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const negativeBounds: Bounds = { x: -10, y: -10, width: 20, height: 20 };
      const positiveBounds: Bounds = { x: 5, y: 5, width: 20, height: 20 };

      expect(CollisionDetector.checkBoundingBoxCollision(negativeBounds, positiveBounds)).toBe(true);
    });

    it('should handle very large coordinates', () => {
      const largeBounds1: Bounds = { x: 1000000, y: 1000000, width: 50, height: 50 };
      const largeBounds2: Bounds = { x: 1000025, y: 1000025, width: 50, height: 50 };

      expect(CollisionDetector.checkBoundingBoxCollision(largeBounds1, largeBounds2)).toBe(true);
    });
  });
});