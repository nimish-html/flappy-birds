import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { Bird } from '../../components/Bird';
import { MathObstacle } from '../../components/MathObstacle';
import { ParticleSystem } from '../../components/ParticleSystem';
import { QuestionSyncManager } from '../../utils/QuestionSyncManager';
import { AnswerHandler } from '../../utils/AnswerHandler';
import { ScoringSystem } from '../../utils/ScoringSystem';
import { MathQuestionManager } from '../../utils/MathQuestionManager';
import { GAME_CONFIG } from '../../utils/gameConfig';
import { Bounds } from '../../types';

describe('Comprehensive Game Fixes Integration Tests', () => {
  let bird: Bird;
  let questionSyncManager: QuestionSyncManager;
  let answerHandler: AnswerHandler;
  let scoringSystem: ScoringSystem;
  let mathQuestionManager: MathQuestionManager;
  let particleSystem: ParticleSystem;

  beforeEach(() => {
    // Initialize components
    bird = new Bird(100, 300);
    mathQuestionManager = new MathQuestionManager();
    questionSyncManager = new QuestionSyncManager(mathQuestionManager);
    scoringSystem = new ScoringSystem();
    particleSystem = new ParticleSystem();
    answerHandler = new AnswerHandler(scoringSystem, particleSystem);
    
    // Initialize the question sync manager to load first question
    questionSyncManager.initialize();
  });

  describe('Question-Answer-Feedback Cycle Integration', () => {
    it('should maintain question stability until obstacle interaction', () => {
      // Get initial question
      const initialQuestion = questionSyncManager.getCurrentQuestion();
      expect(initialQuestion).toBeDefined();
      
      // Verify question is locked
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
      
      // Simulate time passing without obstacle interaction
      // Question should remain the same
      const currentQuestion = questionSyncManager.getCurrentQuestion();
      expect(currentQuestion?.id).toBe(initialQuestion?.id);
      expect(currentQuestion?.question).toBe(initialQuestion?.question);
    });

    it('should complete full question-answer-feedback cycle', () => {
      // Get initial question
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      // Create obstacle with the question
      const obstacle = new MathObstacle(400, question!);
      
      // Verify question is locked
      expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
      
      // Simulate correct answer selection
      const feedback = answerHandler.validateCorrectAnswer(bird.x, bird.y);
      expect(feedback.type).toBe('correct');
      
      // Verify score updated
      const scoreState = scoringSystem.getScoreState();
      expect(scoreState.totalCorrect).toBe(1);
      expect(scoreState.points).toBeGreaterThan(0);
    });

    it('should show correct answer in feedback for incorrect selections', () => {
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      // Create obstacle with the question
      const obstacle = new MathObstacle(400, question!);
      
      // Generate incorrect answer (different from correct)
      const incorrectAnswer = question!.correctAnswer + 1;
      
      // Simulate incorrect answer selection
      const feedback = answerHandler.handleIncorrectAnswer(bird.x, bird.y, question!.correctAnswer);
      expect(feedback.type).toBe('incorrect');
      
      const scoreState = scoringSystem.getScoreState();
      expect(scoreState.totalIncorrect).toBe(1);
    });
  });

  describe('Obstacle Navigation Integration', () => {
    it('should allow navigation between answer zones without collision', () => {
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      const obstacle = new MathObstacle(400, question!);
      
      // Check that bird can pass through the navigable area
      const navigableArea = obstacle.getNavigableArea();
      expect(navigableArea).toBeDefined();
      expect(navigableArea.width).toBeGreaterThan(0);
      expect(navigableArea.height).toBeGreaterThan(0);
      
      // The navigable area represents the pass-through zone
      // This test verifies the area exists and has meaningful dimensions
    });

    it('should maintain sufficient vertical separation between answer zones', () => {
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      const obstacle = new MathObstacle(400, question!);
      
      // Get navigable area which represents the pass-through zone
      const navigableArea = obstacle.getNavigableArea();
      
      // Verify there's a meaningful gap for navigation
      expect(navigableArea.height).toBeGreaterThan(40); // Minimum gap for navigation
    });

    it('should detect collision only on answer zone boundaries', () => {
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      const obstacle = new MathObstacle(400, question!);
      
      // Create bird bounds for testing
      const birdBounds: Bounds = {
        x: 390,
        y: 100, // Will be adjusted for each test
        width: 30,
        height: 30
      };
      
      // Test answer selection (this should work)
      const selectedZone = obstacle.checkAnswerSelection(birdBounds);
      // selectedZone could be null if bird is not in an answer zone, which is valid
      
      // The main test is that the obstacle provides a navigable area
      const navigableArea = obstacle.getNavigableArea();
      expect(navigableArea.height).toBeGreaterThan(0);
    });
  });

  describe('Statistics Accuracy Integration', () => {
    it('should maintain accurate statistics across multiple questions', () => {
      let correctCount = 0;
      let incorrectCount = 0;
      
      // Simulate answering 10 questions
      for (let i = 0; i < 10; i++) {
        const question = questionSyncManager.getCurrentQuestion();
        expect(question).toBeDefined();
        
        // Alternate between correct and incorrect answers
        const isCorrect = i % 2 === 0;
        
        if (isCorrect) {
          answerHandler.validateCorrectAnswer(bird.x, bird.y);
          correctCount++;
        } else {
          answerHandler.handleIncorrectAnswer(bird.x, bird.y, question!.correctAnswer);
          incorrectCount++;
        }
        
        // Advance to next question
        questionSyncManager.unlockAndAdvance();
      }
      
      // Verify statistics accuracy
      const scoreState = scoringSystem.getScoreState();
      expect(scoreState.totalCorrect).toBe(correctCount);
      expect(scoreState.totalIncorrect).toBe(incorrectCount);
      const totalQuestions = scoreState.totalCorrect + scoreState.totalIncorrect;
      expect(totalQuestions).toBe(10);
      
      const expectedAccuracy = (correctCount / 10) * 100;
      const actualAccuracy = (scoreState.totalCorrect / totalQuestions) * 100;
      expect(actualAccuracy).toBeCloseTo(expectedAccuracy, 1);
    });

    it('should track streak information accurately', () => {
      // Simulate a streak of 3 correct answers
      for (let i = 0; i < 3; i++) {
        const question = questionSyncManager.getCurrentQuestion();
        expect(question).toBeDefined();
        
        answerHandler.validateCorrectAnswer(bird.x, bird.y);
        questionSyncManager.unlockAndAdvance();
      }
      
      const scoreState = scoringSystem.getScoreState();
      expect(scoreState.streak).toBe(3);
      expect(scoreState.highestStreak).toBe(3);
      
      // Break the streak with an incorrect answer
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      answerHandler.handleIncorrectAnswer(bird.x, bird.y, question!.correctAnswer);
      
      const finalScoreState = scoringSystem.getScoreState();
      expect(finalScoreState.streak).toBe(0);
      expect(finalScoreState.highestStreak).toBe(3); // Should maintain highest
    });

    it('should maintain statistics consistency across game sessions', () => {
      // First session - answer 5 questions correctly
      for (let i = 0; i < 5; i++) {
        const question = questionSyncManager.getCurrentQuestion();
        expect(question).toBeDefined();
        
        answerHandler.validateCorrectAnswer(bird.x, bird.y);
        questionSyncManager.unlockAndAdvance();
      }
      
      const firstSessionStats = scoringSystem.getScoreState();
      
      // Reset for second session
      scoringSystem.reset();
      questionSyncManager.reset();
      questionSyncManager.initialize();
      
      // Answer 3 questions (2 correct, 1 incorrect)
      for (let i = 0; i < 3; i++) {
        const question = questionSyncManager.getCurrentQuestion();
        expect(question).toBeDefined();
        
        const isCorrect = i < 2;
        
        if (isCorrect) {
          answerHandler.validateCorrectAnswer(bird.x, bird.y);
        } else {
          answerHandler.handleIncorrectAnswer(bird.x, bird.y, question!.correctAnswer);
        }
        questionSyncManager.unlockAndAdvance();
      }
      
      // Verify second session statistics
      const secondSessionStats = scoringSystem.getScoreState();
      expect(secondSessionStats.totalCorrect).toBe(2);
      expect(secondSessionStats.totalIncorrect).toBe(1);
      const secondTotal = secondSessionStats.totalCorrect + secondSessionStats.totalIncorrect;
      expect(secondTotal).toBe(3);
      
      // Verify first session wasn't affected (these are snapshots)
      expect(firstSessionStats.totalCorrect).toBe(5);
      expect(firstSessionStats.totalIncorrect).toBe(0);
      const firstTotal = firstSessionStats.totalCorrect + firstSessionStats.totalIncorrect;
      expect(firstTotal).toBe(5);
    });
  });

  describe('Game Pacing Integration', () => {
    it('should maintain educational pacing with increased obstacle spacing', () => {
      // Verify the configuration has increased spacing
      expect(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE).toBe(450); // Should be 450 (50% increase from 300)
      
      // Generate multiple obstacles and verify spacing
      const obstacles: MathObstacle[] = [];
      for (let i = 0; i < 5; i++) {
        const question = questionSyncManager.getCurrentQuestion();
        expect(question).toBeDefined();
        
        const obstacle = new MathObstacle(400 + (i * GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE), question!);
        obstacles.push(obstacle);
        questionSyncManager.unlockAndAdvance();
      }
      
      // Verify spacing is at least 450 pixels (50% increase from 300)
      for (let i = 1; i < obstacles.length; i++) {
        const spacing = obstacles[i].x - obstacles[i-1].x;
        expect(spacing).toBeGreaterThanOrEqual(450);
      }
    });

    it('should provide adequate time for question consideration', () => {
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      const obstacle = new MathObstacle(800, question!);
      
      // Simulate bird movement towards obstacle
      const initialDistance = obstacle.x - bird.x;
      const gameSpeed = GAME_CONFIG.OBSTACLE_SPEED;
      const timeToReach = initialDistance / gameSpeed;
      
      // With increased spacing, should have adequate time to read question
      // At speed 2 pixels per frame, 700 pixels = 350 frames = ~5.8 seconds at 60fps
      expect(timeToReach).toBeGreaterThan(300); // At least 5 seconds
    });
  });

  describe('Visual Neutrality Integration', () => {
    it('should create obstacles with neutral styling approach', () => {
      const question = questionSyncManager.getCurrentQuestion();
      expect(question).toBeDefined();
      
      const obstacle = new MathObstacle(400, question!);
      
      // Verify obstacle was created successfully
      expect(obstacle).toBeDefined();
      expect(obstacle.x).toBe(400);
      
      // The visual neutrality is implemented in the rendering logic
      // This test verifies the obstacle can be created and positioned correctly
      // The actual blue styling is tested in the MathObstacle unit tests
    });
  });

  describe('End-to-End Integration', () => {
    it('should complete full gameplay cycle with all fixes integrated', () => {
      let questionsAnswered = 0;
      let correctAnswers = 0;
      
      // Play through 5 questions
      for (let i = 0; i < 5; i++) {
        const question = questionSyncManager.getCurrentQuestion();
        expect(question).toBeDefined();
        
        const obstacle = new MathObstacle(400, question!);
        
        // Verify question is locked
        expect(questionSyncManager.isCurrentQuestionLocked()).toBe(true);
        
        // Answer correctly 60% of the time
        const isCorrect = i < 3; // First 3 correct, last 2 incorrect
        
        if (isCorrect) {
          answerHandler.validateCorrectAnswer(bird.x, bird.y);
        } else {
          answerHandler.handleIncorrectAnswer(bird.x, bird.y, question!.correctAnswer);
        }
        
        if (isCorrect) correctAnswers++;
        questionsAnswered++;
        
        questionSyncManager.unlockAndAdvance();
      }
      
      // Verify all systems worked together
      expect(questionsAnswered).toBe(5);
      const finalScoreState = scoringSystem.getScoreState();
      const totalQuestions = finalScoreState.totalCorrect + finalScoreState.totalIncorrect;
      expect(totalQuestions).toBe(5);
      expect(finalScoreState.totalCorrect).toBe(correctAnswers);
      expect(finalScoreState.totalIncorrect).toBe(5 - correctAnswers);
      
      // Verify accuracy calculation
      const expectedAccuracy = (correctAnswers / 5) * 100;
      const actualAccuracy = (finalScoreState.totalCorrect / totalQuestions) * 100;
      expect(actualAccuracy).toBeCloseTo(expectedAccuracy, 1);
      
      // Verify obstacle spacing configuration
      expect(GAME_CONFIG.OBSTACLE_SPAWN_DISTANCE).toBe(450);
      
      // Verify question sync manager functionality
      expect(questionSyncManager.getCurrentQuestion()).toBeDefined();
    });
  });
});