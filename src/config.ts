/**
 * AppConfig — 應用常數，對齊 04_technical-architecture.md §2.3
 * 衍生常數由 config 建構時計算
 */
export interface AppConfig {
  paper: {
    width: number;
    height: number;
  };
  grid: {
    fineCols: number;
    fineRows: number;
    cellSize: number;
    charCellSize: number;
  };
  layout: {
    charsPerGroup: number;
    groupsPerRow: number;
    rowsPerSection: number;
    sectionsPerPage: number;
    guideCols: number;
    blankCols: number;
    maxCharsPerSection: number;
  };
  rendering: {
    fillRatio: number;
    /** 字格內留白（mm），字不貼格線 */
    contentPaddingMm: number;
    /** 字形填滿程度（1 = 用滿可用區，<1 留餘裕）；與 contentPaddingMm 一起決定視覺 3x3 */
    cellFillRatio: number;
    /** 字形放大係數，補償字體 bbox/path 含大量留白時視覺偏小（1=不放大，>1 強制放大，可能略超格） */
    glyphScaleUp: number;
    /** 全局 X 方向位移（mm），正值向右，負值向左 */
    glyphOffsetXMm: number;
    /** 全局 Y 方向位移（mm），正值向下，負值向上 */
    glyphOffsetYMm: number;
    modelCharOpacity: number;
    guideCharOpacity: number;
    fineGridOpacity: number;
    cellGridOpacity: number;
    sectionDividerOpacity: number;
    fineGridLineWidth: number;
    cellGridLineWidth: number;
    sectionDividerLineWidth: number;
  };
  charCellSizeMm: number;
  gridWidth: number;
  gridHeight: number;
  marginX: number;
  marginY: number;
  charsPerPage: number;
}

const CELL_SIZE_MM = 3.7;
const CHAR_CELL_FINE = 3;
const FINE_COLS = 48;
const FINE_ROWS = 72;
const PAPER_W = 210;
const PAPER_H = 297;

function buildConfig(): AppConfig {
  const charCellSizeMm = CELL_SIZE_MM * CHAR_CELL_FINE;
  const gridWidth = CELL_SIZE_MM * FINE_COLS;
  const gridHeight = CELL_SIZE_MM * FINE_ROWS;
  const marginX = (PAPER_W - gridWidth) / 2;
  const marginY = (PAPER_H - gridHeight) / 2;
  const charsPerGroup = 4;
  const groupsPerRow = 4;
  const sectionsPerPage = 4;
  const charsPerPage = 16; // 4 groups × 4 sections（04 §2.3）

  return {
    paper: { width: PAPER_W, height: PAPER_H },
    grid: {
      fineCols: FINE_COLS,
      fineRows: FINE_ROWS,
      cellSize: CELL_SIZE_MM,
      charCellSize: CHAR_CELL_FINE,
    },
    layout: {
      charsPerGroup,
      groupsPerRow,
      rowsPerSection: 6,
      sectionsPerPage,
      guideCols: 2,
      blankCols: 2,
      maxCharsPerSection: 4,
    },
    rendering: {
      fillRatio: 0.9,
      contentPaddingMm: 0.35,
      cellFillRatio: 1.0,
      glyphScaleUp: 0.9,
      glyphOffsetXMm: 0,
      glyphOffsetYMm: 0,
      modelCharOpacity: 1.0,
      guideCharOpacity: 0.25,
      fineGridOpacity: 0.25,
      cellGridOpacity: 0.4,
      sectionDividerOpacity: 0.6,
      fineGridLineWidth: 0.1,
      cellGridLineWidth: 0.3,
      sectionDividerLineWidth: 0.5,
    },
    charCellSizeMm,
    gridWidth,
    gridHeight,
    marginX,
    marginY,
    charsPerPage,
  };
}

export const appConfig: AppConfig = buildConfig();
