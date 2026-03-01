/**
 * PDF Engine — 格線繪製（04 §3.4），對齊 06 §3
 * 繪製順序：fine grid → cell grid → section dividers
 */
import { PDFDocument, rgb } from 'pdf-lib';
import type { AppConfig } from '../config';
import type { GridLayout, ScaledPath, PathCommand } from '../types';
import type { PageLayout } from '../types';
import { mmToPt, logicalYToPdfY } from '../utils/coordinate';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

function drawFineGrid(page: { drawLine: (o: { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; color: ReturnType<typeof rgb>; opacity?: number }) => void }, config: AppConfig): void {
  const { gridWidth, gridHeight, marginX, marginY } = config;
  const opacity = config.rendering.fineGridOpacity;
  const thickness = config.rendering.fineGridLineWidth;
  const color = rgb(0, 0, 0);

  for (let col = 0; col <= config.grid.fineCols; col++) {
    const xMm = marginX + col * config.grid.cellSize;
    const xPt = mmToPt(xMm);
    const yTop = logicalYToPdfY(marginY, PAGE_H_MM);
    const yBottom = logicalYToPdfY(marginY + gridHeight, PAGE_H_MM);
    page.drawLine({
      start: { x: xPt, y: yBottom },
      end: { x: xPt, y: yTop },
      thickness,
      color,
      opacity,
    });
  }
  for (let row = 0; row <= config.grid.fineRows; row++) {
    const yMm = marginY + row * config.grid.cellSize;
    const yPt = logicalYToPdfY(yMm, PAGE_H_MM);
    const xLeft = mmToPt(marginX);
    const xRight = mmToPt(marginX + gridWidth);
    page.drawLine({
      start: { x: xLeft, y: yPt },
      end: { x: xRight, y: yPt },
      thickness,
      color,
      opacity,
    });
  }
}

function drawCellGrid(page: { drawLine: (o: { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; color: ReturnType<typeof rgb>; opacity?: number }) => void }, config: AppConfig): void {
  const { gridWidth, gridHeight, marginX, marginY } = config;
  const opacity = config.rendering.cellGridOpacity;
  const thickness = config.rendering.cellGridLineWidth;
  const color = rgb(0, 0, 0);
  const cellMm = config.charCellSizeMm;
  const cols = 16;
  const rows = 24;

  for (let col = 0; col <= cols; col++) {
    const xMm = marginX + col * cellMm;
    const xPt = mmToPt(xMm);
    const yTop = logicalYToPdfY(marginY, PAGE_H_MM);
    const yBottom = logicalYToPdfY(marginY + gridHeight, PAGE_H_MM);
    page.drawLine({ start: { x: xPt, y: yBottom }, end: { x: xPt, y: yTop }, thickness, color, opacity });
  }
  for (let row = 0; row <= rows; row++) {
    const yMm = marginY + row * cellMm;
    const yPt = logicalYToPdfY(yMm, PAGE_H_MM);
    const xLeft = mmToPt(marginX);
    const xRight = mmToPt(marginX + gridWidth);
    page.drawLine({ start: { x: xLeft, y: yPt }, end: { x: xRight, y: yPt }, thickness, color, opacity });
  }
}

function drawSectionDividers(page: { drawLine: (o: { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; color: ReturnType<typeof rgb>; opacity?: number }) => void }, config: AppConfig): void {
  const { gridWidth, marginX, marginY } = config;
  const opacity = config.rendering.sectionDividerOpacity;
  const thickness = config.rendering.sectionDividerLineWidth;
  const color = rgb(0, 0, 0);
  const cellMm = config.charCellSizeMm;
  const rowsPerSection = 6;
  for (let s = 0; s <= 4; s++) {
    const yMm = marginY + s * rowsPerSection * cellMm;
    const yPt = logicalYToPdfY(yMm, PAGE_H_MM);
    const xLeft = mmToPt(marginX);
    const xRight = mmToPt(marginX + gridWidth);
    page.drawLine({ start: { x: xLeft, y: yPt }, end: { x: xRight, y: yPt }, thickness, color, opacity });
  }
}

/** 說明列白底：遮住底下格線，繪於格線之後、字形之前 */
function drawDescriptionRowBackgrounds(
  page: { drawRectangle: (o: { x: number; y: number; width: number; height: number; color: ReturnType<typeof rgb> }) => void },
  pageLayout: PageLayout,
  config: AppConfig
): void {
  const white = rgb(1, 1, 1);
  for (const sec of pageLayout.sections) {
    if (!sec.descriptionRow) continue;
    const { y, width, height } = sec.descriptionRow;
    const xPt = mmToPt(config.marginX);
    const yPt = logicalYToPdfY(y + height, PAGE_H_MM);
    const wPt = mmToPt(width);
    const hPt = mmToPt(height);
    page.drawRectangle({ x: xPt, y: yPt, width: wPt, height: hPt, color: white });
  }
}

/**
 * 產生僅含格線的 PDF（用於整合測試）
 */
export async function generateGridOnlyPdf(
  layout: GridLayout,
  config: AppConfig
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const wPt = mmToPt(PAGE_W_MM);
  const hPt = mmToPt(PAGE_H_MM);

  for (const pageLayout of layout.pages) {
    const page = doc.addPage([wPt, hPt]);
    drawFineGrid(page, config);
    drawCellGrid(page, config);
    drawSectionDividers(page, config);
    void pageLayout;
  }

  return doc.save();
}

/** 邏輯座標 (mm) 轉成 pdf-lib drawSvgPath 的 path d 字串
 * pdf-lib 預設套用 scale(1, -1)，故傳入 y = -logicalYToPdfY(cmd.y)，轉換後得正確 PDF Y；
 * x 直接 mmToPt(cmd.x)，不鏡射，字形保持正向且落在格線內。
 */
function pathToSvgInPdfCoords(commands: PathCommand[], pageHeightMm: number): string {
  const parts: string[] = [];
  for (const cmd of commands) {
    if (cmd.type === 'M') {
      const x = mmToPt(cmd.x);
      const y = -logicalYToPdfY(cmd.y, pageHeightMm);
      parts.push(`M ${x} ${y}`);
    } else if (cmd.type === 'L') {
      const x = mmToPt(cmd.x);
      const y = -logicalYToPdfY(cmd.y, pageHeightMm);
      parts.push(`L ${x} ${y}`);
    } else if (cmd.type === 'C') {
      const x1 = mmToPt(cmd.x1);
      const y1 = -logicalYToPdfY(cmd.y1, pageHeightMm);
      const x2 = mmToPt(cmd.x2);
      const y2 = -logicalYToPdfY(cmd.y2, pageHeightMm);
      const x = mmToPt(cmd.x);
      const y = -logicalYToPdfY(cmd.y, pageHeightMm);
      parts.push(`C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`);
    } else if (cmd.type === 'Z') {
      parts.push('Z');
    }
  }
  return parts.join(' ');
}

function drawGlyphPaths(
  page: { drawSvgPath: (path: string, opts: { x?: number; y?: number; color?: ReturnType<typeof rgb>; opacity?: number }) => void },
  paths: ScaledPath[],
  pageHeightMm: number
): void {
  const color = rgb(0, 0, 0);
  for (const sp of paths) {
    const d = pathToSvgInPdfCoords(sp.commands, pageHeightMm);
    if (!d) continue;
    page.drawSvgPath(d, { x: 0, y: 0, color, opacity: sp.opacity });
  }
}

/**
 * 產生完整 PDF（格線 + 字形路徑）
 * pathsPerPage[pageIndex] = 該頁所有 ScaledPath
 */
export async function generatePDF(
  layout: GridLayout,
  pathsPerPage: ScaledPath[][],
  config: AppConfig
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const wPt = mmToPt(PAGE_W_MM);
  const hPt = mmToPt(PAGE_H_MM);

  for (let i = 0; i < layout.pages.length; i++) {
    const page = doc.addPage([wPt, hPt]);
    drawFineGrid(page, config);
    drawCellGrid(page, config);
    drawSectionDividers(page, config);
    drawDescriptionRowBackgrounds(page, layout.pages[i], config);
    const paths = pathsPerPage[i] ?? [];
    drawGlyphPaths(page, paths, PAGE_H_MM);
  }

  return doc.save();
}
