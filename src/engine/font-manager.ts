/**
 * Font Manager — 字體載入、缺字檢查、缺字填補用 fallback，對齊 04 §3.1、06 §4
 */
import type { OpenTypeFont } from '../types';

/** opentype.js 回傳的 glyph 可能帶有 index / name（執行期） */
const GLYPH_ACCESS = (g: unknown) => g as { index?: number; name?: string };

/** 是否為字體的「缺字」glyph（.notdef，常畫成方框）；index 0 為 OpenType 保留給 .notdef */
export function isNotdefGlyph(glyph: unknown): boolean {
  const g = GLYPH_ACCESS(glyph);
  return g.index === 0 || g.name === '.notdef';
}

/** 檢查字體是否涵蓋給定字元，回傳缺字列表（含「有 .notdef 方框」也算缺字） */
export function checkFontCoverage(font: OpenTypeFont, characters: string[]): string[] {
  const missing: string[] = [];
  for (const char of characters) {
    const glyph = font.charToGlyph(char);
    if (isNotdefGlyph(glyph)) {
      missing.push(char);
      continue;
    }
    const bbox = glyph.getBoundingBox();
    const hasOutline =
      !!bbox &&
      (glyph as unknown as {
        getPath?: (x: number, y: number, fontSize: number) => { commands?: unknown[] };
      }).getPath !== undefined;
    if (!hasOutline) missing.push(char);
  }
  return missing;
}

/** 載入自訂字體；解析失敗拋錯 */
export async function loadCustomFont(file: File): Promise<OpenTypeFont> {
  const buffer = await file.arrayBuffer();
  const opentype = await import('opentype.js');
  return opentype.parse(buffer);
}

/** 預設字體 URL（相對於 public/ 或 assets/） */
const DEFAULT_FONT_URL = '/fonts/default-kai.ttf';

/** 缺字填補用字體 URL（可放隨峰體等開源字體，置於 assets/fonts/） */
export const FALLBACK_FONT_URL = '/fonts/fallback.ttf';

/** 載入預設書寫字體；若無則拋錯 */
export async function loadDefaultFont(url: string = DEFAULT_FONT_URL): Promise<OpenTypeFont> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法載入預設字體: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const opentype = await import('opentype.js');
  return opentype.parse(buffer);
}

/** 載入缺字填補用字體；若檔案不存在或解析失敗則回傳 null（不拋錯） */
export async function loadFallbackFont(url: string = FALLBACK_FONT_URL): Promise<OpenTypeFont | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const opentype = await import('opentype.js');
    return opentype.parse(buffer);
  } catch {
    return null;
  }
}
