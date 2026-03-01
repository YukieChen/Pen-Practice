import { describe, it, expect } from 'vitest';
import { checkFontCoverage, isNotdefGlyph } from './font-manager';

function mockFont(hasGlyph: (char: string) => boolean): import('../types').OpenTypeFont {
  return {
    charToGlyph(c: string) {
      const bbox = { x1: 0, y1: 0, x2: 100, y2: 100 };
      return {
        path: hasGlyph(c) ? { commands: [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }] } : { commands: [] },
        getBoundingBox: () => bbox,
        getPath: hasGlyph(c) ? () => ({ commands: [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }] }) : undefined,
      };
    },
    getPath: () => ({ commands: [] }),
  } as unknown as import('../types').OpenTypeFont;
}

describe('font-manager', () => {
  it('isNotdefGlyph: index 0 為 .notdef', () => {
    expect(isNotdefGlyph({ index: 0 })).toBe(true);
    expect(isNotdefGlyph({ index: 1 })).toBe(false);
  });

  it('isNotdefGlyph: name .notdef', () => {
    expect(isNotdefGlyph({ name: '.notdef' })).toBe(true);
  });

  it('checkFontCoverage: 全有 → 空陣列', () => {
    const font = mockFont(() => true);
    expect(checkFontCoverage(font, ['甲', '乙'])).toEqual([]);
  });

  it('checkFontCoverage: 缺字 → 回傳缺字列表', () => {
    const font = mockFont((c) => c !== '缺');
    expect(checkFontCoverage(font, ['甲', '缺', '乙'])).toEqual(['缺']);
  });

  it('checkFontCoverage: 回傳 .notdef（方框）視為缺字', () => {
    const font = {
      charToGlyph(c: string) {
        const is缺 = c === '缺';
        return {
          index: is缺 ? 0 : 1,
          getBoundingBox: () => ({ x1: 0, y1: 0, x2: 100, y2: 100 }),
          getPath: () => ({ commands: is缺 ? [{ type: 'M' }, { type: 'L' }, { type: 'Z' }] : [] }),
        };
      },
    } as unknown as import('../types').OpenTypeFont;
    expect(checkFontCoverage(font, ['甲', '缺', '乙'])).toEqual(['缺']);
  });
});
