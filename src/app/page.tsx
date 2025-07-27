'use client';

import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from '../components/GameCanvas';
import ScoreDisplay from '../components/ScoreDisplay';
import GameOverScreen from '../components/GameOverScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import { GAME_CONFIG } from '../utils/gameConfig';

interface GamePageState {
  score: number;
  isGameOver: boolean;
  isPlaying: boolean;
  hasStarted: boolean;
}

export default function Game() {
  const [gameState, setGameState] = useState<GamePageState>({
    score: 0,
    isGameOver: false,
    isPlaying: false,
    hasStarted: false
  });

  // Handle score updates from the game engine
  const handleScoreUpdate = useCallback((newScore: number) => {
    setGameState(prev => ({
      ...prev,
      score: newScore
    }));
  }, []);

  // Handle game over event
  const handleGameOver = useCallback((finalScore: number) => {
    setGameState(prev => ({
      ...prev,
      score: finalScore,
      isGameOver: true,
      isPlaying: false
    }));
  }, []);

  // Handle game start event
  const handleGameStart = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      hasStarted: true,
      isGameOver: false
    }));
  }, []);

  // Handle restart functionality
  const handleRestart = useCallback(() => {
    setGameState({
      score: 0,
      isGameOver: false,
      isPlaying: false,
      hasStarted: false
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
      resetKeys={[gameState.score, gameState.isGameOver]}
    >
      <main className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 flex flex-col items-center justify-center p-2 sm:p-4">
        {/* Game Title */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Flappy Bird
          </h1>
          <p className="text-blue-100 text-sm sm:text-lg px-2">
            {!gameState.hasStarted 
              ? "Tap the canvas or press spacebar to start!" 
              : gameState.isPlaying 
                ? "Keep flying!" 
                : "Tap to jump!"
            }
          </p>
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
              onGameOver={handleGameOver}
              onGameStart={handleGameStart}
              className="rounded-lg shadow-2xl"
              enableResponsive={true}
            />

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
              <li>• Avoid hitting the pipes or the ground</li>
              <li>• Score points by passing through pipe gaps</li>
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