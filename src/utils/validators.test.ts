import { describe, it, expect } from 'vitest';
import {
  filterCjk,
  normalizeSection,
  normalizeConfig,
  validateConfigStructure,
  parseAndValidate,
  MAX_JSON_BYTES,
  MAX_FONT_BYTES,
} from './validators';

describe('validators', () => {
  it('filterCjk: 只保留中文', () => {
    expect(filterCjk('ab永cd')).toBe('永');
    expect(filterCjk('寅宙守宿')).toBe('寅宙守宿');
    expect(filterCjk('')).toBe('');
  });

  it('normalizeSection: description 50 字截斷、characters 64 字截斷', () => {
    const longDesc = '說'.repeat(60);
    const sec = normalizeSection({
      description: longDesc,
      characters: ['寅', '宙', '守', '宿'],
    });
    expect(sec.description).toHaveLength(50);
    expect(sec.characters).toEqual(['寅', '宙', '守', '宿']);

    const manyChars = Array(100).fill('永').flat();
    const sec2 = normalizeSection({ characters: manyChars });
    expect(sec2.characters).toHaveLength(64);
  });

  it('normalizeConfig: 最多 200 段', () => {
    const sections = Array(250)
      .fill(null)
      .map((_, i) => ({ description: '', characters: [`字${i}`] }));
    const config = normalizeConfig({ sections });
    expect(config.sections).toHaveLength(200);
  });

  it('validateConfigStructure', () => {
    expect(validateConfigStructure({ sections: [] })).toBe(true);
    expect(validateConfigStructure({})).toBe(false);
    expect(validateConfigStructure({ sections: 'not-array' })).toBe(false);
    expect(validateConfigStructure(null)).toBe(false);
  });

  it('parseAndValidate: 合法 JSON 回傳 data', () => {
    const json = JSON.stringify({
      sections: [{ description: '天覆', characters: ['寅', '宙'] }],
    });
    const r = parseAndValidate(json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sections).toHaveLength(1);
      expect(r.data.sections[0].description).toBe('天覆');
      expect(r.data.sections[0].characters).toEqual(['寅', '宙']);
    }
  });

  it('parseAndValidate: 非法 JSON → ILLEGAL_JSON', () => {
    const r = parseAndValidate('not json');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.type).toBe('ILLEGAL_JSON');
      expect(r.error).toContain('JSON');
    }
  });

  it('parseAndValidate: 無 sections 陣列 → INVALID_STRUCTURE', () => {
    const r = parseAndValidate(JSON.stringify({ foo: 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.type).toBe('INVALID_STRUCTURE');
    }
  });

  it('parseAndValidate: 超過 5MB → TOO_LARGE', () => {
    const big = 'x'.repeat(MAX_JSON_BYTES + 1);
    const r = parseAndValidate(big);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.type).toBe('TOO_LARGE');
    }
  });

  it('MAX_FONT_BYTES 為 20MB（規格 E03）', () => {
    expect(MAX_FONT_BYTES).toBe(20 * 1024 * 1024);
  });
});
