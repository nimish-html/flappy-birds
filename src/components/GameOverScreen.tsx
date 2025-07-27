'use client';

import React from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
  isVisible: boolean;
  className?: string;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  onRestart,
  isVisible,
  className = ''
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed inset-0 
        bg-black bg-opacity-50 
        flex items-center justify-center 
        z-50
        animate-fade-in
        ${className}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      data-testid="game-over-screen"
    >
      <div className="
        bg-white 
        rounded-xl 
        shadow-2xl 
        p-8 
        max-w-md 
        w-full 
        mx-4
        transform 
        animate-scale-in
        border-2 
        border-gray-200
      ">
        {/* Game Over Title */}
        <div className="text-center mb-6">
          <h1 
            id="game-over-title"
            className="
              text-4xl 
              font-bold 
              text-red-600 
              mb-2
              animate-bounce-in
            "
          >
            Game Over
          </h1>
          <div className="w-16 h-1 bg-red-600 mx-auto rounded-full"></div>
        </div>

        {/* Final Score Display */}
        <div className="text-center mb-8">
          <p className="text-lg text-gray-600 mb-2">Final Score</p>
          <div 
            className="
              text-6xl 
              font-bold 
              text-gray-900 
              tabular-nums
              animate-pulse-score
            "
            data-testid="final-score"
            aria-label={`Final score: ${score}`}
          >
            {score}
          </div>
        </div>

        {/* Restart Button */}
        <div className="text-center">
          <button
            onClick={onRestart}
            className="
              bg-blue-600 
              hover:bg-blue-700 
              active:bg-blue-800
              text-white 
              font-bold 
              py-4 
              px-8 
              rounded-lg 
              text-lg
              transition-all 
              duration-200 
              transform 
              hover:scale-105 
              active:scale-95
              shadow-lg 
              hover:shadow-xl
              focus:outline-none 
              focus:ring-4 
              focus:ring-blue-300
              animate-slide-up
            "
            data-testid="restart-button"
            aria-label="Restart game"
          >
            Play Again
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-4 right-4 text-gray-300">
          <svg 
            className="w-8 h-8" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;