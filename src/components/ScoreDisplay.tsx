'use client';

import React from 'react';

interface ScoreDisplayProps {
  score: number;
  className?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  className = ''
}) => {
  return (
    <div 
      className={`
        absolute top-4 right-4 
        bg-white bg-opacity-90 
        rounded-lg shadow-lg 
        px-4 py-2 
        border border-gray-200
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label={`Current score: ${score}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          Score
        </span>
        <span 
          className="text-2xl font-bold text-gray-900 tabular-nums"
          data-testid="score-value"
        >
          {score}
        </span>
      </div>
    </div>
  );
};

export default ScoreDisplay;