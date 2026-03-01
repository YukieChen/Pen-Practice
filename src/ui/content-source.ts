/**
 * Step 2: 內容來源 — 手動/上傳/預設、上傳區、預設按鈕群組（06 §6.2–6.4）
 */
import type { ContentSource } from '../types';
import { getPresetBatches } from '../data/presets';

export function createContentSource(
  current: ContentSource,
  selectedPresetIndex: number | null,
  uploadError: string | null,
  onTab: (source: ContentSource) => void,
  onPreset: (index: number) => void,
  onFile: (file: File) => void
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'section-block';
  const h2 = document.createElement('h2');
  h2.textContent = '練習內容';
  block.appendChild(h2);

  const tabs = document.createElement('div');
  tabs.className = 'content-tabs';
  ['manual', 'upload', 'preset'].forEach((src) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'content-tab' + (current === src ? ' selected' : '');
    const labels: Record<string, string> = { manual: '手動輸入', upload: '上傳設定檔', preset: '系統預設' };
    tab.textContent = labels[src];
    tab.addEventListener('click', () => onTab(src as ContentSource));
    tabs.appendChild(tab);
  });
  block.appendChild(tabs);

  const uploadZone = document.createElement('div');
  uploadZone.className = 'upload-zone' + (uploadError ? ' error' : '');
  uploadZone.setAttribute('role', 'button');
  uploadZone.setAttribute('tabindex', '0');
  uploadZone.textContent = uploadError || '拖曳或點擊上傳 JSON 設定檔（5MB 以內）';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  uploadZone.appendChild(input);
  uploadZone.addEventListener('click', () => input.click());
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  });
  input.addEventListener('change', () => { const f = input.files?.[0]; if (f) onFile(f); });
  block.appendChild(uploadZone);

  const presetLabel = document.createElement('p');
  presetLabel.textContent = '系統預設：黃自元間架結構九十二法';
  presetLabel.style.marginBottom = '12px';
  presetLabel.style.color = 'var(--color-text-muted)';
  block.appendChild(presetLabel);

  const presetGrid = document.createElement('div');
  presetGrid.className = 'preset-buttons';
  const batches = getPresetBatches();
  batches.forEach((batch, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn' + (selectedPresetIndex === index ? ' selected' : '');
    const label = document.createElement('div');
    label.className = 'preset-label';
    label.textContent = batch.label;
    const pages = document.createElement('div');
    pages.className = 'preset-pages';
    pages.textContent = `${batch.sectionCount} 段 · ${batch.pageCount} 頁`;
    btn.appendChild(label);
    btn.appendChild(pages);
    btn.addEventListener('click', () => onPreset(index));
    presetGrid.appendChild(btn);
  });
  block.appendChild(presetGrid);

  return block;
}

export function updateContentSource(
  root: HTMLElement,
  current: ContentSource,
  selectedPresetIndex: number | null,
  uploadError: string | null
): void {
  root.querySelectorAll('.content-tab').forEach((tab, i) => {
    const src = ['manual', 'upload', 'preset'][i];
    tab.classList.toggle('selected', current === src);
  });
  const zone = root.querySelector('.upload-zone');
  if (zone) {
    zone.classList.toggle('error', !!uploadError);
    const input = zone.querySelector('input');
    if (input) {
      zone.replaceChildren(input);
      zone.appendChild(document.createTextNode(uploadError || '拖曳或點擊上傳 JSON 設定檔（5MB 以內）'));
    } else {
      zone.textContent = uploadError || '拖曳或點擊上傳 JSON 設定檔（5MB 以內）';
    }
  }
  root.querySelectorAll('.preset-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', selectedPresetIndex === i);
  });
}
