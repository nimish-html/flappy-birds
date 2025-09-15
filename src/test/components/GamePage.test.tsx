import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Game from '../../app/page';

// Mock the game components
vi.mock('../../components/GameCanvas', () => ({
  default: function MockGameCanvas({ onScoreUpdate, onGameOver, onGameStart, className }: any) {
    // Simulate game canvas behavior
    React.useEffect(() => {
      // Auto-start game for testing
      if (onGameStart) {
        setTimeout(() => onGameStart(), 100);
      }
    }, [onGameStart]);

    return (
      <div 
        data-testid="game-canvas" 
        className={className}
        onClick={() => {
          // Simulate score updates
          if (onScoreUpdate) {
            onScoreUpdate(1);
            setTimeout(() => onScoreUpdate(2), 100);
            setTimeout(() => onScoreUpdate(3), 200);
            // Simulate game over after some time
            setTimeout(() => onGameOver && onGameOver(3), 300);
          }
        }}
      >
        Mock Game Canvas
      </div>
    );
  }
}));

vi.mock('../../components/ScoreDisplay', () => ({
  default: function MockScoreDisplay({ score, className }: any) {
    return (
      <div data-testid="score-display" className={className}>
        Score: {score}
      </div>
    );
  }
}));

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

// Mock game config
vi.mock('../../utils/gameConfig', () => ({
  GAME_CONFIG: {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600
  }
}));

describe('Game Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the main game page with title and instructions', () => {
    render(<Game />);
    
    expect(screen.getByText('Math Bird')).toBeInTheDocument();
    expect(screen.getByText('Answer math questions by flying through the correct path!')).toBeInTheDocument();
    expect(screen.getByText('How to Play:')).toBeInTheDocument();
  });

  it('renders game canvas component', () => {
    render(<Game />);
    
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });

  it('does not show score display initially', () => {
    render(<Game />);
    
    expect(screen.queryByTestId('score-display')).not.toBeInTheDocument();
  });

  it('shows score display after game starts', async () => {
    render(<Game />);
    
    // Wait for game to auto-start (mocked behavior)
    await waitFor(() => {
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });
  });

  it('updates score when game engine reports score changes', async () => {
    render(<Game />);
    
    // Wait for game to start
    await waitFor(() => {
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });

    // Click canvas to trigger score updates
    fireEvent.click(screen.getByTestId('game-canvas'));

    // Wait for score updates
    await waitFor(() => {
      expect(screen.getByText('Score: 1')).toBeInTheDocument();
    });
  });

  it('shows game over screen when game ends', async () => {
    render(<Game />);
    
    // Click canvas to start the game and trigger game over sequence
    fireEvent.click(screen.getByTestId('game-canvas'));

    // Wait for game over screen to appear
    await waitFor(() => {
      expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByTestId('final-score')).toBeInTheDocument();
    expect(screen.getByTestId('restart-button')).toBeInTheDocument();
  });

  it('displays final score correctly on game over', async () => {
    render(<Game />);
    
    // Click canvas to trigger game sequence
    fireEvent.click(screen.getByTestId('game-canvas'));

    // Wait for game over
    await waitFor(() => {
      expect(screen.getByText('Final Score: 3')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('handles restart functionality', async () => {
    render(<Game />);
    
    // Trigger game over sequence
    fireEvent.click(screen.getByTestId('game-canvas'));

    // Wait for game over screen
    await waitFor(() => {
      expect(screen.getByTestId('restart-button')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click restart button
    fireEvent.click(screen.getByTestId('restart-button'));

    // Verify page reload was called (our restart implementation)
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('updates game status text based on game state', async () => {
    render(<Game />);
    
    // Initially shows start message
    expect(screen.getByText('Answer math questions by flying through the correct path!')).toBeInTheDocument();

    // Wait for game to start and status to change
    await waitFor(() => {
      expect(screen.getByText('Keep flying!')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts for restart', async () => {
    render(<Game />);
    
    // Trigger game over
    fireEvent.click(screen.getByTestId('game-canvas'));

    // Wait for game over
    await waitFor(() => {
      expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Press 'R' key to restart
    fireEvent.keyDown(document, { key: 'r' });

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('shows restart instruction when game is over', async () => {
    render(<Game />);
    
    // Trigger game over
    fireEvent.click(screen.getByTestId('game-canvas'));

    // Wait for game over and check for restart instruction
    await waitFor(() => {
      expect(screen.getByText(/Press 'R' or tap "Play Again" to restart/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('passes correct props to GameCanvas component', () => {
    render(<Game />);
    
    const canvas = screen.getByTestId('game-canvas');
    expect(canvas).toHaveClass('rounded-lg', 'shadow-2xl');
  });

  it('passes correct props to ScoreDisplay component', async () => {
    render(<Game />);
    
    // Wait for game to start
    await waitFor(() => {
      const scoreDisplay = screen.getByTestId('score-display');
      expect(scoreDisplay).toHaveClass('z-10');
    });
  });

  it('shows debug info in development environment', () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<Game />);
    
    expect(screen.getByText(/Game State:/)).toBeInTheDocument();
    expect(screen.getByText(/Score:/)).toBeInTheDocument();
    expect(screen.getByText(/Started:/)).toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('does not show debug info in production environment', () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(<Game />);
    
    expect(screen.queryByText(/Game State:/)).not.toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('handles component mounting and cleanup properly', () => {
    const { unmount } = render(<Game />);
    
    // Component should render without errors
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
    
    // Should unmount without errors
    expect(() => unmount()).not.toThrow();
  });

  it('manages global game state correctly', async () => {
    render(<Game />);
    
    // Initial state
    expect(screen.getByText('Answer math questions by flying through the correct path!')).toBeInTheDocument();
    
    // After game starts
    await waitFor(() => {
      expect(screen.getByText('Keep flying!')).toBeInTheDocument();
    });
    
    // Click to trigger score and game over
    fireEvent.click(screen.getByTestId('game-canvas'));
    
    // After game over
    await waitFor(() => {
      expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});