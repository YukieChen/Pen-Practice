/**
 * Config Manager — 設定檔解析/匯出/預設，對齊 04 §3.5、06 §5
 */
import type { PracticeConfig, SectionConfig, SectionInput, ConfigJson } from '../types';
import { parseAndValidate, type ValidatedParseResult } from '../utils/validators';
import { getPresetBatches, loadPresetBatch } from '../data/presets';

const CONFIG_JSON_VERSION = 1;

/** 解析 JSON 字串 → 驗證+截斷後回傳 Result（含錯誤型別） */
export function parseConfig(jsonString: string): ValidatedParseResult {
  return parseAndValidate(jsonString);
}

/** PracticeConfig → SectionInput[]（供 UI 填入） */
export function configToSectionInputs(config: PracticeConfig): SectionInput[] {
  return config.sections.map((sec) => ({
    description: sec.description,
    characters: sec.characters.join(''),
  }));
}

/** SectionInput[] → ConfigJson（字池完整不截斷，06 §5.5） */
export function exportConfig(sections: SectionInput[]): ConfigJson {
  const sectionConfigs: SectionConfig[] = sections.map((sec) => ({
    description: sec.description ?? '',
    characters: Array.from(sec.characters ?? '').filter((c) => /\p{Script=Han}/u.test(c)),
  }));
  return { version: CONFIG_JSON_VERSION, sections: sectionConfigs };
}

/** 下載用：ConfigJson → JSON 字串 → Blob */
export function exportConfigBlob(sections: SectionInput[]): Blob {
  const json = exportConfig(sections);
  return new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
}

export { getPresetBatches, loadPresetBatch };
