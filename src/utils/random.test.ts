import { describe, it, expect } from 'vitest';
import { randomPick } from './random';

describe('random', () => {
  it('randomPick(8字, 4) → 4 字且都在原陣列', () => {
    const arr = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛'];
    const picked = randomPick(arr, 4);
    expect(picked).toHaveLength(4);
    picked.forEach((c) => expect(arr).toContain(c));
  });

  it('randomPick(3字, 4) → 3 字（不足不補）', () => {
    const arr = ['甲', '乙', '丙'];
    expect(randomPick(arr, 4)).toHaveLength(3);
  });

  it('randomPick(4字, 4) → 4 字', () => {
    const arr = ['甲', '乙', '丙', '丁'];
    expect(randomPick(arr, 4)).toHaveLength(4);
  });

  it('randomPick 不修改原陣列', () => {
    const arr = ['甲', '乙', '丙'];
    randomPick(arr, 2);
    expect(arr).toEqual(['甲', '乙', '丙']);
  });

  it('count=0 或空陣列 → 空陣列', () => {
    expect(randomPick([], 4)).toEqual([]);
    expect(randomPick(['甲'], 0)).toEqual([]);
  });
});
