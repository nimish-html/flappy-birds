import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should have canvas mocking working', () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    expect(context).toBeDefined();
  });

  it('should have requestAnimationFrame mocked', () => {
    expect(global.requestAnimationFrame).toBeDefined();
    expect(global.cancelAnimationFrame).toBeDefined();
  });
});