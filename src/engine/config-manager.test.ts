import { describe, it, expect } from 'vitest';
import {
  parseConfig,
  configToSectionInputs,
  exportConfig,
  exportConfigBlob,
  getPresetBatches,
  loadPresetBatch,
} from './config-manager';
import type { SectionInput } from '../types';

describe('config-manager', () => {
  it('parseConfig: 合法 JSON 回傳 data', () => {
    const json = JSON.stringify({
      sections: [{ description: '天覆', characters: ['寅', '宙', '守', '宿'] }],
    });
    const r = parseConfig(json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sections).toHaveLength(1);
      expect(r.data.sections[0].characters).toEqual(['寅', '宙', '守', '宿']);
    }
  });

  it('parseConfig: 非法 JSON → type ILLEGAL_JSON', () => {
    const r = parseConfig('not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.type).toBe('ILLEGAL_JSON');
  });

  it('parseConfig: 超過 5MB → type TOO_LARGE', () => {
    const r = parseConfig('x'.repeat(5 * 1024 * 1024 + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.type).toBe('TOO_LARGE');
  });

  it('configToSectionInputs: PracticeConfig → SectionInput[]', () => {
    const config = {
      sections: [{ description: '說明', characters: ['甲', '乙', '丙'] }],
    };
    const inputs = configToSectionInputs(config);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].description).toBe('說明');
    expect(inputs[0].characters).toBe('甲乙丙');
  });

  it('exportConfig: sections → ConfigJson，字池完整', () => {
    const sections: SectionInput[] = [
      { description: '天覆', characters: '寅宙守宿' },
      { description: '地載', characters: '至盆盤鹽' },
    ];
    const out = exportConfig(sections);
    expect(out.version).toBe(1);
    expect(out.sections).toHaveLength(2);
    expect(out.sections[0].characters).toEqual(['寅', '宙', '守', '宿']);
    expect(out.sections[1].characters).toEqual(['至', '盆', '盤', '鹽']);
  });

  it('exportConfig: 缺 description/characters 時視為空不拋錯', () => {
    const sections = [
      { description: undefined, characters: undefined },
    ] as unknown as SectionInput[];
    const out = exportConfig(sections);
    expect(out.sections).toHaveLength(1);
    expect(out.sections[0].description).toBe('');
    expect(out.sections[0].characters).toEqual([]);
  });

  it('exportConfigBlob: 回傳 JSON Blob', () => {
    const sections: SectionInput[] = [{ description: '', characters: '永' }];
    const blob = exportConfigBlob(sections);
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('round-trip: export → parse → configToSectionInputs 內容一致', async () => {
    const sections: SectionInput[] = [
      { description: '第一段', characters: '甲乙丙丁' },
      { description: '第二段', characters: '戊己庚辛' },
    ];
    const blob = exportConfigBlob(sections);
    const text = await blob.text();
    const parsed = parseConfig(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const back = configToSectionInputs(parsed.data);
      expect(back[0].description).toBe('第一段');
      expect(back[0].characters).toBe('甲乙丙丁');
      expect(back[1].characters).toBe('戊己庚辛');
    }
  });

  it('getPresetBatches / loadPresetBatch 與 presets 一致', () => {
    expect(getPresetBatches().length).toBe(7);
    expect(loadPresetBatch(0).sections.length).toBe(16);
    expect(loadPresetBatch('all').sections.length).toBe(92);
  });
});
