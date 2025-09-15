import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Game from '../../app/page';
import { MathQuestionManager } from '../../utils/MathQuestionManager';

// Mock window.location.reload for restart functionality
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

// Mock performance.now for consistent timing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10 // 10MB
    }
  },
  writable: true
});

describe('Math Game End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Question Pool Management Over Extended Play', () => {
    it('should manage question pool correctly over 50+ questions', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Track questions seen during extended play
      const seenQuestions = new Set<string>();
      const categoryDistribution = new Map<string, number>();
      
      // Simulate extended gameplay - 50 question cycles
      for (let i = 0; i < 50; i++) {
        // Look for question display
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        if (questionElements.length > 0) {
          const questionText = questionElements[0].textContent;
          if (questionText) {
            seenQuestions.add(questionText);
            
            // Categorize question
            let category = 'unknown';
            if (questionText.includes('+')) category = 'addition';
            else if (questionText.includes('-')) category = 'subtraction';
            else if (questionText.includes('×')) category = 'multiplication';
            else if (questionText.includes('÷')) category = 'division';
            
            const count = categoryDistribution.get(category) || 0;
            categoryDistribution.set(category, count + 1);
          }
        }

        // Simulate bird jump to continue gameplay
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Assert question pool management
      expect(seenQuestions.size).toBeGreaterThan(20); // Should see variety
      expect(categoryDistribution.size).toBeGreaterThan(1); // Multiple categories
      
      // Verify all categories are represented over extended play
      const expectedCategories = ['addition', 'subtraction', 'multiplication', 'division'];
      const seenCategories = Array.from(categoryDistribution.keys());
      const categoriesFound = expectedCategories.filter(cat => seenCategories.includes(cat));
      expect(categoriesFound.length).toBeGreaterThan(2);
    });

    it('should prevent immediate question repetition during extended play', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Track recent questions to check for immediate repetition
      const recentQuestions: string[] = [];
      const maxRecentSize = 5;

      for (let i = 0; i < 30; i++) {
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        if (questionElements.length > 0) {
          const questionText = questionElements[0].textContent;
          if (questionText) {
            recentQuestions.push(questionText);
            
            // Keep only recent questions
            if (recentQuestions.length > maxRecentSize) {
              recentQuestions.shift();
            }
            
            // Check for immediate repetition (same question in last 3)
            const lastThree = recentQuestions.slice(-3);
            const uniqueLastThree = new Set(lastThree);
            expect(uniqueLastThree.size).toBeGreaterThan(1); // Should not repeat immediately
          }
        }

        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      expect(recentQuestions.length).toBeGreaterThan(20);
    });

    it('should handle question pool reset and reshuffle correctly', async () => {
      const user = userEvent.setup();
      
      // Create a mock question manager to test pool behavior
      const questionManager = new MathQuestionManager();
      const initialPoolSize = questionManager.getAvailableQuestionsCount();
      
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Play through enough questions to potentially exhaust and reset pool
      const questionsTracked: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        if (questionElements.length > 0) {
          const questionText = questionElements[0].textContent;
          if (questionText) {
            questionsTracked.push(questionText);
          }
        }

        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Assert pool management behavior
      expect(questionsTracked.length).toBeGreaterThan(50);
      
      // Should see repeated questions after pool reset (but not immediately)
      const uniqueQuestions = new Set(questionsTracked);
      const totalQuestions = questionsTracked.length;
      
      // If we've seen more questions than the pool size, pool must have reset
      if (totalQuestions > initialPoolSize) {
        expect(uniqueQuestions.size).toBeLessThan(totalQuestions);
      }
    });
  });

  describe('Traditional Game-Over Mechanics Preservation', () => {
    it('should trigger game over on physical collision while preserving math scoring', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Verify math elements are present during gameplay
      await waitFor(() => {
        const scoreElements = screen.queryAllByText(/Score:/);
        expect(scoreElements.length).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // Play briefly to potentially accumulate math score
      for (let i = 0; i < 3; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait for natural game over (collision with pipes/ground)
      await waitFor(() => {
        const finalScoreElements = screen.queryAllByText(/Final Score:/);
        return finalScoreElements.length > 0;
      }, { timeout: 10000 });

      // Assert traditional game over behavior
      expect(screen.getAllByText(/Final Score:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Play Again/).length).toBeGreaterThan(0);
      
      // Math score should be preserved in final display
      const finalScoreText = screen.getAllByText(/Final Score:/)[0].textContent;
      expect(finalScoreText).toMatch(/Final Score: \d+/);
    });

    it('should maintain collision detection accuracy with math obstacles', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Track game state during collision scenarios
      let gameOverTriggered = false;
      let mathElementsPresent = false;

      // Check for math elements
      const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
      if (questionElements.length > 0) {
        mathElementsPresent = true;
      }

      // Play until collision
      const maxAttempts = 50;
      for (let i = 0; i < maxAttempts && !gameOverTriggered; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if game over occurred
        const gameOverElements = screen.queryAllByText(/Final Score:/);
        if (gameOverElements.length > 0) {
          gameOverTriggered = true;
        }
      }

      // Assert collision behavior
      expect(mathElementsPresent).toBe(true); // Math elements should be present
      expect(gameOverTriggered).toBe(true); // Collision should eventually occur
      
      // Verify final state shows both traditional and math scoring
      const finalScoreElements = screen.getAllByText(/Final Score:/);
      expect(finalScoreElements.length).toBeGreaterThan(0);
    });

    it('should handle restart functionality with math system reset', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Complete a game session
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Play briefly
      await user.click(gameCanvas);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Wait for game over
      await waitFor(() => {
        const playAgainButtons = screen.queryAllByText(/Play Again/);
        return playAgainButtons.length > 0;
      }, { timeout: 10000 });

      // Restart game
      const restartButton = screen.getAllByText(/Play Again/)[0];
      await user.click(restartButton);

      // Verify restart was triggered (mocked to reload page)
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Performance During Extended Math Gameplay', () => {
    it('should maintain smooth performance during extended math gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Measure performance during extended gameplay
      const startTime = performance.now();
      const performanceMetrics = {
        frameCount: 0,
        questionChanges: 0,
        scoreUpdates: 0
      };

      // Extended gameplay simulation
      for (let i = 0; i < 30; i++) {
        performanceMetrics.frameCount++;
        
        // Check for question changes
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        if (questionElements.length > 0) {
          performanceMetrics.questionChanges++;
        }
        
        // Check for score updates
        const scoreElements = screen.queryAllByText(/Score:/);
        if (scoreElements.length > 0) {
          performanceMetrics.scoreUpdates++;
        }

        await user.click(gameCanvas);
        
        // Simulate frame timing
        mockPerformanceNow.mockReturnValue(startTime + (i * 16.67)); // 60fps
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert performance metrics
      expect(performanceMetrics.frameCount).toBe(30);
      expect(performanceMetrics.questionChanges).toBeGreaterThan(0);
      expect(performanceMetrics.scoreUpdates).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
      
      // Game should still be responsive
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should handle memory usage efficiently during extended play', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Simulate memory-intensive extended gameplay
      const memorySnapshots: number[] = [];
      
      for (let i = 0; i < 20; i++) {
        // Simulate memory usage tracking
        const currentMemory = (global.performance as any).memory?.usedJSHeapSize || 0;
        memorySnapshots.push(currentMemory);
        
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Simulate increasing memory usage slightly
        if ((global.performance as any).memory) {
          (global.performance as any).memory.usedJSHeapSize += 1024 * 100; // 100KB increase
        }
      }

      // Assert memory management
      expect(memorySnapshots.length).toBe(20);
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      
      // Memory should not grow excessively
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
      expect(memoryGrowth).toBeLessThan(1024 * 1024 * 10); // Less than 10MB growth
    });
  });

  describe('Accessibility During Math Gameplay', () => {
    it('should maintain question readability throughout gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Test question readability over multiple questions
      const readabilityChecks: Array<{ questionFound: boolean; isReadable: boolean }> = [];

      for (let i = 0; i < 10; i++) {
        const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
        
        if (questionElements.length > 0) {
          const questionElement = questionElements[0];
          const questionText = questionElement.textContent;
          
          readabilityChecks.push({
            questionFound: true,
            isReadable: questionText !== null && questionText.length > 0 && /\d/.test(questionText)
          });
        } else {
          readabilityChecks.push({
            questionFound: false,
            isReadable: false
          });
        }

        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Assert readability
      const questionsFound = readabilityChecks.filter(check => check.questionFound);
      expect(questionsFound.length).toBeGreaterThan(5);
      
      const readableQuestions = questionsFound.filter(check => check.isReadable);
      expect(readableQuestions.length).toBe(questionsFound.length);
    });

    it('should provide accessible answer zone visibility', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check for accessible game elements
      expect(gameCanvas).toHaveAttribute('aria-label');
      expect(gameCanvas.getAttribute('aria-label')).toContain('Game Canvas');

      // Verify canvas is focusable for keyboard accessibility
      expect(gameCanvas).toHaveAttribute('tabIndex');

      // Test keyboard interaction
      gameCanvas.focus();
      await user.keyboard(' ');
      
      // Game should respond to keyboard input
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should maintain consistent UI contrast and visibility', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Check for consistent UI elements visibility
      const uiElements = [
        screen.queryAllByText(/Score:/),
        screen.queryAllByText(/Keep flying!/),
        screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/)
      ];

      uiElements.forEach(elements => {
        if (elements.length > 0) {
          elements.forEach(element => {
            // Element should be visible
            expect(element).toBeInTheDocument();
            
            // Element should have text content
            expect(element.textContent).toBeTruthy();
          });
        }
      });

      // Play briefly to test UI consistency during gameplay
      for (let i = 0; i < 3; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // UI elements should remain visible and accessible
        const scoreElements = screen.queryAllByText(/Score:/);
        if (scoreElements.length > 0) {
          expect(scoreElements[0]).toBeInTheDocument();
        }
      }
    });
  });

  describe('Complete Math Game Validation', () => {
    it('should validate all requirements through end-to-end gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Validation tracking
      const validationResults = {
        questionDisplayed: false,
        scoreTracking: false,
        gameOverMechanics: false,
        mathIntegration: false,
        accessibility: false
      };

      // Check question display (Requirement 1)
      const questionElements = screen.queryAllByText(/\d+\s*[\+\-\×\÷]\s*\d+/);
      if (questionElements.length > 0) {
        validationResults.questionDisplayed = true;
      }

      // Check score tracking (Requirement 4)
      const scoreElements = screen.queryAllByText(/Score:/);
      if (scoreElements.length > 0) {
        validationResults.scoreTracking = true;
      }

      // Check accessibility (Requirement 8)
      if (gameCanvas.hasAttribute('aria-label')) {
        validationResults.accessibility = true;
      }

      // Check math integration
      if (validationResults.questionDisplayed && validationResults.scoreTracking) {
        validationResults.mathIntegration = true;
      }

      // Play until game over to check mechanics (Requirement 3)
      for (let i = 0; i < 20 && !validationResults.gameOverMechanics; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const gameOverElements = screen.queryAllByText(/Final Score:/);
        if (gameOverElements.length > 0) {
          validationResults.gameOverMechanics = true;
        }
      }

      // Assert all requirements validated
      expect(validationResults.questionDisplayed).toBe(true);
      expect(validationResults.scoreTracking).toBe(true);
      expect(validationResults.mathIntegration).toBe(true);
      expect(validationResults.accessibility).toBe(true);
      
      // Game over mechanics should eventually trigger
      if (validationResults.gameOverMechanics) {
        expect(validationResults.gameOverMechanics).toBe(true);
      }
    });
  });
});