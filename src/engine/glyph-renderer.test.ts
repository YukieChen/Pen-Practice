import { describe, it, expect } from 'vitest';
import { prepareGlyphs, renderGlyph, type BBox } from './glyph-renderer';
import { appConfig } from '../config';
import type { CellLayout, PathCommand } from '../types';

function mockFont(hasGlyph: (char: string) => boolean): import('../types').OpenTypeFont {
  return {
    charToGlyph(c: string) {
      const bbox = { x1: 0, y1: 0, x2: 100, y2: 100 };
      const has = hasGlyph(c);
      return {
        getBoundingBox: () => bbox,
        getPath: () => (has ? { commands: [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }] } : { commands: [] }),
      };
    },
  } as unknown as import('../types').OpenTypeFont;
}

describe('glyph-renderer', () => {
  it('renderGlyph: bbox → scale + 格內留白頂部對齊（offsetY = cell.y + contentPaddingMm）', () => {
    const cache = new Map<string, { path: PathCommand[]; bbox: BBox }>();
    cache.set('甲', {
      path: [{ type: 'M', x: 0, y: 0 }, { type: 'L', x: 100, y: 200 }, { type: 'Z' }],
      bbox: { x1: 0, y1: 0, x2: 100, y2: 200 },
    });
    const cell: CellLayout = { row: 0, col: 0, x: 10, y: 20, type: 'model' };
    const result = renderGlyph(cache, '甲', cell, appConfig);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.character).toBe('甲');
      expect(result.opacity).toBe(1);
      expect(result.commands.length).toBe(3);
      const m = result.commands[0];
      if (m.type === 'M') {
        const pad = appConfig.rendering.contentPaddingMm;
        const available = appConfig.charCellSizeMm - 2 * pad;
        const effective = available * appConfig.rendering.cellFillRatio;
        const scale =
          Math.min(effective / 100, effective / 200) * appConfig.rendering.glyphScaleUp;
        const offsetX = 10 + pad + (available - 100 * scale) / 2;
        const offsetY = 20 + pad + (available - 200 * scale) / 2;
        expect(m.x).toBeCloseTo(offsetX, 2);
        expect(m.y).toBeCloseTo(offsetY, 2);
      }
    }
  });

  it('renderGlyph: guide cell → opacity 0.25', () => {
    const cache = new Map<string, { path: PathCommand[]; bbox: BBox }>();
    cache.set('乙', { path: [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }], bbox: { x1: 0, y1: 0, x2: 50, y2: 50 } });
    const cell: CellLayout = { row: 0, col: 1, x: 0, y: 0, type: 'guide' };
    const result = renderGlyph(cache, '乙', cell, appConfig);
    expect(result?.opacity).toBe(0.25);
  });

  it('renderGlyph: 缺字 → null', () => {
    const cache = new Map<string, { path: import('../types').PathCommand[]; bbox: BBox }>();
    const cell: CellLayout = { row: 0, col: 0, x: 0, y: 0, type: 'model' };
    expect(renderGlyph(cache, '缺', cell, appConfig)).toBeNull();
  });

  it('prepareGlyphs: 有 fallback 時缺字由 fallback 填補', () => {
    const main = mockFont((c) => c === '甲' || c === '乙');
    const fallback = mockFont((c) => c === '缺');
    const cache = prepareGlyphs(main, ['甲', '缺', '乙'], fallback);
    expect(cache.size).toBe(3);
    expect(cache.has('甲')).toBe(true);
    expect(cache.has('缺')).toBe(true);
    expect(cache.has('乙')).toBe(true);
  });

  it('prepareGlyphs: 無 fallback 時缺字不入 cache', () => {
    const main = mockFont((c) => c === '甲' || c === '乙');
    const cache = prepareGlyphs(main, ['甲', '缺', '乙']);
    expect(cache.size).toBe(2);
    expect(cache.has('缺')).toBe(false);
  });
});
