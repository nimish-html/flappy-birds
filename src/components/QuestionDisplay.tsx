import React, { useMemo } from 'react';

interface QuestionDisplayProps {
  question: string;
  isVisible: boolean;
  canvasWidth: number;
  canvasHeight: number;
  scale?: number;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  isVisible,
  canvasWidth,
  canvasHeight,
  scale = 1
}) => {
  // Memoize calculations for performance
  const displayProps = useMemo(() => {
    if (!isVisible || !question) {
      return null;
    }

    // Detect mobile for responsive sizing
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768;

    // Calculate responsive font size with mobile optimizations
    const baseFontSize = Math.min(canvasWidth * 0.04, canvasHeight * 0.06);
    const mobileAdjustment = isMobile ? 0.9 : 1; // Slightly smaller on mobile
    const scaleAdjustment = Math.min(scale, 1.2); // Cap scale effect on font size
    const fontSize = Math.max(
      isMobile ? 20 : 24, 
      Math.min(isMobile ? 36 : 48, baseFontSize * mobileAdjustment * scaleAdjustment)
    );

    // Calculate positioning for top-center placement with mobile adjustments
    const topOffset = canvasHeight * (isMobile ? 0.06 : 0.08); // Closer to top on mobile
    // Optimize padding and sizing for mobile
    const padding = fontSize * (isMobile ? 0.25 : 0.3);
    const borderRadius = fontSize * 0.2;
    const minWidth = fontSize * (isMobile ? 3 : 4);

    return {
      containerStyle: {
        position: 'absolute' as const,
        top: `${topOffset}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        pointerEvents: 'none' as const,
        userSelect: 'none' as const,
      },
      questionStyle: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold' as const,
        color: '#1a202c',
        textAlign: 'center' as const,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
        padding: `${padding}px ${padding * 2}px`,
        borderRadius: `${borderRadius}px`,
        border: isMobile ? '3px solid #4299e1' : '4px solid #3182ce', // Blue theme border
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1)',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        minWidth: `${minWidth}px`,
        whiteSpace: 'nowrap' as const,
        // Enhanced visual effects
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(8px)',
        // Performance optimizations
        willChange: 'transform',
        backfaceVisibility: 'hidden' as const,
      }
    };
  }, [question, isVisible, canvasWidth, canvasHeight, scale]);

  if (!displayProps) {
    return null;
  }

  return (
    <div style={displayProps.containerStyle}>
      <div style={displayProps.questionStyle}>
        {question}
      </div>
    </div>
  );
};

export default QuestionDisplay;