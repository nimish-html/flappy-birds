import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEngine, GameState, GameOverData } from '../../components/GameEngine';
import { GAME_CONFIG } from '../../utils/gameConfig';

// Mock canvas and context
const mockCanvas = {
  width: GAME_CONFIG.CANVAS_WIDTH,
  height: GAME_CONFIG.CANVAS_HEIGHT,
  getContext: vi.fn(() => mockContext)
} as unknown as HTMLCanvasElement;

const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  globalAlpha: 1,
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  }))
} as unknown as CanvasRenderingContext2D;

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  }
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('GameEngine - Game State Management', () => {
  let gameEngine: GameEngine;
  let onGameOverSpy: ReturnType<typeof vi.fn>;
  let onScoreUpdateSpy: ReturnType<typeof vi.fn>;
  let onMathScoreUpdateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gameEngine = new GameEngine();
    onGameOverSpy = vi.fn();
    onScoreUpdateSpy = vi.fn();
    onMathScoreUpdateSpy = vi.fn();

    gameEngine.initialize(mockCanvas, {
      onGameOver: onGameOverSpy,
      onScoreUpdate: onScoreUpdateSpy,
      onMathScoreUpdate: onMathScoreUpdateSpy
    });
  });

  afterEach(() => {
    gameEngine.destroy();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const state = gameEngine.getGameState();
      
      expect(state.state).toBe(GameState.MENU);
      expect(state.score).toBe(0);
      expect(state.mathScore).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.totalCorrect).toBe(0);
      expect(state.totalIncorrect).toBe(0);
      expect(state.currentQuestion).toBeNull();
      expect(state.bird.alive).toBe(true);
      expect(state.obstacles).toHaveLength(0);
    });

    it('should provide correct math performance data initially', () => {
      const mathData = gameEngine.getMathPerformanceData();
      
      expect(mathData.mathScore).toBe(0);
      expect(mathData.streak).toBe(0);
      expect(mathData.totalCorrect).toBe(0);
      expect(mathData.totalIncorrect).toBe(0);
      expect(mathData.accuracy).toBe(0);
    });
  });

  describe('Game State Transitions', () => {
    it('should transition from MENU to PLAYING when started', () => {
      expect(gameEngine.getGameState().state).toBe(GameState.MENU);
      
      gameEngine.start();
      
      expect(gameEngine.getGameState().state).toBe(GameState.PLAYING);
      expect(gameEngine.isPlaying()).toBe(true);
      expect(gameEngine.isGameOver()).toBe(false);
    });

    it('should transition to GAME_OVER when bird dies', () => {
      gameEngine.start();
      
      // Kill the bird to trigger game over
      const state = gameEngine.getGameState();
      state.bird.kill();
      
      // Simulate collision detection triggering game over
      gameEngine['handleGameOver']();
      
      expect(gameEngine.getGameState().state).toBe(GameState.GAME_OVER);
      expect(gameEngine.isPlaying()).toBe(false);
      expect(gameEngine.isGameOver()).toBe(true);
    });

    it('should transition to PAUSED when paused during play', () => {
      gameEngine.start();
      expect(gameEngine.getGameState().state).toBe(GameState.PLAYING);
      
      gameEngine.pause();
      
      expect(gameEngine.getGameState().state).toBe(GameState.PAUSED);
      expect(gameEngine.isPlaying()).toBe(false);
    });

    it('should resume from PAUSED to PLAYING', () => {
      gameEngine.start();
      gameEngine.pause();
      expect(gameEngine.getGameState().state).toBe(GameState.PAUSED);
      
      gameEngine.resume();
      
      expect(gameEngine.getGameState().state).toBe(GameState.PLAYING);
      expect(gameEngine.isPlaying()).toBe(true);
    });
  });

  describe('Math State Tracking', () => {
    beforeEach(() => {
      gameEngine.start();
    });

    it('should track correct answers and update math state', () => {
      const initialState = gameEngine.getGameState();
      
      // Simulate correct answer
      gameEngine['handleAnswerSelection'](5, true);
      
      const updatedState = gameEngine.getGameState();
      expect(updatedState.totalCorrect).toBe(initialState.totalCorrect + 1);
      expect(updatedState.mathScore).toBeGreaterThan(initialState.mathScore);
      expect(updatedState.streak).toBeGreaterThan(initialState.streak);
    });

    it('should track incorrect answers and update math state', () => {
      const initialState = gameEngine.getGameState();
      
      // Simulate incorrect answer
      gameEngine['handleAnswerSelection'](10, false);
      
      const updatedState = gameEngine.getGameState();
      expect(updatedState.totalIncorrect).toBe(initialState.totalIncorrect + 1);
      expect(updatedState.streak).toBe(0); // Streak should reset
    });

    it('should calculate accuracy correctly', () => {
      // Simulate some answers
      gameEngine['handleAnswerSelection'](5, true);  // Correct
      gameEngine['handleAnswerSelection'](10, false); // Incorrect
      gameEngine['handleAnswerSelection'](7, true);  // Correct
      
      const mathData = gameEngine.getMathPerformanceData();
      expect(mathData.totalCorrect).toBe(2);
      expect(mathData.totalIncorrect).toBe(1);
      expect(mathData.accuracy).toBe(66.7); // 2/3 * 100, rounded to 1 decimal
    });
  });

  describe('Game Over Data', () => {
    it('should provide complete game over data when game ends', () => {
      gameEngine.start();
      
      // Simulate some gameplay with math answers
      gameEngine['handleAnswerSelection'](5, true);  // +10 points, streak 1
      gameEngine['handleAnswerSelection'](7, true);  // +10 points, streak 2
      gameEngine['handleAnswerSelection'](10, false); // -5 points, streak reset
      
      // Trigger game over
      const state = gameEngine.getGameState();
      state.bird.kill();
      gameEngine['handleGameOver']();
      
      // Check that onGameOver was called with complete data
      expect(onGameOverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          score: expect.any(Number),
          mathScore: expect.any(Number),
          streak: expect.any(Number),
          totalCorrect: 2,
          totalIncorrect: 1,
          accuracy: 66.7
        })
      );
    });

    it('should handle game over with no math answers', () => {
      gameEngine.start();
      
      // Trigger game over without any math answers
      const state = gameEngine.getGameState();
      state.bird.kill();
      gameEngine['handleGameOver']();
      
      expect(onGameOverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCorrect: 0,
          totalIncorrect: 0,
          accuracy: 0
        })
      );
    });
  });

  describe('Game Reset', () => {
    it('should reset all game state when reset is called', () => {
      gameEngine.start();
      
      // Simulate some gameplay
      gameEngine['handleAnswerSelection'](5, true);
      gameEngine['handleAnswerSelection'](10, false);
      
      // Verify state has changed
      let state = gameEngine.getGameState();
      expect(state.totalCorrect).toBe(1);
      expect(state.totalIncorrect).toBe(1);
      expect(state.mathScore).toBeGreaterThan(0);
      
      // Reset the game
      gameEngine.reset();
      
      // Verify state is back to initial values
      state = gameEngine.getGameState();
      expect(state.state).toBe(GameState.MENU);
      expect(state.score).toBe(0);
      expect(state.mathScore).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.totalCorrect).toBe(0);
      expect(state.totalIncorrect).toBe(0);
      expect(state.currentQuestion).toBeNull();
      expect(state.bird.alive).toBe(true);
      expect(state.obstacles).toHaveLength(0);
    });

    it('should reset math performance data', () => {
      gameEngine.start();
      
      // Simulate gameplay
      gameEngine['handleAnswerSelection'](5, true);
      gameEngine['handleAnswerSelection'](7, true);
      
      // Verify math data has values
      let mathData = gameEngine.getMathPerformanceData();
      expect(mathData.totalCorrect).toBe(2);
      expect(mathData.mathScore).toBeGreaterThan(0);
      
      // Reset
      gameEngine.reset();
      
      // Verify math data is reset
      mathData = gameEngine.getMathPerformanceData();
      expect(mathData.mathScore).toBe(0);
      expect(mathData.streak).toBe(0);
      expect(mathData.totalCorrect).toBe(0);
      expect(mathData.totalIncorrect).toBe(0);
      expect(mathData.accuracy).toBe(0);
    });
  });

  describe('Data Persistence During Gameplay', () => {
    it('should maintain math state throughout gameplay session', () => {
      gameEngine.start();
      
      // Simulate extended gameplay
      const answers = [
        { answer: 5, correct: true },
        { answer: 7, correct: true },
        { answer: 10, correct: false },
        { answer: 3, correct: true },
        { answer: 8, correct: true },
        { answer: 12, correct: false }
      ];
      
      answers.forEach(({ answer, correct }) => {
        gameEngine['handleAnswerSelection'](answer, correct);
      });
      
      const mathData = gameEngine.getMathPerformanceData();
      expect(mathData.totalCorrect).toBe(4);
      expect(mathData.totalIncorrect).toBe(2);
      expect(mathData.accuracy).toBe(66.7); // 4/6 * 100
      expect(mathData.mathScore).toBeGreaterThan(0);
    });

    it('should maintain traditional collision detection behavior', () => {
      gameEngine.start();
      
      // Simulate some math gameplay
      gameEngine['handleAnswerSelection'](5, true);
      
      const initialMathScore = gameEngine.getGameState().mathScore;
      
      // Trigger collision (traditional game over)
      const state = gameEngine.getGameState();
      state.bird.kill();
      gameEngine['handleGameOver']();
      
      // Verify game over was triggered and math state was preserved
      expect(gameEngine.isGameOver()).toBe(true);
      expect(onGameOverSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mathScore: initialMathScore,
          totalCorrect: 1,
          totalIncorrect: 0
        })
      );
    });
  });

  describe('Browser Support', () => {
    it('should check browser support correctly', () => {
      const support = GameEngine.checkBrowserSupport();
      
      expect(support).toHaveProperty('supported');
      expect(support).toHaveProperty('issues');
      expect(support).toHaveProperty('recommendations');
      expect(Array.isArray(support.issues)).toBe(true);
      expect(Array.isArray(support.recommendations)).toBe(true);
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources when destroyed', () => {
      gameEngine.start();
      
      // Verify game is running
      expect(gameEngine.isPlaying()).toBe(true);
      
      // Destroy the engine
      gameEngine.destroy();
      
      // Verify cleanup (we can't easily test all internal cleanup, 
      // but we can verify the method doesn't throw)
      expect(() => gameEngine.destroy()).not.toThrow();
    });
  });
});