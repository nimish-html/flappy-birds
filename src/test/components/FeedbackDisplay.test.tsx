import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackDisplay } from '../../components/FeedbackDisplay';
import { AnswerFeedback } from '../../utils/AnswerHandler';

describe('FeedbackDisplay', () => {
  describe('rendering', () => {
    it('should render nothing when feedback is null', () => {
      // Act
      const { container } = render(<FeedbackDisplay feedback={null} />);

      // Assert
      expect(container.firstChild).toBeNull();
    });

    it('should render correct answer feedback', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByText('Correct! +10 points')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-500');
    });

    it('should render incorrect answer feedback', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1500
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByText('Incorrect! -5 points')).toBeInTheDocument();
      expect(screen.getByText('✗')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-500');
    });

    it('should render streak bonus feedback with special styling', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'streak_bonus',
        points: 60,
        message: 'Streak Bonus! +60 points!',
        duration: 2000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByText('Streak Bonus! +60 points!')).toBeInTheDocument();
      expect(screen.getByText('🎉')).toBeInTheDocument();
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('bg-gradient-to-r');
      expect(alertElement).toHaveClass('from-yellow-400');
      expect(alertElement).toHaveClass('to-orange-500');
      expect(alertElement).toHaveClass('animate-bounce');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should be announced to screen readers', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className when provided', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} className="custom-class" />);

      // Assert
      expect(screen.getByRole('alert')).toHaveClass('custom-class');
    });

    it('should have consistent base styling for all feedback types', () => {
      const feedbackTypes: AnswerFeedback[] = [
        { type: 'correct', points: 10, message: 'Correct!', duration: 1000 },
        { type: 'incorrect', points: -5, message: 'Incorrect!', duration: 1000 },
        { type: 'streak_bonus', points: 60, message: 'Bonus!', duration: 2000 }
      ];

      feedbackTypes.forEach((feedback, index) => {
        // Act
        const { unmount } = render(<FeedbackDisplay feedback={feedback} />);
        
        // Assert
        const alertElement = screen.getByRole('alert');
        expect(alertElement).toHaveClass('fixed');
        expect(alertElement).toHaveClass('top-20');
        expect(alertElement).toHaveClass('left-1/2');
        expect(alertElement).toHaveClass('transform');
        expect(alertElement).toHaveClass('-translate-x-1/2');
        expect(alertElement).toHaveClass('px-6');
        expect(alertElement).toHaveClass('py-3');
        expect(alertElement).toHaveClass('rounded-lg');
        expect(alertElement).toHaveClass('font-bold');
        expect(alertElement).toHaveClass('shadow-lg');
        expect(alertElement).toHaveClass('z-50');

        // Clean up for next iteration
        unmount();
      });
    });

    it('should have different colors for different feedback types', () => {
      // Test correct feedback
      const correctFeedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct!',
        duration: 1000
      };
      
      const { unmount: unmountCorrect } = render(<FeedbackDisplay feedback={correctFeedback} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-green-500', 'border-green-600');
      unmountCorrect();

      // Test incorrect feedback
      const incorrectFeedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect!',
        duration: 1000
      };
      
      const { unmount: unmountIncorrect } = render(<FeedbackDisplay feedback={incorrectFeedback} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-red-500', 'border-red-600');
      unmountIncorrect();

      // Test streak bonus feedback
      const bonusFeedback: AnswerFeedback = {
        type: 'streak_bonus',
        points: 60,
        message: 'Bonus!',
        duration: 2000
      };
      
      render(<FeedbackDisplay feedback={bonusFeedback} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-gradient-to-r', 'from-yellow-400', 'to-orange-500', 'border-yellow-600');
    });
  });

  describe('correct answer display (Requirement 4.5)', () => {
    it('should display correct answer when feedback includes it', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1500,
        correctAnswer: 42
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByText('Incorrect! -5 points')).toBeInTheDocument();
      expect(screen.getByText('Correct answer: 42')).toBeInTheDocument();
      expect(screen.getByText('✗')).toBeInTheDocument();
    });

    it('should not display correct answer section for correct feedback', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000,
        correctAnswer: 42 // Even if provided, shouldn't show for correct answers
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByText('Correct! +10 points')).toBeInTheDocument();
      expect(screen.queryByText('Correct answer: 42')).not.toBeInTheDocument();
    });

    it('should not display correct answer section when not provided', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1500
        // No correctAnswer provided
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      expect(screen.getByText('Incorrect! -5 points')).toBeInTheDocument();
      expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
    });

    it('should style correct answer display appropriately', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1500,
        correctAnswer: 15
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const correctAnswerElement = screen.getByText('Correct answer: 15');
      expect(correctAnswerElement).toHaveClass('text-sm', 'font-semibold', 'bg-white', 'bg-opacity-20', 'px-2', 'py-1', 'rounded');
    });
  });

  describe('icons', () => {
    it('should display correct icons for each feedback type', () => {
      const testCases = [
        { type: 'correct' as const, expectedIcon: '✓' },
        { type: 'incorrect' as const, expectedIcon: '✗' },
        { type: 'streak_bonus' as const, expectedIcon: '🎉' }
      ];

      testCases.forEach(({ type, expectedIcon }) => {
        // Arrange
        const feedback: AnswerFeedback = {
          type,
          points: 10,
          message: `${type} message`,
          duration: 1000
        };

        // Act
        const { unmount } = render(<FeedbackDisplay feedback={feedback} />);

        // Assert
        expect(screen.getByText(expectedIcon)).toBeInTheDocument();

        // Clean up
        unmount();
      });
    });
  });

  describe('requirements compliance', () => {
    it('should provide visual feedback for correct answers (Requirement 8.1)', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeVisible();
      expect(alertElement).toHaveClass('bg-green-500'); // Positive visual feedback
      expect(screen.getByText('✓')).toBeInTheDocument(); // Visual indicator
    });

    it('should provide visual feedback for incorrect answers (Requirement 8.2)', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeVisible();
      expect(alertElement).toHaveClass('bg-red-500'); // Negative visual feedback
      expect(screen.getByText('✗')).toBeInTheDocument(); // Visual indicator
    });

    it('should provide special effects for streak bonus (Requirement 8.3)', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'streak_bonus',
        points: 60,
        message: 'Streak Bonus! +60 points!',
        duration: 2000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('animate-bounce'); // Special animation
      expect(alertElement).toHaveClass('bg-gradient-to-r'); // Special gradient
      expect(alertElement).toHaveClass('text-xl'); // Larger text
      expect(screen.getByText('🎉')).toBeInTheDocument(); // Celebration icon
    });

    it('should be positioned to not interfere with gameplay (Requirement 8.4)', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('fixed'); // Fixed positioning
      expect(alertElement).toHaveClass('top-20'); // Positioned at top
      expect(alertElement).toHaveClass('z-50'); // High z-index to be visible
      expect(alertElement).toHaveClass('left-1/2'); // Centered horizontally
      expect(alertElement).toHaveClass('-translate-x-1/2'); // Centered horizontally
    });

    it('should be brief and clear (Requirement 8.5)', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(<FeedbackDisplay feedback={feedback} />);

      // Assert
      const message = screen.getByText('Correct! +10 points');
      expect(message).toBeInTheDocument();
      
      // Check that message is concise and informative
      expect(feedback.message.length).toBeLessThan(50); // Brief message
      expect(feedback.message).toMatch(/^(Correct|Incorrect|Streak Bonus)/); // Clear prefix
      expect(feedback.message).toMatch(/[+-]?\d+\s*points?/); // Clear point indication
    });
  });
});