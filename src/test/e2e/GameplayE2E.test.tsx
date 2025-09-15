import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Game from '../../app/page';

// Mock the GameCanvas component to simulate game behavior
vi.mock('../../components/GameCanvas', () => ({
  default: function MockGameCanvas({ 
    onScoreUpdate, 
    onGameOver, 
    onGameStart, 
    className,
    width = 800,
    height = 600
  }: any) {
    const [gameState, setGameState] = React.useState({
      isPlaying: false,
      score: 0,
      isGameOver: false,
      hasStarted: false
    });

    // Simulate game behavior
    React.useEffect(() => {
      let scoreInterval: NodeJS.Timeout;
      let gameOverTimeout: NodeJS.Timeout;
      
      if (gameState.isPlaying && !gameState.isGameOver) {
        // Simulate scoring every second
        scoreInterval = setInterval(() => {
          setGameState(prev => {
            const newScore = prev.score + 1;
            onScoreUpdate?.(newScore);
            return { ...prev, score: newScore };
          });
        }, 1000);

        // Simulate game over after 3 seconds
        gameOverTimeout = setTimeout(() => {
          setGameState(prev => {
            const finalScore = prev.score;
            onGameOver?.(finalScore);
            return { ...prev, isGameOver: true, isPlaying: false };
          });
        }, 3000);
      }

      return () => {
        clearInterval(scoreInterval);
        clearTimeout(gameOverTimeout);
      };
    }, [gameState.isPlaying, gameState.isGameOver, onScoreUpdate, onGameOver]);

    const handleClick = () => {
      if (!gameState.hasStarted) {
        // First click starts the game
        setGameState(prev => ({ 
          ...prev, 
          isPlaying: true, 
          hasStarted: true,
          score: 0,
          isGameOver: false 
        }));
        onGameStart?.();
      } else if (gameState.isGameOver) {
        // Click when game over restarts
        setGameState({ 
          isPlaying: true, 
          score: 0, 
          isGameOver: false,
          hasStarted: true 
        });
        onGameStart?.();
      }
      // During gameplay, clicks are just jumps (no state change needed for test)
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    };

    return (
      <canvas
        data-testid="game-canvas"
        className={className}
        width={width}
        height={height}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Math Bird Game Canvas - Click or press spacebar to make the bird jump"
        style={{ border: '1px solid #ccc', display: 'block' }}
      >
        Game Canvas Mock
      </canvas>
    );
  }
}));

// Mock ScoreDisplay component
vi.mock('../../components/ScoreDisplay', () => ({
  default: function MockScoreDisplay({ score, className }: any) {
    return (
      <div data-testid="score-display" className={className}>
        Score: {score}
      </div>
    );
  }
}));

// Mock GameOverScreen component
vi.mock('../../components/GameOverScreen', () => ({
  default: function MockGameOverScreen({ score, onRestart, isVisible }: any) {
    return isVisible ? (
      <div data-testid="game-over-screen">
        <div data-testid="final-score">Final Score: {score}</div>
        <button data-testid="restart-button" onClick={onRestart}>
          Play Again
        </button>
      </div>
    ) : null;
  }
}));

// Mock window.location.reload for restart functionality
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true
});

describe('Flappy Bird Game - End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Gameplay Flow', () => {
    it('should complete a full game session from start to game over to restart', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // 1. Initial state - game should show start screen
      expect(screen.getByText('Flappy Bird')).toBeInTheDocument();
      expect(screen.getByText(/Tap the canvas or press spacebar to start/)).toBeInTheDocument();
      expect(screen.queryByTestId('score-display')).not.toBeInTheDocument();
      expect(screen.queryByTestId('game-over-screen')).not.toBeInTheDocument();

      // 2. Start the game by clicking canvas
      const canvas = screen.getByTestId('game-canvas');
      await user.click(canvas);

      // Wait for game to start and show score
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Score should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('score-display')).toBeInTheDocument();
      });

      // 3. Play the game - simulate bird jumps
      for (let i = 0; i < 3; i++) {
        await user.click(canvas);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 4. Wait for game over (mocked to happen after 3 seconds)
      await waitFor(() => {
        expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByTestId('final-score')).toBeInTheDocument();
      expect(screen.getByTestId('restart-button')).toBeInTheDocument();

      // 5. Restart the game
      const restartButton = screen.getByTestId('restart-button');
      await user.click(restartButton);

      // Verify restart was called
      expect(mockReload).toHaveBeenCalled();
    });

    it('should handle keyboard controls throughout the game session', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game with spacebar
      const canvas = screen.getByTestId('game-canvas');
      canvas.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Use spacebar to control bird during gameplay
      for (let i = 0; i < 3; i++) {
        await user.keyboard(' ');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait for game over
      await waitFor(() => {
        expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Restart with 'R' key
      await user.keyboard('r');
      expect(mockReload).toHaveBeenCalled();
    });

    it('should maintain consistent score tracking throughout gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Start game
      const canvas = screen.getByTestId('game-canvas');
      await user.click(canvas);

      await waitFor(() => {
        expect(screen.getByTestId('score-display')).toBeInTheDocument();
      });

      // Wait for score to increase (mocked to increase every second)
      await waitFor(() => {
        const scoreElement = screen.getByTestId('score-display');
        expect(scoreElement.textContent).toMatch(/Score: [1-9]/);
      }, { timeout: 2000 });

      // Wait for game over
      await waitFor(() => {
        expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify final score is displayed
      const finalScoreElement = screen.getByTestId('final-score');
      expect(finalScoreElement.textContent).toMatch(/Final Score: \d+/);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle rapid clicking without breaking game state', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');
      
      // Start game
      await user.click(canvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Rapid clicking test - click very quickly multiple times
      for (let i = 0; i < 10; i++) {
        await user.click(canvas);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Game should still be responsive and not crash
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();
    });

    it('should handle rapid keyboard input without issues', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');
      canvas.focus();

      // Start with spacebar
      await user.keyboard(' ');
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Rapid spacebar pressing
      for (let i = 0; i < 10; i++) {
        await user.keyboard(' ');
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Game should remain stable
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();
    });

    it('should handle mixed input methods (mouse and keyboard)', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');

      // Start with mouse click
      await user.click(canvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Alternate between mouse clicks and keyboard
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) {
          await user.click(canvas);
        } else {
          canvas.focus();
          await user.keyboard(' ');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Game should handle mixed input correctly
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();
    });

    it('should handle game restart multiple times in succession', async () => {
      const user = userEvent.setup();

      // Play and restart multiple times
      for (let gameSession = 0; gameSession < 2; gameSession++) {
        // Clear previous reload calls
        mockReload.mockClear();

        render(<Game />);

        // Start game
        const canvas = screen.getByTestId('game-canvas');
        await user.click(canvas);

        await waitFor(() => {
          expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
        });

        // Play briefly
        await user.click(canvas);
        await new Promise(resolve => setTimeout(resolve, 200));

        // Wait for game over
        await waitFor(() => {
          expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
        }, { timeout: 5000 });

        // Restart
        const restartButton = screen.getByTestId('restart-button');
        await user.click(restartButton);

        expect(mockReload).toHaveBeenCalledTimes(1);
      }
    });

    it('should maintain game state consistency during focus/blur scenarios', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');
      
      // Start game
      await user.click(canvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Simulate tab switching (which might pause/resume the game)
      fireEvent.blur(canvas);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      fireEvent.focus(canvas);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Game should continue normally
      expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });
  });

  describe('User Interaction Validation', () => {
    it('should respond correctly to all supported input methods', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');

      // Test mouse click to start
      await user.click(canvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Test spacebar for jumping
      canvas.focus();
      await user.keyboard(' ');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test mouse click for jumping
      await user.click(canvas);
      await new Promise(resolve => setTimeout(resolve, 100));

      // All inputs should work without errors
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();
    });

    it('should ignore input when game is not in appropriate state', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');
      canvas.focus();

      // Try to jump before game starts (should start game instead)
      await user.keyboard(' ');
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Wait for game over
      await waitFor(() => {
        expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Try to jump when game is over (should restart instead)
      await user.click(canvas);

      // Should trigger restart
      expect(mockReload).toHaveBeenCalled();
    });

    it('should provide appropriate visual feedback for all interactions', async () => {
      const user = userEvent.setup();
      render(<Game />);

      // Initial state feedback
      expect(screen.getByText(/Tap the canvas or press spacebar to start/)).toBeInTheDocument();

      // Start game
      const canvas = screen.getByTestId('game-canvas');
      await user.click(canvas);

      // Playing state feedback
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Score feedback should be visible
      expect(screen.getByTestId('score-display')).toBeInTheDocument();

      // Wait for game over
      await waitFor(() => {
        expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Game over feedback should be visible
      expect(screen.getByTestId('final-score')).toBeInTheDocument();
      expect(screen.getByTestId('restart-button')).toBeInTheDocument();
    });
  });

  describe('Performance and Stability', () => {
    it('should maintain stable performance during extended gameplay', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');
      
      // Start game
      await user.click(canvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Simulate extended gameplay (many interactions)
      const startTime = performance.now();
      
      // Simulate rapid interactions
      for (let i = 0; i < 20; i++) {
        await user.click(canvas);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Game should still be responsive
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();

      // Performance should be reasonable
      expect(duration).toBeLessThan(5000);
    });

    it('should handle memory cleanup properly on game restart', async () => {
      const user = userEvent.setup();
      
      // Play multiple game sessions to test memory cleanup
      for (let session = 0; session < 2; session++) {
        render(<Game />);

        const canvas = screen.getByTestId('game-canvas');
        
        // Start and play game
        await user.click(canvas);
        await waitFor(() => {
          expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Wait for game over
        await waitFor(() => {
          expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
        }, { timeout: 5000 });

        // Restart
        const restartButton = screen.getByTestId('restart-button');
        await user.click(restartButton);

        // Each session should work without accumulating errors
        expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();
      }
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
      const canvas = screen.getByTestId('game-canvas');
      await user.click(canvas);

      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });
      stateChanges.push('playing');

      // Verify score is tracking
      expect(screen.getByTestId('score-display')).toBeInTheDocument();

      // Play for a while
      for (let i = 0; i < 2; i++) {
        await user.click(canvas);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait for game over
      await waitFor(() => {
        expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      }, { timeout: 5000 });
      stateChanges.push('game_over');

      // Verify all expected state transitions occurred
      expect(stateChanges).toEqual(['initial', 'playing', 'game_over']);

      // Verify final state is consistent
      expect(screen.getByTestId('final-score')).toBeInTheDocument();
      expect(screen.getByTestId('restart-button')).toBeInTheDocument();
    });

    it('should handle concurrent state changes gracefully', async () => {
      const user = userEvent.setup();
      render(<Game />);

      const canvas = screen.getByTestId('game-canvas');
      
      // Start game
      await user.click(canvas);
      await waitFor(() => {
        expect(screen.getByText(/Keep flying!/)).toBeInTheDocument();
      });

      // Simulate rapid state-changing actions
      const actions = [
        () => user.click(canvas),
        () => { canvas.focus(); return user.keyboard(' '); },
        () => new Promise(resolve => setTimeout(resolve, 50)),
        () => user.click(canvas),
        () => new Promise(resolve => setTimeout(resolve, 50))
      ];

      // Execute actions rapidly
      await Promise.all(actions.map(action => action()));

      // Game should remain in a consistent state
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
      expect(screen.queryByText(/Game Error/)).not.toBeInTheDocument();
    });
  });
});