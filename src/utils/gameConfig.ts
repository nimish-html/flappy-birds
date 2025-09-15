// Game configuration constants
export const GAME_CONFIG = {
  // Canvas dimensions
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  
  // Bird physics and properties
  BIRD_GRAVITY: 0.5,
  BIRD_JUMP_FORCE: -8,
  BIRD_SIZE: 30,
  BIRD_START_X: 100,
  BIRD_START_Y: 300,
  
  // Obstacle properties
  OBSTACLE_WIDTH: 60,
  OBSTACLE_GAP: 150,
  OBSTACLE_SPEED: 2,
  OBSTACLE_SPAWN_DISTANCE: 450,
  OBSTACLE_MIN_HEIGHT: 50,
  OBSTACLE_MAX_HEIGHT: 400,
  
  // Game mechanics
  FRAME_RATE: 60,
  GROUND_HEIGHT: 50,
  
  // Scoring
  POINTS_PER_OBSTACLE: 1,
} as const;

// Responsive design configuration
export const RESPONSIVE_CONFIG = {
  // Breakpoints
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  
  // Scaling limits
  MIN_SCALE: 0.3,
  MAX_SCALE: 1.5,
  
  // Mobile optimizations
  MOBILE_FRAME_RATE: 45, // Reduced frame rate for mobile performance
  MOBILE_PARTICLE_COUNT: 4, // Fewer particles on mobile
  MOBILE_TOUCH_AREA_PADDING: 20, // Extra touch area for mobile
  
  // Aspect ratio maintenance
  ASPECT_RATIO: GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT,
  
  // Performance thresholds
  LOW_PERFORMANCE_THRESHOLD: 0.5, // Scale below which to reduce effects
  HIGH_PERFORMANCE_THRESHOLD: 1.2, // Scale above which to enhance effects
} as const;

// Animation configuration constants
export const ANIMATION_CONFIG = {
  // Bird animation
  BIRD_ROTATION_FACTOR: 0.08, // How much rotation is applied based on velocity
  BIRD_MAX_ROTATION: 0.8, // Maximum rotation in radians
  BIRD_MIN_ROTATION: -0.5, // Minimum rotation in radians
  BIRD_WING_FLAP_SPEED: 8, // Wing flapping animation speed
  BIRD_JUMP_SCALE_FACTOR: 1.1, // Scale factor when jumping
  BIRD_JUMP_SCALE_DURATION: 100, // Duration of jump scale effect in ms
  
  // Particle effects
  PARTICLE_COUNT: 8, // Number of particles on collision
  PARTICLE_SPEED: 3, // Initial particle speed
  PARTICLE_LIFE: 500, // Particle lifetime in ms
  PARTICLE_GRAVITY: 0.2, // Particle gravity effect
  
  // Visual feedback
  COLLISION_FLASH_DURATION: 200, // Screen flash duration on collision
  JUMP_FEEDBACK_DURATION: 150, // Visual feedback duration for jumps
  
  // Smooth movement
  OBSTACLE_WOBBLE_AMPLITUDE: 1, // Slight wobble effect for obstacles
  OBSTACLE_WOBBLE_FREQUENCY: 0.002, // Wobble frequency
} as const;

// Physics constants
export const PHYSICS = {
  GRAVITY: GAME_CONFIG.BIRD_GRAVITY,
  JUMP_VELOCITY: GAME_CONFIG.BIRD_JUMP_FORCE,
  TERMINAL_VELOCITY: 10,
} as const;

// Collision detection constants
export const COLLISION = {
  BIRD_COLLISION_PADDING: 2, // Slight padding to make collisions feel fair
  OBSTACLE_COLLISION_PADDING: 1,
} as const;