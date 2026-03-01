/**
 * 應用 UI 組裝 — 狀態、Step1–4、動作區，對齊 06 §6
 * 所有使用者/設定檔文字以 textContent 渲染，無 innerHTML
 */
import type { AppState } from '../types';
import { createInitialState, getPageCount, totalChars, isReady } from '../state';
import { appConfig } from '../config';
import { parseConfig, configToSectionInputs, exportConfigBlob, loadPresetBatch } from '../engine/config-manager';
import { MAX_JSON_BYTES, MAX_FONT_BYTES } from '../utils/validators';
import { calculateGridLayout } from '../engine/grid-engine';
import { prepareGlyphs, renderGlyph, renderGlyphInBox } from '../engine/glyph-renderer';
import { loadDefaultFont, loadCustomFont, loadFallbackFont, checkFontCoverage } from '../engine/font-manager';
import { generatePDF, generateGridOnlyPdf } from '../engine/pdf-engine';
import { createModeSelector, updateModeSelectorCards } from './mode-selector';
import { createContentSource, updateContentSource } from './content-source';
import { createSectionEditor, renderSectionList, setGlobalStats, getSectionStatsText } from './section-editor';
import { createFontSelector, updateFontSelector } from './font-selector';
import { createActionButtons, updateActionButtons } from './action-buttons';
import { sectionChars } from '../domain/layout';

let state: AppState = createInitialState();
let selectedPresetIndex: number | null = null;
let uploadError: string | null = null;
let defaultFont: import('../types').OpenTypeFont | null = null;
let fallbackFontPromise: Promise<import('../types').OpenTypeFont | null> | null = null;

function getStatsText(): string {
  const total = totalChars(state);
  const pages = getPageCount(state);
  const modeLabel = state.mode === 'with-description' ? '有說明' : '無說明';
  return `共 ${state.sections.length} 段, ${total} 字 │ ${modeLabel}: ${pages} 頁`;
}

function refreshUi(): void {
  document.body.classList.toggle('mode-with-description', state.mode === 'with-description');
  const app = document.getElementById('app');
  if (!app) return;

  const modeBlock = app.querySelector('[data-step="mode"]');
  if (modeBlock) updateModeSelectorCards(modeBlock as HTMLElement, state.mode);

  const contentBlock = app.querySelector('[data-step="content"]');
  if (contentBlock) updateContentSource(contentBlock as HTMLElement, state.contentSource, selectedPresetIndex, uploadError);

  const sectionBlock = app.querySelector('[data-step="sections"]');
  if (sectionBlock) {
    const list = sectionBlock.querySelector('.section-list');
    const statsEl = sectionBlock.querySelector('.global-stats');
    if (list) {
      renderSectionList(
        list as HTMLElement,
        state.sections,
        state.mode,
        (index) => {
          if (state.sections.length <= 1) return;
          state.sections = state.sections.filter((_, i) => i !== index);
          refreshUi();
        },
        (index, next) => {
          state.sections = state.sections.slice();
          state.sections[index] = next;
          // 僅更新統計 DOM，不重繪列表，避免輸入框每輸入一字就失去焦點
          if (statsEl) setGlobalStats(statsEl as HTMLElement, getStatsText());
          const item = (list as HTMLElement).children[index];
          if (item) {
            const sectionStats = item.querySelector('.section-stats');
            if (sectionStats) sectionStats.textContent = getSectionStatsText(next, state.mode);
          }
          // 更新產生字帖按鈕的 enabled 狀態（不重繪整個 section 列表）
          const actionBlock = app.querySelector('[data-step="action"]');
          if (actionBlock) {
            updateActionButtons(
              actionBlock as HTMLElement,
              isReady(state),
              state.isGenerating,
              state.progress,
              state.error,
              handleGenerate,
              handleDownloadConfig
            );
          }
        },
        (next) => {
          state.sections = next;
          refreshUi();
        }
      );
    }
    if (statsEl) setGlobalStats(statsEl as HTMLElement, getStatsText());
  }

  const fontBlock = app.querySelector('[data-step="font"]');
  if (fontBlock) updateFontSelector(fontBlock as HTMLElement, state.fontSource, state.customFontFile?.name ?? null);

  const actionBlock = app.querySelector('[data-step="action"]');
  if (actionBlock) {
    updateActionButtons(
      actionBlock as HTMLElement,
      isReady(state),
      state.isGenerating,
      state.progress,
      state.error,
      handleGenerate,
      handleDownloadConfig
    );
  }
}

function handleGenerate(): void {
  if (!isReady(state) || state.isGenerating) return;
  state.isGenerating = true;
  state.error = null;
  state.progress = 0;
  refreshUi();

  (async () => {
    try {
      // 使用者在 UI 拉桿上調整的 glyphScale 只影響字形大小
      const runtimeConfig: import('../config').AppConfig = {
        ...appConfig,
        rendering: {
          ...appConfig.rendering,
          glyphScaleUp: state.glyphScale,
          glyphOffsetXMm: state.glyphOffsetX,
          glyphOffsetYMm: state.glyphOffsetY,
        },
      };

      const layout = calculateGridLayout(state, runtimeConfig);
      const allChars = new Set<string>();
      for (const page of layout.pages) {
        for (const sec of page.sections) {
          // 練習字
          for (const g of sec.charGroups) {
            if (g.character) allChars.add(g.character);
          }
          // 說明列文字
          if (sec.descriptionRow && sec.descriptionRow.text) {
            for (const ch of Array.from(sec.descriptionRow.text)) {
              allChars.add(ch);
            }
          }
        }
      }
      const charArray = Array.from(allChars);

      if (charArray.length === 0) {
        state.error = '版面配置中沒有任何可繪製的字元（layout 無 character）。';
        const bytes = await generateGridOnlyPdf(layout, runtimeConfig);
        const name = `鋼筆字帖_${new Date().toISOString().slice(0, 10)}_${new Date()
          .toTimeString()
          .slice(0, 8)
          .replace(/:/g, '')}.pdf`;
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 100);
        return;
      }

      let font =
        state.fontSource === 'custom' && state.parsedFont
          ? state.parsedFont
          : defaultFont;
      if (!font) {
        try {
          defaultFont = await loadDefaultFont('/fonts/default-kai.ttf');
          font = defaultFont;
        } catch {
          state.error = '無法載入預設字體，僅產生格線 PDF';
        }
      }

      const pathsPerPage: import('../types').ScaledPath[][] = layout.pages.map(() => []);
      if (font) {
        if (!fallbackFontPromise) fallbackFontPromise = loadFallbackFont();
        const fallback = await fallbackFontPromise;
        const cache = prepareGlyphs(font, charArray, fallback ?? undefined);
        if (cache.size === 0) {
          state.error = '字體已載入，但無任何 glyph path（cache 為空）。可能是不支援的字體格式。';
        }
        let done = 0;
        const totalCells = layout.pages.reduce(
          (sum, p) =>
            sum +
            p.sections.reduce(
              (s, sec) =>
                s +
                sec.charGroups.reduce((c, g) => c + g.cells.length, 0) +
                (sec.descriptionRow && sec.descriptionRow.text
                  ? Array.from(sec.descriptionRow.text).length
                  : 0),
              0
            ),
          0
        );
        const DESCRIPTION_OPACITY = 0.8;
        for (let pi = 0; pi < layout.pages.length; pi++) {
          for (const sec of layout.pages[pi].sections) {
            // 說明列文字先繪（Layer 4），再繪練習字（Layer 5/6）
            if (sec.descriptionRow && sec.descriptionRow.text) {
              const text = Array.from(sec.descriptionRow.text);
              if (text.length > 0) {
                const leftPaddingMm = 2;
                const rightPaddingMm = 2;
                const rowWidth = sec.descriptionRow.width;
                const boxHeight = sec.descriptionRow.height;
                const availableWidth = Math.max(
                  rowWidth - leftPaddingMm - rightPaddingMm,
                  0
                );
                const charBoxWidth =
                  text.length > 0 ? availableWidth / text.length : 0;
                for (let idx = 0; idx < text.length; idx++) {
                  const ch = text[idx];
                  const boxX =
                    appConfig.marginX + leftPaddingMm + charBoxWidth * idx;
                  const boxY = sec.descriptionRow.y;
                  const sp = renderGlyphInBox(
                    cache,
                    ch,
                    { x: boxX, y: boxY, width: charBoxWidth, height: boxHeight },
                    runtimeConfig,
                    DESCRIPTION_OPACITY
                  );
                  if (sp) pathsPerPage[pi].push(sp);
                  done++;
                  if (done % 50 === 0) {
                    state.progress = Math.round((done / totalCells) * 100);
                    refreshUi();
                  }
                }
              }
            }
            // 描寫 / 臨摹格字形
            for (const group of sec.charGroups) {
              if (!group.character) continue;
              for (const cell of group.cells) {
                const sp = renderGlyph(cache, group.character, cell, runtimeConfig);
                if (sp) pathsPerPage[pi].push(sp);
                done++;
                if (done % 50 === 0) {
                  state.progress = Math.round((done / totalCells) * 100);
                  refreshUi();
                }
              }
            }
          }
        }
      }
      state.progress = 100;
      refreshUi();

      const totalPaths = pathsPerPage.reduce((sum, pagePaths) => sum + pagePaths.length, 0);
      const useGlyphPdf = font && totalPaths > 0;

      if (!useGlyphPdf && !state.error) {
        state.error = '無任何 glyph 被繪製（pathsPerPage 為空），已 fallback 為僅格線 PDF。';
      }

      const bytes = useGlyphPdf
        ? await generatePDF(layout, pathsPerPage, runtimeConfig)
        : await generateGridOnlyPdf(layout, runtimeConfig);

      const name = `鋼筆字帖_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.pdf`;
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 100);
    } catch (e) {
      state.error = e instanceof Error ? e.message : '產生 PDF 時發生錯誤';
    } finally {
      state.isGenerating = false;
      state.progress = 0;
      refreshUi();
    }
  })();
}

function handleDownloadConfig(): void {
  if (!isReady(state)) return;
  const blob = exportConfigBlob(state.sections);
  const name = `字帖設定_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 100);
}

function mount(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';
  const main = document.createElement('div');
  main.className = 'main-content';

  const modeBlock = createModeSelector(state.mode, (mode) => {
    state.mode = mode;
    refreshUi();
  });
  modeBlock.setAttribute('data-step', 'mode');
  main.appendChild(modeBlock);

  const contentBlock = createContentSource(
    state.contentSource,
    selectedPresetIndex,
    uploadError,
    (source) => {
      state.contentSource = source;
      refreshUi();
    },
    (index) => {
      selectedPresetIndex = index;
      const config = loadPresetBatch(index === 6 ? 'all' : index);
      state.sections = configToSectionInputs(config);
      state.contentSource = 'preset';
      // 預設內容若有段落說明，自動切換為「需要說明列」以印出規則說明（附圖一）
      if (config.sections.some((s) => (s.description || '').trim() !== '')) {
        state.mode = 'with-description';
      }
      refreshUi();
    },
    async (file: File) => {
      uploadError = null;
      if (file.size > MAX_JSON_BYTES) {
        uploadError = '設定檔超過 5MB';
        refreshUi();
        return;
      }
      const text = await file.text();
      const result = parseConfig(text);
      if (!result.ok) {
        uploadError = result.error;
        refreshUi();
        return;
      }
      state.sections = configToSectionInputs(result.data);
      state.contentSource = 'upload';
      refreshUi();
    }
  );
  contentBlock.setAttribute('data-step', 'content');
  main.appendChild(contentBlock);

  const sectionBlock = createSectionEditor(
    state.sections,
    state.mode,
    getStatsText(),
    (next) => {
      state.sections = next;
      refreshUi();
    },
    () => {
      if (state.sections.length >= 200) {
        alert('最多 200 段');
        return;
      }
      state.sections = state.sections.concat([{ description: '', characters: '' }]);
      refreshUi();
    },
    (index) => {
      if (state.sections.length <= 1) return;
      state.sections = state.sections.filter((_, i) => i !== index);
      refreshUi();
    }
  );
  sectionBlock.setAttribute('data-step', 'sections');
  main.appendChild(sectionBlock);

  const allCharsForFont = () => state.sections.flatMap((s) => sectionChars(s));
  const fontBlock = createFontSelector(
    state.fontSource,
    state.customFontFile?.name ?? null,
    Array.from(state.missingChars.values()).flat(),
    state.error && state.isGenerating ? null : state.error,
    state.glyphScale,
    state.glyphOffsetX,
    state.glyphOffsetY,
    (value) => {
      // 全局 glyph 縮放，僅影響之後產生的 PDF
      state.glyphScale = value;
    },
    (value) => {
      state.glyphOffsetX = value;
    },
    (value) => {
      state.glyphOffsetY = value;
    },
    (source) => {
      state.fontSource = source;
      if (source === 'default') {
        state.customFontFile = null;
        state.parsedFont = null;
        state.missingChars = new Map();
        state.error = null;
      }
      refreshUi();
    },
    async (file: File | null) => {
      state.customFontFile = file;
      state.parsedFont = null;
      state.missingChars = new Map();
      state.error = null;
      if (!file) {
        refreshUi();
        return;
      }
      if (file.size > MAX_FONT_BYTES) {
        state.error = '字體檔案大小超過 20MB 限制，請選擇較小的字體檔';
        state.customFontFile = null;
        refreshUi();
        return;
      }
      state.fontSource = 'custom';
      try {
        state.parsedFont = await loadCustomFont(file);
        const chars = allCharsForFont();
        const missing = checkFontCoverage(state.parsedFont, chars);
        if (missing.length > 0) {
          state.sections.forEach((_, i) => {
            const secChars = sectionChars(state.sections[i]);
            const m = secChars.filter((c) => missing.includes(c));
            if (m.length) state.missingChars.set(i, m);
          });
        }
      } catch (e) {
        state.error = e instanceof Error ? e.message : '無法解析字體檔案';
      }
      refreshUi();
    }
  );
  fontBlock.setAttribute('data-step', 'font');
  main.appendChild(fontBlock);

  const actionBlock = createActionButtons(
    isReady(state),
    state.isGenerating,
    state.progress,
    state.error,
    handleGenerate,
    handleDownloadConfig
  );
  actionBlock.setAttribute('data-step', 'action');
  main.appendChild(actionBlock);

  app.appendChild(main);
  document.body.classList.toggle('mode-with-description', state.mode === 'with-description');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
