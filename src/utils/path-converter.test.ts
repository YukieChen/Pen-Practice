import { describe, it, expect } from 'vitest';
import { quadraticToCubic, convertPathCommand, convertPath } from './path-converter';

describe('path-converter', () => {
  it('quadraticToCubic: 端點不變', () => {
    const q = quadraticToCubic(0, 0, 50, 50, 100, 0);
    expect(q.x).toBe(100);
    expect(q.y).toBe(0);
    expect(q.x1).toBeCloseTo(0 + (2 / 3) * 50, 5);
    expect(q.y1).toBeCloseTo(0 + (2 / 3) * 50, 5);
    expect(q.x2).toBeCloseTo(100 + (2 / 3) * (50 - 100), 5);
    expect(q.y2).toBeCloseTo(0 + (2 / 3) * (50 - 0), 5);
  });

  it('convertPathCommand: M/L/Q/C/Z', () => {
    expect(convertPathCommand({ type: 'M', x: 1, y: 2 })).toEqual({ type: 'M', x: 1, y: 2 });
    expect(convertPathCommand({ type: 'L', x: 3, y: 4 })).toEqual({ type: 'L', x: 3, y: 4 });
    expect(convertPathCommand({ type: 'Z' })).toEqual({ type: 'Z' });

    const c = convertPathCommand({ type: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 });
    expect(c.type).toBe('C');
    if (c.type === 'C') {
      expect(c.x1).toBe(1);
      expect(c.y2).toBe(4);
      expect(c.x).toBe(5);
      expect(c.y).toBe(6);
    }
  });

  it('convertPathCommand: Q 需前一點', () => {
    const q = convertPathCommand(
      { type: 'Q', x1: 0, y1: 0, x2: 10, y2: 10, x: 20, y: 0 },
      { x: 0, y: 0 }
    );
    expect(q.type).toBe('C');
  });

  it('convertPath: 多指令', () => {
    const out = convertPath([
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 10, y: 0 },
      { type: 'Z' },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ type: 'M', x: 0, y: 0 });
    expect(out[1]).toEqual({ type: 'L', x: 10, y: 0 });
    expect(out[2]).toEqual({ type: 'Z' });
  });
});
