'use client';

import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from '../components/GameCanvas';
import ScoreDisplay from '../components/ScoreDisplay';
import GameOverScreen, { GameOverData } from '../components/GameOverScreen';
import QuestionDisplay from '../components/QuestionDisplay';
import ErrorBoundary from '../components/ErrorBoundary';
import { GAME_CONFIG } from '../utils/gameConfig';
import { MathQuestion } from '../types';

interface GamePageState {
  score: number;
  mathScore: number;
  streak: number;
  currentQuestion: MathQuestion | null;
  isGameOver: boolean;
  isPlaying: boolean;
  hasStarted: boolean;
  gameOverData: GameOverData | null;
}

export default function Game() {
  const [gameState, setGameState] = useState<GamePageState>({
    score: 0,
    mathScore: 0,
    streak: 0,
    currentQuestion: null,
    isGameOver: false,
    isPlaying: false,
    hasStarted: false,
    gameOverData: null
  });

  // Handle score updates from the game engine
  const handleScoreUpdate = useCallback((newScore: number) => {
    setGameState(prev => ({
      ...prev,
      score: newScore
    }));
  }, []);

  // Handle math score updates from the game engine
  const handleMathScoreUpdate = useCallback((mathScore: number, streak: number) => {
    setGameState(prev => ({
      ...prev,
      mathScore,
      streak
    }));
  }, []);

  // Handle question updates from the game engine
  const handleQuestionUpdate = useCallback((question: MathQuestion | null) => {
    setGameState(prev => ({
      ...prev,
      currentQuestion: question
    }));
  }, []);

  // Handle game over event
  const handleGameOver = useCallback((gameOverData: GameOverData) => {
    setGameState(prev => ({
      ...prev,
      score: gameOverData.score,
      isGameOver: true,
      isPlaying: false,
      gameOverData: gameOverData
    }));
  }, []);

  // Handle game start event
  const handleGameStart = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      hasStarted: true,
      isGameOver: false,
      gameOverData: null
    }));
  }, []);

  // Handle restart functionality
  const handleRestart = useCallback(() => {
    setGameState({
      score: 0,
      mathScore: 0,
      streak: 0,
      currentQuestion: null,
      isGameOver: false,
      isPlaying: false,
      hasStarted: false,
      gameOverData: null
    });
    
    // Force a re-render of the GameCanvas component by changing its key
    // This ensures the game engine is properly reset
    window.location.reload();
  }, []);

  // Handle keyboard shortcuts for game control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Handle restart with 'R' key when game is over
      if (event.key.toLowerCase() === 'r' && gameState.isGameOver) {
        event.preventDefault();
        handleRestart();
      }
      
      // Handle escape key to pause/resume (future enhancement)
      if (event.key === 'Escape' && gameState.isPlaying) {
        event.preventDefault();
        // Could implement pause functionality here
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState.isGameOver, gameState.isPlaying, handleRestart]);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Game page error:', error, errorInfo);
      }}
      resetKeys={[gameState.score, gameState.isGameOver.toString()]}
    >
      <main className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 flex flex-col items-center justify-center p-2 sm:p-4">
        {/* Game Title */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Math Bird
          </h1>
          <p className="text-blue-100 text-sm sm:text-lg px-2">
            {!gameState.hasStarted 
              ? "Answer math questions by flying through the correct path!" 
              : gameState.isPlaying 
                ? "Solve the math problem above!" 
                : "Tap to jump!"
            }
          </p>
          
          {/* Math Score Display */}
          {gameState.hasStarted && (gameState.mathScore > 0 || gameState.streak > 0) && (
            <div className="flex justify-center space-x-4 mt-2">
              <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 backdrop-blur-sm">
                <span className="text-yellow-200 text-sm font-medium">
                  Math Score: {gameState.mathScore}
                </span>
              </div>
              {gameState.streak > 0 && (
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 backdrop-blur-sm">
                  <span className="text-green-200 text-sm font-medium">
                    Streak: {gameState.streak}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Game Container */}
        <ErrorBoundary
          onError={(error) => {
            console.error('Game canvas error:', error);
          }}
        >
          <div className="relative w-full flex justify-center">
            {/* Game Canvas */}
            <GameCanvas
              width={GAME_CONFIG.CANVAS_WIDTH}
              height={GAME_CONFIG.CANVAS_HEIGHT}
              onScoreUpdate={handleScoreUpdate}
              onMathScoreUpdate={handleMathScoreUpdate}
              onQuestionUpdate={handleQuestionUpdate}
              onGameOver={handleGameOver}
              onGameStart={handleGameStart}
              className="rounded-lg shadow-2xl"
              enableResponsive={true}
            />

            {/* Question Display - Overlay on top of canvas */}
            {gameState.currentQuestion && gameState.isPlaying && (
              <ErrorBoundary>
                <QuestionDisplay
                  question={gameState.currentQuestion.question}
                  isVisible={true}
                  canvasWidth={GAME_CONFIG.CANVAS_WIDTH}
                  canvasHeight={GAME_CONFIG.CANVAS_HEIGHT}
                  scale={1}
                />
              </ErrorBoundary>
            )}

            {/* Score Display - Only show when game has started */}
            {gameState.hasStarted && (
              <ErrorBoundary>
                <ScoreDisplay 
                  score={gameState.score}
                  className="z-10"
                />
              </ErrorBoundary>
            )}

            {/* Game Over Screen */}
            <ErrorBoundary>
              <GameOverScreen
                score={gameState.score}
                mathData={gameState.gameOverData || undefined}
                onRestart={handleRestart}
                isVisible={gameState.isGameOver}
              />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>

        {/* Game Instructions */}
        <div className="mt-4 sm:mt-6 text-center text-blue-100 max-w-md mx-auto px-2">
          <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 text-sm sm:text-base">How to Play:</h3>
            <ul className="text-xs sm:text-sm space-y-1">
              <li>• Tap or press spacebar to make the bird jump</li>
              <li>• Solve math questions by flying through the correct answer</li>
              <li>• Correct answers: +10 points, build streaks for bonuses!</li>
              <li>• Wrong answers: -5 points, streak resets</li>
              <li>• Avoid hitting the pipes or ground to keep playing</li>
              {gameState.isGameOver && (
                <li className="text-yellow-200 font-medium">• Press &apos;R&apos; or tap &quot;Play Again&quot; to restart</li>
              )}
            </ul>
          </div>
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-blue-200 bg-black bg-opacity-20 rounded p-2">
            <div>Game State: {gameState.isPlaying ? 'Playing' : gameState.isGameOver ? 'Game Over' : 'Ready'}</div>
            <div>Score: {gameState.score}</div>
            <div>Started: {gameState.hasStarted ? 'Yes' : 'No'}</div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}