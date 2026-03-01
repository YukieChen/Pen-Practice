import { describe, it, expect } from 'vitest';
import { appConfig } from './config';

describe('config', () => {
  it('appConfig 符合 04 §2.3 格線常數', () => {
    expect(appConfig.grid.fineCols).toBe(48);
    expect(appConfig.grid.fineRows).toBe(72);
    expect(appConfig.layout.sectionsPerPage).toBe(4);
    expect(appConfig.charsPerPage).toBe(16);
    expect(appConfig.charCellSizeMm).toBeCloseTo(11.1, 1);
    expect(appConfig.gridWidth).toBeCloseTo(177.6, 1);
    expect(appConfig.gridHeight).toBeCloseTo(266.4, 1);
  });
});
