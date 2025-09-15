'use client';

import React from 'react';

export interface GameOverData {
  score: number;
  mathScore: number;
  streak: number;
  highestStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number;
}

interface GameOverScreenProps {
  score: number;
  mathData?: GameOverData;
  onRestart: () => void;
  isVisible: boolean;
  className?: string;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  mathData,
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
        <div className="text-center mb-6">
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

        {/* Math Performance Stats */}
        {mathData && (mathData.totalCorrect > 0 || mathData.totalIncorrect > 0) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">
              Math Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Math Score */}
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="math-score">
                  {mathData.mathScore}
                </div>
                <div className="text-gray-600">Math Points</div>
              </div>
              
              {/* Best Streak */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="best-streak">
                  {mathData.highestStreak}
                </div>
                <div className="text-gray-600">Best Streak</div>
              </div>
              
              {/* Correct Answers */}
              <div className="text-center">
                <div className="text-xl font-bold text-green-500" data-testid="correct-answers">
                  {mathData.totalCorrect}
                </div>
                <div className="text-gray-600">Correct</div>
              </div>
              
              {/* Incorrect Answers */}
              <div className="text-center">
                <div className="text-xl font-bold text-red-500" data-testid="incorrect-answers">
                  {mathData.totalIncorrect}
                </div>
                <div className="text-gray-600">Incorrect</div>
              </div>
            </div>
            
            {/* Accuracy */}
            {(mathData.totalCorrect + mathData.totalIncorrect) > 0 && (
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold text-purple-600" data-testid="accuracy">
                  {mathData.accuracy}%
                </div>
                <div className="text-gray-600 text-sm">Accuracy</div>
              </div>
            )}
          </div>
        )}

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