import { describe, it, expect } from 'vitest';
import { HUANG_92_PRESETS, getPresetBatches, loadPresetBatch } from './presets';

describe('presets', () => {
  it('HUANG_92_PRESETS 包含 92 個 sections', () => {
    expect(HUANG_92_PRESETS.sections).toHaveLength(92);
    expect(HUANG_92_PRESETS.sections[0]).toMatchObject({
      description: expect.any(String),
      characters: expect.any(Array),
    });
    expect(HUANG_92_PRESETS.sections[0].characters).toContain('寅');
  });

  it('getPresetBatches 回傳 7 個批次（6 批 + 全部）', () => {
    const batches = getPresetBatches();
    expect(batches).toHaveLength(7);
    expect(batches[0].sectionCount).toBe(16);
    expect(batches[0].pageCount).toBe(4);
    expect(batches[5].sectionCount).toBe(12);
    expect(batches[5].pageCount).toBe(3);
    expect(batches[6].sectionCount).toBe(92);
    expect(batches[6].pageCount).toBe(23);
  });

  it('loadPresetBatch(0) 回傳第 1-16 法', () => {
    const config = loadPresetBatch(0);
    expect(config.sections).toHaveLength(16);
    expect(config.sections[0].description).toContain('01、天覆');
  });

  it('loadPresetBatch(5) 回傳第 81-92 法', () => {
    const config = loadPresetBatch(5);
    expect(config.sections).toHaveLength(12);
    expect(config.sections[0].description).toContain('81、');
  });

  it("loadPresetBatch('all') 回傳全部 92 段", () => {
    const config = loadPresetBatch('all');
    expect(config.sections).toHaveLength(92);
  });

  it('loadPresetBatch(6) 回傳全部 92 段', () => {
    const config = loadPresetBatch(6);
    expect(config.sections).toHaveLength(92);
  });
});
