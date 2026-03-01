/**
 * 黃自元間架結構九十二法 — 系統預設，對齊 04 §3.5、06 §5.4
 */
import type { PracticeConfig, PresetBatch } from '../types';
import huang92Json from './huang-92-presets.json';

const raw = huang92Json as { title?: string; author?: string; sections: { description: string; characters: string[] }[] };
export const HUANG_92_PRESETS: PracticeConfig = { sections: raw.sections };

/** 7 批次：第 1–16 法 … 第 81–92 法 + 全部（04 §3.5、PRD 6.5.1） */
export const PRESET_BATCHES: PresetBatch[] = [
  { index: 0, label: '第 1-16 法', startRule: 1, endRule: 16, sectionCount: 16, pageCount: 4 },
  { index: 1, label: '第 17-32 法', startRule: 17, endRule: 32, sectionCount: 16, pageCount: 4 },
  { index: 2, label: '第 33-48 法', startRule: 33, endRule: 48, sectionCount: 16, pageCount: 4 },
  { index: 3, label: '第 49-64 法', startRule: 49, endRule: 64, sectionCount: 16, pageCount: 4 },
  { index: 4, label: '第 65-80 法', startRule: 65, endRule: 80, sectionCount: 16, pageCount: 4 },
  { index: 5, label: '第 81-92 法', startRule: 81, endRule: 92, sectionCount: 12, pageCount: 3 },
  { index: 6, label: '全部 92 法', startRule: 1, endRule: 92, sectionCount: 92, pageCount: 23 },
];

export function getPresetBatches(): PresetBatch[] {
  return [...PRESET_BATCHES];
}

/**
 * 載入預設批次：0–5 為單批，6 或 'all' 為全部 92 段
 */
export function loadPresetBatch(batchIndex: number | 'all'): PracticeConfig {
  if (batchIndex === 'all' || batchIndex === 6) return HUANG_92_PRESETS;
  const batch = PRESET_BATCHES[batchIndex];
  if (!batch) return { sections: [] };
  const start = batch.startRule - 1;
  const end = batch.endRule;
  return { sections: HUANG_92_PRESETS.sections.slice(start, end) };
}
