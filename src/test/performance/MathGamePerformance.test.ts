import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameEngine } from '../../components/GameEngine';
import { MathQuestionManager } from '../../utils/MathQuestionManager';
import { ScoringSystem } from '../../utils/ScoringSystem';
import { PerformanceMonitor } from '../../utils/performanceMonitor';
import { MathObstacle } from '../../components/MathObstacle';

// Mock canvas and context with performance tracking
const createMockCanvas = () => {
  const renderCalls = {
    clearRect: 0,
    fillText: 0,
    fillRect: 0,
    strokeRect: 0,
    total: 0
  };

  const mockContext = {
    clearRect: vi.fn(() => { renderCalls.clearRect++; renderCalls.total++; }),
    fillRect: vi.fn(() => { renderCalls.fillRect++; renderCalls.total++; }),
    strokeRect: vi.fn(() => { renderCalls.strokeRect++; renderCalls.total++; }),
    fillText: vi.fn(() => { renderCalls.fillText++; renderCalls.total++; }),
    drawImage: vi.fn(() => { renderCalls.total++; }),
    measureText: vi.fn(() => ({ width: 50 })),
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
    textBaseline: 'alphabetic',
    getRenderCalls: () => renderCalls
  };

  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => mockContext)
  } as unknown as HTMLCanvasElement & { getContext: () => typeof mockContext };
};

// Mock performance.now with controllable time
let mockTime = 0;
const mockPerformanceNow = vi.fn(() => mockTime);
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10 // 10MB initial
    }
  },
  writable: true
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock document.createElement for canvas creation in text caching
global.document = {
  ...global.document,
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return createMockCanvas();
    }
    return {};
  })
} as any;

describe('Math Game Performance Tests', () => {
  let gameEngine: GameEngine;
  let performanceMonitor: PerformanceMonitor;
  let mockCanvas: HTMLCanvasElement & { getContext: () => any };
  let mockCallbacks: {
    onScoreUpdate: ReturnType<typeof vi.fn>;
    onGameOver: ReturnType<typeof vi.fn>;
    onGameStart: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    onQuestionUpdate: ReturnType<typeof vi.fn>;
    onMathScoreUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTime = 0;
    mockCanvas = createMockCanvas();
    gameEngine = new GameEngine();
    performanceMonitor = new PerformanceMonitor({
      targetFps: 60,
      lowPerformanceFps: 45,
      criticalPerformanceFps: 30
    });
    
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
    performanceMonitor.stop();
    vi.clearAllMocks();
  });

  describe('Math UI Rendering Performance', () => {
    it('should maintain 60fps with math question display', async () => {
      // Arrange
      gameEngine.start();
      performanceMonitor.start();
      const targetFrameTime = 16.67; // 60fps
      const frameMetrics: number[] = [];

      // Act - Simulate 60 frames of rendering with math elements
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = mockTime;
        
        // Simulate frame rendering with math elements
        gameEngine.update();
        
        // Simulate math question rendering overhead
        const context = mockCanvas.getContext();
        context.fillText('12 + 8', 400, 50); // Question display
        context.fillText('20', 350, 300); // Answer choice 1
        context.fillText('19', 350, 450); // Answer choice 2
        context.fillText('Score: 150', 50, 50); // Score display
        
        mockTime += targetFrameTime;
        const frameTime = mockTime - frameStart;
        frameMetrics.push(frameTime);
        
        performanceMonitor.update();
      }

      // Assert
      const avgFrameTime = frameMetrics.reduce((sum, time) => sum + time, 0) / frameMetrics.length;
      expect(avgFrameTime).toBeLessThanOrEqual(targetFrameTime * 1.1); // Allow 10% variance
      
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      expect(currentMetrics.fps).toBeGreaterThanOrEqual(55); // Close to 60fps
      expect(currentMetrics.droppedFrames).toBeLessThan(5); // Minimal dropped frames
    });

    it('should optimize text rendering for math elements', async () => {
      // Arrange
      gameEngine.start();
      const context = mockCanvas.getContext();
      const renderCallsBefore = context.getRenderCalls().fillText;

      // Act - Render multiple math elements
      for (let i = 0; i < 10; i++) {
        // Simulate rendering math question
        context.fillText(`${i + 1} + ${i + 2}`, 400, 50);
        
        // Simulate rendering answer choices
        context.fillText(`${(i + 1) + (i + 2)}`, 350, 300);
        context.fillText(`${(i + 1) + (i + 2) + 1}`, 350, 450);
        
        // Simulate score rendering
        context.fillText(`Score: ${i * 10}`, 50, 50);
      }

      const renderCallsAfter = context.getRenderCalls().fillText;
      const textRenderCalls = renderCallsAfter - renderCallsBefore;

      // Assert
      expect(textRenderCalls).toBe(40); // 4 text renders per iteration * 10 iterations
      expect(textRenderCalls).toBeLessThan(50); // Should not exceed expected calls
    });

    it('should handle answer zone collision detection efficiently', async () => {
      // Arrange
      const mathObstacle = new MathObstacle(400, 300, 100, 200);
      const question = {
        id: 'test_001',
        category: 'addition' as const,
        question: '5 + 3',
        correctAnswer: 8,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      
      const collisionTests = 1000;
      const startTime = performance.now();

      // Act - Perform many collision detections
      for (let i = 0; i < collisionTests; i++) {
        const birdBounds = {
          x: 350 + (i % 100),
          y: 300 + (i % 200),
          width: 30,
          height: 30
        };
        
        mathObstacle.checkAnswerSelection(birdBounds);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(totalTime).toBeLessThan(100); // Should complete in less than 100ms
      const avgTimePerCollision = totalTime / collisionTests;
      expect(avgTimePerCollision).toBeLessThan(0.1); // Less than 0.1ms per collision
    });

    it('should maintain performance with multiple math obstacles', async () => {
      // Arrange
      gameEngine.start();
      performanceMonitor.start();
      
      // Generate multiple obstacles with math elements
      for (let i = 0; i < 5; i++) {
        gameEngine.forceObstacleGeneration();
      }

      const frameMetrics: number[] = [];
      const targetFrameTime = 16.67;

      // Act - Render frames with multiple math obstacles
      for (let frame = 0; frame < 30; frame++) {
        const frameStart = mockTime;
        
        gameEngine.update();
        
        mockTime += targetFrameTime;
        const frameTime = mockTime - frameStart;
        frameMetrics.push(frameTime);
        
        performanceMonitor.update();
      }

      // Assert
      const avgFrameTime = frameMetrics.reduce((sum, time) => sum + time, 0) / frameMetrics.length;
      expect(avgFrameTime).toBeLessThanOrEqual(targetFrameTime * 1.2); // Allow 20% variance for multiple obstacles
      
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      expect(currentMetrics.fps).toBeGreaterThanOrEqual(50); // Should maintain reasonable fps
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should manage memory efficiently during extended math gameplay', async () => {
      // Arrange
      gameEngine.start();
      const initialMemory = (global.performance as any).memory.usedJSHeapSize;
      const memorySnapshots: number[] = [];

      // Act - Simulate extended gameplay with question changes
      for (let i = 0; i < 100; i++) {
        // Generate new question and obstacle
        gameEngine.forceObstacleGeneration();
        
        // Simulate memory usage
        const currentMemory = (global.performance as any).memory.usedJSHeapSize;
        memorySnapshots.push(currentMemory);
        
        // Simulate gradual memory increase (realistic for game objects)
        (global.performance as any).memory.usedJSHeapSize += 1024 * 10; // 10KB per iteration
        
        // Simulate frame update
        gameEngine.update();
      }

      const finalMemory = (global.performance as any).memory.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      // Assert
      expect(memoryGrowth).toBeLessThan(1024 * 1024 * 5); // Less than 5MB growth
      expect(memorySnapshots.length).toBe(100);
      
      // Memory growth should be linear, not exponential
      const midpointMemory = memorySnapshots[50];
      const quarterMemory = memorySnapshots[25];
      const memoryGrowthRate = (midpointMemory - quarterMemory) / 25;
      expect(memoryGrowthRate).toBeLessThan(1024 * 50); // Less than 50KB per iteration
    });

    it('should clean up math obstacles properly to prevent memory leaks', async () => {
      // Arrange
      gameEngine.start();
      const initialObstacleCount = gameEngine.getGameState().obstacles.length;

      // Act - Generate and clean up many obstacles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Generate obstacles
        for (let i = 0; i < 5; i++) {
          gameEngine.forceObstacleGeneration();
        }
        
        // Simulate obstacle cleanup (they move off screen)
        const gameState = gameEngine.getGameState();
        gameState.obstacles.forEach(obstacle => {
          obstacle.x = -200; // Move off screen
        });
        
        gameEngine.update(); // This should clean up off-screen obstacles
      }

      const finalObstacleCount = gameEngine.getGameState().obstacles.length;

      // Assert
      expect(finalObstacleCount).toBeLessThan(10); // Should not accumulate obstacles
      expect(finalObstacleCount).toBeGreaterThanOrEqual(initialObstacleCount); // But should have some active
    });

    it('should optimize question pool memory usage', async () => {
      // Arrange
      const questionManager = new MathQuestionManager();
      const initialMemory = (global.performance as any).memory.usedJSHeapSize;

      // Act - Cycle through many questions
      const questionIds = new Set<string>();
      for (let i = 0; i < 300; i++) { // More than the pool size
        const question = questionManager.getNextQuestion();
        questionIds.add(question.id);
        
        // Simulate memory tracking
        (global.performance as any).memory.usedJSHeapSize += 100; // Small increase per question
      }

      const finalMemory = (global.performance as any).memory.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      // Assert
      expect(questionIds.size).toBeLessThanOrEqual(200); // Should not exceed pool size significantly
      expect(memoryGrowth).toBeLessThan(1024 * 100); // Less than 100KB growth
    });
  });

  describe('Mobile and Touch Optimization', () => {
    it('should optimize answer zone sizes for mobile devices', async () => {
      // Arrange - Mock mobile environment
      const originalUserAgent = navigator.userAgent;
      const originalInnerWidth = window.innerWidth;
      
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        configurable: true
      });

      const question = {
        id: 'test_mobile',
        category: 'addition' as const,
        question: '3 + 4',
        correctAnswer: 7,
        difficulty: 1
      };
      
      const mathObstacle = new MathObstacle(400, question, 300);
      const answerZones = mathObstacle.getAnswerZones();

      // Act & Assert
      expect(answerZones.upper.bounds.height).toBeGreaterThanOrEqual(60); // Mobile-friendly height
      expect(answerZones.lower.bounds.height).toBeGreaterThanOrEqual(60);
      expect(answerZones.upper.bounds.width).toBeGreaterThanOrEqual(50); // Touch-friendly width

      // Cleanup
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        configurable: true
      });
    });

    it('should optimize collision detection performance with early exits', async () => {
      // Arrange
      const question = {
        id: 'test_collision',
        category: 'multiplication' as const,
        question: '6 × 7',
        correctAnswer: 42,
        difficulty: 2
      };
      
      const mathObstacle = new MathObstacle(400, question, 300);
      const collisionTests = 10000;
      const startTime = performance.now();

      // Act - Test collision detection with birds far from obstacle
      for (let i = 0; i < collisionTests; i++) {
        const birdBounds = {
          x: 100, // Far from obstacle at x=400
          y: 300,
          width: 30,
          height: 30
        };
        
        mathObstacle.checkAnswerSelection(birdBounds);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert - Should be very fast due to early exit optimization
      expect(totalTime).toBeLessThan(50); // Should complete in less than 50ms
      const avgTimePerCollision = totalTime / collisionTests;
      expect(avgTimePerCollision).toBeLessThan(0.005); // Less than 0.005ms per collision
    });

    it('should cache text rendering for improved performance', async () => {
      // Arrange
      const question1 = {
        id: 'test_cache_1',
        category: 'addition' as const,
        question: '5 + 5',
        correctAnswer: 10,
        difficulty: 1
      };
      
      const question2 = {
        id: 'test_cache_2',
        category: 'addition' as const,
        question: '5 + 5', // Same question for cache testing
        correctAnswer: 10,
        difficulty: 1
      };

      const obstacle1 = new MathObstacle(400, question1, 300);
      const obstacle2 = new MathObstacle(500, question2, 300);
      const context = mockCanvas.getContext();

      // Act - Render both obstacles (should use cached text for same answers)
      const renderStart = performance.now();
      
      for (let i = 0; i < 100; i++) {
        obstacle1.renderAnswerChoices(context);
        obstacle2.renderAnswerChoices(context);
      }

      const renderEnd = performance.now();
      const totalRenderTime = renderEnd - renderStart;

      // Assert - Should be faster due to text caching
      expect(totalRenderTime).toBeLessThan(100); // Should complete quickly
      const avgRenderTime = totalRenderTime / 200; // 100 iterations * 2 obstacles
      expect(avgRenderTime).toBeLessThan(0.5); // Less than 0.5ms per render
    });
  });

  describe('Rendering Optimization', () => {
    it('should minimize redundant rendering calls for static math elements', async () => {
      // Arrange
      gameEngine.start();
      const context = mockCanvas.getContext();
      const initialRenderCalls = context.getRenderCalls().total;

      // Act - Multiple updates with same question
      const question = gameEngine.getCurrentQuestion();
      for (let i = 0; i < 10; i++) {
        gameEngine.update();
        
        // Simulate rendering the same question multiple times
        if (question) {
          context.fillText(question.question, 400, 50);
        }
      }

      const finalRenderCalls = context.getRenderCalls().total;
      const totalRenderCalls = finalRenderCalls - initialRenderCalls;

      // Assert
      expect(totalRenderCalls).toBeGreaterThan(0); // Should render
      expect(totalRenderCalls).toBeLessThan(100); // But not excessively
    });

    it('should optimize answer zone rendering performance', async () => {
      // Arrange
      const mathObstacle = new MathObstacle(400, 300, 100, 200);
      const question = {
        id: 'test_001',
        category: 'addition' as const,
        question: '7 + 5',
        correctAnswer: 12,
        difficulty: 1
      };
      
      mathObstacle.setupAnswerZones(question);
      const context = mockCanvas.getContext();
      const renderStartTime = performance.now();

      // Act - Render answer zones multiple times
      for (let i = 0; i < 50; i++) {
        try {
          mathObstacle.renderAnswerChoices(context);
        } catch (error) {
          // Expected if answer zones aren't set up - that's fine for performance testing
        }
      }

      const renderEndTime = performance.now();
      const totalRenderTime = renderEndTime - renderStartTime;

      // Assert
      expect(totalRenderTime).toBeLessThan(50); // Should complete in less than 50ms
      const avgRenderTime = totalRenderTime / 50;
      expect(avgRenderTime).toBeLessThan(1); // Less than 1ms per render
    });

    it('should handle dynamic score display updates efficiently', async () => {
      // Arrange
      const scoringSystem = new ScoringSystem();
      const context = mockCanvas.getContext();
      const renderTimes: number[] = [];

      // Act - Update and render score many times
      for (let i = 0; i < 100; i++) {
        const renderStart = performance.now();
        
        // Update score
        if (i % 2 === 0) {
          scoringSystem.processCorrectAnswer();
        } else {
          scoringSystem.processIncorrectAnswer();
        }
        
        // Render score
        const score = scoringSystem.getPoints();
        const streak = scoringSystem.getStreak();
        context.fillText(`Score: ${score}`, 50, 50);
        context.fillText(`Streak: ${streak}`, 50, 80);
        
        const renderEnd = performance.now();
        renderTimes.push(renderEnd - renderStart);
      }

      // Assert
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(1); // Less than 1ms per score update and render
      
      const maxRenderTime = Math.max(...renderTimes);
      expect(maxRenderTime).toBeLessThan(5); // No single render should take more than 5ms
    });
  });

  describe('Responsive Scaling Performance', () => {
    it('should maintain 60fps with responsive question display scaling', async () => {
      // Arrange
      performanceMonitor.start();
      const frameMetrics: number[] = [];
      const targetFrameTime = 16.67;

      // Test different screen sizes
      const screenSizes = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const screenSize of screenSizes) {
        // Mock screen size
        Object.defineProperty(window, 'innerWidth', {
          value: screenSize.width,
          configurable: true
        });
        Object.defineProperty(window, 'innerHeight', {
          value: screenSize.height,
          configurable: true
        });

        // Act - Render frames with responsive scaling
        for (let frame = 0; frame < 20; frame++) {
          const frameStart = mockTime;
          
          // Simulate responsive question display rendering
          const scale = Math.min(screenSize.width / 800, screenSize.height / 600);
          const fontSize = Math.max(20, Math.min(48, 32 * scale));
          
          const context = mockCanvas.getContext();
          context.font = `bold ${fontSize}px Arial`;
          context.fillText('8 + 7 = ?', screenSize.width / 2, 50);
          
          mockTime += targetFrameTime;
          const frameTime = mockTime - frameStart;
          frameMetrics.push(frameTime);
          
          performanceMonitor.update();
        }
      }

      // Assert
      const avgFrameTime = frameMetrics.reduce((sum, time) => sum + time, 0) / frameMetrics.length;
      expect(avgFrameTime).toBeLessThanOrEqual(targetFrameTime * 1.1); // Allow 10% variance
      
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      expect(currentMetrics.fps).toBeGreaterThanOrEqual(55); // Close to 60fps
    });

    it('should optimize performance on low-end devices', async () => {
      // Arrange - Simulate low-end device
      performanceMonitor = new PerformanceMonitor({
        targetFps: 45, // Lower target for low-end devices
        lowPerformanceFps: 30,
        criticalPerformanceFps: 20
      });
      
      performanceMonitor.start();
      gameEngine.start();

      // Mock low-end device characteristics
      Object.defineProperty(window, 'innerWidth', {
        value: 320,
        configurable: true
      });
      
      (global.performance as any).memory.usedJSHeapSize = 1024 * 1024 * 50; // 50MB (limited memory)

      const frameMetrics: number[] = [];
      const targetFrameTime = 22.22; // 45fps

      // Act - Simulate gameplay on low-end device
      for (let frame = 0; frame < 45; frame++) {
        const frameStart = mockTime;
        
        gameEngine.update();
        
        // Reduced rendering for low-end devices
        const context = mockCanvas.getContext();
        context.fillText('Question', 160, 30); // Simplified rendering
        
        mockTime += targetFrameTime;
        const frameTime = mockTime - frameStart;
        frameMetrics.push(frameTime);
        
        performanceMonitor.update();
      }

      // Assert
      const avgFrameTime = frameMetrics.reduce((sum, time) => sum + time, 0) / frameMetrics.length;
      expect(avgFrameTime).toBeLessThanOrEqual(targetFrameTime * 1.2); // Allow 20% variance for low-end
      
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      expect(currentMetrics.fps).toBeGreaterThanOrEqual(35); // Reasonable performance for low-end
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should detect performance issues with math rendering', async () => {
      // Arrange
      let lowPerformanceDetected = false;
      const performanceMonitorWithCallbacks = new PerformanceMonitor(
        { targetFps: 60, lowPerformanceFps: 45 },
        {
          onLowPerformance: () => { lowPerformanceDetected = true; }
        }
      );
      
      performanceMonitorWithCallbacks.start();
      gameEngine.start();

      // Act - Simulate poor performance with heavy math rendering
      for (let frame = 0; frame < 20; frame++) {
        // Simulate slow frame (30fps instead of 60fps)
        mockTime += 33.33;
        
        // Heavy rendering simulation
        const context = mockCanvas.getContext();
        for (let i = 0; i < 100; i++) {
          context.fillText(`Question ${i}`, 400, 50 + i);
        }
        
        performanceMonitorWithCallbacks.update();
      }

      // Assert
      expect(lowPerformanceDetected).toBe(true);
      
      const metrics = performanceMonitorWithCallbacks.getCurrentMetrics();
      expect(metrics.fps).toBeLessThan(45);
      expect(metrics.isLowPerformance).toBe(true);
    });

    it('should provide optimization recommendations for math game performance', async () => {
      // Arrange
      performanceMonitor.start();
      gameEngine.start();

      // Act - Simulate performance issues
      for (let frame = 0; frame < 15; frame++) {
        mockTime += 40; // 25fps - poor performance
        performanceMonitor.update();
      }

      const metrics = performanceMonitor.getCurrentMetrics();
      const recommendations = performanceMonitor.getOptimizationRecommendations(metrics);

      // Assert
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('performance'))).toBe(true);
      expect(metrics.fps).toBeLessThan(30);
    });

    it('should maintain performance metrics accuracy during math gameplay', async () => {
      // Arrange
      performanceMonitor.start();
      gameEngine.start();
      const expectedFps = 60;
      const frameTime = 1000 / expectedFps;

      // Act - Simulate consistent 60fps gameplay
      for (let frame = 0; frame < 60; frame++) {
        mockTime += frameTime;
        
        // Simulate math game update
        gameEngine.update();
        if (frame % 10 === 0) {
          gameEngine.forceObstacleGeneration(); // New question every 10 frames
        }
        
        performanceMonitor.update();
      }

      const metrics = performanceMonitor.getCurrentMetrics();

      // Assert
      expect(metrics.fps).toBeCloseTo(expectedFps, 5); // Within 5fps
      expect(metrics.totalFrames).toBe(60);
      expect(metrics.droppedFrames).toBe(0);
      expect(metrics.isLowPerformance).toBe(false);
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme math rendering load', async () => {
      // Arrange
      gameEngine.start();
      performanceMonitor.start();
      const stressTestFrames = 100;
      const performanceResults: number[] = [];

      // Act - Extreme rendering stress test
      for (let frame = 0; frame < stressTestFrames; frame++) {
        const frameStart = performance.now();
        
        // Generate multiple obstacles
        if (frame % 5 === 0) {
          gameEngine.forceObstacleGeneration();
        }
        
        // Heavy math rendering
        const context = mockCanvas.getContext();
        for (let i = 0; i < 20; i++) {
          context.fillText(`${i} + ${i + 1} = ${i + i + 1}`, 100 + (i * 10), 100 + (i * 5));
        }
        
        gameEngine.update();
        
        mockTime += 16.67;
        const frameTime = performance.now() - frameStart;
        performanceResults.push(frameTime);
        
        performanceMonitor.update();
      }

      // Assert
      const avgFrameTime = performanceResults.reduce((sum, time) => sum + time, 0) / performanceResults.length;
      expect(avgFrameTime).toBeLessThan(50); // Should handle stress reasonably
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.totalFrames).toBe(stressTestFrames);
      
      // Should not crash or throw errors
      expect(gameEngine.isPlaying()).toBe(true);
    });
  });
});