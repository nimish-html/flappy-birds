import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine, GameOverData } from '../components/GameEngine';
import { GameOverScreen } from '../components/GameOverScreen';
import { GAME_CONFIG } from '../utils/gameConfig';

/**
 * Task 12 Integration Tests
 * 
 * Tests the complete flow from GameEngine statistics calculation
 * to GameOverScreen display to ensure:
 * - Final score matches accumulated gameplay score (Requirement 6.5)
 * - Highest streak tracking throughout the session (Requirement 6.6)
 * - All statistics are accurately reflected in GameOverScreen
 */
describe('Task 12: GameEngine to GameOverScreen Integration', () => {
  let gameEngine: GameEngine;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let capturedGameOverData: GameOverData | null = null;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = {
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      getContext: vi.fn(() => mockContext)
    } as unknown as HTMLCanvasElement;

    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'top' as CanvasTextBaseline
    } as unknown as CanvasRenderingContext2D;

    // Reset captured data
    capturedGameOverData = null;

    // Create game engine
    gameEngine = new GameEngine();
    gameEngine.initialize(mockCanvas, {
      onGameOver: (data: GameOverData) => {
        capturedGameOverData = data;
      },
      onScoreUpdate: vi.fn(),
      onMathScoreUpdate: vi.fn(),
      onQuestionUpdate: vi.fn(),
      onGameStart: vi.fn(),
      onError: vi.fn(),
      onFeedbackUpdate: vi.fn()
    });
  });

  describe('End-to-End Statistics Flow', () => {
    it('should pass accurate final score from GameEngine to GameOverScreen', () => {
      // Start game and simulate gameplay
      gameEngine.start();
      
      // Simulate obstacle passing (adds to final score)
      gameEngine['gameState'].score += 15; // 15 obstacles passed
      
      // Simulate math answers (affects math score but also final score through penalties/bonuses)
      const scoringSystem = gameEngine['scoringSystem'];
      scoringSystem.processCorrectAnswer(); // +10 math points
      scoringSystem.processCorrectAnswer(); // +10 math points
      scoringSystem.processIncorrectAnswer(); // -5 math points
      
      // Get the expected final score (obstacle points + math score adjustments)
      const expectedFinalScore = gameEngine.getGameState().score;
      
      // Trigger game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify GameEngine passes correct data
      expect(capturedGameOverData).not.toBeNull();
      expect(capturedGameOverData!.score).toBe(expectedFinalScore);
      
      // Render GameOverScreen with the captured data
      render(
        <GameOverScreen
          score={capturedGameOverData!.score}
          mathData={capturedGameOverData!}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      // Verify GameOverScreen displays the correct final score
      const finalScoreElement = screen.getByTestId('final-score');
      expect(finalScoreElement).toHaveTextContent(expectedFinalScore.toString());
    });

    it('should pass accurate highest streak from GameEngine to GameOverScreen', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Build initial streak
      scoringSystem.processCorrectAnswer(); // streak = 1
      scoringSystem.processCorrectAnswer(); // streak = 2
      scoringSystem.processCorrectAnswer(); // streak = 3
      scoringSystem.processCorrectAnswer(); // streak = 4
      
      // Break streak
      scoringSystem.processIncorrectAnswer(); // streak = 0, highestStreak = 4
      
      // Build higher streak
      for (let i = 0; i < 7; i++) {
        scoringSystem.processCorrectAnswer(); // streak = 7
      }
      
      const expectedHighestStreak = 7;
      const expectedCurrentStreak = 7;
      
      // Trigger game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify GameEngine passes correct streak data
      expect(capturedGameOverData).not.toBeNull();
      expect(capturedGameOverData!.highestStreak).toBe(expectedHighestStreak);
      expect(capturedGameOverData!.streak).toBe(expectedCurrentStreak);
      
      // Render GameOverScreen with the captured data
      render(
        <GameOverScreen
          score={capturedGameOverData!.score}
          mathData={capturedGameOverData!}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      // Verify GameOverScreen displays the correct highest streak
      const bestStreakElement = screen.getByTestId('best-streak');
      expect(bestStreakElement).toHaveTextContent(expectedHighestStreak.toString());
    });

    it('should maintain data consistency throughout the complete flow', () => {
      gameEngine.start();
      
      // Simulate a complete game session
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Add obstacle score
      gameEngine['gameState'].score += 8; // 8 obstacles passed
      
      // Math performance: 6 correct, 2 incorrect, highest streak of 4
      scoringSystem.processCorrectAnswer(); // streak = 1
      scoringSystem.processCorrectAnswer(); // streak = 2
      scoringSystem.processCorrectAnswer(); // streak = 3
      scoringSystem.processCorrectAnswer(); // streak = 4
      scoringSystem.processIncorrectAnswer(); // streak = 0, highestStreak = 4
      scoringSystem.processCorrectAnswer(); // streak = 1
      scoringSystem.processCorrectAnswer(); // streak = 2
      scoringSystem.processIncorrectAnswer(); // streak = 0, highestStreak still 4
      
      // Get expected values from GameEngine
      const expectedFinalScore = gameEngine.getGameState().score;
      const mathPerformanceData = gameEngine.getMathPerformanceData();
      
      // Trigger game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify all data is consistent
      expect(capturedGameOverData).not.toBeNull();
      expect(capturedGameOverData!.score).toBe(expectedFinalScore);
      expect(capturedGameOverData!.mathScore).toBe(mathPerformanceData.mathScore);
      expect(capturedGameOverData!.totalCorrect).toBe(6);
      expect(capturedGameOverData!.totalIncorrect).toBe(2);
      expect(capturedGameOverData!.highestStreak).toBe(4);
      expect(capturedGameOverData!.accuracy).toBe(75.0); // 6/8 * 100
      
      // Render GameOverScreen
      render(
        <GameOverScreen
          score={capturedGameOverData!.score}
          mathData={capturedGameOverData!}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      // Verify all statistics are displayed correctly
      expect(screen.getByTestId('final-score')).toHaveTextContent(expectedFinalScore.toString());
      expect(screen.getByTestId('math-score')).toHaveTextContent(mathPerformanceData.mathScore.toString());
      expect(screen.getByTestId('best-streak')).toHaveTextContent('4');
      expect(screen.getByTestId('correct-answers')).toHaveTextContent('6');
      expect(screen.getByTestId('incorrect-answers')).toHaveTextContent('2');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('75%');
    });
  });

  describe('Edge Case Integration', () => {
    it('should handle zero scores and streaks correctly throughout the flow', () => {
      gameEngine.start();
      
      // Immediately trigger game over without any gameplay
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify zero values are handled correctly
      expect(capturedGameOverData).not.toBeNull();
      expect(capturedGameOverData!.score).toBe(0);
      expect(capturedGameOverData!.mathScore).toBe(0);
      expect(capturedGameOverData!.streak).toBe(0);
      expect(capturedGameOverData!.highestStreak).toBe(0);
      expect(capturedGameOverData!.totalCorrect).toBe(0);
      expect(capturedGameOverData!.totalIncorrect).toBe(0);
      expect(capturedGameOverData!.accuracy).toBe(0);
      
      // Render GameOverScreen
      render(
        <GameOverScreen
          score={capturedGameOverData!.score}
          mathData={capturedGameOverData!}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      // Verify zero values are displayed correctly
      expect(screen.getByTestId('final-score')).toHaveTextContent('0');
      
      // Math performance section should not be displayed when no answers were given
      // This is the correct behavior as per GameOverScreen implementation
      expect(screen.queryByText('Math Performance')).not.toBeInTheDocument();
      expect(screen.queryByTestId('math-score')).not.toBeInTheDocument();
      expect(screen.queryByTestId('best-streak')).not.toBeInTheDocument();
      expect(screen.queryByTestId('correct-answers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('incorrect-answers')).not.toBeInTheDocument();
      expect(screen.queryByTestId('accuracy')).not.toBeInTheDocument();
    });

    it('should handle negative scores correctly throughout the flow', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Create scenario with negative math score
      scoringSystem.processIncorrectAnswer(); // -5
      scoringSystem.processIncorrectAnswer(); // -5 (total: -10, but clamped to 0)
      scoringSystem.processIncorrectAnswer(); // -5 (total: still 0)
      
      // No obstacle points, so final score should be 0 (math score is clamped to 0)
      
      // Trigger game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify negative handling
      expect(capturedGameOverData).not.toBeNull();
      expect(capturedGameOverData!.mathScore).toBe(0); // Math score is clamped to 0
      expect(capturedGameOverData!.totalIncorrect).toBe(3);
      expect(capturedGameOverData!.accuracy).toBe(0); // 0 correct out of 3
      
      // Render GameOverScreen
      render(
        <GameOverScreen
          score={capturedGameOverData!.score}
          mathData={capturedGameOverData!}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      // Verify display handles the scenario correctly
      expect(screen.getByTestId('math-score')).toHaveTextContent('0');
      expect(screen.getByTestId('incorrect-answers')).toHaveTextContent('3');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('0%');
    });

    it('should handle perfect game scenario correctly', () => {
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      
      // Perfect game: obstacles + all correct answers
      gameEngine['gameState'].score += 10; // 10 obstacles
      
      // 10 correct answers in a row
      for (let i = 0; i < 10; i++) {
        scoringSystem.processCorrectAnswer();
      }
      
      // Trigger game over
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify perfect game stats
      expect(capturedGameOverData).not.toBeNull();
      expect(capturedGameOverData!.totalCorrect).toBe(10);
      expect(capturedGameOverData!.totalIncorrect).toBe(0);
      expect(capturedGameOverData!.streak).toBe(10);
      expect(capturedGameOverData!.highestStreak).toBe(10);
      expect(capturedGameOverData!.accuracy).toBe(100);
      
      // Render GameOverScreen
      render(
        <GameOverScreen
          score={capturedGameOverData!.score}
          mathData={capturedGameOverData!}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      // Verify perfect game display
      expect(screen.getByTestId('best-streak')).toHaveTextContent('10');
      expect(screen.getByTestId('correct-answers')).toHaveTextContent('10');
      expect(screen.getByTestId('incorrect-answers')).toHaveTextContent('0');
      expect(screen.getByTestId('accuracy')).toHaveTextContent('100%');
    });
  });

  describe('Data Integrity Verification', () => {
    it('should maintain data integrity across multiple game sessions', () => {
      // First game session
      gameEngine.start();
      
      const scoringSystem = gameEngine['scoringSystem'];
      scoringSystem.processCorrectAnswer();
      scoringSystem.processCorrectAnswer();
      
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      const firstGameData = { ...capturedGameOverData! };
      
      // Reset for second session
      gameEngine.reset();
      capturedGameOverData = null;
      
      // Second game session
      gameEngine.start();
      
      // Different performance
      scoringSystem.processCorrectAnswer();
      scoringSystem.processIncorrectAnswer();
      scoringSystem.processCorrectAnswer();
      
      gameEngine['gameState'].bird.kill();
      gameEngine['handleGameOver']();
      
      const secondGameData = { ...capturedGameOverData! };
      
      // Verify sessions are independent
      expect(firstGameData.totalCorrect).toBe(2);
      expect(firstGameData.totalIncorrect).toBe(0);
      expect(firstGameData.highestStreak).toBe(2);
      
      expect(secondGameData.totalCorrect).toBe(2);
      expect(secondGameData.totalIncorrect).toBe(1);
      expect(secondGameData.highestStreak).toBe(1); // Reset between sessions
      
      // Verify each session's data displays correctly
      render(
        <GameOverScreen
          score={secondGameData.score}
          mathData={secondGameData}
          onRestart={vi.fn()}
          isVisible={true}
        />
      );
      
      expect(screen.getByTestId('correct-answers')).toHaveTextContent('2');
      expect(screen.getByTestId('incorrect-answers')).toHaveTextContent('1');
      expect(screen.getByTestId('best-streak')).toHaveTextContent('1');
    });
  });
});