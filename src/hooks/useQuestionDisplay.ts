import { useState, useEffect, useCallback } from 'react';
import { MathQuestion } from '../types';

interface QuestionDisplayState {
  currentQuestion: MathQuestion | null;
  isVisible: boolean;
  isLoading: boolean;
}

interface UseQuestionDisplayProps {
  onQuestionLoad?: (question: MathQuestion) => void;
  onQuestionChange?: (question: MathQuestion | null) => void;
}

export const useQuestionDisplay = ({
  onQuestionLoad,
  onQuestionChange
}: UseQuestionDisplayProps = {}) => {
  const [state, setState] = useState<QuestionDisplayState>({
    currentQuestion: null,
    isVisible: false,
    isLoading: false
  });

  // Load a new question
  const loadQuestion = useCallback((question: MathQuestion) => {
    setState(prev => ({
      ...prev,
      currentQuestion: question,
      isVisible: true,
      isLoading: false
    }));
    
    onQuestionLoad?.(question);
    onQuestionChange?.(question);
  }, [onQuestionLoad, onQuestionChange]);

  // Hide the current question
  const hideQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  // Show the current question
  const showQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: prev.currentQuestion !== null
    }));
  }, []);

  // Clear the current question
  const clearQuestion = useCallback(() => {
    setState({
      currentQuestion: null,
      isVisible: false,
      isLoading: false
    });
    
    onQuestionChange?.(null);
  }, [onQuestionChange]);

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  // Get the formatted question text
  const getQuestionText = useCallback(() => {
    return state.currentQuestion?.question || '';
  }, [state.currentQuestion]);

  // Check if a question is currently displayed
  const hasQuestion = useCallback(() => {
    return state.currentQuestion !== null;
  }, [state.currentQuestion]);

  return {
    currentQuestion: state.currentQuestion,
    isVisible: state.isVisible,
    isLoading: state.isLoading,
    loadQuestion,
    hideQuestion,
    showQuestion,
    clearQuestion,
    setLoading,
    getQuestionText,
    hasQuestion
  };
};