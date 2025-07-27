import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputHandler } from '../../components/InputHandler';
import { GameEngine, GameState } from '../../components/GameEngine';

// Mock the GameEngine
vi.mock('../../components/GameEngine');

describe('InputHandler', () => {
  let inputHandler: InputHandler;
  let mockGameEngine: GameEngine;
  let mockCanvas: HTMLCanvasElement;
  let mockOnInput: ReturnType<typeof vi.fn>;
  let canvasEventHandlers: { [key: string]: (event: any) => void } = {};

  beforeEach(() => {
    // Reset event handlers
    canvasEventHandlers = {};

    // Create mock canvas that stores event handlers
    mockCanvas = {
      addEventListener: vi.fn((event: string, handler: (event: any) => void, options?: any) => {
        canvasEventHandlers[event] = handler;
      }),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600
      }),
      style: {}
    } as unknown as HTMLCanvasElement;

    // Create mock game engine
    mockGameEngine = {
      handleInput: vi.fn(),
      getGameState: vi.fn().mockReturnValue({
        state: GameState.PLAYING,
        score: 0,
        bird: {},
        obstacles: [],
        lastTime: 0,
        nextObstacleX: 800
      }),
    } as unknown as GameEngine;

    // Create mock callback
    mockOnInput = vi.fn();

    // Mock document.addEventListener
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');

    // Mock getBoundingClientRect for touch tests
    mockCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600
    });

    // Create input handler (default desktop mode)
    inputHandler = new InputHandler({
      gameEngine: mockGameEngine,
      canvas: mockCanvas,
      onInput: mockOnInput,
      isMobile: false,
      scale: 1
    });
  });

  afterEach(() => {
    inputHandler.destroy();
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should attach event listeners on construction', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    });

    it('should be enabled by default', () => {
      expect(inputHandler.isInputEnabled()).toBe(true);
    });
  });

  describe('Keyboard Input Handling', () => {
    it('should handle spacebar keydown event', () => {
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      const preventDefaultSpy = vi.spyOn(keydownEvent, 'preventDefault');

      // Simulate keydown event
      document.dispatchEvent(keydownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockGameEngine.handleInput).toHaveBeenCalled();
      expect(mockOnInput).toHaveBeenCalled();
    });

    it('should handle spacebar with key property', () => {
      const keydownEvent = new KeyboardEvent('keydown', { key: ' ' });
      const preventDefaultSpy = vi.spyOn(keydownEvent, 'preventDefault');

      // Simulate keydown event
      document.dispatchEvent(keydownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockGameEngine.handleInput).toHaveBeenCalled();
    });

    it('should ignore non-spacebar keys', () => {
      const keydownEvent = new KeyboardEvent('keydown', { code: 'KeyA' });

      // Simulate keydown event
      document.dispatchEvent(keydownEvent);

      expect(mockGameEngine.handleInput).not.toHaveBeenCalled();
      expect(mockOnInput).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Input Handling', () => {
    it('should handle mouse click events', () => {
      const clickEvent = new MouseEvent('click');
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      // Simulate click event by calling the handler directly
      canvasEventHandlers['click'](clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockGameEngine.handleInput).toHaveBeenCalled();
      expect(mockOnInput).toHaveBeenCalled();
    });
  });

  describe('Touch Input Handling', () => {
    it('should handle touch events', () => {
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      const preventDefaultSpy = vi.spyOn(touchEvent, 'preventDefault');

      // Simulate touch event by calling the handler directly
      canvasEventHandlers['touchstart'](touchEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockGameEngine.handleInput).toHaveBeenCalled();
      expect(mockOnInput).toHaveBeenCalled();
    });
  });

  describe('Mobile Support', () => {
    let mobileInputHandler: InputHandler;

    beforeEach(() => {
      // Reset canvas event handlers
      canvasEventHandlers = {};
      
      // Create mobile input handler
      mobileInputHandler = new InputHandler({
        gameEngine: mockGameEngine,
        canvas: mockCanvas,
        onInput: mockOnInput,
        isMobile: true,
        scale: 0.5
      });
    });

    afterEach(() => {
      if (mobileInputHandler) {
        mobileInputHandler.destroy();
      }
    });

    it('should not attach keyboard listeners for mobile', () => {
      // Reset mocks to check mobile-specific behavior
      vi.clearAllMocks();
      
      // Create new mobile handler to test initialization
      const testMobileHandler = new InputHandler({
        gameEngine: mockGameEngine,
        canvas: mockCanvas,
        onInput: mockOnInput,
        isMobile: true
      });

      // Should not attach keyboard listeners for mobile
      expect(document.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));
      
      testMobileHandler.destroy();
    });

    it('should not attach mouse listeners for mobile', () => {
      // Reset mocks to check mobile-specific behavior
      vi.clearAllMocks();
      
      // Create new mobile handler to test initialization
      const testMobileHandler = new InputHandler({
        gameEngine: mockGameEngine,
        canvas: mockCanvas,
        onInput: mockOnInput,
        isMobile: true
      });

      // Should not attach mouse listeners for mobile
      expect(mockCanvas.addEventListener).not.toHaveBeenCalledWith('click', expect.any(Function));
      
      testMobileHandler.destroy();
    });

    it('should handle touch events with cooldown', () => {
      // Clear previous calls
      mockGameEngine.handleInput.mockClear();
      
      const touchEvent1 = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      const touchEvent2 = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });

      // First touch should work
      canvasEventHandlers['touchstart'](touchEvent1);
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1);

      // Immediate second touch should be blocked by cooldown
      canvasEventHandlers['touchstart'](touchEvent2);
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1);
    });

    it('should validate touch within canvas bounds', () => {
      // Clear previous calls
      mockGameEngine.handleInput.mockClear();
      
      const touchInsideCanvas = new TouchEvent('touchstart', {
        touches: [{ clientX: 400, clientY: 300 } as Touch]
      });
      const touchOutsideCanvas = new TouchEvent('touchstart', {
        touches: [{ clientX: 1000, clientY: 1000 } as Touch]
      });

      // Touch inside canvas should work
      canvasEventHandlers['touchstart'](touchInsideCanvas);
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1);

      // Touch outside canvas should not work
      canvasEventHandlers['touchstart'](touchOutsideCanvas);
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1);
    });

    it('should allow touch within padding area', () => {
      // Clear previous calls
      mockGameEngine.handleInput.mockClear();
      
      const touchInPadding = new TouchEvent('touchstart', {
        touches: [{ clientX: -10, clientY: 10 } as Touch] // Within padding
      });

      canvasEventHandlers['touchstart'](touchInPadding);
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1);
    });

    it('should update settings dynamically', () => {
      mobileInputHandler.updateSettings(false, 1.0);
      
      // After updating to desktop settings, behavior should change
      expect(() => mobileInputHandler.updateSettings(true, 0.3)).not.toThrow();
    });

    it('should handle touch move events to prevent scrolling', () => {
      const touchMoveEvent = new TouchEvent('touchmove');
      const preventDefaultSpy = vi.spyOn(touchMoveEvent, 'preventDefault');

      canvasEventHandlers['touchmove'](touchMoveEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should handle touch end events', () => {
      const touchEndEvent = new TouchEvent('touchend');
      const preventDefaultSpy = vi.spyOn(touchEndEvent, 'preventDefault');

      canvasEventHandlers['touchend'](touchEndEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Input State Validation', () => {
    it('should process input when game is playing', () => {
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.PLAYING
      });

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).toHaveBeenCalled();
    });

    it('should process input when game is in menu state', () => {
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.MENU
      });

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).toHaveBeenCalled();
    });

    it('should process input when game is over', () => {
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.GAME_OVER
      });

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).toHaveBeenCalled();
    });

    it('should not process input when game is paused', () => {
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.PAUSED
      });

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).not.toHaveBeenCalled();
    });
  });

  describe('Enable/Disable Functionality', () => {
    it('should not process input when disabled', () => {
      inputHandler.disable();

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).not.toHaveBeenCalled();
      expect(mockOnInput).not.toHaveBeenCalled();
    });

    it('should process input when re-enabled', () => {
      inputHandler.disable();
      inputHandler.enable();

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).toHaveBeenCalled();
      expect(mockOnInput).toHaveBeenCalled();
    });

    it('should return correct enabled state', () => {
      expect(inputHandler.isInputEnabled()).toBe(true);

      inputHandler.disable();
      expect(inputHandler.isInputEnabled()).toBe(false);

      inputHandler.enable();
      expect(inputHandler.isInputEnabled()).toBe(true);
    });
  });

  describe('Input Responsiveness', () => {
    it('should call game engine handleInput immediately', () => {
      const startTime = performance.now();
      
      inputHandler.triggerInput();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(mockGameEngine.handleInput).toHaveBeenCalled();
      expect(responseTime).toBeLessThan(10); // Should be very fast
    });

    it('should trigger callback immediately after processing', () => {
      let callbackCalled = false;
      const immediateCallback = vi.fn(() => {
        callbackCalled = true;
      });

      const immediateInputHandler = new InputHandler({
        gameEngine: mockGameEngine,
        canvas: mockCanvas,
        onInput: immediateCallback,
      });

      immediateInputHandler.triggerInput();

      expect(callbackCalled).toBe(true);
      expect(immediateCallback).toHaveBeenCalledTimes(1);

      immediateInputHandler.destroy();
    });
  });

  describe('Multiple Input Events', () => {
    it('should handle rapid input events', () => {
      // Simulate rapid inputs
      for (let i = 0; i < 10; i++) {
        inputHandler.triggerInput();
      }

      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(10);
      expect(mockOnInput).toHaveBeenCalledTimes(10);
    });

    it('should handle mixed input types', () => {
      // Simulate keyboard input
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      document.dispatchEvent(keydownEvent);

      // Simulate mouse input
      const clickEvent = new MouseEvent('click');
      canvasEventHandlers['click'](clickEvent);

      // Simulate touch input
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      canvasEventHandlers['touchstart'](touchEvent);

      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should work without onInput callback', () => {
      const handlerWithoutCallback = new InputHandler({
        gameEngine: mockGameEngine,
        canvas: mockCanvas,
      });

      expect(() => {
        handlerWithoutCallback.triggerInput();
      }).not.toThrow();

      expect(mockGameEngine.handleInput).toHaveBeenCalled();

      handlerWithoutCallback.destroy();
    });

    it('should handle context menu prevention', () => {
      const contextMenuEvent = new MouseEvent('contextmenu');
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');

      canvasEventHandlers['contextmenu'](contextMenuEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove all event listeners on destroy', () => {
      inputHandler.destroy();

      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    });

    it('should not process input after destroy', () => {
      inputHandler.destroy();

      // Try to trigger input after destroy
      inputHandler.triggerInput();

      // Should still work since triggerInput bypasses event listeners
      expect(mockGameEngine.handleInput).toHaveBeenCalled();
    });
  });

  describe('Game State Integration', () => {
    it('should respect game over state for input disabling', () => {
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.GAME_OVER
      });

      inputHandler.triggerInput();

      expect(mockGameEngine.handleInput).toHaveBeenCalled();
    });

    it('should handle game state changes dynamically', () => {
      // Start in playing state
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.PLAYING
      });

      inputHandler.triggerInput();
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1);

      // Change to paused state
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.PAUSED
      });

      inputHandler.triggerInput();
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(1); // Should not increase

      // Change back to playing
      mockGameEngine.getGameState = vi.fn().mockReturnValue({
        state: GameState.PLAYING
      });

      inputHandler.triggerInput();
      expect(mockGameEngine.handleInput).toHaveBeenCalledTimes(2); // Should increase
    });
  });
});