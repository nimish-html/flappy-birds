import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useQuestionDisplay } from '../../hooks/useQuestionDisplay';
import { MathQuestion } from '../../types';

describe('useQuestionDisplay', () => {
  const mockQuestion: MathQuestion = {
    id: 'test_001',
    category: 'addition',
    question: '7 + 4',
    correctAnswer: 11,
    difficulty: 1
  };

  const mockQuestion2: MathQuestion = {
    id: 'test_002',
    category: 'subtraction',
    question: '15 - 8',
    correctAnswer: 7,
    difficulty: 1
  };

  describe('Initial State', () => {
    it('should initialize with null question and not visible', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      expect(result.current.currentQuestion).toBeNull();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.getQuestionText()).toBe('');
      expect(result.current.hasQuestion()).toBe(false);
    });
  });

  describe('Loading Questions', () => {
    it('should load a question and make it visible', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestion);
      expect(result.current.isVisible).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.getQuestionText()).toBe('7 + 4');
      expect(result.current.hasQuestion()).toBe(true);
    });

    it('should call onQuestionLoad callback when loading a question', () => {
      const onQuestionLoad = vi.fn();
      const { result } = renderHook(() => useQuestionDisplay({ onQuestionLoad }));

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(onQuestionLoad).toHaveBeenCalledWith(mockQuestion);
    });

    it('should call onQuestionChange callback when loading a question', () => {
      const onQuestionChange = vi.fn();
      const { result } = renderHook(() => useQuestionDisplay({ onQuestionChange }));

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(onQuestionChange).toHaveBeenCalledWith(mockQuestion);
    });

    it('should replace current question when loading a new one', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestion);

      act(() => {
        result.current.loadQuestion(mockQuestion2);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestion2);
      expect(result.current.getQuestionText()).toBe('15 - 8');
    });
  });

  describe('Visibility Control', () => {
    it('should hide question while keeping it loaded', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.hideQuestion();
      });

      expect(result.current.isVisible).toBe(false);
      expect(result.current.currentQuestion).toEqual(mockQuestion);
      expect(result.current.hasQuestion()).toBe(true);
    });

    it('should show question if one is loaded', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.loadQuestion(mockQuestion);
        result.current.hideQuestion();
      });

      expect(result.current.isVisible).toBe(false);

      act(() => {
        result.current.showQuestion();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should not show question if none is loaded', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.showQuestion();
      });

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('Clearing Questions', () => {
    it('should clear question and hide display', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(result.current.currentQuestion).toEqual(mockQuestion);
      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.clearQuestion();
      });

      expect(result.current.currentQuestion).toBeNull();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.getQuestionText()).toBe('');
      expect(result.current.hasQuestion()).toBe(false);
    });

    it('should call onQuestionChange callback when clearing', () => {
      const onQuestionChange = vi.fn();
      const { result } = renderHook(() => useQuestionDisplay({ onQuestionChange }));

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      onQuestionChange.mockClear();

      act(() => {
        result.current.clearQuestion();
      });

      expect(onQuestionChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Loading State', () => {
    it('should manage loading state', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should reset loading state when loading a question', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Callback Handling', () => {
    it('should handle missing callbacks gracefully', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      expect(() => {
        act(() => {
          result.current.loadQuestion(mockQuestion);
          result.current.clearQuestion();
        });
      }).not.toThrow();
    });

    it('should call callbacks with correct parameters', () => {
      const onQuestionLoad = vi.fn();
      const onQuestionChange = vi.fn();
      const { result } = renderHook(() => 
        useQuestionDisplay({ onQuestionLoad, onQuestionChange })
      );

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(onQuestionLoad).toHaveBeenCalledTimes(1);
      expect(onQuestionLoad).toHaveBeenCalledWith(mockQuestion);
      expect(onQuestionChange).toHaveBeenCalledTimes(1);
      expect(onQuestionChange).toHaveBeenCalledWith(mockQuestion);

      onQuestionLoad.mockClear();
      onQuestionChange.mockClear();

      act(() => {
        result.current.clearQuestion();
      });

      expect(onQuestionLoad).not.toHaveBeenCalled();
      expect(onQuestionChange).toHaveBeenCalledTimes(1);
      expect(onQuestionChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Question Text Formatting', () => {
    it('should return empty string for null question', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      expect(result.current.getQuestionText()).toBe('');
    });

    it('should return question text for loaded question', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      act(() => {
        result.current.loadQuestion(mockQuestion);
      });

      expect(result.current.getQuestionText()).toBe('7 + 4');
    });

    it('should handle different question formats', () => {
      const { result } = renderHook(() => useQuestionDisplay());

      const questions = [
        { ...mockQuestion, question: '15 + 23' },
        { ...mockQuestion, question: '45 - 18' },
        { ...mockQuestion, question: '6 × 7' },
        { ...mockQuestion, question: '24 ÷ 6' }
      ];

      questions.forEach(question => {
        act(() => {
          result.current.loadQuestion(question);
        });

        expect(result.current.getQuestionText()).toBe(question.question);
      });
    });
  });
});