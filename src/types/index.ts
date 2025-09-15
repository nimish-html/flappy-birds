// Utility types for position, velocity, and collision bounds
export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Bird interface
export interface Bird {
  x: number;
  y: number;
  velocityY: number;
  width: number;
  height: number;
  alive: boolean;
}

// Obstacle interface
export interface Obstacle {
  x: number;
  gapY: number;
  gapHeight: number;
  width: number;
  passed: boolean;
}

// Game state interface
export interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  bird: Bird;
  obstacles: Obstacle[];
  lastTime: number;
}

// Math question interfaces
export interface MathQuestion {
  id: string;
  category: 'addition' | 'subtraction' | 'multiplication' | 'division';
  question: string;
  correctAnswer: number;
  difficulty: number;
}

export interface QuestionPool {
  available: MathQuestion[];
  used: MathQuestion[];
}

// Answer zone interface for math obstacles
export interface AnswerZone {
  bounds: Bounds;
  answer: number;
  isCorrect: boolean;
  position: 'upper' | 'lower';
}