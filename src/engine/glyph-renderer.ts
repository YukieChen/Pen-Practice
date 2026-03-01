/**
 * Glyph Renderer — 字形路徑提取、bbox 縮放，對齊 04 §3.3、06 §4
 * 缺字回傳 null，caller 僅繪格線
 */
import type { CellLayout, ScaledPath, PathCommand } from '../types';
import type { OpenTypeFont } from '../types';
import type { AppConfig } from '../config';
import { convertPath } from '../utils/path-converter';
import type { OtCommand } from '../utils/path-converter';
import { isNotdefGlyph } from './font-manager';

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GlyphCache {
  get(char: string): { path: PathCommand[]; bbox: BBox } | undefined;
}

/** 從單一字體取得可繪 glyph 的 path/bbox，無則回傳 null；.notdef（方框）視為缺字 */
function tryGlyphFromFont(
  font: OpenTypeFont,
  char: string
): { path: PathCommand[]; bbox: BBox } | null {
  const unitsPerEm = (font as { unitsPerEm?: number }).unitsPerEm ?? 1000;
  const glyph = font.charToGlyph(char);
  if (isNotdefGlyph(glyph)) return null;
  const bbox = glyph.getBoundingBox();
  if (!bbox) return null;

  const rawPath = (glyph as unknown as { getPath: (x: number, y: number, fontSize: number) => { commands?: unknown[] } }).getPath(
    0,
    0,
    unitsPerEm
  );
  if (!rawPath.commands || !rawPath.commands.length) return null;

  const commands = convertPath(rawPath.commands as OtCommand[]);
  return {
    path: commands,
    bbox: { x1: bbox.x1, y1: bbox.y1, x2: bbox.x2, y2: bbox.y2 },
  };
}

/** 從 opentype Font 建 GlyphCache
 *  - 使用 glyph.getPath(0, 0, unitsPerEm) 取得實際輪廓
 *  - bbox 與 path 使用相同座標單位，方便後續縮放
 *  - 若傳入 fallbackFont，主字體缺字時改由此字體填補（如隨峰體）
 */
export function prepareGlyphs(
  font: OpenTypeFont,
  characters: string[],
  fallbackFont?: OpenTypeFont | null
): Map<string, { path: PathCommand[]; bbox: BBox }> {
  const cache = new Map<string, { path: PathCommand[]; bbox: BBox }>();

  for (const char of characters) {
    let entry = tryGlyphFromFont(font, char);
    if (!entry && fallbackFont) entry = tryGlyphFromFont(fallbackFont, char);
    if (entry) cache.set(char, entry);
  }

  return cache;
}

/** 從 path 指令計算實際邊界（含超出 font bbox 的筆畫，如「寅」底下兩點） */
function pathBounds(commands: PathCommand[]): { xMin: number; yMin: number; xMax: number; yMax: number } | null {
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  const push = (x: number, y: number) => {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  };
  for (const cmd of commands) {
    if (cmd.type === 'M' || cmd.type === 'L') {
      push(cmd.x, cmd.y);
    } else if (cmd.type === 'C') {
      push(cmd.x1, cmd.y1);
      push(cmd.x2, cmd.y2);
      push(cmd.x, cmd.y);
    }
  }
  if (xMin === Infinity) return null;
  return { xMin, yMin, xMax, yMax };
}

/** 將 bbox 內點轉成邏輯座標（mm）。
 * Y：以 yMin 對齊 cell 頂（offsetY）。若字體為 Y-up 會上飄，可依字體用 UI 的 Y 軸偏移補償。
 */
function transformPoint(
  x: number,
  y: number,
  xMin: number,
  yMin: number,
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  return {
    x: scale * (x - xMin) + offsetX,
    y: offsetY + scale * (y - yMin),
  };
}

function transformCommands(
  commands: PathCommand[],
  xMin: number,
  yMin: number,
  scale: number,
  offsetX: number,
  offsetY: number
): PathCommand[] {
  return commands.map((cmd) => {
    if (cmd.type === 'M') {
      const p = transformPoint(cmd.x, cmd.y, xMin, yMin, scale, offsetX, offsetY);
      return { type: 'M', x: p.x, y: p.y };
    }
    if (cmd.type === 'L') {
      const p = transformPoint(cmd.x, cmd.y, xMin, yMin, scale, offsetX, offsetY);
      return { type: 'L', x: p.x, y: p.y };
    }
    if (cmd.type === 'C') {
      const p1 = transformPoint(cmd.x1, cmd.y1, xMin, yMin, scale, offsetX, offsetY);
      const p2 = transformPoint(cmd.x2, cmd.y2, xMin, yMin, scale, offsetX, offsetY);
      const p = transformPoint(cmd.x, cmd.y, xMin, yMin, scale, offsetX, offsetY);
      return { type: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y };
    }
    return cmd;
  });
}

/**
 * 產生單一 cell 的縮放路徑；缺字回傳 null（僅繪格線）
 * 垂直定位與說明列一致：以 pathBounds（墨水邊界）為準，避免 bbox 留白導致字帖整塊上飄約 3mm。
 */
export function renderGlyph(
  cache: Map<string, { path: PathCommand[]; bbox: BBox }>,
  character: string,
  cell: CellLayout,
  config: AppConfig
): ScaledPath | null {
  // 空白格不繪製任何字形
  if (cell.type === 'blank') return null;

  const entry = cache.get(character);
  if (!entry) return null;
  const { path, bbox } = entry;
  const pathBox = pathBounds(path);
  const xMin = pathBox ? Math.min(bbox.x1, pathBox.xMin) : bbox.x1;
  const xMax = pathBox ? Math.max(bbox.x2, pathBox.xMax) : bbox.x2;
  // 字帖垂直定位與說明列一致：用墨水邊界；若 path 無高度則退回 bbox
  const pathYValid = pathBox && pathBox.yMax > pathBox.yMin;
  const yMin = pathYValid ? pathBox!.yMin : Math.min(bbox.y1, bbox.y2);
  const yMax = pathYValid ? pathBox!.yMax : Math.max(bbox.y1, bbox.y2);
  const glyphW = xMax - xMin;
  const glyphH = yMax - yMin;
  if (glyphW <= 0 || glyphH <= 0) return null;

  const pad = config.rendering.contentPaddingMm;
  const available = config.charCellSizeMm - 2 * pad;
  const effective = available * config.rendering.cellFillRatio;
  const scale =
    Math.min(effective / glyphW, effective / glyphH) * config.rendering.glyphScaleUp;
  const scaledW = glyphW * scale;
  const scaledH = glyphH * scale;
  const baseOffsetX = cell.x + pad + (available - scaledW) / 2;
  const baseOffsetY = cell.y + pad + (available - scaledH) / 2;
  const offsetX = baseOffsetX + (config.rendering.glyphOffsetXMm ?? 0);
  const offsetY = baseOffsetY + (config.rendering.glyphOffsetYMm ?? 0);

  const opacity =
    cell.type === 'model'
      ? config.rendering.modelCharOpacity
      : config.rendering.guideCharOpacity;

  const commands = transformCommands(path, xMin, yMin, scale, offsetX, offsetY);
  return {
    character,
    commands,
    fillColor: '#000000',
    opacity,
  };
}

/**
 * 在任意矩形區域內繪製單一 glyph，主要用於說明列文字。
 * 使用「墨水邊界」(pathBounds) 計算縮放；並加上縮放上限，避免標點等小 glyph 被放大過頭。
 */
export function renderGlyphInBox(
  cache: Map<string, { path: PathCommand[]; bbox: BBox }>,
  character: string,
  box: { x: number; y: number; width: number; height: number },
  config: AppConfig,
  opacity: number
): ScaledPath | null {
  const entry = cache.get(character);
  if (!entry) return null;
  const { path, bbox } = entry;
  const pathBox = pathBounds(path);
  const xMin = pathBox ? pathBox.xMin : bbox.x1;
  const xMax = pathBox ? pathBox.xMax : bbox.x2;
  const yMin = pathBox ? pathBox.yMin : Math.min(bbox.y1, bbox.y2);
  const yMax = pathBox ? pathBox.yMax : Math.max(bbox.y1, bbox.y2);
  const glyphW = xMax - xMin;
  const glyphH = yMax - yMin;
  if (glyphW <= 0 || glyphH <= 0) return null;

  const pad = Math.min(config.rendering.contentPaddingMm, Math.min(box.width, box.height) / 4);
  const availableW = Math.max(box.width - 2 * pad, 0);
  const availableH = Math.max(box.height - 2 * pad, 0);
  if (availableW === 0 || availableH === 0) return null;

  const effectiveW = availableW * config.rendering.cellFillRatio;
  const effectiveH = availableH * config.rendering.cellFillRatio;
  let scale =
    Math.min(effectiveW / glyphW, effectiveH / glyphH) * config.rendering.glyphScaleUp;

  // 說明列縮放上限：以「參考字高」1000 font units 為準，避免標點等小 glyph 被放大成巨大
  const REFERENCE_GLYPH_HEIGHT = 1000;
  const maxScale = (0.85 * availableH) / REFERENCE_GLYPH_HEIGHT;
  scale = Math.min(scale, maxScale);

  const scaledW = glyphW * scale;
  const scaledH = glyphH * scale;

  const baseOffsetX = box.x + pad + (availableW - scaledW) / 2;
  const baseOffsetY = box.y + pad + (availableH - scaledH) / 2;
  // 說明列不套用全局 X/Y 偏移，僅字帖（renderGlyph）受偏移設定影響
  const offsetX = baseOffsetX;
  const offsetY = baseOffsetY;

  const commands = transformCommands(path, xMin, yMin, scale, offsetX, offsetY);
  return {
    character,
    commands,
    fillColor: '#000000',
    opacity,
  };
}
