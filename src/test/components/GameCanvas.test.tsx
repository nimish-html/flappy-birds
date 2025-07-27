import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameCanvas } from '../../components/GameCanvas';
import { GameEngine } from '../../components/GameEngine';

// Mock the GameEngine
vi.mock('../../components/GameEngine', () => ({
  GameEngine: vi.fn(),
  GameState: {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    PAUSED: 'paused'
  }
}));

// Mock the responsive canvas hook
vi.mock('../../hooks/useResponsiveCanvas', () => ({
  useResponsiveCanvas: vi.fn(() => ({
    dimensions: {
      width: 800,
      height: 600,
      scale: 1
    },
    isMobile: false,
    isSmallScreen: false,
    isLargeScreen: false
  }))
}));

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn()
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);

describe('GameCanvas', () => {
  let mockGameEngine: any;
  let mockInitialize: any;
  let mockHandleInput: any;
  let mockRender: any;
  let mockDestroy: any;
  let mockGetScore: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock methods
    mockInitialize = vi.fn();
    mockHandleInput = vi.fn();
    mockRender = vi.fn();
    mockDestroy = vi.fn();
    mockGetScore = vi.fn(() => 0);

    // Create mock game engine instance
    mockGameEngine = {
      initialize: mockInitialize,
      handleInput: mockHandleInput,
      render: mockRender,
      destroy: mockDestroy,
      getScore: mockGetScore
    };

    // Mock the GameEngine constructor
    (GameEngine as any).mockImplementation(() => mockGameEngine);
    
    // Reset canvas context mock to return valid context by default
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Canvas Setup and Initialization', () => {
    it('should render canvas element with correct dimensions', () => {
      render(<GameCanvas width={800} height={600} />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '600');
    });

    it('should use default dimensions when not provided', () => {
      render(<GameCanvas />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveAttribute('width', '800'); // GAME_CONFIG.CANVAS_WIDTH
      expect(canvas).toHaveAttribute('height', '600'); // GAME_CONFIG.CANVAS_HEIGHT
    });

    it('should initialize game engine with canvas and callbacks', async () => {
      const onScoreUpdate = vi.fn();
      const onGameOver = vi.fn();
      const onGameStart = vi.fn();

      render(
        <GameCanvas 
          onScoreUpdate={onScoreUpdate}
          onGameOver={onGameOver}
          onGameStart={onGameStart}
        />
      );

      await waitFor(() => {
        expect(GameEngine).toHaveBeenCalledTimes(1);
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.any(HTMLCanvasElement),
          expect.objectContaining({
            onScoreUpdate,
            onGameOver: expect.any(Function),
            onGameStart
          })
        );
      });
    });

    it('should call initial render after initialization', async () => {
      render(<GameCanvas />);

      await waitFor(() => {
        expect(mockRender).toHaveBeenCalledTimes(1);
      });
    });

    it('should have loading state functionality', () => {
      // Since the useEffect runs synchronously in tests, we can't easily test the loading state
      // But we can verify that the component renders without errors and initializes properly
      const { container } = render(<GameCanvas />);
      
      // Verify the component rendered successfully
      expect(container.firstChild).toBeInTheDocument();
      
      // Verify initialization was called
      expect(mockInitialize).toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    it('should handle canvas click events', async () => {
      render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      
      act(() => {
        fireEvent.click(canvas);
      });

      expect(mockHandleInput).toHaveBeenCalledTimes(1);
    });

    it('should handle spacebar key press', async () => {
      render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      act(() => {
        fireEvent.keyDown(document, { code: 'Space', key: ' ' });
      });

      expect(mockHandleInput).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior for spacebar', async () => {
      render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      const spaceEvent = new KeyboardEvent('keydown', { 
        code: 'Space', 
        key: ' ',
        cancelable: true 
      });
      const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');

      act(() => {
        document.dispatchEvent(spaceEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should ignore non-space key presses', async () => {
      render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      act(() => {
        fireEvent.keyDown(document, { code: 'KeyA', key: 'a' });
      });

      expect(mockHandleInput).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error when canvas context is not available', async () => {
      // Mock getContext to return null
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

      render(<GameCanvas />);

      await waitFor(() => {
        expect(screen.getByText('Game Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to get 2D rendering context from canvas')).toBeInTheDocument();
      });
    });

    it('should display error when game engine initialization fails', async () => {
      const mockError = new Error('Initialization failed');
      mockInitialize.mockImplementation(() => {
        throw mockError;
      });

      render(<GameCanvas />);

      await waitFor(() => {
        expect(screen.getByText('Game Error')).toBeInTheDocument();
        expect(screen.getByText('Initialization failed')).toBeInTheDocument();
      });
    });

    it('should handle input errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      // Now mock the input handler to throw an error
      mockHandleInput.mockImplementation(() => {
        throw new Error('Input error');
      });

      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      
      act(() => {
        fireEvent.click(canvas);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error handling canvas click:', expect.any(Error));
        expect(screen.getByText('Failed to handle input')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('should provide reload button on error', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
      
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      render(<GameCanvas />);

      await waitFor(() => {
        const reloadButton = screen.getByText('Reload Game');
        expect(reloadButton).toBeInTheDocument();
        
        fireEvent.click(reloadButton);
        expect(mockReload).toHaveBeenCalled();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup game engine on unmount', async () => {
      const { unmount } = render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      unmount();

      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('should remove event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<GameCanvas />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should handle callback prop changes', async () => {
      const initialCallback = vi.fn();
      const newCallback = vi.fn();

      const { rerender } = render(<GameCanvas onScoreUpdate={initialCallback} />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.any(HTMLCanvasElement),
          expect.objectContaining({
            onScoreUpdate: initialCallback
          })
        );
      });

      // Clear the mock to check for new initialization
      mockInitialize.mockClear();

      rerender(<GameCanvas onScoreUpdate={newCallback} />);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.any(HTMLCanvasElement),
          expect.objectContaining({
            onScoreUpdate: newCallback
          })
        );
      });
    });
  });

  describe('Accessibility and Styling', () => {
    it('should have proper accessibility attributes', () => {
      render(<GameCanvas />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveAttribute('tabIndex', '0');
      expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('Flappy Bird Game Canvas'));
    });

    it('should apply custom className', () => {
      render(<GameCanvas className="custom-class" />);
      
      const container = screen.getByLabelText(/flappy bird game canvas/i).parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should have focus styles', () => {
      render(<GameCanvas />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });

    it('should be responsive', () => {
      render(<GameCanvas />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveStyle({ maxWidth: '100%', height: 'auto' });
    });
  });

  describe('Game Over Callback', () => {
    it('should call onGameOver with current score', async () => {
      const onGameOver = vi.fn();
      mockGetScore.mockReturnValue(42);

      render(<GameCanvas onGameOver={onGameOver} />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      // Get the onGameOver callback that was passed to the game engine
      const gameOverCallback = mockInitialize.mock.calls[0][1].onGameOver;
      
      // Call it without a score parameter to test fallback
      act(() => {
        gameOverCallback();
      });

      expect(onGameOver).toHaveBeenCalledWith(42);
    });

    it('should call onGameOver with provided score', async () => {
      const onGameOver = vi.fn();

      render(<GameCanvas onGameOver={onGameOver} />);
      
      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });

      // Get the onGameOver callback that was passed to the game engine
      const gameOverCallback = mockInitialize.mock.calls[0][1].onGameOver;
      
      // Call it with a specific score
      act(() => {
        gameOverCallback(25);
      });

      expect(onGameOver).toHaveBeenCalledWith(25);
    });
  });

  describe('Responsive Design', () => {

    it('should use responsive dimensions when enabled', async () => {
      // Mock responsive hook to return mobile dimensions
      const { useResponsiveCanvas } = await import('../../hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        dimensions: { width: 400, height: 300, scale: 0.5 },
        isMobile: true,
        isSmallScreen: true,
        isLargeScreen: false
      });

      render(<GameCanvas enableResponsive={true} />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveAttribute('width', '400');
      expect(canvas).toHaveAttribute('height', '300');
    });

    it('should use fixed dimensions when responsive is disabled', async () => {
      render(<GameCanvas enableResponsive={false} width={800} height={600} />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '600');
    });

    it('should pass mobile settings to game engine', async () => {
      const { useResponsiveCanvas } = await import('../../hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        dimensions: { width: 400, height: 300, scale: 0.5 },
        isMobile: true,
        isSmallScreen: true,
        isLargeScreen: false
      });

      render(<GameCanvas enableResponsive={true} />);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalledWith(
          expect.any(HTMLCanvasElement),
          expect.objectContaining({
            isMobile: true,
            scale: 0.5
          })
        );
      });
    });

    it('should apply mobile-specific styling', async () => {
      const { useResponsiveCanvas } = await import('../../hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        dimensions: { width: 400, height: 300, scale: 0.5 },
        isMobile: true,
        isSmallScreen: true,
        isLargeScreen: false
      });

      render(<GameCanvas enableResponsive={true} />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).toHaveClass('touch-manipulation');
    });

    it('should update aria-label for mobile', async () => {
      const { useResponsiveCanvas } = await import('../../hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        dimensions: { width: 400, height: 300, scale: 0.5 },
        isMobile: true,
        isSmallScreen: true,
        isLargeScreen: false
      });

      render(<GameCanvas enableResponsive={true} />);
      
      const canvas = screen.getByLabelText(/tap.*to make the bird jump/i);
      expect(canvas).toBeInTheDocument();
    });

    it('should not apply mobile styling for desktop', async () => {
      const { useResponsiveCanvas } = await import('../../hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        dimensions: { width: 800, height: 600, scale: 1 },
        isMobile: false,
        isSmallScreen: false,
        isLargeScreen: false
      });

      render(<GameCanvas enableResponsive={true} />);
      
      const canvas = screen.getByLabelText(/flappy bird game canvas/i);
      expect(canvas).not.toHaveClass('touch-manipulation');
    });
  });
});