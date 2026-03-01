/**
 * Domain 層 — sections → 字元解析、頁數計算，對齊 04 §3.2 與 06 §2
 * 無 UI/IO 依賴，可純單元測試
 */
import type { AppState, ResolvedChars } from '../types';
import { appConfig, type AppConfig } from '../config';
import { randomPick } from '../utils/random';

/** 將 SectionInput.characters 字串轉成字元陣列（缺欄位時視為空字串） */
export function sectionChars(section: { characters?: string }): string[] {
  const raw = section.characters ?? '';
  return Array.from(raw).filter((c) => /\p{Script=Han}/u.test(c));
}

/**
 * 依模式解析字池：有說明 → 每段最多 4 字；無說明 → 扁平
 * pick 可注入以利測試（預設 randomPick）
 */
export function resolveCharacters(
  state: AppState,
  pick: (arr: string[], n: number) => string[] = randomPick
): ResolvedChars {
  if (state.mode === 'with-description') {
    const sections = state.sections.map((sec) => {
      const chars = sectionChars(sec);
      const take = chars.length > 4 ? pick(chars, 4) : chars;
      return { description: sec.description ?? '', characters: take };
    });
    return { kind: 'with-description', sections };
  }
  const flatCharacters = state.sections.flatMap((sec) => sectionChars(sec));
  return { kind: 'no-description', flatCharacters };
}

/**
 * 頁數計算：無說明 16 字/頁；有說明 4 段/頁（04/06）
 */
export function pageCount(state: AppState, config: AppConfig = appConfig): number {
  const resolved = resolveCharacters(state);
  if (resolved.kind === 'with-description') {
    const n = resolved.sections.length;
    return Math.max(1, Math.ceil(n / config.layout.sectionsPerPage));
  }
  const n = resolved.flatCharacters.length;
  return Math.max(1, Math.ceil(n / config.charsPerPage));
}

/** 總字數（未截斷） */
export function totalChars(state: AppState): number {
  return state.sections.reduce((sum, sec) => sum + sectionChars(sec).length, 0);
}

/** 有效字數：有說明 = 每段 min(len,4) 之和；無說明 = totalChars */
export function effectiveChars(state: AppState): number {
  if (state.mode === 'no-description') return totalChars(state);
  return state.sections.reduce((sum, sec) => {
    const n = sectionChars(sec).length;
    return sum + Math.min(n, 4);
  }, 0);
}

/** 是否可產生 PDF：至少 1 字 */
export function isReady(state: AppState): boolean {
  return effectiveChars(state) >= 1;
}
