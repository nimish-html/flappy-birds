import { describe, it, expect, beforeEach } from 'vitest';
import { Obstacle } from '../../components/Obstacle';
import { GAME_CONFIG } from '../../utils/gameConfig';

describe('Scoring System', () => {
  describe('Obstacle Scoring Logic', () => {
    let obstacle: Obstacle;
    
    beforeEach(() => {
      obstacle = new Obstacle(200, 300);
    });

    it('should not be passed initially', () => {
      expect(obstacle.passed).toBe(false);
      expect(obstacle.checkPassed(GAME_CONFIG.BIRD_START_X)).toBe(false);
    });

    it('should not be passed when bird is before obstacle', () => {
      const birdX = obstacle.x - 50;
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.passed).toBe(false);
    });

    it('should not be passed when bird is within obstacle bounds', () => {
      const birdX = obstacle.x + (obstacle.width / 2);
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.passed).toBe(false);
    });

    it('should be passed when bird moves past obstacle', () => {
      const birdX = obstacle.x + obstacle.width + 1;
      expect(obstacle.checkPassed(birdX)).toBe(true);
      expect(obstacle.passed).toBe(true);
    });

    it('should only return true once when passed', () => {
      const birdX = obstacle.x + obstacle.width + 1;
      
      // First check should return true
      expect(obstacle.checkPassed(birdX)).toBe(true);
      expect(obstacle.passed).toBe(true);

      // Subsequent checks should return false
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.checkPassed(birdX + 100)).toBe(false);
    });

    it('should handle exact boundary condition', () => {
      // Bird exactly at the edge should not be considered passed
      const birdX = obstacle.x + obstacle.width;
      expect(obstacle.checkPassed(birdX)).toBe(false);
      expect(obstacle.passed).toBe(false);
      
      // Bird just past the edge should be considered passed
      const birdXPast = obstacle.x + obstacle.width + 0.1;
      expect(obstacle.checkPassed(birdXPast)).toBe(true);
      expect(obstacle.passed).toBe(true);
    });
  });

  describe('Score Configuration', () => {
    it('should have correct points per obstacle configured', () => {
      expect(GAME_CONFIG.POINTS_PER_OBSTACLE).toBe(1);
    });

    it('should use consistent scoring values', () => {
      // Ensure the scoring system uses the configured value
      expect(typeof GAME_CONFIG.POINTS_PER_OBSTACLE).toBe('number');
      expect(GAME_CONFIG.POINTS_PER_OBSTACLE).toBeGreaterThan(0);
    });
  });

  describe('Multiple Obstacle Scoring', () => {
    it('should handle multiple obstacles with different positions', () => {
      const obstacles = [
        new Obstacle(100, 200),
        new Obstacle(200, 250),
        new Obstacle(300, 300)
      ];
      
      const birdX = 400; // Past all obstacles
      
      let totalPassed = 0;
      obstacles.forEach(obstacle => {
        if (obstacle.checkPassed(birdX)) {
          totalPassed++;
        }
      });
      
      expect(totalPassed).toBe(3);
      
      // Verify all obstacles are marked as passed
      obstacles.forEach(obstacle => {
        expect(obstacle.passed).toBe(true);
      });
    });

    it('should handle mixed passed and unpassed obstacles', () => {
      const obstacles = [
        new Obstacle(50, 200),   // Should be passed
        new Obstacle(150, 250),  // Should not be passed
        new Obstacle(250, 300)   // Should not be passed
      ];
      
      const birdX = 120; // Between first and second obstacle
      
      let totalPassed = 0;
      obstacles.forEach(obstacle => {
        if (obstacle.checkPassed(birdX)) {
          totalPassed++;
        }
      });
      
      expect(totalPassed).toBe(1);
      expect(obstacles[0].passed).toBe(true);
      expect(obstacles[1].passed).toBe(false);
      expect(obstacles[2].passed).toBe(false);
    });

    it('should handle obstacles passed in sequence', () => {
      const obstacle1 = new Obstacle(100, 200);
      const obstacle2 = new Obstacle(200, 250);
      
      // Bird passes first obstacle
      let birdX = 170; // Past first obstacle
      expect(obstacle1.checkPassed(birdX)).toBe(true);
      expect(obstacle2.checkPassed(birdX)).toBe(false);
      
      // Bird passes second obstacle
      birdX = 270; // Past second obstacle
      expect(obstacle1.checkPassed(birdX)).toBe(false); // Already passed, returns false
      expect(obstacle2.checkPassed(birdX)).toBe(true);
      
      // Both should be marked as passed
      expect(obstacle1.passed).toBe(true);
      expect(obstacle2.passed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle obstacles with minimum width', () => {
      const obstacle = new Obstacle(100, 200);
      expect(obstacle.width).toBe(GAME_CONFIG.OBSTACLE_WIDTH);
      
      const birdX = obstacle.x + obstacle.width + 1;
      expect(obstacle.checkPassed(birdX)).toBe(true);
    });

    it('should handle very close bird positions', () => {
      const obstacle = new Obstacle(100, 200);
      
      // Test positions very close to the boundary
      expect(obstacle.checkPassed(obstacle.x + obstacle.width - 0.1)).toBe(false);
      expect(obstacle.checkPassed(obstacle.x + obstacle.width)).toBe(false);
      expect(obstacle.checkPassed(obstacle.x + obstacle.width + 0.1)).toBe(true);
    });

    it('should handle negative bird positions', () => {
      const obstacle = new Obstacle(100, 200);
      
      // Bird at negative position should not pass obstacle
      expect(obstacle.checkPassed(-50)).toBe(false);
      expect(obstacle.passed).toBe(false);
    });

    it('should handle very large bird positions', () => {
      const obstacle = new Obstacle(100, 200);
      
      // Bird at very large position should pass obstacle
      const largeBirdX = 10000;
      expect(obstacle.checkPassed(largeBirdX)).toBe(true);
      expect(obstacle.passed).toBe(true);
    });
  });

  describe('Scoring Integration', () => {
    it('should work correctly with game configuration values', () => {
      // Test with actual game configuration values
      const obstacle = new Obstacle(
        GAME_CONFIG.BIRD_START_X + GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE,
        GAME_CONFIG.CANVAS_HEIGHT / 2
      );
      
      // Bird should not pass obstacle initially
      expect(obstacle.checkPassed(GAME_CONFIG.BIRD_START_X)).toBe(false);
      
      // Bird should pass obstacle when it moves far enough
      const passedBirdX = obstacle.x + obstacle.width + 1;
      expect(obstacle.checkPassed(passedBirdX)).toBe(true);
    });

    it('should maintain passed state correctly', () => {
      const obstacle = new Obstacle(100, 200);
      
      // Initially not passed
      expect(obstacle.passed).toBe(false);
      
      // Pass the obstacle
      obstacle.checkPassed(200);
      expect(obstacle.passed).toBe(true);
      
      // State should persist
      expect(obstacle.passed).toBe(true);
      
      // Subsequent checks should not change the state
      obstacle.checkPassed(300);
      expect(obstacle.passed).toBe(true);
    });
  });
});