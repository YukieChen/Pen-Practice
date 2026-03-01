/**
 * Step 4: 字體選擇 — 預設/上傳、預覽、缺字警告 + 字格大小拉桿（06 §6.8）
 */
import type { FontSource } from '../types';

export function createFontSelector(
  fontSource: FontSource,
  customFileName: string | null,
  missingCharsList: string[],
  fontError: string | null,
  glyphScale: number,
  glyphOffsetX: number,
  glyphOffsetY: number,
  onGlyphScale: (value: number) => void,
  onGlyphOffsetX: (value: number) => void,
  onGlyphOffsetY: (value: number) => void,
  onSource: (source: FontSource) => void,
  onFile: (file: File | null) => void
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'section-block';
  const h2 = document.createElement('h2');
  h2.textContent = '字體';
  block.appendChild(h2);

  const options = document.createElement('div');
  options.className = 'font-options';

  const defaultOpt = document.createElement('div');
  defaultOpt.className = 'font-option' + (fontSource === 'default' ? ' selected' : '');
  defaultOpt.setAttribute('role', 'button');
  defaultOpt.setAttribute('tabindex', '0');
  const d1 = document.createElement('div');
  d1.textContent = '預設字體（內建書寫用楷體）';
  defaultOpt.appendChild(d1);
  const prevDefault = document.createElement('div');
  prevDefault.className = 'font-preview font-preview-default';
  prevDefault.textContent = '永';
  defaultOpt.appendChild(prevDefault);
  defaultOpt.addEventListener('click', () => onSource('default'));
  defaultOpt.addEventListener('keydown', (e) => e.key === 'Enter' && onSource('default'));
  options.appendChild(defaultOpt);

  const customOpt = document.createElement('div');
  customOpt.className = 'font-option' + (fontSource === 'custom' ? ' selected' : '');
  customOpt.setAttribute('role', 'button');
  customOpt.setAttribute('tabindex', '0');
  const c1 = document.createElement('div');
  c1.textContent = '上傳字體';
  c1.style.marginBottom = '8px';
  customOpt.appendChild(c1);
  const uploadZone = document.createElement('div');
  uploadZone.style.border = '2px dashed var(--color-border)';
  uploadZone.style.borderRadius = '6px';
  uploadZone.style.padding = '16px';
  uploadZone.style.marginTop = '12px';
  uploadZone.style.textAlign = 'center';
  uploadZone.style.color = 'var(--color-text-muted)';
  uploadZone.style.fontSize = '13px';
  uploadZone.textContent = customFileName || '拖曳或點擊上傳 .ttf / .otf';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.ttf,.otf,font/ttf,font/otf';
  fileInput.style.display = 'none';
  customOpt.appendChild(uploadZone);
  customOpt.appendChild(fileInput);
  uploadZone.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    onFile(f || null);
  });
  customOpt.addEventListener('click', (e) => { if (e.target !== uploadZone && e.target !== fileInput) onSource('custom'); });
  customOpt.addEventListener('keydown', (e) => e.key === 'Enter' && onSource('custom'));
  options.appendChild(customOpt);

  block.appendChild(options);

  if (fontError) {
    const err = document.createElement('div');
    err.className = 'font-warning';
    err.style.border = '1px solid var(--color-error)';
    err.style.background = 'var(--color-error-bg)';
    err.textContent = `⚠ ${fontError}`;
    block.appendChild(err);
  }
  if (missingCharsList.length > 0) {
    const warn = document.createElement('div');
    warn.className = 'font-warning';
    warn.textContent = `⚠ 此字體缺少以下字元: 「${missingCharsList.slice(0, 10).join('」「')}」${missingCharsList.length > 10 ? ' ...' : ''}，字帖中將顯示為空白格`;
    block.appendChild(warn);
  }

  // 字格大小拉桿：全局控制 glyph 縮放
  const scaleBlock = document.createElement('div');
  scaleBlock.className = 'font-scale-control';
  scaleBlock.style.marginTop = '16px';

  const scaleLabel = document.createElement('div');
  scaleLabel.textContent = '字在格子中的大小';
  scaleLabel.style.marginBottom = '4px';
  scaleBlock.appendChild(scaleLabel);

  const scaleRow = document.createElement('div');
  scaleRow.style.display = 'flex';
  scaleRow.style.alignItems = 'center';
  scaleRow.style.gap = '8px';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0.5';
  slider.max = '1.5';
  slider.step = '0.05';
  slider.value = glyphScale.toString();
  slider.style.flex = '1';
  slider.setAttribute('aria-label', '字格縮放');

  const valueLabel = document.createElement('span');
  valueLabel.style.minWidth = '44px';
  valueLabel.style.textAlign = 'right';
  const percent = Math.round(glyphScale * 100);
  valueLabel.textContent = `${percent}%`;

  slider.addEventListener('input', () => {
    const v = Number.parseFloat(slider.value);
    if (!Number.isFinite(v)) return;
    onGlyphScale(v);
    const p = Math.round(v * 100);
    valueLabel.textContent = `${p}%`;
  });

  scaleRow.appendChild(slider);
  scaleRow.appendChild(valueLabel);
  scaleBlock.appendChild(scaleRow);

  block.appendChild(scaleBlock);

  // 位置拉桿：全局 X/Y 微調
  const offsetBlock = document.createElement('div');
  offsetBlock.className = 'font-offset-control';
  offsetBlock.style.marginTop = '12px';

  const offsetLabel = document.createElement('div');
  offsetLabel.textContent = '字在格子中的位置';
  offsetLabel.style.marginBottom = '4px';
  offsetBlock.appendChild(offsetLabel);

  const makeOffsetRow = (
    title: string,
    initial: number,
    min: string,
    max: string,
    onChange: (v: number) => void
  ): HTMLElement => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.marginTop = '4px';

    const label = document.createElement('span');
    label.textContent = title;
    label.style.minWidth = '32px';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = '0.05';
    slider.value = initial.toString();
    slider.style.flex = '1';

    const value = document.createElement('span');
    value.style.minWidth = '52px';
    value.style.textAlign = 'right';
    value.textContent = `${initial.toFixed(2)}mm`;

    slider.addEventListener('input', () => {
      const v = Number.parseFloat(slider.value);
      if (!Number.isFinite(v)) return;
      onChange(v);
      value.textContent = `${v.toFixed(2)}mm`;
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(value);
    return row;
  };

  offsetBlock.appendChild(
    makeOffsetRow('左右', glyphOffsetX, '-5.00', '5.00', onGlyphOffsetX)
  );
  offsetBlock.appendChild(
    makeOffsetRow('上下', glyphOffsetY, '-5.00', '5.00', onGlyphOffsetY)
  );

  block.appendChild(offsetBlock);

  return block;
}

export function updateFontSelector(
  root: HTMLElement,
  fontSource: FontSource,
  customFileName: string | null
): void {
  root.querySelectorAll('.font-option').forEach((el, i) => {
    el.classList.toggle('selected', (i === 0 && fontSource === 'default') || (i === 1 && fontSource === 'custom'));
  });
  const zone = root.querySelector('.font-option:nth-child(2) div[style*="dashed"]');
  if (zone && zone.textContent !== null) zone.textContent = customFileName || '拖曳或點擊上傳 .ttf / .otf';
}
