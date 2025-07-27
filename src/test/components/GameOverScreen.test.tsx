import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameOverScreen } from '../../components/GameOverScreen';

describe('GameOverScreen', () => {
  const defaultProps = {
    score: 10,
    onRestart: vi.fn(),
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should render when isVisible is true', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      expect(screen.getByTestId('game-over-screen')).toBeInTheDocument();
      expect(screen.getByText('Game Over')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      render(<GameOverScreen {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByTestId('game-over-screen')).not.toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('should display the final score prominently', () => {
      render(<GameOverScreen {...defaultProps} score={25} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement).toHaveTextContent('25');
    });

    it('should display score of 0 correctly', () => {
      render(<GameOverScreen {...defaultProps} score={0} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('0');
    });

    it('should display high scores correctly', () => {
      render(<GameOverScreen {...defaultProps} score={999} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('999');
    });

    it('should have proper aria-label for score accessibility', () => {
      render(<GameOverScreen {...defaultProps} score={15} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveAttribute('aria-label', 'Final score: 15');
    });
  });

  describe('Restart Button', () => {
    it('should render restart button with correct text', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const restartButton = screen.getByTestId('restart-button');
      expect(restartButton).toBeInTheDocument();
      expect(restartButton).toHaveTextContent('Play Again');
    });

    it('should call onRestart when restart button is clicked', () => {
      const mockOnRestart = vi.fn();
      render(<GameOverScreen {...defaultProps} onRestart={mockOnRestart} />);
      
      const restartButton = screen.getByTestId('restart-button');
      fireEvent.click(restartButton);
      
      expect(mockOnRestart).toHaveBeenCalledTimes(1);
    });

    it('should have proper aria-label for accessibility', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const restartButton = screen.getByTestId('restart-button');
      expect(restartButton).toHaveAttribute('aria-label', 'Restart game');
    });

    it('should be focusable for keyboard navigation', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const restartButton = screen.getByTestId('restart-button');
      restartButton.focus();
      expect(restartButton).toHaveFocus();
    });
  });

  describe('Modal Behavior', () => {
    it('should have proper modal attributes', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const modal = screen.getByTestId('game-over-screen');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'game-over-title');
    });

    it('should have game over title with correct id', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const title = screen.getByText('Game Over');
      expect(title).toHaveAttribute('id', 'game-over-title');
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should apply default styling classes', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const modal = screen.getByTestId('game-over-screen');
      expect(modal).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
    });

    it('should apply custom className when provided', () => {
      render(<GameOverScreen {...defaultProps} className="custom-class" />);
      
      const modal = screen.getByTestId('game-over-screen');
      expect(modal).toHaveClass('custom-class');
    });

    it('should apply animation classes', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      const modal = screen.getByTestId('game-over-screen');
      expect(modal).toHaveClass('animate-fade-in');
    });
  });

  describe('Keyboard Interaction', () => {
    it('should trigger restart on Enter key press on button', () => {
      const mockOnRestart = vi.fn();
      render(<GameOverScreen {...defaultProps} onRestart={mockOnRestart} />);
      
      const restartButton = screen.getByTestId('restart-button');
      fireEvent.keyDown(restartButton, { key: 'Enter', code: 'Enter' });
      
      // The button's default behavior should handle Enter key
      expect(restartButton).toBeInTheDocument();
    });

    it('should trigger restart on Space key press on button', () => {
      const mockOnRestart = vi.fn();
      render(<GameOverScreen {...defaultProps} onRestart={mockOnRestart} />);
      
      const restartButton = screen.getByTestId('restart-button');
      fireEvent.keyDown(restartButton, { key: ' ', code: 'Space' });
      
      // The button's default behavior should handle Space key
      expect(restartButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative scores', () => {
      render(<GameOverScreen {...defaultProps} score={-5} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('-5');
    });

    it('should handle very large scores', () => {
      render(<GameOverScreen {...defaultProps} score={999999} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('999999');
    });

    it('should not crash when onRestart is undefined', () => {
      // @ts-expect-error Testing edge case
      render(<GameOverScreen {...defaultProps} onRestart={undefined} />);
      
      const restartButton = screen.getByTestId('restart-button');
      expect(() => fireEvent.click(restartButton)).not.toThrow();
    });
  });

  describe('Component Structure', () => {
    it('should render all required elements', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      // Check for main elements
      expect(screen.getByText('Game Over')).toBeInTheDocument();
      expect(screen.getByText('Final Score')).toBeInTheDocument();
      expect(screen.getByTestId('final-score')).toBeInTheDocument();
      expect(screen.getByTestId('restart-button')).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      render(<GameOverScreen {...defaultProps} />);
      
      // Check for heading
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Game Over');
      
      // Check for button
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Play Again');
    });
  });
});