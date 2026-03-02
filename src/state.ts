/**
 * 狀態管理 — 初始狀態與 computed，對齊 06 §2.8
 */
import type { AppState } from './types';
import { pageCount, totalChars, effectiveChars, isReady } from './domain/layout';
import { appConfig } from './config';

export function createInitialState(): AppState {
  return {
    mode: 'no-description',
    contentSource: 'manual',
    sections: [
      { description: '', characters: '' },
      { description: '', characters: '' },
      { description: '', characters: '' },
      { description: '', characters: '' },
    ],
    fontSource: 'default',
    customFontFile: null,
    parsedFont: null,
    missingChars: new Map(),
    // 初始縮放與 config.rendering.glyphScaleUp 一致
    glyphScale: appConfig.rendering.glyphScaleUp,
    glyphOffsetX: appConfig.rendering.glyphOffsetXMm,
    glyphOffsetY: appConfig.rendering.glyphOffsetYMm,
    fineGridOpacity: appConfig.rendering.fineGridOpacity,
    printFontName: false,
    isGenerating: false,
    progress: 0,
    error: null,
  };
}

export function getPageCount(state: AppState): number {
  return pageCount(state, appConfig);
}

export { totalChars, effectiveChars, isReady };
