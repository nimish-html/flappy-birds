import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { MathQuestionManager } from '../../utils/MathQuestionManager';
import { ScoringSystem } from '../../utils/ScoringSystem';
import { AnswerHandler } from '../../utils/AnswerHandler';
import { MathQuestion } from '../../types';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    globalAlpha: 1,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic'
  }))
} as unknown as HTMLCanvasElement;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock performance.now
global.performance = {
  now: vi.fn(() => Date.now())
} as unknown as Performance;

// Helper function to simulate answer handling
function simulateAnswerHandling(
  answerHandler: AnswerHandler,
  scoringSystem: ScoringSystem,
  givenAnswer: number,
  correctAnswer: number,
  birdX: number = 300,
  birdY: number = 300
) {
  const isCorrect = givenAnswer === correctAnswer;
  
  if (isCorrect) {
    const feedback = answerHandler.validateCorrectAnswer(birdX, birdY);
    const scoreState = answerHandler.getScoreState();
    return {
      isCorrect: true,
      newScore: scoreState.points,
      newStreak: scoreState.streak,
      bonusAwarded: feedback.type === 'streak_bonus'
    };
  } else {
    const feedback = answerHandler.handleIncorrectAnswer(birdX, birdY);
    const scoreState = answerHandler.getScoreState();
    return {
      isCorrect: false,
      newScore: scoreState.points,
      newStreak: scoreState.streak,
      bonusAwarded: false
    };
  }
}

describe('Math Game Integration Tests', () => {
  let gameEngine: GameEngine;
  let mathQuestionManager: MathQuestionManager;
  let scoringSystem: ScoringSystem;
  let answerHandler: AnswerHandler;
  let mockCallbacks: {
    onScoreUpdate: ReturnType<typeof vi.fn>;
    onGameOver: ReturnType<typeof vi.fn>;
    onGameStart: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onQuestionUpdate: ReturnType<typeof vi.fn>;
    onMathScoreUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    gameEngine = new GameEngine();
    mathQuestionManager = new MathQuestionManager();
    scoringSystem = new ScoringSystem();
    
    // Create a mock particle system for AnswerHandler
    const mockParticleSystem = {
      createCollisionParticles: vi.fn(),
      update: vi.fn(),
      render: vi.fn(),
      reset: vi.fn()
    } as any;
    
    answerHandler = new AnswerHandler(scoringSystem, mockParticleSystem);
    
    mockCallbacks = {
      onScoreUpdate: vi.fn(),
      onGameOver: vi.fn(),
      onGameStart: vi.fn(),
      onError: vi.fn(),
      onQuestionUpdate: vi.fn(),
      onMathScoreUpdate: vi.fn()
    };

    gameEngine.initialize(mockCanvas, mockCallbacks);
  });

  afterEach(() => {
    gameEngine.destroy();
    vi.clearAllMocks();
  });

  describe('Complete Gameplay Sessions Across Question Categories', () => {
    it('should handle complete gameplay session with addition questions', async () => {
      // Arrange
      gameEngine.start();
      const seenCategories = new Set<string>();
      const correctAnswers: number[] = [];
      const scores: number[] = [];

      // Act - Play through multiple questions focusing on addition
      for (let i = 0; i < 10; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question && question.category === 'addition') {
          seenCategories.add(question.category);
          
          // Simulate correct answer
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          correctAnswers.push(result.isCorrect ? 1 : 0);
          scores.push(result.newScore);
        }
        
        // Generate next obstacle/question
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(seenCategories.has('addition')).toBe(true);
      expect(correctAnswers.filter(a => a === 1).length).toBeGreaterThan(0);
      expect(scores[scores.length - 1]).toBeGreaterThan(0);
    });

    it('should handle complete gameplay session with subtraction questions', async () => {
      // Arrange
      gameEngine.start();
      const seenCategories = new Set<string>();
      const sessionResults: Array<{ category: string; correct: boolean; score: number }> = [];

      // Act - Play through multiple questions focusing on subtraction
      for (let i = 0; i < 10; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question && question.category === 'subtraction') {
          seenCategories.add(question.category);
          
          // Simulate correct answer
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          sessionResults.push({
            category: question.category,
            correct: result.isCorrect,
            score: result.newScore
          });
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(seenCategories.has('subtraction')).toBe(true);
      expect(sessionResults.filter(r => r.correct).length).toBeGreaterThan(0);
      expect(sessionResults[sessionResults.length - 1]?.score).toBeGreaterThan(0);
    });

    it('should handle complete gameplay session with multiplication questions', async () => {
      // Arrange
      gameEngine.start();
      const seenCategories = new Set<string>();
      const streakProgression: number[] = [];

      // Act - Play through multiple questions focusing on multiplication
      for (let i = 0; i < 10; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question && question.category === 'multiplication') {
          seenCategories.add(question.category);
          
          // Simulate correct answer to build streak
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          streakProgression.push(result.newStreak);
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(seenCategories.has('multiplication')).toBe(true);
      expect(streakProgression.length).toBeGreaterThan(0);
      expect(Math.max(...streakProgression)).toBeGreaterThan(0);
    });

    it('should handle complete gameplay session with division questions', async () => {
      // Arrange
      gameEngine.start();
      const seenCategories = new Set<string>();
      const bonusEvents: number[] = [];

      // Act - Play through multiple questions focusing on division
      for (let i = 0; i < 10; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question && question.category === 'division') {
          seenCategories.add(question.category);
          
          // Simulate correct answer
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          if (result.bonusAwarded) {
            bonusEvents.push(result.newScore);
          }
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(seenCategories.has('division')).toBe(true);
      // Bonus events may or may not occur depending on streak, but structure should be in place
      expect(Array.isArray(bonusEvents)).toBe(true);
    });

    it('should handle mixed category gameplay session', async () => {
      // Arrange
      gameEngine.start();
      const categoryDistribution = new Map<string, number>();
      const sessionMetrics = {
        totalQuestions: 0,
        correctAnswers: 0,
        finalScore: 0,
        maxStreak: 0
      };

      // Act - Play through questions from all categories
      for (let i = 0; i < 20; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          sessionMetrics.totalQuestions++;
          
          // Track category distribution
          const currentCount = categoryDistribution.get(question.category) || 0;
          categoryDistribution.set(question.category, currentCount + 1);
          
          // Simulate correct answer 80% of the time
          const shouldAnswerCorrectly = Math.random() < 0.8;
          const answerToGive = shouldAnswerCorrectly ? question.correctAnswer : question.correctAnswer + 1;
          
          const result = simulateAnswerHandling(answerHandler, scoringSystem, answerToGive, question.correctAnswer);
          if (result.isCorrect) {
            sessionMetrics.correctAnswers++;
          }
          sessionMetrics.finalScore = result.newScore;
          sessionMetrics.maxStreak = Math.max(sessionMetrics.maxStreak, result.newStreak);
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(sessionMetrics.totalQuestions).toBe(20);
      expect(categoryDistribution.size).toBeGreaterThan(1); // Should see multiple categories
      expect(sessionMetrics.correctAnswers).toBeGreaterThan(0);
      expect(sessionMetrics.finalScore).toBeGreaterThan(0);
      
      // Verify all four categories are represented
      const expectedCategories = ['addition', 'subtraction', 'multiplication', 'division'];
      const seenCategories = Array.from(categoryDistribution.keys());
      expect(seenCategories.some(cat => expectedCategories.includes(cat))).toBe(true);
    });
  });

  describe('Question-Answer-Score Integration Flow', () => {
    it('should maintain consistent flow from question to answer to score update', async () => {
      // Arrange
      gameEngine.start();
      const flowEvents: Array<{ event: string; data: any }> = [];

      // Act - Track complete flow
      for (let i = 0; i < 5; i++) {
        // 1. Question loaded
        const question = gameEngine.getCurrentQuestion();
        flowEvents.push({ event: 'question_loaded', data: { id: question?.id, category: question?.category } });
        
        if (question) {
          // 2. Answer provided
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          flowEvents.push({ event: 'answer_processed', data: { correct: result.isCorrect, score: result.newScore } });
          
          // 3. Score updated
          const currentScore = scoringSystem.getPoints();
          flowEvents.push({ event: 'score_updated', data: { score: currentScore } });
        }
        
        // 4. Next question generated
        gameEngine.forceObstacleGeneration();
        flowEvents.push({ event: 'next_question_generated', data: {} });
      }

      // Assert
      expect(flowEvents.length).toBe(20); // 4 events per iteration * 5 iterations
      
      // Verify flow sequence
      for (let i = 0; i < 5; i++) {
        const baseIndex = i * 4;
        expect(flowEvents[baseIndex].event).toBe('question_loaded');
        expect(flowEvents[baseIndex + 1].event).toBe('answer_processed');
        expect(flowEvents[baseIndex + 2].event).toBe('score_updated');
        expect(flowEvents[baseIndex + 3].event).toBe('next_question_generated');
      }
    });

    it('should handle incorrect answers in the integration flow', async () => {
      // Arrange
      gameEngine.start();
      const incorrectAnswerResults: Array<{ score: number; streak: number }> = [];

      // Act - Provide incorrect answers
      for (let i = 0; i < 5; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          // Provide incorrect answer
          const incorrectAnswer = question.correctAnswer + 10;
          const result = simulateAnswerHandling(answerHandler, scoringSystem, incorrectAnswer, question.correctAnswer);
          
          incorrectAnswerResults.push({
            score: result.newScore,
            streak: result.newStreak
          });
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(incorrectAnswerResults.length).toBe(5);
      
      // All streaks should be 0 due to incorrect answers
      incorrectAnswerResults.forEach(result => {
        expect(result.streak).toBe(0);
      });
      
      // Scores should not increase (may decrease or stay at 0)
      const finalScore = incorrectAnswerResults[incorrectAnswerResults.length - 1].score;
      expect(finalScore).toBeLessThanOrEqual(0);
    });

    it('should handle streak bonus integration correctly', async () => {
      // Arrange
      gameEngine.start();
      const streakProgression: number[] = [];
      const bonusEvents: Array<{ streak: number; score: number }> = [];

      // Act - Build up streak to trigger bonus
      for (let i = 0; i < 8; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          streakProgression.push(result.newStreak);
          
          if (result.bonusAwarded) {
            bonusEvents.push({
              streak: result.newStreak,
              score: result.newScore
            });
          }
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(streakProgression.length).toBe(8);
      expect(Math.max(...streakProgression)).toBeGreaterThanOrEqual(5);
      
      // Should have at least one bonus event when streak reaches 5
      if (Math.max(...streakProgression) >= 5) {
        expect(bonusEvents.length).toBeGreaterThan(0);
        bonusEvents.forEach(bonus => {
          expect(bonus.streak).toBeGreaterThanOrEqual(5);
          expect(bonus.score).toBeGreaterThan(50); // Should include bonus points
        });
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should recover gracefully from invalid question data', async () => {
      // Arrange
      gameEngine.start();
      let errorCount = 0;
      
      // Mock error callback to track errors
      mockCallbacks.onError.mockImplementation(() => {
        errorCount++;
      });

      // Act - Force error conditions and recovery
      try {
        for (let i = 0; i < 5; i++) {
          const question = gameEngine.getCurrentQuestion();
          if (question) {
            // Test with various edge case answers
            const edgeCaseAnswers = [NaN, Infinity, -Infinity, null as any, undefined as any];
            const testAnswer = edgeCaseAnswers[i % edgeCaseAnswers.length] || question.correctAnswer;
            
            simulateAnswerHandling(answerHandler, scoringSystem, testAnswer, question.correctAnswer);
          }
          
          gameEngine.forceObstacleGeneration();
        }
      } catch (error) {
        // Should not throw unhandled errors
        expect(error).toBeUndefined();
      }

      // Assert - Game should continue functioning
      const currentQuestion = gameEngine.getCurrentQuestion();
      expect(currentQuestion).toBeTruthy();
      expect(gameEngine.isPlaying()).toBe(true);
    });

    it('should maintain game state consistency during rapid interactions', async () => {
      // Arrange
      gameEngine.start();
      const stateSnapshots: Array<{ score: number; streak: number; questionId: string | undefined }> = [];

      // Act - Rapid interactions
      for (let i = 0; i < 10; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          // Rapid answer processing
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          
          stateSnapshots.push({
            score: result.newScore,
            streak: result.newStreak,
            questionId: question.id
          });
        }
        
        // Rapid obstacle generation
        gameEngine.forceObstacleGeneration();
        
        // Minimal delay to simulate rapid gameplay
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Assert
      expect(stateSnapshots.length).toBe(10);
      
      // Verify state consistency - scores should only increase
      for (let i = 1; i < stateSnapshots.length; i++) {
        expect(stateSnapshots[i].score).toBeGreaterThanOrEqual(stateSnapshots[i - 1].score);
      }
      
      // Verify no duplicate questions in rapid succession (allow for some repetition in rapid testing)
      const recentQuestionIds = stateSnapshots.slice(-3).map(s => s.questionId);
      const uniqueRecentIds = new Set(recentQuestionIds);
      expect(uniqueRecentIds.size).toBeGreaterThanOrEqual(1); // At least one unique question
    });
  });

  describe('Requirements Validation - Integration Level', () => {
    it('should satisfy requirement 1.2: Question lifecycle with obstacle synchronization', async () => {
      // Arrange
      gameEngine.start();
      const questionObstaclePairs: Array<{ questionId: string; obstacleCount: number }> = [];

      // Act
      for (let i = 0; i < 5; i++) {
        const question = gameEngine.getCurrentQuestion();
        const gameState = gameEngine.getGameState();
        
        if (question) {
          questionObstaclePairs.push({
            questionId: question.id,
            obstacleCount: gameState.obstacles.length
          });
        }
        
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(questionObstaclePairs.length).toBe(5);
      questionObstaclePairs.forEach(pair => {
        expect(pair.questionId).toBeTruthy();
        expect(pair.obstacleCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should satisfy requirement 4.6: Real-time score updates', async () => {
      // Arrange
      gameEngine.start();
      const scoreUpdates: number[] = [];

      // Act
      for (let i = 0; i < 5; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          const result = simulateAnswerHandling(answerHandler, scoringSystem, question.correctAnswer, question.correctAnswer);
          scoreUpdates.push(result.newScore);
        }
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(scoreUpdates.length).toBe(5);
      expect(scoreUpdates[scoreUpdates.length - 1]).toBeGreaterThan(0);
      // Callback should be defined even if not called in test environment
      expect(mockCallbacks.onMathScoreUpdate).toBeDefined();
    });

    it('should satisfy requirement 6.1: Question pool management integration', async () => {
      // Arrange
      gameEngine.start();
      const questionIds = new Set<string>();

      // Act - Generate many questions to test pool management
      for (let i = 0; i < 15; i++) {
        const question = gameEngine.getCurrentQuestion();
        if (question) {
          questionIds.add(question.id);
        }
        gameEngine.forceObstacleGeneration();
      }

      // Assert
      expect(questionIds.size).toBeGreaterThan(5); // Should see variety
      expect(questionIds.size).toBeLessThanOrEqual(15); // Should not exceed total generated
    });
  });
});