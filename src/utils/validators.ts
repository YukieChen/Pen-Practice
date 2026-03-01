/**
 * 輸入驗證 — CJK 過濾、JSON 結構驗證，對齊 06 §5.0 / S3
 * 截斷：200 段、64 字/段、description 50 字
 */
import type { PracticeConfig, SectionConfig } from '../types';

const MAX_SECTIONS = 200;
export const MAX_CHARS_PER_SECTION = 64;
const MAX_DESCRIPTION_LENGTH = 50;

/** 僅保留 CJK 字元 */
export function filterCjk(text: string): string {
  return Array.from(text)
    .filter((c) => /\p{Script=Han}/u.test(c))
    .join('');
}

/** 驗證並截斷單段 */
export function normalizeSection(sec: { description?: string; characters?: unknown }): SectionConfig {
  const desc =
    typeof sec.description === 'string'
      ? sec.description.slice(0, MAX_DESCRIPTION_LENGTH)
      : '';
  const raw = sec.characters;
  const chars: string[] = Array.isArray(raw)
    ? (raw as unknown[])
        .filter((c): c is string => typeof c === 'string')
        .flatMap((s) => Array.from(s).filter((c) => /\p{Script=Han}/u.test(c)))
        .slice(0, MAX_CHARS_PER_SECTION)
    : [];
  return { description: desc, characters: chars };
}

/** 驗證並截斷 PracticeConfig */
export function normalizeConfig(data: { sections?: unknown }): PracticeConfig {
  const raw = data.sections;
  const sections = Array.isArray(raw)
    ? raw.slice(0, MAX_SECTIONS).map((sec) => normalizeSection(sec as Record<string, unknown>))
    : [];
  return { sections };
}

export function validateConfigStructure(data: unknown): data is { sections: unknown[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'sections' in data &&
    Array.isArray((data as { sections: unknown }).sections)
  );
}

export type ParseErrorType = 'ILLEGAL_JSON' | 'TOO_LARGE' | 'INVALID_STRUCTURE';

export interface ParseFailure {
  ok: false;
  error: string;
  type: ParseErrorType;
}

export interface ParseSuccess {
  ok: true;
  data: PracticeConfig;
}

export type ValidatedParseResult = ParseSuccess | ParseFailure;

export const MAX_JSON_BYTES = 5 * 1024 * 1024;

/** 字型檔大小上限 20MB（規格 01/03/06 E03） */
export const MAX_FONT_BYTES = 20 * 1024 * 1024;

export function parseAndValidate(jsonString: string): ValidatedParseResult {
  if (new TextEncoder().encode(jsonString).length > MAX_JSON_BYTES) {
    return { ok: false, error: '設定檔超過 5MB', type: 'TOO_LARGE' };
  }
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'JSON 格式錯誤', type: 'ILLEGAL_JSON' };
  }
  if (!validateConfigStructure(data)) {
    return { ok: false, error: '設定檔需包含 sections 陣列', type: 'INVALID_STRUCTURE' };
  }
  return { ok: true, data: normalizeConfig(data) };
}
