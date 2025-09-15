import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnswerHandler, AnswerFeedback } from '../utils/AnswerHandler';
import { ScoringSystem } from '../utils/ScoringSystem';
import { ParticleSystem } from '../components/ParticleSystem';
import { render, screen } from '@testing-library/react';
import { FeedbackDisplay } from '../components/FeedbackDisplay';
import React from 'react';

// Mock the ParticleSystem
vi.mock('../components/ParticleSystem', () => ({
  ParticleSystem: vi.fn().mockImplementation(() => ({
    createCollisionParticles: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    clear: vi.fn()
  }))
}));

describe('Task 7: Clear post-selection feedback implementation', () => {
  let answerHandler: AnswerHandler;
  let scoringSystem: ScoringSystem;
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    scoringSystem = new ScoringSystem();
    particleSystem = new ParticleSystem();
    answerHandler = new AnswerHandler(scoringSystem, particleSystem);
  });

  describe('Requirement 4.5: Show correct answer when wrong', () => {
    it('should include correct answer in feedback message for incorrect answers', () => {
      // Arrange
      scoringSystem.processCorrectAnswer(); // Add some points first
      const correctAnswer = 42;

      // Act
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.message).toContain('(Correct: 42)');
      expect(feedback.correctAnswer).toBe(42);
    });

    it('should display correct answer prominently in FeedbackDisplay component', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points (Correct: 15)',
        duration: 1500,
        correctAnswer: 15
      };

      // Act
      render(React.createElement(FeedbackDisplay, { feedback }));

      // Assert
      expect(screen.getByText('Incorrect! -5 points (Correct: 15)')).toBeInTheDocument();
      expect(screen.getByText('Correct answer: 15')).toBeInTheDocument();
      expect(screen.getByText('✗')).toBeInTheDocument();
    });

    it('should not show correct answer section for correct feedback', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'correct',
        points: 10,
        message: 'Correct! +10 points',
        duration: 1000
      };

      // Act
      render(React.createElement(FeedbackDisplay, { feedback }));

      // Assert
      expect(screen.getByText('Correct! +10 points')).toBeInTheDocument();
      expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 4.4: Prominent feedback positioning without obstructing gameplay', () => {
    it('should position feedback prominently at top center', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -5,
        message: 'Incorrect! -5 points',
        duration: 1500,
        correctAnswer: 25
      };

      // Act
      render(React.createElement(FeedbackDisplay, { feedback }));

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveClass('fixed', 'top-20', 'left-1/2', '-translate-x-1/2');
      expect(alertElement).toHaveClass('z-50'); // High z-index to be visible
    });

    it('should have longer duration for incorrect feedback to read correct answer', () => {
      // Arrange
      const correctAnswer = 18;

      // Act
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, correctAnswer);

      // Assert
      expect(feedback.duration).toBe(1500); // 1.5 seconds vs 1 second for correct answers
    });
  });

  describe('Requirement 4.1 & 4.2: Clear feedback for correct and incorrect answers', () => {
    it('should provide clear positive feedback for correct answers', () => {
      // Act
      const feedback = answerHandler.validateCorrectAnswer(100, 200);

      // Assert
      expect(feedback.type).toBe('correct');
      expect(feedback.message).toContain('Correct!');
      expect(feedback.points).toBeGreaterThan(0);
    });

    it('should provide clear negative feedback for incorrect answers', () => {
      // Arrange
      scoringSystem.processCorrectAnswer(); // Add some points first

      // Act
      const feedback = answerHandler.handleIncorrectAnswer(100, 200, 30);

      // Assert
      expect(feedback.type).toBe('incorrect');
      expect(feedback.message).toContain('Incorrect!');
      expect(feedback.message).toContain('(Correct: 30)');
      expect(feedback.points).toBeLessThanOrEqual(0);
    });
  });

  describe('Enhanced feedback display styling', () => {
    it('should style correct answer display with appropriate visual hierarchy', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -3,
        message: 'Incorrect! -3 points',
        duration: 1500,
        correctAnswer: 7
      };

      // Act
      render(React.createElement(FeedbackDisplay, { feedback }));

      // Assert
      const correctAnswerElement = screen.getByText('Correct answer: 7');
      expect(correctAnswerElement).toHaveClass(
        'text-sm', 
        'font-semibold', 
        'bg-white', 
        'bg-opacity-20', 
        'px-2', 
        'py-1', 
        'rounded'
      );
    });

    it('should maintain accessibility with proper ARIA attributes', () => {
      // Arrange
      const feedback: AnswerFeedback = {
        type: 'incorrect',
        points: -2,
        message: 'Incorrect! -2 points',
        duration: 1500,
        correctAnswer: 12
      };

      // Act
      render(React.createElement(FeedbackDisplay, { feedback }));

      // Assert
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'polite');
    });
  });
});