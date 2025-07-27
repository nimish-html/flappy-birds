import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreDisplay } from '../../components/ScoreDisplay';

describe('ScoreDisplay', () => {
  describe('Basic Rendering', () => {
    it('should render the score display with initial score of 0', () => {
      render(<ScoreDisplay score={0} />);
      
      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByTestId('score-value')).toHaveTextContent('0');
    });

    it('should render the score display with a positive score', () => {
      render(<ScoreDisplay score={42} />);
      
      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByTestId('score-value')).toHaveTextContent('42');
    });

    it('should render the score display with a large score', () => {
      render(<ScoreDisplay score={9999} />);
      
      expect(screen.getByTestId('score-value')).toHaveTextContent('9999');
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper positioning classes for top-right corner', () => {
      const { container } = render(<ScoreDisplay score={10} />);
      const scoreDisplay = container.firstChild as HTMLElement;
      
      expect(scoreDisplay).toHaveClass('absolute', 'top-4', 'right-4');
    });

    it('should have proper styling classes for appearance', () => {
      const { container } = render(<ScoreDisplay score={5} />);
      const scoreDisplay = container.firstChild as HTMLElement;
      
      expect(scoreDisplay).toHaveClass(
        'bg-white',
        'bg-opacity-90',
        'rounded-lg',
        'shadow-lg',
        'px-4',
        'py-2',
        'border',
        'border-gray-200'
      );
    });

    it('should apply custom className when provided', () => {
      const customClass = 'custom-score-class';
      const { container } = render(<ScoreDisplay score={7} className={customClass} />);
      const scoreDisplay = container.firstChild as HTMLElement;
      
      expect(scoreDisplay).toHaveClass(customClass);
    });

    it('should have tabular-nums class for consistent number spacing', () => {
      render(<ScoreDisplay score={123} />);
      const scoreValue = screen.getByTestId('score-value');
      
      expect(scoreValue).toHaveClass('tabular-nums');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ScoreDisplay score={15} />);
      const scoreDisplay = screen.getByRole('status');
      
      expect(scoreDisplay).toHaveAttribute('aria-live', 'polite');
      expect(scoreDisplay).toHaveAttribute('aria-label', 'Current score: 15');
    });

    it('should update aria-label when score changes', () => {
      const { rerender } = render(<ScoreDisplay score={5} />);
      let scoreDisplay = screen.getByRole('status');
      expect(scoreDisplay).toHaveAttribute('aria-label', 'Current score: 5');

      rerender(<ScoreDisplay score={10} />);
      scoreDisplay = screen.getByRole('status');
      expect(scoreDisplay).toHaveAttribute('aria-label', 'Current score: 10');
    });
  });

  describe('Score Updates', () => {
    it('should update displayed score when prop changes', () => {
      const { rerender } = render(<ScoreDisplay score={0} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('0');

      rerender(<ScoreDisplay score={1} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('1');

      rerender(<ScoreDisplay score={25} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('25');
    });

    it('should handle rapid score updates', () => {
      const { rerender } = render(<ScoreDisplay score={0} />);
      
      // Simulate rapid score updates
      for (let i = 1; i <= 10; i++) {
        rerender(<ScoreDisplay score={i} />);
        expect(screen.getByTestId('score-value')).toHaveTextContent(i.toString());
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative scores (edge case)', () => {
      render(<ScoreDisplay score={-1} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('-1');
    });

    it('should handle very large scores', () => {
      render(<ScoreDisplay score={999999} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('999999');
    });

    it('should handle decimal scores (edge case)', () => {
      render(<ScoreDisplay score={5.5} />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('5.5');
    });
  });

  describe('Responsive Design', () => {
    it('should maintain consistent layout structure', () => {
      render(<ScoreDisplay score={42} />);
      
      const scoreDisplay = screen.getByRole('status');
      const scoreLabel = screen.getByText('Score');
      const scoreValue = screen.getByTestId('score-value');
      
      // Check that elements are present and properly structured
      expect(scoreDisplay).toContainElement(scoreLabel);
      expect(scoreDisplay).toContainElement(scoreValue);
      
      // Check flex layout classes
      const flexContainer = scoreLabel.parentElement;
      expect(flexContainer).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should have appropriate text sizes for different screen contexts', () => {
      render(<ScoreDisplay score={100} />);
      
      const scoreLabel = screen.getByText('Score');
      const scoreValue = screen.getByTestId('score-value');
      
      expect(scoreLabel).toHaveClass('text-sm');
      expect(scoreValue).toHaveClass('text-2xl');
    });
  });

  describe('Component Integration', () => {
    it('should render without crashing with default props', () => {
      expect(() => render(<ScoreDisplay score={0} />)).not.toThrow();
    });

    it('should be compatible with different parent containers', () => {
      const { container } = render(
        <div className="relative">
          <ScoreDisplay score={10} />
        </div>
      );
      
      const scoreDisplay = container.querySelector('[role="status"]');
      expect(scoreDisplay).toBeInTheDocument();
      expect(scoreDisplay).toHaveClass('absolute');
    });
  });
});