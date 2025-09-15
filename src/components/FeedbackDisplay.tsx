import React from 'react';
import { AnswerFeedback } from '../utils/AnswerHandler';

interface FeedbackDisplayProps {
  feedback: AnswerFeedback | null;
  className?: string;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ 
  feedback, 
  className = '' 
}) => {
  if (!feedback) {
    return null;
  }

  const getFeedbackStyles = (type: AnswerFeedback['type']) => {
    const baseStyles = 'fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg font-bold text-lg shadow-lg z-50 transition-all duration-300 animate-pulse';
    
    switch (type) {
      case 'correct':
        return `${baseStyles} bg-green-500 text-white border-2 border-green-600`;
      case 'incorrect':
        return `${baseStyles} bg-red-500 text-white border-2 border-red-600`;
      case 'streak_bonus':
        return `${baseStyles} bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-2 border-yellow-600 text-xl animate-bounce`;
      default:
        return `${baseStyles} bg-gray-500 text-white border-2 border-gray-600`;
    }
  };

  const getIcon = (type: AnswerFeedback['type']) => {
    switch (type) {
      case 'correct':
        return '✓';
      case 'incorrect':
        return '✗';
      case 'streak_bonus':
        return '🎉';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`${getFeedbackStyles(feedback.type)} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center">
          <span className="mr-2 text-xl">{getIcon(feedback.type)}</span>
          {feedback.message}
        </div>
        {/* Requirement 4.5: Show correct answer prominently when wrong */}
        {feedback.type === 'incorrect' && feedback.correctAnswer !== undefined && (
          <div className="mt-1 text-sm font-semibold bg-white bg-opacity-20 px-2 py-1 rounded">
            Correct answer: {feedback.correctAnswer}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackDisplay;