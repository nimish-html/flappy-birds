import { GameEngine, GameState } from './GameEngine';
import { RESPONSIVE_CONFIG } from '../utils/gameConfig';

export interface InputHandlerOptions {
  gameEngine: GameEngine;
  canvas: HTMLCanvasElement;
  onInput?: () => void;
  isMobile?: boolean;
  scale?: number;
}

export class InputHandler {
  private gameEngine: GameEngine;
  private canvas: HTMLCanvasElement;
  private onInput?: () => void;
  private isEnabled: boolean = true;
  private isMobile: boolean = false;
  private scale: number = 1;
  private lastTouchTime: number = 0;
  private touchCooldown: number = 100; // Prevent rapid touch events
  
  // Event handler references for cleanup
  private keydownHandler: (event: KeyboardEvent) => void;
  private clickHandler: (event: MouseEvent) => void;
  private touchStartHandler: (event: TouchEvent) => void;
  private touchEndHandler: (event: TouchEvent) => void;
  private touchMoveHandler: (event: TouchEvent) => void;

  constructor(options: InputHandlerOptions) {
    this.gameEngine = options.gameEngine;
    this.canvas = options.canvas;
    this.onInput = options.onInput;
    this.isMobile = options.isMobile ?? false;
    this.scale = options.scale ?? 1;

    // Bind event handlers to maintain 'this' context
    this.keydownHandler = this.handleKeydown.bind(this);
    this.clickHandler = this.handleClick.bind(this);
    this.touchStartHandler = this.handleTouchStart.bind(this);
    this.touchEndHandler = this.handleTouchEnd.bind(this);
    this.touchMoveHandler = this.handleTouchMove.bind(this);

    this.attachEventListeners();
  }

  /**
   * Attach event listeners for input handling
   */
  private attachEventListeners(): void {
    // Keyboard events (spacebar) - primarily for desktop
    if (!this.isMobile) {
      document.addEventListener('keydown', this.keydownHandler);
    }
    
    // Mouse events (click) - for desktop
    if (!this.isMobile) {
      this.canvas.addEventListener('click', this.clickHandler);
    }
    
    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    this.canvas.addEventListener('touchend', this.touchEndHandler, { passive: false });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    
    // Prevent context menu and other unwanted behaviors
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
    
    // Prevent zoom on double tap for mobile
    if (this.isMobile) {
      this.canvas.style.touchAction = 'manipulation';
    }
  }

  /**
   * Handle keyboard input
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Only handle spacebar (key code 32 or ' ')
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault(); // Prevent page scrolling
      this.processInput();
    }
  }

  /**
   * Handle mouse click input
   */
  private handleClick(event: MouseEvent): void {
    event.preventDefault();
    this.processInput();
  }

  /**
   * Handle touch start events for mobile devices
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault(); // Prevent scrolling and other touch behaviors
    
    // Implement touch cooldown to prevent rapid firing
    const currentTime = Date.now();
    if (currentTime - this.lastTouchTime < this.touchCooldown) {
      return;
    }
    this.lastTouchTime = currentTime;
    
    // Check if touch is within canvas bounds (with padding for easier touch)
    if (this.isTouchWithinCanvas(event)) {
      this.processInput();
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    // Touch end handling if needed
  }

  /**
   * Handle touch move events (prevent scrolling)
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    // Prevent scrolling while touching the canvas
  }

  /**
   * Check if touch event is within canvas bounds with padding
   */
  private isTouchWithinCanvas(event: TouchEvent): boolean {
    if (event.touches.length === 0) return false;
    
    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const padding = RESPONSIVE_CONFIG.MOBILE_TOUCH_AREA_PADDING;
    
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    return x >= -padding && 
           x <= rect.width + padding && 
           y >= -padding && 
           y <= rect.height + padding;
  }

  /**
   * Process input based on current game state
   */
  private processInput(): void {
    if (!this.isEnabled) {
      return;
    }

    // Validate game state before processing input
    if (!this.isValidInputState()) {
      return;
    }

    // Process the input through the game engine
    this.gameEngine.handleInput();
    
    // Notify callback if provided
    this.onInput?.();
  }

  /**
   * Check if current game state allows input
   */
  private isValidInputState(): boolean {
    const gameState = this.gameEngine.getGameState();
    
    // Allow input during playing, menu, and game over states
    return gameState.state === GameState.PLAYING || 
           gameState.state === GameState.MENU || 
           gameState.state === GameState.GAME_OVER;
  }

  /**
   * Enable input handling
   */
  public enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable input handling (useful during game over or pause)
   */
  public disable(): void {
    this.isEnabled = false;
  }

  /**
   * Check if input is currently enabled
   */
  public isInputEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Update mobile status and scale (for dynamic changes)
   */
  public updateSettings(isMobile: boolean, scale: number): void {
    this.isMobile = isMobile;
    this.scale = scale;
    
    // Adjust touch cooldown based on scale (smaller screens need more responsive touch)
    this.touchCooldown = scale < 0.7 ? 80 : 100;
  }

  /**
   * Manually trigger input (useful for testing)
   */
  public triggerInput(): void {
    this.processInput();
  }

  /**
   * Remove all event listeners and cleanup
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.keydownHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.removeEventListener('selectstart', (e) => e.preventDefault());
    this.canvas.removeEventListener('dragstart', (e) => e.preventDefault());
  }
}