import { describe, it, expect } from 'vitest';
import { calculateGridLayout } from './grid-engine';
import { generateGridOnlyPdf, generatePDF } from './pdf-engine';
import { createInitialState } from '../state';
import { appConfig } from '../config';
import type { ScaledPath } from '../types';

describe('pdf-engine integration', () => {
  it('給定 layout → 產出 PDF，頁數與 layout.pages 一致', async () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [
      { description: '', characters: '甲乙丙丁戊己庚辛' },
      { description: '', characters: '壬癸子丑寅卯辰巳' },
    ];
    const layout = calculateGridLayout(state, appConfig);
    const pdfBytes = await generateGridOnlyPdf(layout, appConfig);
    expect(layout.pages).toHaveLength(1);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it('20 字 → 2 頁 PDF', async () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [{ description: '', characters: '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥' }];
    const layout = calculateGridLayout(state, appConfig);
    expect(layout.pages).toHaveLength(2);
    const pdfBytes = await generateGridOnlyPdf(layout, appConfig);
    expect(pdfBytes.length).toBeGreaterThan(2000);
  });

  it('含字形 path 時 generatePDF 產出有效 PDF', async () => {
    const state = createInitialState();
    state.mode = 'no-description';
    state.sections = [{ description: '', characters: '甲' }];
    const layout = calculateGridLayout(state, appConfig);
    const pathsPerPage: ScaledPath[][] = layout.pages.map(() => []);
    const cell = layout.pages[0].sections[0].charGroups[0].cells[0];
    pathsPerPage[0].push({
      character: '甲',
      commands: [
        { type: 'M', x: cell.x + 1, y: cell.y + 1 },
        { type: 'L', x: cell.x + 10, y: cell.y + 1 },
        { type: 'L', x: cell.x + 10, y: cell.y + 10 },
        { type: 'L', x: cell.x + 1, y: cell.y + 10 },
        { type: 'Z' },
      ],
      fillColor: '#000000',
      opacity: 1,
    });
    const pdfBytes = await generatePDF(layout, pathsPerPage, appConfig);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
