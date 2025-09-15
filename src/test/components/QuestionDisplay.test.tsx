import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuestionDisplay from '../../components/QuestionDisplay';

describe('QuestionDisplay', () => {
  const defaultProps = {
    question: '7 + 4',
    isVisible: true,
    canvasWidth: 800,
    canvasHeight: 600
  };

  describe('Rendering', () => {
    it('should render question text when visible', () => {
      render(<QuestionDisplay {...defaultProps} />);
      
      expect(screen.getByText('7 + 4')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      render(<QuestionDisplay {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByText('7 + 4')).not.toBeInTheDocument();
    });

    it('should not render when question is empty', () => {
      render(<QuestionDisplay {...defaultProps} question="" />);
      
      expect(screen.queryByText('7 + 4')).not.toBeInTheDocument();
    });

    it('should not render when question is null/undefined', () => {
      render(<QuestionDisplay {...defaultProps} question={null as any} />);
      
      expect(screen.queryByText('7 + 4')).not.toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should position question at top-center of screen', () => {
      render(<QuestionDisplay {...defaultProps} />);
      
      const container = screen.getByText('7 + 4').parentElement;
      expect(container).toHaveStyle({
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        top: '48px' // 8% of 600px height
      });
    });

    it('should calculate correct top offset for different canvas heights', () => {
      render(<QuestionDisplay {...defaultProps} canvasHeight={400} />);
      
      const container = screen.getByText('7 + 4').parentElement;
      expect(container).toHaveStyle({
        top: '32px' // 8% of 400px height
      });
    });

    it('should have proper z-index for overlay display', () => {
      render(<QuestionDisplay {...defaultProps} />);
      
      const container = screen.getByText('7 + 4').parentElement;
      expect(container).toHaveStyle({
        zIndex: '10',
        pointerEvents: 'none',
        userSelect: 'none'
      });
    });
  });

  describe('Responsive Font Sizing', () => {
    it('should calculate font size based on canvas dimensions', () => {
      render(<QuestionDisplay {...defaultProps} canvasWidth={800} canvasHeight={600} />);
      
      const questionElement = screen.getByText('7 + 4');
      // baseFontSize = min(800 * 0.04, 600 * 0.06) = min(32, 36) = 32
      // fontSize = max(24, min(48, 32)) = 32
      expect(questionElement).toHaveStyle({ fontSize: '32px' });
    });

    it('should enforce minimum font size of 24px', () => {
      render(<QuestionDisplay {...defaultProps} canvasWidth={400} canvasHeight={300} />);
      
      const questionElement = screen.getByText('7 + 4');
      // baseFontSize = min(400 * 0.04, 300 * 0.06) = min(16, 18) = 16
      // fontSize = max(24, min(48, 16)) = 24
      expect(questionElement).toHaveStyle({ fontSize: '24px' });
    });

    it('should enforce maximum font size of 48px', () => {
      render(<QuestionDisplay {...defaultProps} canvasWidth={1600} canvasHeight={1200} />);
      
      const questionElement = screen.getByText('7 + 4');
      // baseFontSize = min(1600 * 0.04, 1200 * 0.06) = min(64, 72) = 64
      // fontSize = max(24, min(48, 64)) = 48
      expect(questionElement).toHaveStyle({ fontSize: '48px' });
    });

    it('should scale padding and border radius with font size', () => {
      render(<QuestionDisplay {...defaultProps} canvasWidth={800} canvasHeight={600} />);
      
      const questionElement = screen.getByText('7 + 4');
      // fontSize = 32px
      // padding = 32 * 0.3 = 9.6px (top/bottom), 32 * 0.6 = 19.2px (left/right)
      // borderRadius = 32 * 0.2 = 6.4px
      expect(questionElement).toHaveStyle({
        padding: '9.6px 19.2px',
        borderRadius: '6.4px'
      });
    });
  });

  describe('Visual Styling', () => {
    it('should apply correct visual styles for readability', () => {
      render(<QuestionDisplay {...defaultProps} />);
      
      const questionElement = screen.getByText('7 + 4');
      expect(questionElement).toHaveStyle({
        fontWeight: 'bold',
        color: '#1a202c',
        textAlign: 'center',
        border: '4px solid #3182ce',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        whiteSpace: 'nowrap'
      });
    });

    it('should set minimum width based on font size', () => {
      render(<QuestionDisplay {...defaultProps} canvasWidth={800} canvasHeight={600} />);
      
      const questionElement = screen.getByText('7 + 4');
      // fontSize = 32px, minWidth = 32 * 4 = 128px
      expect(questionElement).toHaveStyle({ minWidth: '128px' });
    });
  });

  describe('Different Question Types', () => {
    it('should render addition questions correctly', () => {
      render(<QuestionDisplay {...defaultProps} question="15 + 23" />);
      expect(screen.getByText('15 + 23')).toBeInTheDocument();
    });

    it('should render subtraction questions correctly', () => {
      render(<QuestionDisplay {...defaultProps} question="45 - 18" />);
      expect(screen.getByText('45 - 18')).toBeInTheDocument();
    });

    it('should render multiplication questions correctly', () => {
      render(<QuestionDisplay {...defaultProps} question="6 × 7" />);
      expect(screen.getByText('6 × 7')).toBeInTheDocument();
    });

    it('should render division questions correctly', () => {
      render(<QuestionDisplay {...defaultProps} question="24 ÷ 6" />);
      expect(screen.getByText('24 ÷ 6')).toBeInTheDocument();
    });

    it('should handle long question text without wrapping', () => {
      render(<QuestionDisplay {...defaultProps} question="123 + 456" />);
      
      const questionElement = screen.getByText('123 + 456');
      expect(questionElement).toHaveStyle({ whiteSpace: 'nowrap' });
    });
  });
});