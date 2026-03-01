import { describe, it, expect } from 'vitest';
import {
  resolveCharacters,
  pageCount,
  totalChars,
  effectiveChars,
  isReady,
  sectionChars,
} from './layout';
import type { AppState } from '../types';

function state(overrides: Partial<AppState>): AppState {
  return {
    mode: 'no-description',
    contentSource: 'manual',
    sections: [{ description: '', characters: '' }],
    fontSource: 'default',
    customFontFile: null,
    parsedFont: null,
    missingChars: new Map(),
    glyphScale: 1,
    glyphOffsetX: 0,
    glyphOffsetY: 0,
    isGenerating: false,
    progress: 0,
    error: null,
    ...overrides,
  };
}

describe('sectionChars', () => {
  it('過濾出中文', () => {
    expect(sectionChars({ characters: '寅宙守宿' })).toEqual(['寅', '宙', '守', '宿']);
    expect(sectionChars({ characters: 'ab永cd' })).toEqual(['永']);
  });

  it('缺 characters 時視為空字串不拋錯', () => {
    expect(sectionChars({})).toEqual([]);
    expect(sectionChars({ characters: undefined })).toEqual([]);
  });
});

describe('resolveCharacters', () => {
  it('無說明：扁平化所有段落字元', () => {
    const s = state({
      mode: 'no-description',
      sections: [
        { description: '', characters: '甲乙' },
        { description: '', characters: '丙丁' },
      ],
    });
    const r = resolveCharacters(s);
    expect(r.kind).toBe('no-description');
    if (r.kind === 'no-description') {
      expect(r.flatCharacters).toEqual(['甲', '乙', '丙', '丁']);
    }
  });

  it('有說明：字池 >4 取 4（注入確定性 pick）', () => {
    const s = state({
      mode: 'with-description',
      sections: [{ description: '說明', characters: '甲乙丙丁戊己' }],
    });
    const pick = (arr: string[], n: number) => arr.slice(0, n);
    const r = resolveCharacters(s, pick);
    expect(r.kind).toBe('with-description');
    if (r.kind === 'with-description') {
      expect(r.sections).toHaveLength(1);
      expect(r.sections[0].characters).toHaveLength(4);
      expect(r.sections[0].characters).toEqual(['甲', '乙', '丙', '丁']);
    }
  });

  it('有說明：字池 ≤4 不截斷', () => {
    const s = state({
      mode: 'with-description',
      sections: [{ description: '說明', characters: '甲乙丙' }],
    });
    const r = resolveCharacters(s);
    expect(r.kind).toBe('with-description');
    if (r.kind === 'with-description') {
      expect(r.sections[0].characters).toEqual(['甲', '乙', '丙']);
    }
  });
});

describe('pageCount', () => {
  it('無說明：8 字 → 1 頁', () => {
    const s = state({
      mode: 'no-description',
      sections: [{ description: '', characters: '甲乙丙丁戊己庚辛' }],
    });
    expect(pageCount(s)).toBe(1);
  });

  it('無說明：12/16/20 字 → 1/1/2 頁', () => {
    const base = { description: '', characters: '' };
    expect(pageCount(state({ mode: 'no-description', sections: [{ ...base, characters: '甲乙丙丁戊己庚辛壬癸子丑' }] }))).toBe(1);
    expect(pageCount(state({ mode: 'no-description', sections: [{ ...base, characters: '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳' }] }))).toBe(1);
    expect(pageCount(state({ mode: 'no-description', sections: [{ ...base, characters: '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未' }] }))).toBe(2);
  });

  it('有說明：4 段 → 1 頁，5 段 → 2 頁', () => {
    const sec = (chars: string) => ({ description: '', characters: chars });
    expect(pageCount(state({
      mode: 'with-description',
      sections: [sec('甲乙'), sec('丙丁'), sec('戊己'), sec('庚辛')],
    }))).toBe(1);
    expect(pageCount(state({
      mode: 'with-description',
      sections: [sec('甲乙'), sec('丙丁'), sec('戊己'), sec('庚辛'), sec('壬癸')],
    }))).toBe(2);
  });
});

describe('totalChars / effectiveChars / isReady', () => {
  it('無說明時 effectiveChars = totalChars', () => {
    const s = state({
      mode: 'no-description',
      sections: [{ description: '', characters: '甲乙丙丁' }],
    });
    expect(totalChars(s)).toBe(4);
    expect(effectiveChars(s)).toBe(4);
    expect(isReady(s)).toBe(true);
  });

  it('有說明時 effectiveChars = 每段 min(len,4) 之和', () => {
    const s = state({
      mode: 'with-description',
      sections: [
        { description: '', characters: '甲乙丙丁戊' },
        { description: '', characters: '己庚' },
      ],
    });
    expect(totalChars(s)).toBe(7);
    expect(effectiveChars(s)).toBe(4 + 2);
    expect(isReady(s)).toBe(true);
  });

  it('無字時 isReady 為 false', () => {
    expect(isReady(state({ sections: [{ description: '', characters: '' }] }))).toBe(false);
  });
});
