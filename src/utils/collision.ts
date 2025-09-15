import { Bounds } from '../types';
import { GAME_CONFIG, COLLISION } from './gameConfig';

/**
 * Collision detection utilities for the Brainy Bird game
 */
export class CollisionDetector {
  /**
   * Check if two bounding boxes intersect using AABB (Axis-Aligned Bounding Box) collision detection
   * @param bounds1 - First bounding box
   * @param bounds2 - Second bounding box
   * @returns True if the bounds intersect
   */
  public static checkBoundingBoxCollision(bounds1: Bounds, bounds2: Bounds): boolean {
    return (
      bounds1.x < bounds2.x + bounds2.width &&
      bounds1.x + bounds1.width > bounds2.x &&
      bounds1.y < bounds2.y + bounds2.height &&
      bounds1.y + bounds1.height > bounds2.y
    );
  }

  /**
   * Check if the bird collides with any obstacles
   * @param birdBounds - Bird's collision bounds
   * @param obstacleBounds - Array of obstacle bounds (top and bottom pipes)
   * @returns True if collision detected
   */
  public static checkBirdObstacleCollision(birdBounds: Bounds, obstacleBounds: Bounds[]): boolean {
    // Apply collision padding to bird bounds for fairer gameplay
    const paddedBirdBounds: Bounds = {
      x: birdBounds.x + COLLISION.BIRD_COLLISION_PADDING,
      y: birdBounds.y + COLLISION.BIRD_COLLISION_PADDING,
      width: birdBounds.width - (COLLISION.BIRD_COLLISION_PADDING * 2),
      height: birdBounds.height - (COLLISION.BIRD_COLLISION_PADDING * 2)
    };

    // Check collision with each obstacle bound (top and bottom pipes)
    for (const obstacleBound of obstacleBounds) {
      if (this.checkBoundingBoxCollision(paddedBirdBounds, obstacleBound)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the bird collides with the ground
   * @param birdBounds - Bird's collision bounds
   * @returns True if bird hits the ground
   */
  public static checkGroundCollision(birdBounds: Bounds): boolean {
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT;
    return birdBounds.y + birdBounds.height >= groundY;
  }

  /**
   * Check if the bird collides with the ceiling
   * @param birdBounds - Bird's collision bounds
   * @returns True if bird hits the ceiling
   */
  public static checkCeilingCollision(birdBounds: Bounds): boolean {
    return birdBounds.y <= 0;
  }

  /**
   * Comprehensive collision check for the bird against all game boundaries and obstacles
   * @param birdBounds - Bird's collision bounds
   * @param obstacles - Array of obstacle bounds arrays
   * @returns Object indicating what type of collision occurred
   */
  public static checkAllCollisions(
    birdBounds: Bounds, 
    obstacles: Bounds[][]
  ): {
    hasCollision: boolean;
    groundCollision: boolean;
    ceilingCollision: boolean;
    obstacleCollision: boolean;
  } {
    const groundCollision = this.checkGroundCollision(birdBounds);
    const ceilingCollision = this.checkCeilingCollision(birdBounds);
    
    let obstacleCollision = false;
    for (const obstacleBounds of obstacles) {
      if (this.checkBirdObstacleCollision(birdBounds, obstacleBounds)) {
        obstacleCollision = true;
        break;
      }
    }

    return {
      hasCollision: groundCollision || ceilingCollision || obstacleCollision,
      groundCollision,
      ceilingCollision,
      obstacleCollision
    };
  }

  /**
   * Check if a point is inside a bounding box
   * @param point - Point with x, y coordinates
   * @param bounds - Bounding box to check against
   * @returns True if point is inside bounds
   */
  public static isPointInBounds(point: { x: number; y: number }, bounds: Bounds): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  /**
   * Calculate the distance between two points
   * @param point1 - First point
   * @param point2 - Second point
   * @returns Distance between the points
   */
  public static getDistance(
    point1: { x: number; y: number }, 
    point2: { x: number; y: number }
  ): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get the center point of a bounding box
   * @param bounds - Bounding box
   * @returns Center point coordinates
   */
  public static getBoundsCenter(bounds: Bounds): { x: number; y: number } {
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  /**
   * Check if two bounding boxes are overlapping by a minimum amount
   * @param bounds1 - First bounding box
   * @param bounds2 - Second bounding box
   * @param minOverlap - Minimum overlap required
   * @returns True if overlap is greater than minimum
   */
  public static checkMinimumOverlap(bounds1: Bounds, bounds2: Bounds, minOverlap: number): boolean {
    if (!this.checkBoundingBoxCollision(bounds1, bounds2)) {
      return false;
    }

    const overlapX = Math.min(bounds1.x + bounds1.width, bounds2.x + bounds2.width) - 
                     Math.max(bounds1.x, bounds2.x);
    const overlapY = Math.min(bounds1.y + bounds1.height, bounds2.y + bounds2.height) - 
                     Math.max(bounds1.y, bounds2.y);

    return overlapX >= minOverlap && overlapY >= minOverlap;
  }
}