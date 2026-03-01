import { describe, it, expect } from 'vitest';
import { calculateGridLayout } from './grid-engine';
import { createInitialState } from '../state';
import { appConfig } from '../config';

describe('grid-engine', () => {
  it('無說明 16 字 → 1 頁、4 段、每段 descriptionRow null、6 practice rows', () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [
      { description: '', characters: '甲乙丙丁' },
      { description: '', characters: '戊己庚辛' },
      { description: '', characters: '壬癸子丑' },
      { description: '', characters: '寅卯辰巳' },
    ];
    const layout = calculateGridLayout(state, appConfig);
    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0].sections).toHaveLength(4);
    for (const sec of layout.pages[0].sections) {
      expect(sec.descriptionRow).toBeNull();
      expect(sec.practiceRows).toHaveLength(6);
      expect(sec.charGroups).toHaveLength(4);
    }
  });

  it('無說明 8 字 → 1 頁、空白字組 character 為 null', () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [
      { description: '', characters: '甲乙丙丁' },
      { description: '', characters: '戊己庚辛' },
    ];
    const layout = calculateGridLayout(state, appConfig);
    expect(layout.pages[0].sections[0].charGroups[0].character).toBe('甲');
    expect(layout.pages[0].sections[0].charGroups[3].character).toBe('丁');
    expect(layout.pages[0].sections[1].charGroups[0].character).toBe('戊');
    expect(layout.pages[0].sections[1].charGroups[3].character).toBe('辛');
    expect(layout.pages[0].sections[2].charGroups[0].character).toBeNull();
    expect(layout.pages[0].sections[3].charGroups[0].character).toBeNull();
  });

  it('無說明 20 字 → 2 頁', () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [
      { description: '', characters: '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未' },
      { description: '', characters: '申酉戌亥' },
    ];
    const layout = calculateGridLayout(state, appConfig);
    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0].pageIndex).toBe(0);
    expect(layout.pages[1].pageIndex).toBe(1);
  });

  it('座標：cellX/cellY 與 04 公式一致', () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [{ description: '', characters: '甲' }];
    const layout = calculateGridLayout(state, appConfig);
    const sec = layout.pages[0].sections[0];
    const group0 = sec.charGroups[0];
    expect(group0.cells.length).toBeGreaterThan(0);
    const cell = group0.cells[0];
    const expectedX = appConfig.marginX + 0 * 4 * appConfig.charCellSizeMm + 0 * appConfig.charCellSizeMm;
    const expectedY = appConfig.marginY + 0 * 6 * appConfig.charCellSizeMm + 0 * appConfig.charCellSizeMm;
    expect(cell.x).toBeCloseTo(expectedX, 2);
    expect(cell.y).toBeCloseTo(expectedY, 2);
  });

  it('有說明列：每段 descriptionRow 存在、5 practice rows', () => {
    const state = createInitialState();
    state.mode = 'with-description';
    state.sections = [
      { description: '天覆', characters: '甲乙丙丁' },
      { description: '地載', characters: '戊己庚辛' },
      { description: '', characters: '壬癸' },
      { description: '', characters: '子丑' },
    ];
    const pick = (arr: string[], n: number) => arr.slice(0, n);
    const layout = calculateGridLayout(state, appConfig, pick);
    expect(layout.pages[0].sections).toHaveLength(4);
    expect(layout.pages[0].sections[0].descriptionRow).not.toBeNull();
    expect(layout.pages[0].sections[0].descriptionRow!.text).toBe('天覆');
    expect(layout.pages[0].sections[0].practiceRows).toHaveLength(5);
    expect(layout.pages[0].sections[0].descriptionRow!.height).toBe(appConfig.charCellSizeMm);
    expect(layout.pages[0].sections[0].descriptionRow!.width).toBe(appConfig.gridWidth);
  });

  it('有說明列：字池 >4 取 4（注入 pick）', () => {
    const state = createInitialState();
    state.mode = 'with-description';
    state.sections = [{ description: '說明', characters: '甲乙丙丁戊己' }];
    const pick = (arr: string[], n: number) => arr.slice(0, n);
    const layout = calculateGridLayout(state, appConfig, pick);
    expect(layout.pages[0].sections[0].charGroups).toHaveLength(4);
    expect(layout.pages[0].sections[0].charGroups[0].character).toBe('甲');
    expect(layout.pages[0].sections[0].charGroups[3].character).toBe('丁');
  });
});
