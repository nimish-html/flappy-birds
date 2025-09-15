import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MathObstacle } from '../../components/MathObstacle';
import { MathQuestion, Bounds } from '../../types';
import { GAME_CONFIG } from '../../utils/gameConfig';

// Mock the base Obstacle class methods
vi.mock('../../components/Obstacle', () => ({
  Obstacle: class MockObstacle {
    public x: number;
    public gapY: number;
    public gapHeight: number;
    public width: number;
    public passed: boolean;

    constructor(x: number, gapY?: number) {
      this.x = x;
      this.width = GAME_CONFIG.OBSTACLE_WIDTH;
      this.gapHeight = GAME_CONFIG.OBSTACLE_GAP;
      this.passed = false;
      this.gapY = gapY || 300; // Default gap position
    }

    public update(deltaTime: number): void {
      const dt = deltaTime / 1000;
      this.x -= GAME_CONFIG.OBSTACLE_SPEED * dt * 60;
    }

    public render(context: CanvasRenderingContext2D): void {
      // Mock render implementation
    }
  }
}));

describe('MathObstacle', () => {
  let mathObstacle: MathObstacle;
  let sampleQuestion: MathQuestion;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    sampleQuestion = {
      id: 'test_001',
      category: 'addition',
      question: '5 + 3',
      correctAnswer: 8,
      difficulty: 1
    };

    mathObstacle = new MathObstacle(400, sampleQuestion, 300);

    // Mock canvas context
    const mockGradient = {
      addColorStop: vi.fn()
    };
    
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue(mockGradient),
      measureText: vi.fn().mockReturnValue({ width: 20 }),
      drawImage: vi.fn(),
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0
    } as any;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct question and position', () => {
      expect(mathObstacle.getQuestion()).toEqual(sampleQuestion);
      expect(mathObstacle.x).toBe(400);
      expect(mathObstacle.gapY).toBe(300);
    });

    it('should create upper and lower answer zones', () => {
      const zones = mathObstacle.getAnswerZones();
      
      expect(zones.upper).toBeDefined();
      expect(zones.lower).toBeDefined();
      expect(zones.upper.position).toBe('upper');
      expect(zones.lower.position).toBe('lower');
    });

    it('should randomly assign correct answer to upper or lower zone', () => {
      const zones = mathObstacle.getAnswerZones();
      const correctAnswers = [zones.upper.isCorrect, zones.lower.isCorrect];
      
      // Exactly one should be correct
      expect(correctAnswers.filter(Boolean).length).toBe(1);
      
      // One zone should have correct answer, other should have incorrect
      const answers = [zones.upper.answer, zones.lower.answer];
      expect(answers).toContain(sampleQuestion.correctAnswer);
      expect(answers.some(answer => answer !== sampleQuestion.correctAnswer)).toBe(true);
    });

    it('should position answer zones within the gap', () => {
      const zones = mathObstacle.getAnswerZones();
      const gapTop = mathObstacle.gapY - mathObstacle.gapHeight / 2;
      const gapBottom = mathObstacle.gapY + mathObstacle.gapHeight / 2;

      // Upper zone should be in upper half of gap
      expect(zones.upper.bounds.y).toBeGreaterThanOrEqual(gapTop);
      expect(zones.upper.bounds.y + zones.upper.bounds.height).toBeLessThan(mathObstacle.gapY);

      // Lower zone should be in lower half of gap
      expect(zones.lower.bounds.y).toBeGreaterThan(mathObstacle.gapY);
      expect(zones.lower.bounds.y + zones.lower.bounds.height).toBeLessThanOrEqual(gapBottom);
    });
  });

  describe('Incorrect Answer Generation', () => {
    it('should generate different incorrect answers for addition', () => {
      const additionQuestion: MathQuestion = {
        id: 'add_001',
        category: 'addition',
        question: '7 + 4',
        correctAnswer: 11,
        difficulty: 1
      };

      const obstacle = new MathObstacle(400, additionQuestion);
      const zones = obstacle.getAnswerZones();
      const answers = [zones.upper.answer, zones.lower.answer];
      const incorrectAnswer = answers.find(answer => answer !== additionQuestion.correctAnswer);

      expect(incorrectAnswer).toBeDefined();
      expect(incorrectAnswer).not.toBe(additionQuestion.correctAnswer);
      expect(incorrectAnswer).toBeGreaterThanOrEqual(0); // Should not be negative
    });

    it('should generate different incorrect answers for multiplication', () => {
      const multiplicationQuestion: MathQuestion = {
        id: 'mul_001',
        category: 'multiplication',
        question: '3 × 4',
        correctAnswer: 12,
        difficulty: 2
      };

      const obstacle = new MathObstacle(400, multiplicationQuestion);
      const zones = obstacle.getAnswerZones();
      const answers = [zones.upper.answer, zones.lower.answer];
      const incorrectAnswer = answers.find(answer => answer !== multiplicationQuestion.correctAnswer);

      expect(incorrectAnswer).toBeDefined();
      expect(incorrectAnswer).not.toBe(multiplicationQuestion.correctAnswer);
    });

    it('should generate positive incorrect answers for division', () => {
      const divisionQuestion: MathQuestion = {
        id: 'div_001',
        category: 'division',
        question: '12 ÷ 3',
        correctAnswer: 4,
        difficulty: 2
      };

      const obstacle = new MathObstacle(400, divisionQuestion);
      const zones = obstacle.getAnswerZones();
      const answers = [zones.upper.answer, zones.lower.answer];
      const incorrectAnswer = answers.find(answer => answer !== divisionQuestion.correctAnswer);

      expect(incorrectAnswer).toBeDefined();
      expect(incorrectAnswer).not.toBe(divisionQuestion.correctAnswer);
      expect(incorrectAnswer).toBeGreaterThan(0); // Should be positive
    });
  });

  describe('Answer Zone Collision Detection', () => {
    it('should detect collision with upper answer zone', () => {
      const zones = mathObstacle.getAnswerZones();
      const birdBounds: Bounds = {
        x: zones.upper.bounds.x + 10,
        y: zones.upper.bounds.y + 10,
        width: 20,
        height: 20
      };

      const selectedZone = mathObstacle.checkAnswerSelection(birdBounds);
      expect(selectedZone).toBe(zones.upper);
    });

    it('should detect collision with lower answer zone', () => {
      const zones = mathObstacle.getAnswerZones();
      const birdBounds: Bounds = {
        x: zones.lower.bounds.x + 10,
        y: zones.lower.bounds.y + 10,
        width: 20,
        height: 20
      };

      const selectedZone = mathObstacle.checkAnswerSelection(birdBounds);
      expect(selectedZone).toBe(zones.lower);
    });

    it('should return null when bird is not in any answer zone', () => {
      const birdBounds: Bounds = {
        x: mathObstacle.x - 100, // Far to the left
        y: mathObstacle.gapY,
        width: 20,
        height: 20
      };

      const selectedZone = mathObstacle.checkAnswerSelection(birdBounds);
      expect(selectedZone).toBeNull();
    });

    it('should not detect collision when bird is outside answer zone bounds', () => {
      const zones = mathObstacle.getAnswerZones();
      const birdBounds: Bounds = {
        x: zones.upper.bounds.x + zones.upper.bounds.width + 10, // Just outside
        y: zones.upper.bounds.y + 10,
        width: 20,
        height: 20
      };

      const selectedZone = mathObstacle.checkAnswerSelection(birdBounds);
      expect(selectedZone).toBeNull();
    });
  });

  describe('Update Method', () => {
    it('should update answer zone positions when obstacle moves', () => {
      const initialZones = mathObstacle.getAnswerZones();
      const initialUpperX = initialZones.upper.bounds.x;
      const initialLowerX = initialZones.lower.bounds.x;

      mathObstacle.update(16.67); // ~60fps frame time

      const updatedZones = mathObstacle.getAnswerZones();
      expect(updatedZones.upper.bounds.x).toBeLessThan(initialUpperX);
      expect(updatedZones.lower.bounds.x).toBeLessThan(initialLowerX);
    });

    it('should move answer zones by the same amount as obstacle', () => {
      const initialX = mathObstacle.x;
      const initialZones = mathObstacle.getAnswerZones();
      const initialUpperX = initialZones.upper.bounds.x;

      mathObstacle.update(16.67);

      const finalX = mathObstacle.x;
      const finalZones = mathObstacle.getAnswerZones();
      const finalUpperX = finalZones.upper.bounds.x;

      const obstacleDelta = finalX - initialX;
      const zoneDelta = finalUpperX - initialUpperX;

      expect(Math.abs(obstacleDelta - zoneDelta)).toBeLessThan(0.1); // Allow for floating point precision
    });
  });

  describe('Rendering', () => {
    it('should call renderAnswerChoices when rendering', () => {
      const renderSpy = vi.spyOn(mathObstacle, 'renderAnswerChoices');
      mathObstacle.render(mockContext);
      expect(renderSpy).toHaveBeenCalledWith(mockContext);
    });

    it('should render answer zones with correct styling', () => {
      mathObstacle.renderAnswerChoices(mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
      expect(mockContext.drawImage).toHaveBeenCalled(); // Text is now rendered via cached canvas
    });

    it('should render both answer zones without separator', () => {
      mathObstacle.renderAnswerChoices(mockContext);

      // Should render background rectangles for both zones (no separator)
      expect(mockContext.fillRect).toHaveBeenCalledTimes(2); // 2 backgrounds (no separator, no effects in test)
      // Should render borders for both zones
      expect(mockContext.strokeRect).toHaveBeenCalledTimes(2);
      // Should render text for both zones via cached canvas
      expect(mockContext.drawImage).toHaveBeenCalledTimes(2);
    });

    it('should use uniform blue color scheme for all answer zones', () => {
      mathObstacle.renderAnswerChoices(mockContext);

      // Verify that createLinearGradient was called for both answer zones
      expect(mockContext.createLinearGradient).toHaveBeenCalledTimes(2);
      
      // Verify that strokeStyle is set to the uniform blue color
      expect(mockContext.strokeStyle).toBe('#4682B4'); // Steel blue - consistent for all answers
      
      // Verify that the gradient addColorStop was called with blue colors
      const gradientMock = mockContext.createLinearGradient();
      expect(gradientMock.addColorStop).toHaveBeenCalledWith(0, 'rgba(173, 216, 230, 0.95)'); // Light blue
      expect(gradientMock.addColorStop).toHaveBeenCalledWith(1, 'rgba(135, 206, 250, 0.95)'); // Sky blue
    });

    it('should not provide visual hints about answer correctness', () => {
      // Requirement 3.2: No visual indication of which is correct or incorrect
      // Requirement 3.5: Colors should not provide hints about answer correctness
      const zones = mathObstacle.getAnswerZones();
      
      mathObstacle.renderAnswerChoices(mockContext);

      // Both zones should use identical styling regardless of correctness
      expect(mockContext.createLinearGradient).toHaveBeenCalledTimes(2);
      expect(mockContext.strokeStyle).toBe('#4682B4'); // Same border color for both
      
      // Verify no different styling is applied based on isCorrect property
      const gradientMock = mockContext.createLinearGradient();
      const expectedLightBlue = 'rgba(173, 216, 230, 0.95)';
      const expectedSkyBlue = 'rgba(135, 206, 250, 0.95)';
      
      expect(gradientMock.addColorStop).toHaveBeenCalledWith(0, expectedLightBlue);
      expect(gradientMock.addColorStop).toHaveBeenCalledWith(1, expectedSkyBlue);
    });

    it('should render answer zones with identical visual appearance', () => {
      // Requirement 3.4: Answer zones should be visually identical except for numerical content
      const zones = mathObstacle.getAnswerZones();
      
      mathObstacle.renderAnswerChoices(mockContext);

      // Both zones should have same dimensions and styling
      expect(zones.upper.bounds.width).toBe(zones.lower.bounds.width);
      expect(zones.upper.bounds.height).toBe(zones.lower.bounds.height);
      
      // Both should use same rendering calls
      expect(mockContext.fillRect).toHaveBeenCalledTimes(2); // Same background rendering
      expect(mockContext.strokeRect).toHaveBeenCalledTimes(2); // Same border rendering
      expect(mockContext.drawImage).toHaveBeenCalledTimes(2); // Same text rendering
    });
  });

  describe('Visual Positioning', () => {
    it('should position answer zones with proper padding from pipe edges', () => {
      const zones = mathObstacle.getAnswerZones();
      
      // Answer zones should have touch-friendly padding from pipe edges
      // The exact padding depends on mobile detection and touch padding calculations
      expect(zones.upper.bounds.x).toBeGreaterThan(mathObstacle.x);
      expect(zones.lower.bounds.x).toBeGreaterThan(mathObstacle.x);
      expect(zones.upper.bounds.x + zones.upper.bounds.width).toBeLessThan(mathObstacle.x + mathObstacle.width);
      expect(zones.lower.bounds.x + zones.lower.bounds.width).toBeLessThan(mathObstacle.x + mathObstacle.width);
    });

    it('should create touch-friendly answer zones with adequate height', () => {
      const zones = mathObstacle.getAnswerZones();
      
      // Answer zones should be reasonably sized for touch interaction
      // With the current gap size (150px) and increased separation, zones will be smaller
      expect(zones.upper.bounds.height).toBeGreaterThan(30); // Reasonable minimum
      expect(zones.lower.bounds.height).toBeGreaterThan(30); // Reasonable minimum
      
      // Both zones should have the same height for consistency
      expect(zones.upper.bounds.height).toBe(zones.lower.bounds.height);
    });

    it('should position answer zones with proper padding from gap edges', () => {
      const zones = mathObstacle.getAnswerZones();
      const gapTop = mathObstacle.gapY - mathObstacle.gapHeight / 2;
      const gapBottom = mathObstacle.gapY + mathObstacle.gapHeight / 2;

      // Upper zone should have 8px padding from top of gap (updated from 5px)
      expect(zones.upper.bounds.y).toBe(gapTop + 8);
      
      // Lower zone should have 8px padding from bottom of gap (updated from 5px)
      expect(zones.lower.bounds.y + zones.lower.bounds.height).toBe(gapBottom - 8);
    });

    it('should create answer zones that fit within the gap height with pass-through space', () => {
      const zones = mathObstacle.getAnswerZones();
      const navigableArea = mathObstacle.getNavigableArea();
      
      // Each zone should be smaller than half the gap to allow for increased pass-through space
      const maxZoneHeight = mathObstacle.gapHeight / 2 - 25; // Account for increased pass-through gap and padding
      
      expect(zones.upper.bounds.height).toBeLessThanOrEqual(maxZoneHeight);
      expect(zones.lower.bounds.height).toBeLessThanOrEqual(maxZoneHeight);
      expect(zones.upper.bounds.height).toBeGreaterThan(0);
      expect(zones.lower.bounds.height).toBeGreaterThan(0);
      
      // Should have navigable space between zones (at least 50px for improved navigation)
      expect(navigableArea.height).toBeGreaterThanOrEqual(50); // Increased minimum navigable space
    });
  });

  describe('Missed Answer Detection', () => {
    it('should detect when bird passes through gap without selecting answer', () => {
      const birdBounds: Bounds = {
        x: mathObstacle.x + mathObstacle.width + 10, // Past the obstacle
        y: mathObstacle.gapY - 10, // In the gap
        width: 20,
        height: 20
      };

      const missedAnswer = mathObstacle.checkMissedAnswer(birdBounds);
      expect(missedAnswer).toBe(true);
    });

    it('should not detect missed answer when bird has not passed obstacle', () => {
      const birdBounds: Bounds = {
        x: mathObstacle.x - 10, // Before the obstacle
        y: mathObstacle.gapY,
        width: 20,
        height: 20
      };

      const missedAnswer = mathObstacle.checkMissedAnswer(birdBounds);
      expect(missedAnswer).toBe(false);
    });

    it('should not detect missed answer when bird is outside gap area', () => {
      const birdBounds: Bounds = {
        x: mathObstacle.x + mathObstacle.width + 10, // Past the obstacle
        y: mathObstacle.gapY - mathObstacle.gapHeight, // Above the gap
        width: 20,
        height: 20
      };

      const missedAnswer = mathObstacle.checkMissedAnswer(birdBounds);
      expect(missedAnswer).toBe(false);
    });
  });

  describe('Pass-Through Navigation', () => {
    it('should allow bird to pass through the gap between answer zones', () => {
      const navigableArea = mathObstacle.getNavigableArea();
      const birdBounds: Bounds = {
        x: navigableArea.x + 10,
        y: navigableArea.y + 10,
        width: 20,
        height: 20
      };

      const selectedZone = mathObstacle.checkAnswerSelection(birdBounds);
      expect(selectedZone).toBeNull(); // Should not select any answer zone
    });

    it('should have a navigable area between answer zones', () => {
      const navigableArea = mathObstacle.getNavigableArea();
      const zones = mathObstacle.getAnswerZones();

      expect(navigableArea.x).toBe(mathObstacle.x);
      expect(navigableArea.width).toBe(mathObstacle.width);
      expect(navigableArea.y).toBe(zones.upper.bounds.y + zones.upper.bounds.height);
      expect(navigableArea.y + navigableArea.height).toBe(zones.lower.bounds.y);
      expect(navigableArea.height).toBeGreaterThan(0); // Should have some space
    });

    it('should indicate that it has a pass-through zone', () => {
      expect(mathObstacle.hasPassThroughZone()).toBe(true);
    });

    it('should not detect collision when bird is in pass-through zone', () => {
      const navigableArea = mathObstacle.getNavigableArea();
      const birdBounds: Bounds = {
        x: navigableArea.x + 10,
        y: navigableArea.y + 5,
        width: 20,
        height: 10
      };

      const hasCollision = mathObstacle.checkBirdCollisionExcludingGap(birdBounds);
      expect(hasCollision).toBe(false);
    });

    it('should detect collision when bird hits answer zones', () => {
      const zones = mathObstacle.getAnswerZones();
      const birdBounds: Bounds = {
        x: zones.upper.bounds.x + 10,
        y: zones.upper.bounds.y + 10,
        width: 20,
        height: 20
      };

      const hasCollision = mathObstacle.checkBirdCollisionExcludingGap(birdBounds);
      expect(hasCollision).toBe(true);
    });

    it('should create sufficient vertical separation between answer zones', () => {
      const zones = mathObstacle.getAnswerZones();
      const upperBottom = zones.upper.bounds.y + zones.upper.bounds.height;
      const lowerTop = zones.lower.bounds.y;
      const separation = lowerTop - upperBottom;

      // Should have at least 50px separation for improved navigation (increased from 30px)
      expect(separation).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Random Answer Placement', () => {
    it('should prevent pattern memorization by randomizing answer positions', () => {
      const obstacles: MathObstacle[] = [];
      const correctPositions: string[] = [];

      // Create multiple obstacles with the same question
      for (let i = 0; i < 10; i++) {
        const obstacle = new MathObstacle(400 + i * 200, sampleQuestion);
        obstacles.push(obstacle);
        
        const zones = obstacle.getAnswerZones();
        if (zones.upper.isCorrect) {
          correctPositions.push('upper');
        } else {
          correctPositions.push('lower');
        }
      }

      // Should have some variation in correct answer positions
      const upperCount = correctPositions.filter(pos => pos === 'upper').length;
      const lowerCount = correctPositions.filter(pos => pos === 'lower').length;

      // With 10 obstacles, we should have some distribution (not all in one position)
      // This test might occasionally fail due to randomness, but it's very unlikely
      expect(upperCount).toBeGreaterThan(0);
      expect(lowerCount).toBeGreaterThan(0);
    });
  });
});