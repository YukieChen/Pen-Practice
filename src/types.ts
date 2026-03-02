/**
 * 核心資料結構 — 對齊 04_technical-architecture.md §2
 * 設計原則：消除特殊情況，兩種模式用同一資料結構表達
 */

/** 練習設定 — 段落化字池，描述手動/設定檔/預設三種來源 */
export interface PracticeConfig {
  sections: SectionConfig[];
}

export interface SectionConfig {
  description: string;
  characters: string[];
}

/** 應用狀態 — 可變，對齊 UI/UX §5.1 */
export type ContentMode = 'no-description' | 'with-description';
export type ContentSource = 'manual' | 'upload' | 'preset';
export type FontSource = 'default' | 'custom';

export interface SectionInput {
  description: string;
  characters: string;
}

/** opentype.Font 由 opentype.js 提供 */
export type OpenTypeFont = import('opentype.js').Font;

export interface AppState {
  mode: ContentMode;
  contentSource: ContentSource;
  sections: SectionInput[];
  fontSource: FontSource;
  customFontFile: File | null;
  parsedFont: OpenTypeFont | null;
  /** sectionIndex → 該段缺字字元陣列 */
  missingChars: Map<number, string[]>;
  /** 全局字格縮放因子（對應 UI 拉桿），用於調整 glyph 大小 */
  glyphScale: number;
  /** 全局 X/Y 位移（mm），對應 UI 拉桿，調整 glyph 在格子內的位置 */
  glyphOffsetX: number;
  glyphOffsetY: number;
  isGenerating: boolean;
  progress: number;
  error: string | null;
}

/** 格線佈局 — Grid Engine 產出 */
export interface GridLayout {
  pages: PageLayout[];
}

export interface PageLayout {
  pageIndex: number;
  sections: SectionLayout[];
}

export interface SectionLayout {
  sectionIndex: number;
  originY: number;
  descriptionRow: DescriptionRow | null;
  practiceRows: PracticeRow[];
  charGroups: CharGroupLayout[];
}

export interface DescriptionRow {
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface CharGroupLayout {
  groupIndex: number;
  character: string | null;
  originX: number;
  cells: CellLayout[];
}

export interface CellLayout {
  row: number;
  col: number;
  x: number;
  y: number;
  type: 'model' | 'guide' | 'blank';
}

export interface PracticeRow {
  rowIndex: number;
  y: number;
}

/** Glyph Renderer 產出 — 縮放後路徑 */
export interface ScaledPath {
  character: string;
  commands: PathCommand[];
  fillColor: string;
  opacity: number;
}

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' };

/** Config Manager — 預設批次 */
export interface PresetBatch {
  index: number;
  label: string;
  startRule: number;
  endRule: number;
  sectionCount: number;
  pageCount: number;
}

/** JSON 設定檔版本與結構（匯出用） */
export interface ConfigJson {
  version: number;
  sections: SectionConfig[];
}

/** 解析/驗證結果 */
export type ParseResult = { ok: true; data: PracticeConfig } | { ok: false; error: string };

/** resolveCharacters 產出 */
export interface ResolvedWithDescription {
  kind: 'with-description';
  sections: { description: string; characters: string[] }[];
}

export interface ResolvedNoDescription {
  kind: 'no-description';
  flatCharacters: string[];
}

export type ResolvedChars = ResolvedWithDescription | ResolvedNoDescription;

/** 一字對應的練習 slot 數：有說明 20、無說明 24（04/06） */
export const SLOTS_PER_CHAR_WITH_DESCRIPTION = 20;
export const SLOTS_PER_CHAR_NO_DESCRIPTION = 24;
