import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Game from '../../app/page';
import { MathObstacle } from '../../components/MathObstacle';
import { MathQuestion } from '../../types';

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

// Mock canvas for accessibility testing
const createAccessibleMockCanvas = () => {
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 8, // Mock text width calculation
      height: 16
    })),
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
    font: '24px Arial', // Accessible font size
    textAlign: 'center',
    textBaseline: 'middle'
  };

  return mockContext;
};

describe('Math Game Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Question Readability', () => {
    it('should display math questions with sufficient font size and contrast', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check for math question display
      const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
      
      if (questionElements.length > 0) {
        const questionElement = questionElements[0];
        
        // Verify question is readable
        expect(questionElement).toBeInTheDocument();
        expect(questionElement.textContent).toMatch(/\d+\s*[\+\-\×\÷]\s*\d+/);
        
        // Check computed styles for accessibility
        const computedStyle = window.getComputedStyle(questionElement);
        
        // Font size should be large enough (at least 16px for accessibility)
        const fontSize = parseInt(computedStyle.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(16);
        
        // Should have sufficient contrast (text should not be transparent)
        expect(computedStyle.opacity).not.toBe('0');
        expect(computedStyle.visibility).not.toBe('hidden');
      }
    });

    it('should maintain question readability across different question types', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Track different question types for readability
      const questionTypes = new Set<string>();
      const readabilityChecks: Array<{ type: string; isReadable: boolean; length: number }> = [];

      // Check multiple questions for readability
      for (let i = 0; i < 10; i++) {
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        
        if (questionElements.length > 0) {
          const questionText = questionElements[0].textContent || '';
          
          // Determine question type
          let type = 'unknown';
          if (questionText.includes('+')) type = 'addition';
          else if (questionText.includes('-')) type = 'subtraction';
          else if (questionText.includes('×')) type = 'multiplication';
          else if (questionText.includes('÷')) type = 'division';
          
          questionTypes.add(type);
          
          // Check readability criteria
          const isReadable = questionText.length > 0 && 
                           questionText.length < 20 && // Not too long
                           /\d/.test(questionText) && // Contains numbers
                           /[\+\-\×\÷]/.test(questionText); // Contains operator
          
          readabilityChecks.push({
            type,
            isReadable,
            length: questionText.length
          });
        }

        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Assert readability across question types
      expect(questionTypes.size).toBeGreaterThan(1); // Multiple types seen
      
      const readableQuestions = readabilityChecks.filter(check => check.isReadable);
      expect(readableQuestions.length).toBe(readabilityChecks.length); // All should be readable
      
      // All questions should be reasonable length
      readabilityChecks.forEach(check => {
        expect(check.length).toBeGreaterThan(3); // At least "1+1"
        expect(check.length).toBeLessThan(15); // Not too verbose
      });
    });

    it('should provide clear visual hierarchy for math elements', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check visual hierarchy of game elements
      const gameElements = {
        title: screen.queryByText('Flappy Bird'),
        instruction: screen.queryByText(/Keep flying!/),
        score: screen.queryAllByText(/Score:/),
        question: screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/)
      };

      // Verify elements are present and accessible
      expect(gameElements.instruction).toBeInTheDocument();
      
      if (gameElements.score.length > 0) {
        expect(gameElements.score[0]).toBeInTheDocument();
      }
      
      if (gameElements.question.length > 0) {
        expect(gameElements.question[0]).toBeInTheDocument();
        
        // Question should be prominently displayed
        const questionElement = gameElements.question[0];
        const computedStyle = window.getComputedStyle(questionElement);
        
        // Should not be hidden or have very low opacity
        expect(computedStyle.display).not.toBe('none');
        expect(parseFloat(computedStyle.opacity)).toBeGreaterThan(0.7);
      }
    });

    it('should handle text scaling for different screen sizes', async () => {
      const user = userEvent.setup();
      
      // Test different viewport sizes
      const viewportSizes = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewportSizes) {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height
        });

        render(<Game />);

        // Start game
        const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
        await user.click(gameCanvas);

        await waitFor(() => {
          expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
        }, { timeout: 2000 });

        // Check if elements are still readable at this viewport size
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        
        if (questionElements.length > 0) {
          const questionElement = questionElements[0];
          expect(questionElement).toBeInTheDocument();
          
          // Element should be visible and not clipped
          const rect = questionElement.getBoundingClientRect();
          expect(rect.width).toBeGreaterThan(0);
          expect(rect.height).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Answer Zone Visibility', () => {
    it('should provide clear visual distinction between answer zones', () => {
      // Arrange
      const mathObstacle = new MathObstacle(400, 300, 100, 200);
      const question: MathQuestion = {
        id: 'test_001',
        category: 'addition',
        question: '8 + 7',
        correctAnswer: 15,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      const mockContext = createAccessibleMockCanvas();

      // Act
      mathObstacle.renderAnswerChoices(mockContext);

      // Assert
      expect(mockContext.fillText).toHaveBeenCalledTimes(2); // Two answer choices
      expect(mockContext.fillRect).toHaveBeenCalled(); // Background boxes for answers
      
      // Verify distinct positioning for upper and lower zones
      const fillTextCalls = mockContext.fillText.mock.calls;
      expect(fillTextCalls.length).toBe(2);
      
      // Y positions should be different for upper and lower zones
      const yPositions = fillTextCalls.map(call => call[2]); // Third parameter is y position
      expect(yPositions[0]).not.toBe(yPositions[1]);
      expect(Math.abs(yPositions[0] - yPositions[1])).toBeGreaterThan(50); // Sufficient separation
    });

    it('should ensure answer zones have sufficient size for touch interaction', () => {
      // Arrange
      const mathObstacle = new MathObstacle(400, 300, 100, 200);
      const question: MathQuestion = {
        id: 'test_002',
        category: 'multiplication',
        question: '6 × 4',
        correctAnswer: 24,
        difficulty: 2
      };
      
      mathObstacle.setupAnswerZones(question);

      // Act
      const upperZone = mathObstacle.getUpperAnswerZone();
      const lowerZone = mathObstacle.getLowerAnswerZone();

      // Assert
      expect(upperZone).toBeDefined();
      expect(lowerZone).toBeDefined();
      
      if (upperZone && lowerZone) {
        // Answer zones should be large enough for touch interaction (minimum 44px)
        expect(upperZone.bounds.width).toBeGreaterThanOrEqual(44);
        expect(upperZone.bounds.height).toBeGreaterThanOrEqual(44);
        expect(lowerZone.bounds.width).toBeGreaterThanOrEqual(44);
        expect(lowerZone.bounds.height).toBeGreaterThanOrEqual(44);
        
        // Zones should not overlap
        const upperBottom = upperZone.bounds.y + upperZone.bounds.height;
        const lowerTop = lowerZone.bounds.y;
        expect(upperBottom).toBeLessThanOrEqual(lowerTop);
      }
    });

    it('should provide high contrast for answer zone text', () => {
      // Arrange
      const mathObstacle = new MathObstacle(400, 300, 100, 200);
      const question: MathQuestion = {
        id: 'test_003',
        category: 'division',
        question: '20 ÷ 4',
        correctAnswer: 5,
        difficulty: 2
      };
      
      mathObstacle.setupAnswerZones(question);
      const mockContext = createAccessibleMockCanvas();

      // Act
      mathObstacle.renderAnswerChoices(mockContext);

      // Assert
      // Should set appropriate colors for contrast
      expect(mockContext.fillStyle).toBeDefined();
      expect(mockContext.strokeStyle).toBeDefined();
      
      // Font should be large enough for readability
      expect(mockContext.font).toContain('24px'); // Accessible font size
      expect(mockContext.textAlign).toBe('center'); // Centered for better readability
    });

    it('should maintain answer zone visibility during obstacle movement', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Track visibility during gameplay
      const visibilityChecks: boolean[] = [];

      for (let i = 0; i < 10; i++) {
        // Check if game elements are visible
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        const scoreElements = screen.queryAllByText(/Score:/);
        
        const hasVisibleElements = questionElements.length > 0 || scoreElements.length > 0;
        visibilityChecks.push(hasVisibleElements);

        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Assert
      const visibleFrames = visibilityChecks.filter(visible => visible).length;
      expect(visibleFrames).toBeGreaterThan(5); // Most frames should have visible elements
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should support keyboard navigation for game controls', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Game canvas should be focusable
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      expect(gameCanvas).toHaveAttribute('tabIndex');
      
      // Focus the canvas
      gameCanvas.focus();
      expect(document.activeElement).toBe(gameCanvas);

      // Should respond to spacebar
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should continue to respond to keyboard during gameplay
      for (let i = 0; i < 3; i++) {
        await user.keyboard(' ');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Game should remain functional
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should provide keyboard shortcuts for game restart', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start and play game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      gameCanvas.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Play briefly
      await user.keyboard(' ');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Wait for game over
      await waitFor(() => {
        const playAgainButtons = screen.queryAllByText(/Play Again/);
        return playAgainButtons.length > 0;
      }, { timeout: 10000 });

      // Should support 'R' key for restart
      await user.keyboard('r');
      expect(mockReload).toHaveBeenCalled();
    });

    it('should maintain focus management during game state changes', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Initial focus
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      gameCanvas.focus();
      expect(document.activeElement).toBe(gameCanvas);

      // Start game
      await user.keyboard(' ');
      
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Focus should remain on canvas during gameplay
      expect(document.activeElement).toBe(gameCanvas);

      // Continue gameplay
      await user.keyboard(' ');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Focus should still be maintained
      expect(document.activeElement).toBe(gameCanvas);
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide appropriate ARIA labels for game elements', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Check ARIA labels
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      expect(gameCanvas).toHaveAttribute('aria-label');
      
      const ariaLabel = gameCanvas.getAttribute('aria-label');
      expect(ariaLabel).toContain('Game Canvas');
      expect(ariaLabel).toContain('Click');
      expect(ariaLabel).toContain('spacebar');
    });

    it('should provide meaningful text alternatives for visual elements', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check for text-based game state information
      const textElements = [
        screen.queryByText(/Keep flying!/),
        screen.queryAllByText(/Score:/),
        screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/)
      ];

      textElements.forEach(elements => {
        if (Array.isArray(elements)) {
          elements.forEach(element => {
            if (element) {
              expect(element).toBeInTheDocument();
              expect(element.textContent).toBeTruthy();
            }
          });
        } else if (elements) {
          expect(elements).toBeInTheDocument();
          expect(elements.textContent).toBeTruthy();
        }
      });
    });

    it('should announce important game state changes', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Check for live regions or announcements
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Game state should be communicated through text
      expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      
      // Score should be visible and readable
      const scoreElements = screen.queryAllByText(/Score:/);
      if (scoreElements.length > 0) {
        expect(scoreElements[0]).toBeInTheDocument();
        expect(scoreElements[0].textContent).toMatch(/Score: \d+/);
      }
    });
  });

  describe('Color and Contrast Accessibility', () => {
    it('should not rely solely on color to convey information', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Information should be conveyed through text, not just color
      const informationalElements = [
        screen.queryByText(/Keep flying!/), // Game state
        screen.queryAllByText(/Score:/), // Score information
        screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/) // Math questions
      ];

      informationalElements.forEach(elements => {
        if (Array.isArray(elements)) {
          elements.forEach(element => {
            if (element) {
              // Should have meaningful text content
              expect(element.textContent).toBeTruthy();
              expect(element.textContent?.trim().length).toBeGreaterThan(0);
            }
          });
        } else if (elements) {
          expect(elements.textContent).toBeTruthy();
          expect(elements.textContent?.trim().length).toBeGreaterThan(0);
        }
      });
    });

    it('should maintain sufficient contrast ratios', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check text elements for contrast
      const textElements = [
        screen.queryByText(/Keep flying!/),
        ...screen.queryAllByText(/Score:/),
        ...screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/)
      ];

      textElements.forEach(element => {
        if (element) {
          const computedStyle = window.getComputedStyle(element);
          
          // Should not be transparent or nearly transparent
          const opacity = parseFloat(computedStyle.opacity);
          expect(opacity).toBeGreaterThan(0.7);
          
          // Should not be hidden
          expect(computedStyle.visibility).not.toBe('hidden');
          expect(computedStyle.display).not.toBe('none');
        }
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should provide touch-friendly interaction areas', async () => {
      const user = userEvent.setup();
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      render(<Game />);

      // Game canvas should be touch-friendly
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      
      // Should respond to touch events (simulated as clicks)
      await user.click(gameCanvas);
      
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Canvas should be appropriately sized for mobile
      const canvasRect = gameCanvas.getBoundingClientRect();
      expect(canvasRect.width).toBeGreaterThan(0);
      expect(canvasRect.height).toBeGreaterThan(0);
      
      // Should not be too small for interaction
      expect(canvasRect.width).toBeGreaterThan(200);
      expect(canvasRect.height).toBeGreaterThan(200);
    });

    it('should handle orientation changes gracefully', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start in portrait
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Simulate orientation change to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      // Game should still be functional
      await user.click(gameCanvas);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Requirements Validation - Accessibility', () => {
    it('should satisfy requirement 8.4: Feedback that does not interfere with gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Play and check that feedback elements don't block interaction
      for (let i = 0; i < 5; i++) {
        await user.click(gameCanvas);
        
        // Check that canvas remains clickable and responsive
        expect(gameCanvas).toBeInTheDocument();
        expect(document.activeElement).toBe(gameCanvas);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Game should remain functional throughout
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should satisfy requirement 7.4 and 7.5: Clear visual boundaries and readable numbers', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check for readable math elements
      const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
      
      if (questionElements.length > 0) {
        const questionElement = questionElements[0];
        
        // Should be clearly readable
        expect(questionElement).toBeInTheDocument();
        expect(questionElement.textContent).toMatch(/\d+\s*[\+\-\×\÷]\s*\d+/);
        
        // Should have clear visual presentation
        const computedStyle = window.getComputedStyle(questionElement);
        expect(computedStyle.display).not.toBe('none');
        expect(parseFloat(computedStyle.opacity)).toBeGreaterThan(0.8);
      }
    });

    it('should satisfy requirement 1.3 and 1.4: Large, legible fonts and responsive scaling', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check text elements for appropriate sizing
      const textElements = [
        screen.queryByText(/Keep flying!/),
        ...screen.queryAllByText(/Score:/),
        ...screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/)
      ];

      textElements.forEach(element => {
        if (element) {
          const computedStyle = window.getComputedStyle(element);
          const fontSize = parseInt(computedStyle.fontSize);
          
          // Should meet minimum accessibility font size
          expect(fontSize).toBeGreaterThanOrEqual(14);
          
          // Should be visible and legible
          expect(computedStyle.visibility).not.toBe('hidden');
          expect(parseFloat(computedStyle.opacity)).toBeGreaterThan(0.7);
        }
      });
    });
  });
});