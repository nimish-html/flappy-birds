import { ANIMATION_CONFIG } from '../utils/gameConfig';

export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = ANIMATION_CONFIG.PARTICLE_COUNT;

  /**
   * Create collision particles at the specified position
   * @param x - X position for particle spawn
   * @param y - Y position for particle spawn
   * @param color - Color of the particles
   */
  public createCollisionParticles(x: number, y: number, color: string = '#FFD700'): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const angle = (Math.PI * 2 * i) / ANIMATION_CONFIG.PARTICLE_COUNT;
      const speed = ANIMATION_CONFIG.PARTICLE_SPEED + Math.random() * 2;
      
      const particle: Particle = {
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: ANIMATION_CONFIG.PARTICLE_LIFE,
        maxLife: ANIMATION_CONFIG.PARTICLE_LIFE,
        color,
        size: 3 + Math.random() * 2
      };
      
      this.particles.push(particle);
    }
  }

  /**
   * Create jump particles for visual feedback
   * @param x - X position for particle spawn
   * @param y - Y position for particle spawn
   */
  public createJumpParticles(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const particle: Particle = {
        x: x + (Math.random() - 0.5) * 20,
        y: y + 10,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: Math.random() * 2 + 1,
        life: ANIMATION_CONFIG.JUMP_FEEDBACK_DURATION,
        maxLife: ANIMATION_CONFIG.JUMP_FEEDBACK_DURATION,
        color: '#87CEEB',
        size: 2 + Math.random()
      };
      
      this.particles.push(particle);
    }
  }

  /**
   * Update all particles
   * @param deltaTime - Time elapsed since last update
   */
  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.velocityX * (deltaTime / 16.67); // Normalize to 60fps
      particle.y += particle.velocityY * (deltaTime / 16.67);
      
      // Apply gravity
      particle.velocityY += ANIMATION_CONFIG.PARTICLE_GRAVITY * (deltaTime / 16.67);
      
      // Update life
      particle.life -= deltaTime;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render all particles
   * @param context - Canvas rendering context
   */
  public render(context: CanvasRenderingContext2D): void {
    context.save();
    
    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      
      context.globalAlpha = alpha;
      context.fillStyle = particle.color;
      
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    
    context.restore();
  }

  /**
   * Clear all particles
   */
  public clear(): void {
    this.particles = [];
  }

  /**
   * Get the number of active particles
   */
  public getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Set the maximum number of particles for performance optimization
   * @param maxParticles - Maximum number of particles to create
   */
  public setMaxParticles(maxParticles: number): void {
    this.maxParticles = Math.max(1, maxParticles);
  }

  /**
   * Get the current maximum particle count
   */
  public getMaxParticles(): number {
    return this.maxParticles;
  }
}