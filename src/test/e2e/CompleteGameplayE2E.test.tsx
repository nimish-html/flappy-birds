import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Game from '../../app/page';

// Mock window.location.reload for restart functionality
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

describe('Flappy Bird Game - Complete End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Gameplay Session', () => {
    it('should simulate a complete game session from start to game over to restart', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // 1. Verify initial game state
      expect(screen.getByText('Flappy Bird')).toBeInTheDocument();
      expect(screen.getByText(/Tap the canvas or press spacebar to start/)).toBeInTheDocument();
      expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Final Score:/)).not.toBeInTheDocument();

      // 2. Find and interact with the game canvas
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      expect(gameCanvas).toBeInTheDocument();

      // 3. Start the game by clicking the canvas
      await user.click(gameCanvas);

      // 4. Wait for game to start and show playing state
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // 5. Verify score display appears
      await waitFor(() => {
        const scoreElements = screen.queryAllByText(/Score:/);
        expect(scoreElements.length).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // 6. Simulate gameplay - make several jumps
      for (let i = 0; i < 5; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 7. Wait for game over (this will happen naturally due to game physics)
      // We'll wait for either the game over screen or a reasonable timeout
      await waitFor(() => {
        const gameOverElements = screen.queryAllByText(/Final Score:/);
        const playAgainButtons = screen.queryAllByText(/Play Again/);
        return gameOverElements.length > 0 || playAgainButtons.length > 0;
      }, { timeout: 10000 });

      // 8. Verify game over state
      const finalScoreElements = screen.queryAllByText(/Final Score:/);
      const playAgainButtons = screen.queryAllByText(/Play Again/);
      
      expect(finalScoreElements.length).toBeGreaterThan(0);
      expect(playAgainButtons.length).toBeGreaterThan(0);

      // 9. Restart the game
      const restartButton = playAgainButtons[0];
      await user.click(restartButton);

      // 10. Verify restart was triggered
      expect(mockReload).toHaveBeenCalled();
    });

    it('should handle keyboard controls throughout the game session', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game with spacebar
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      gameCanvas.focus();
      await user.keyboard(' ');

      // Wait for game to start
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Use spacebar to control bird during gameplay
      for (let i = 0; i < 3; i++) {
        await user.keyboard(' ');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Wait for game over
      await waitFor(() => {
        const playAgainButtons = screen.queryAllByText(/Play Again/);
        return playAgainButtons.length > 0;
      }, { timeout: 10000 });

      // Restart with 'R' key
      await user.keyboard('r');
      expect(mockReload).toHaveBeenCalled();
    });

    it('should maintain score consistency throughout gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      // Wait for game to start and score to appear
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for score display to appear
      await waitFor(() => {
        const scoreElements = screen.queryAllByText(/Score:/);
        expect(scoreElements.length).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // Play for a while to potentially increase score
      for (let i = 0; i < 3; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for game over
      await waitFor(() => {
        const finalScoreElements = screen.queryAllByText(/Final Score:/);
        return finalScoreElements.length > 0;
      }, { timeout: 10000 });

      // Verify final score is displayed and is a valid number
      const finalScoreElements = screen.getAllByText(/Final Score:/);
      expect(finalScoreElements.length).toBeGreaterThan(0);
      
      const finalScoreText = finalScoreElements[0].textContent;
      expect(finalScoreText).toMatch(/Final Score: \d+/);
    });
  });

  describe('Edge Cases and User Interactions', () => {
    it('should handle rapid clicking without breaking', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      
      // Start game
      await user.click(gameCanvas);
      
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Rapid clicking test
      for (let i = 0; i < 10; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Game should still be functional
      const scoreElements = screen.queryAllByText(/Score:/);
      expect(scoreElements.length).toBeGreaterThan(0);
      
      // Should not show any error messages
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/crash/i)).not.toBeInTheDocument();
    });

    it('should handle mixed input methods correctly', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);

      // Start with mouse click
      await user.click(gameCanvas);
      
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Alternate between mouse clicks and keyboard
      for (let i = 0; i < 4; i++) {
        if (i % 2 === 0) {
          await user.click(gameCanvas);
        } else {
          gameCanvas.focus();
          await user.keyboard(' ');
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Game should handle mixed input correctly
      const scoreElements = screen.queryAllByText(/Score:/);
      expect(scoreElements.length).toBeGreaterThan(0);
    });

    it('should provide appropriate visual feedback for all game states', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Initial state feedback
      expect(screen.getByText(/Tap the canvas or press spacebar to start/)).toBeInTheDocument();

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      // Playing state feedback
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Score feedback should be visible
      await waitFor(() => {
        const scoreElements = screen.queryAllByText(/Score:/);
        expect(scoreElements.length).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // Wait for game over
      await waitFor(() => {
        const finalScoreElements = screen.queryAllByText(/Final Score:/);
        const playAgainButtons = screen.queryAllByText(/Play Again/);
        return finalScoreElements.length > 0 && playAgainButtons.length > 0;
      }, { timeout: 10000 });

      // Game over feedback should be visible
      expect(screen.getAllByText(/Final Score:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Play Again/).length).toBeGreaterThan(0);
    });
  });

  describe('Game State Consistency', () => {
    it('should maintain consistent state throughout complete game lifecycle', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Track state changes throughout the game
      const stateChanges: string[] = [];

      // Initial state
      expect(screen.getByText(/Tap the canvas or press spacebar to start/)).toBeInTheDocument();
      stateChanges.push('initial');

      // Start game
      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      await user.click(gameCanvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });
      stateChanges.push('playing');

      // Verify score is tracking
      await waitFor(() => {
        const scoreElements = screen.queryAllByText(/Score:/);
        expect(scoreElements.length).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // Play for a while
      for (let i = 0; i < 2; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Wait for game over
      await waitFor(() => {
        const finalScoreElements = screen.queryAllByText(/Final Score:/);
        return finalScoreElements.length > 0;
      }, { timeout: 10000 });
      stateChanges.push('game_over');

      // Verify all expected state transitions occurred
      expect(stateChanges).toEqual(['initial', 'playing', 'game_over']);

      // Verify final state is consistent
      expect(screen.getAllByText(/Final Score:/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Play Again/).length).toBeGreaterThan(0);
    });

    it('should handle game restart functionality correctly', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start and play game
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

      // Restart
      const restartButton = screen.getAllByText(/Play Again/)[0];
      await user.click(restartButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Stability', () => {
    it('should maintain stable performance during extended gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const gameCanvas = screen.getByLabelText(/Math Bird Game Canvas/);
      
      // Start game
      await user.click(gameCanvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Simulate extended gameplay with many interactions
      const startTime = performance.now();
      
      for (let i = 0; i < 20; i++) {
        await user.click(gameCanvas);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Game should still be responsive
      const scoreElements = screen.queryAllByText(/Score:/);
      expect(scoreElements.length).toBeGreaterThan(0);
      
      // Should not show any error messages
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

      // Performance should be reasonable
      expect(duration).toBeLessThan(10000); // Should complete in reasonable time
    });
  });
});