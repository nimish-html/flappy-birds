'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine, GameState, GameOverData } from './GameEngine';
import { GAME_CONFIG, RESPONSIVE_CONFIG } from '../utils/gameConfig';
import { useResponsiveCanvas } from '../hooks/useResponsiveCanvas';
import { FeedbackDisplay } from './FeedbackDisplay';
import { AnswerFeedback } from '../utils/AnswerHandler';
import { MathQuestion } from '../types';

interface GameCanvasProps {
  width?: number;
  height?: number;
  onGameOver?: (gameOverData: GameOverData) => void;
  onScoreUpdate?: (score: number) => void;
  onMathScoreUpdate?: (mathScore: number, streak: number) => void;
  onQuestionUpdate?: (question: MathQuestion | null) => void;
  onGameStart?: () => void;
  className?: string;
  enableResponsive?: boolean;
}

interface GameCanvasState {
  hasError: boolean;
  errorMessage: string;
  isInitialized: boolean;
  currentFeedback: AnswerFeedback | null;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  width = GAME_CONFIG.CANVAS_WIDTH,
  height = GAME_CONFIG.CANVAS_HEIGHT,
  onGameOver,
  onScoreUpdate,
  onMathScoreUpdate,
  onQuestionUpdate,
  onGameStart,
  className = '',
  enableResponsive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameCanvasState>({
    hasError: false,
    errorMessage: '',
    isInitialized: false,
    currentFeedback: null
  });

  // Use responsive canvas hook if enabled
  const { dimensions, isMobile, isSmallScreen } = useResponsiveCanvas({
    maxWidth: width,
    maxHeight: height,
    minScale: RESPONSIVE_CONFIG.MIN_SCALE,
    maxScale: RESPONSIVE_CONFIG.MAX_SCALE
  });

  // Use responsive dimensions if enabled, otherwise use props
  const canvasWidth = enableResponsive ? dimensions.width : width;
  const canvasHeight = enableResponsive ? dimensions.height : height;
  const canvasScale = enableResponsive ? dimensions.scale : 1;

  // Handle input events
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (gameEngineRef.current) {
      try {
        gameEngineRef.current.handleInput();
      } catch (error) {
        console.error('Error handling canvas click:', error);
        setGameState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Failed to handle input'
        }));
      }
    }
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      if (gameEngineRef.current) {
        try {
          gameEngineRef.current.handleInput();
        } catch (error) {
          console.error('Error handling key press:', error);
          setGameState(prev => ({
            ...prev,
            hasError: true,
            errorMessage: 'Failed to handle input'
          }));
        }
      }
    }
  }, []);

  // Initialize game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setGameState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: 'Canvas element not found'
      }));
      return;
    }

    // Check browser support before initializing
    // Note: Browser support check temporarily disabled for integration
    // const browserSupport = GameEngine.checkBrowserSupport();
    // if (!browserSupport.supported) {
    //   setGameState(prev => ({
    //     ...prev,
    //     hasError: true,
    //     errorMessage: `Browser not supported: ${browserSupport.issues.join(', ')}`
    //   }));
    //   return;
    // }

    // Check if canvas context is available
    const context = canvas.getContext('2d');
    if (!context) {
      setGameState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: 'Failed to get 2D rendering context from canvas. Please enable hardware acceleration.'
      }));
      return;
    }

    try {
      // Create game engine instance with responsive settings
      const gameEngine = new GameEngine();
      
      // Initialize with canvas and callbacks, including mobile optimizations
      gameEngine.initialize(canvas, {
        onScoreUpdate,
        onMathScoreUpdate,
        onQuestionUpdate,
        onGameOver: (gameOverData: GameOverData) => {
          if (onGameOver) {
            onGameOver(gameOverData);
          }
        },
        onGameStart,
        onError: (error: Error) => {
          console.error('Game engine error:', error);
          setGameState(prev => ({
            ...prev,
            hasError: true,
            errorMessage: `Game error: ${error.message}`
          }));
        },
        onFeedbackUpdate: (feedback: AnswerFeedback | null) => {
          setGameState(prev => ({
            ...prev,
            currentFeedback: feedback
          }));
        },
        isMobile: enableResponsive ? isMobile : false,
        scale: enableResponsive ? canvasScale : 1
      });

      gameEngineRef.current = gameEngine;
      
      setGameState(prev => ({
        ...prev,
        isInitialized: true,
        hasError: false,
        errorMessage: ''
      }));

      // Initial render with error handling
      try {
        gameEngine.render();
      } catch (renderError) {
        console.error('Initial render failed:', renderError);
        setGameState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: 'Failed to render game'
        }));
      }

    } catch (error) {
      console.error('Failed to initialize game engine:', error);
      setGameState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to initialize game'
      }));
    }
  }, [onScoreUpdate, onMathScoreUpdate, onQuestionUpdate, onGameOver, onGameStart, enableResponsive, isMobile, canvasScale]);

  // Set up event listeners
  useEffect(() => {
    if (!gameState.isInitialized) return;

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress, gameState.isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
        gameEngineRef.current = null;
      }
    };
  }, []);

  // Handle canvas focus for keyboard events
  const handleCanvasFocus = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, []);

  // Error boundary fallback
  if (gameState.hasError) {
    // const browserSupport = GameEngine.checkBrowserSupport();
    
    return (
      <div 
        className={`flex items-center justify-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="font-bold mb-2">Game Error</h3>
          <p className="text-sm mb-3">{gameState.errorMessage}</p>
          
          {/* Browser support info temporarily disabled */}
          
          <div className="flex space-x-2">
            <button 
              className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-sm transition-colors"
              onClick={() => {
                setGameState({
                  hasError: false,
                  errorMessage: '',
                  isInitialized: false,
                  currentFeedback: null
                });
              }}
            >
              Try Again
            </button>
            <button 
              className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded text-sm transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleCanvasClick}
        onFocus={handleCanvasFocus}
        tabIndex={0}
        className={`border border-gray-300 rounded-lg shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isMobile ? 'touch-manipulation' : ''
        }`}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          touchAction: isMobile ? 'manipulation' : 'auto'
        }}
        aria-label={`Math Bird Game Canvas - ${isMobile ? 'Tap' : 'Click or press spacebar'} to make the bird jump and solve math problems`}
      />
      
      {/* Answer feedback display */}
      <FeedbackDisplay feedback={gameState.currentFeedback} />
      
      {!gameState.isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading game...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;