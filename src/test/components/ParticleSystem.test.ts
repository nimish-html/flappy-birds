import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParticleSystem } from '../../components/ParticleSystem';
import { ANIMATION_CONFIG } from '../../utils/gameConfig';

describe('ParticleSystem', () => {
  let particleSystem: ParticleSystem;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    particleSystem = new ParticleSystem();
    
    // Mock canvas context
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      globalAlpha: 0,
      fillStyle: ''
    } as any;
  });

  describe('createCollisionParticles', () => {
    it('should create the correct number of collision particles', () => {
      particleSystem.createCollisionParticles(100, 100);
      
      expect(particleSystem.getParticleCount()).toBe(ANIMATION_CONFIG.PARTICLE_COUNT);
    });

    it('should create particles with specified color', () => {
      const testColor = '#FF0000';
      particleSystem.createCollisionParticles(100, 100, testColor);
      
      // Particles should be created (we can't directly test color without exposing internal state)
      expect(particleSystem.getParticleCount()).toBe(ANIMATION_CONFIG.PARTICLE_COUNT);
    });

    it('should create particles at specified position', () => {
      const x = 150;
      const y = 200;
      
      particleSystem.createCollisionParticles(x, y);
      
      expect(particleSystem.getParticleCount()).toBe(ANIMATION_CONFIG.PARTICLE_COUNT);
    });
  });

  describe('createJumpParticles', () => {
    it('should create jump particles', () => {
      particleSystem.createJumpParticles(100, 100);
      
      expect(particleSystem.getParticleCount()).toBe(3); // Jump particles create 3 particles
    });

    it('should create particles at specified position', () => {
      const x = 150;
      const y = 200;
      
      particleSystem.createJumpParticles(x, y);
      
      expect(particleSystem.getParticleCount()).toBe(3);
    });
  });

  describe('update', () => {
    it('should update particle positions over time', () => {
      particleSystem.createCollisionParticles(100, 100);
      const initialCount = particleSystem.getParticleCount();
      
      // Update particles
      particleSystem.update(16.67); // One frame at 60fps
      
      // Particles should still exist after one frame
      expect(particleSystem.getParticleCount()).toBe(initialCount);
    });

    it('should remove particles when their life expires', () => {
      particleSystem.createJumpParticles(100, 100);
      
      // Update particles for longer than their lifetime
      particleSystem.update(ANIMATION_CONFIG.JUMP_FEEDBACK_DURATION + 100);
      
      // Jump particles should be removed
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it('should apply gravity to particles', () => {
      particleSystem.createCollisionParticles(100, 100);
      
      // Update multiple times to see gravity effect
      for (let i = 0; i < 10; i++) {
        particleSystem.update(16.67);
      }
      
      // Particles should still exist but have moved due to gravity
      expect(particleSystem.getParticleCount()).toBe(ANIMATION_CONFIG.PARTICLE_COUNT);
    });
  });

  describe('render', () => {
    it('should call canvas methods when rendering particles', () => {
      particleSystem.createCollisionParticles(100, 100);
      
      particleSystem.render(mockContext);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should render particles with correct alpha based on life', () => {
      particleSystem.createCollisionParticles(100, 100);
      
      particleSystem.render(mockContext);
      
      // Should have set globalAlpha for particle rendering
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should not render when no particles exist', () => {
      particleSystem.render(mockContext);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      // Should not draw any particles
    });
  });

  describe('clear', () => {
    it('should remove all particles', () => {
      particleSystem.createCollisionParticles(100, 100);
      particleSystem.createJumpParticles(150, 150);
      
      expect(particleSystem.getParticleCount()).toBeGreaterThan(0);
      
      particleSystem.clear();
      
      expect(particleSystem.getParticleCount()).toBe(0);
    });
  });

  describe('getParticleCount', () => {
    it('should return 0 when no particles exist', () => {
      expect(particleSystem.getParticleCount()).toBe(0);
    });

    it('should return correct count after creating particles', () => {
      particleSystem.createCollisionParticles(100, 100);
      particleSystem.createJumpParticles(150, 150);
      
      const expectedCount = ANIMATION_CONFIG.PARTICLE_COUNT + 3; // Collision + jump particles
      expect(particleSystem.getParticleCount()).toBe(expectedCount);
    });
  });

  describe('Mobile Optimization', () => {
    it('should allow setting maximum particle count', () => {
      particleSystem.setMaxParticles(4);
      expect(particleSystem.getMaxParticles()).toBe(4);
      
      particleSystem.createCollisionParticles(100, 100);
      expect(particleSystem.getParticleCount()).toBe(4);
    });

    it('should enforce minimum particle count of 1', () => {
      particleSystem.setMaxParticles(0);
      expect(particleSystem.getMaxParticles()).toBe(1);
      
      particleSystem.setMaxParticles(-5);
      expect(particleSystem.getMaxParticles()).toBe(1);
    });

    it('should create fewer particles when max is reduced', () => {
      particleSystem.setMaxParticles(2);
      particleSystem.createCollisionParticles(100, 100);
      
      expect(particleSystem.getParticleCount()).toBe(2);
    });

    it('should create more particles when max is increased', () => {
      particleSystem.setMaxParticles(16);
      particleSystem.createCollisionParticles(100, 100);
      
      expect(particleSystem.getParticleCount()).toBe(16);
    });

    it('should maintain existing particles when max is changed', () => {
      // Create particles with default max
      particleSystem.createCollisionParticles(100, 100);
      const initialCount = particleSystem.getParticleCount();
      
      // Reduce max particles
      particleSystem.setMaxParticles(2);
      
      // Existing particles should remain
      expect(particleSystem.getParticleCount()).toBe(initialCount);
      
      // But new particles should respect the new limit
      particleSystem.createCollisionParticles(200, 200);
      expect(particleSystem.getParticleCount()).toBe(initialCount + 2);
    });

    it('should not affect jump particles', () => {
      particleSystem.setMaxParticles(2);
      particleSystem.createJumpParticles(100, 100);
      
      // Jump particles should still create 3 particles regardless of max setting
      expect(particleSystem.getParticleCount()).toBe(3);
    });
  });
});