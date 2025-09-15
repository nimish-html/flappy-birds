import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameOverScreen, GameOverData } from '../components/GameOverScreen';

/**
 * Task 12 GameOverScreen Verification Tests
 * 
 * Verifies that the GameOverScreen component properly displays:
 * - Final score that matches accumulated gameplay score (Requirement 6.5)
 * - Highest streak achieved during the session (Requirement 6.6)
 * - All statistics are accurately reflected in the display
 */
describe('Task 12: GameOverScreen Statistics Display Verification', () => {
  const defaultProps = {
    score: 0,
    onRestart: vi.fn(),
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Final Score Display (Requirement 6.5)', () => {
    it('should display final score that matches accumulated gameplay score', () => {
      const accumulatedScore = 47; // Score accumulated during gameplay
      
      render(<GameOverScreen {...defaultProps} score={accumulatedScore} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent(accumulatedScore.toString());
      expect(scoreElement).toHaveAttribute('aria-label', `Final score: ${accumulatedScore}`);
    });

    it('should display zero score correctly when no points were accumulated', () => {
      render(<GameOverScreen {...defaultProps} score={0} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('0');
    });

    it('should display negative scores correctly when math penalties exceeded gains', () => {
      const negativeScore = -15;
      
      render(<GameOverScreen {...defaultProps} score={negativeScore} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('-15');
    });

    it('should display very high accumulated scores correctly', () => {
      const highScore = 999999;
      
      render(<GameOverScreen {...defaultProps} score={highScore} />);
      
      const scoreElement = screen.getByTestId('final-score');
      expect(scoreElement).toHaveTextContent('999999');
    });
  });

  describe('Highest Streak Display (Requirement 6.6)', () => {
    it('should display highest streak achieved during the session', () => {
      const mathData: GameOverData = {
        score: 50,
        mathScore: 85,
        streak: 3, // Current streak at game over
        highestStreak: 7, // Highest streak achieved during session
        totalCorrect: 10,
        totalIncorrect: 2,
        accuracy: 83.3
      };

      render(<GameOverScreen {...defaultProps} mathData={mathData} />);
      
      const bestStreakElement = screen.getByTestId('best-streak');
      expect(bestStreakElement).toHaveTextContent('7');
      
      // Verify the label is correct
      expect(screen.getByText('Best Streak')).toBeInTheDocument();
    });

    it('should display highest streak even when current streak is lower', () => {
      const mathData: GameOverData = {
        score: 30,
        mathScore: 45,
        streak: 1, // Low current streak
        highestStreak: 12, // Much higher streak achieved earlier
        totalCorrect: 8,
        totalIncorrect: 4,
        accuracy: 66.7
      };

      render(<GameOverScreen {...defaultProps} mathData={mathData} />);
      
      const bestStreakElement = screen.getByTestId('best-streak');
      expect(bestStreakElement).toHaveTextContent('12');
    });

    it('should display zero highest streak when no correct answers were given', () => {
      const mathData: GameOverData = {
        score: 5,
        mathScore: 0,
        streak: 0,
        highestStreak: 0,
        totalCorrect: 0,
        totalIncorrect: 3,
        accuracy: 0
      };

      render(<GameOverScreen {...defaultProps} mathData={mathData} />);
      
      const bestStreakElement = screen.getByTestId('best-streak');
      expect(bestStreakElement).toHaveTextContent('0');
    });

    it('should display single answer streak correctly', () => {
      const mathData: GameOverData = {
        score: 11,
        mathScore: 10,
        streak: 1,
        highestStreak: 1,
        totalCorrect: 1,
        totalIncorrect: 0,
        accuracy: 100
      };

      render(<GameOverScreen {...defaultProps} mathData={mathData} />);
      
      const bestStreakElement = screen.getByTestId('best-streak');
      expect(bestStreakElement).toHaveTextContent('1');
    });

    it('should display very high streaks correctly', () => {
      const mathData: GameOverData = {
        score: 1050,
        mathScore: 1000,
        streak: 100,
        highestStreak: 100,
        totalCorrect: 100,
        totalIncorrect: 0,
        accuracy: 100
      };

      render(<GameOverScreen {...defaultProps} mathData={mathData} />);
      
      const bestStreakElement = screen.getByTestId('best-streak');
      expect(bestStreakElement).toHaveTextContent('100');
    });
  });

  describe('Complete Statistics Accuracy Display', () => {
    it('should accurately display all statistics from game session', () => {
      const completeGameData: GameOverData = {
        score: 73, // Final accumulated score
        mathScore: 65, // Math points earned
        streak: 4, // Current streak at game over
        highestStreak: 8, // Best streak during session
        totalCorrect: 12,
        totalIncorrect: 3,
        accuracy: 80.0
      };

      render(<GameOverScreen {...defaultProps} score={completeGameData.score} mathData={completeGameData} />);
      
      // Verify final score display
      const finalScoreElement = screen.getByTestId('final-score');
      expect(finalScoreElement).toHaveTextContent('73');
      
      // Verify math performance stats
      expect(screen.getByTestId('math-score')).toHaveTextContent('65');
      expect(screen.getByTestId('best-streak')).toHaveTextContent('8');
      expect(screen.getByTestId('correct-answers')).toHaveTextContent('12');
      expect(screen.getByTestId('incorrect-answers')).toHaveTextContent('3');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('80%');
    });

    it('should handle mixed positive and negative scores correctly', () => {
      const mixedScoreData: GameOverData = {
        score: -5, // Negative final score due to penalties
        mathScore: -10, // Negative math score
        streak: 0,
        highestStreak: 2, // Had some success earlier
        totalCorrect: 2,
        totalIncorrect: 5,
        accuracy: 28.6
      };

      render(<GameOverScreen {...defaultProps} score={mixedScoreData.score} mathData={mixedScoreData} />);
      
      // Verify negative scores are displayed correctly
      expect(screen.getByTestId('final-score')).toHaveTextContent('-5');
      expect(screen.getByTestId('math-score')).toHaveTextContent('-10');
      expect(screen.getByTestId('best-streak')).toHaveTextContent('2');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('28.6%');
    });

    it('should display perfect game statistics correctly', () => {
      const perfectGameData: GameOverData = {
        score: 120,
        mathScore: 100,
        streak: 10,
        highestStreak: 10,
        totalCorrect: 10,
        totalIncorrect: 0,
        accuracy: 100.0
      };

      render(<GameOverScreen {...defaultProps} score={perfectGameData.score} mathData={perfectGameData} />);
      
      expect(screen.getByTestId('final-score')).toHaveTextContent('120');
      expect(screen.getByTestId('math-score')).toHaveTextContent('100');
      expect(screen.getByTestId('best-streak')).toHaveTextContent('10');
      expect(screen.getByTestId('correct-answers')).toHaveTextContent('10');
      expect(screen.getByTestId('incorrect-answers')).toHaveTextContent('0');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('100%');
    });
  });

  describe('Statistics Consistency Verification', () => {
    it('should maintain consistency between final score and math data score', () => {
      const gameData: GameOverData = {
        score: 42, // This should be the authoritative final score
        mathScore: 35,
        streak: 2,
        highestStreak: 5,
        totalCorrect: 7,
        totalIncorrect: 2,
        accuracy: 77.8
      };

      render(<GameOverScreen {...defaultProps} score={gameData.score} mathData={gameData} />);
      
      // The final score display should use the score prop (accumulated gameplay score)
      // not the mathScore from mathData (which is just math points)
      expect(screen.getByTestId('final-score')).toHaveTextContent('42');
      expect(screen.getByTestId('math-score')).toHaveTextContent('35');
    });

    it('should handle edge case where final score differs from math score', () => {
      // This can happen when obstacle passing points are added to math points
      const gameData: GameOverData = {
        score: 58, // Total score (math + obstacle points)
        mathScore: 40, // Just the math points
        streak: 3,
        highestStreak: 6,
        totalCorrect: 8,
        totalIncorrect: 2,
        accuracy: 80.0
      };

      render(<GameOverScreen {...defaultProps} score={gameData.score} mathData={gameData} />);
      
      // Both should be displayed correctly but serve different purposes
      expect(screen.getByTestId('final-score')).toHaveTextContent('58'); // Total game score
      expect(screen.getByTestId('math-score')).toHaveTextContent('40'); // Math-specific score
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide proper accessibility labels for statistics', () => {
      const mathData: GameOverData = {
        score: 45,
        mathScore: 35,
        streak: 2,
        highestStreak: 7,
        totalCorrect: 6,
        totalIncorrect: 1,
        accuracy: 85.7
      };

      render(<GameOverScreen {...defaultProps} score={mathData.score} mathData={mathData} />);
      
      // Verify accessibility
      expect(screen.getByTestId('final-score')).toHaveAttribute('aria-label', 'Final score: 45');
      
      // Verify all statistics are clearly labeled
      expect(screen.getByText('Math Points')).toBeInTheDocument();
      expect(screen.getByText('Best Streak')).toBeInTheDocument();
      expect(screen.getByText('Correct')).toBeInTheDocument();
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
    });

    it('should display statistics in a clear, organized manner', () => {
      const mathData: GameOverData = {
        score: 67,
        mathScore: 55,
        streak: 4,
        highestStreak: 9,
        totalCorrect: 11,
        totalIncorrect: 2,
        accuracy: 84.6
      };

      render(<GameOverScreen {...defaultProps} score={mathData.score} mathData={mathData} />);
      
      // Verify the math performance section is present
      expect(screen.getByText('Math Performance')).toBeInTheDocument();
      
      // Verify all key statistics are visible
      expect(screen.getByTestId('math-score')).toBeVisible();
      expect(screen.getByTestId('best-streak')).toBeVisible();
      expect(screen.getByTestId('correct-answers')).toBeVisible();
      expect(screen.getByTestId('incorrect-answers')).toBeVisible();
      expect(screen.getByTestId('accuracy')).toBeVisible();
    });
  });
});