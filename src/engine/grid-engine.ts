/**
 * Grid Engine — 格線座標計算，對齊 04 §3.2、06 §3
 */
import type {
  AppState,
  GridLayout,
  PageLayout,
  SectionLayout,
  CharGroupLayout,
  CellLayout,
  PracticeRow,
  DescriptionRow,
} from '../types';
import type { AppConfig } from '../config';
import { resolveCharacters } from '../domain/layout';

function cellX(config: AppConfig, groupIndex: number, colInGroup: number): number {
  return (
    config.marginX +
    groupIndex * config.layout.charsPerGroup * config.charCellSizeMm +
    colInGroup * config.charCellSizeMm
  );
}

function cellY(
  config: AppConfig,
  sectionIndexInPage: number,
  rowInSection: number,
  hasDescription: boolean
): number {
  return (
    config.marginY +
    sectionIndexInPage * config.layout.rowsPerSection * config.charCellSizeMm +
    (hasDescription ? config.charCellSizeMm : 0) +
    rowInSection * config.charCellSizeMm
  );
}

function cellType(row: number, col: number): 'model' | 'guide' | 'blank' {
  if (row === 0 && col === 0) return 'model';
  if (col === 0 || col === 1) return 'guide';
  return 'blank';
}

function buildCharGroupCells(
  config: AppConfig,
  groupIndex: number,
  practiceRowCount: number,
  hasDescription: boolean,
  sectionIndexInPage: number
): CellLayout[] {
  const cells: CellLayout[] = [];
  for (let row = 0; row < practiceRowCount; row++) {
    const y = cellY(config, sectionIndexInPage, row, hasDescription);
    for (let col = 0; col < 4; col++) {
      cells.push({
        row,
        col,
        x: cellX(config, groupIndex, col),
        y,
        type: cellType(row, col),
      });
    }
  }
  return cells;
}

function buildCharGroupNoDescription(
  config: AppConfig,
  groupIndex: number,
  character: string | null,
  sectionIndexInPage: number
): CharGroupLayout {
  const originX = cellX(config, groupIndex, 0);
  const cells = buildCharGroupCells(config, groupIndex, 6, false, sectionIndexInPage);
  return { groupIndex, character, originX, cells };
}

function buildCharGroupWithDescription(
  config: AppConfig,
  groupIndex: number,
  character: string | null,
  sectionIndexInPage: number
): CharGroupLayout {
  const originX = cellX(config, groupIndex, 0);
  const cells = buildCharGroupCells(config, groupIndex, 5, true, sectionIndexInPage);
  return { groupIndex, character, originX, cells };
}

function buildPracticeRows(
  config: AppConfig,
  count: number,
  sectionIndexInPage: number,
  hasDescription: boolean
): PracticeRow[] {
  const rows: PracticeRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      rowIndex: i,
      y: cellY(config, sectionIndexInPage, i, hasDescription),
    });
  }
  return rows;
}

function emptySection(
  config: AppConfig,
  sectionIndexInPage: number,
  hasDescription: boolean
): SectionLayout {
  const practiceRowCount = hasDescription ? 5 : 6;
  const originY =
    config.marginY +
    sectionIndexInPage * config.layout.rowsPerSection * config.charCellSizeMm;
  const descRow: DescriptionRow | null = hasDescription
    ? { y: originY, width: config.gridWidth, height: config.charCellSizeMm, text: '' }
    : null;
  const charGroups: CharGroupLayout[] = [];
  for (let g = 0; g < 4; g++) {
    const builder = hasDescription ? buildCharGroupWithDescription : buildCharGroupNoDescription;
    charGroups.push(builder(config, g, null, sectionIndexInPage));
  }
  return {
    sectionIndex: sectionIndexInPage,
    originY,
    descriptionRow: descRow,
    practiceRows: buildPracticeRows(config, practiceRowCount, sectionIndexInPage, hasDescription),
    charGroups,
  };
}

/**
 * 計算格線佈局
 * @param pick 可注入以利測試（有說明模式字池 >4 取 4）
 */
export function calculateGridLayout(
  state: AppState,
  config: AppConfig,
  pick?: (arr: string[], n: number) => string[]
): GridLayout {
  const resolved = resolveCharacters(state, pick);
  const pages: PageLayout[] = [];

  if (resolved.kind === 'with-description') {
    const { sections } = resolved;
    let sectionIndex = 0;
    while (sectionIndex < sections.length || pages.length === 0) {
      const pageSections: SectionLayout[] = [];
      for (let i = 0; i < config.layout.sectionsPerPage; i++) {
        if (sectionIndex >= sections.length) {
          pageSections.push(emptySection(config, i, true));
          continue;
        }
        const sec = sections[sectionIndex++];
        const originY =
          config.marginY + i * config.layout.rowsPerSection * config.charCellSizeMm;
        const descRow: DescriptionRow = {
          y: originY,
          width: config.gridWidth,
          height: config.charCellSizeMm,
          text: sec.description,
        };
        const charGroups: CharGroupLayout[] = [];
        for (let g = 0; g < 4; g++) {
          const ch = sec.characters[g] ?? null;
          charGroups.push(buildCharGroupWithDescription(config, g, ch, i));
        }
        pageSections.push({
          sectionIndex: i,
          originY,
          descriptionRow: descRow,
          practiceRows: buildPracticeRows(config, 5, i, true),
          charGroups,
        });
      }
      pages.push({ pageIndex: pages.length, sections: pageSections });
      if (sectionIndex >= sections.length) break;
    }
  } else {
    const flat = resolved.flatCharacters;
    const totalPages = Math.max(1, Math.ceil(flat.length / config.charsPerPage));
    let charIndex = 0;
    for (let p = 0; p < totalPages; p++) {
      const pageSections: SectionLayout[] = [];
      for (let s = 0; s < config.layout.sectionsPerPage; s++) {
        const charGroups: CharGroupLayout[] = [];
        for (let g = 0; g < 4; g++) {
          const ch = flat[charIndex++] ?? null;
          charGroups.push(buildCharGroupNoDescription(config, g, ch, s));
        }
        const originY =
          config.marginY + s * config.layout.rowsPerSection * config.charCellSizeMm;
        pageSections.push({
          sectionIndex: s,
          originY,
          descriptionRow: null,
          practiceRows: buildPracticeRows(config, 6, s, false),
          charGroups,
        });
      }
      pages.push({ pageIndex: p, sections: pageSections });
    }
  }

  return { pages };
}
