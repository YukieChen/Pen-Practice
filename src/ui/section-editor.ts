/**
 * Step 3: 段落編輯 — accordion、說明/練習字、統計、新增/移除（06 §6.5–6.7）
 * 所有顯示文字以 textContent/createTextNode 渲染
 */
import type { SectionInput } from '../types';
import { filterCjk, MAX_CHARS_PER_SECTION } from '../utils/validators';

/** 回傳單一段落的統計文字（供僅更新統計、不重繪列表時使用） */
export function getSectionStatsText(
  sec: SectionInput,
  mode: 'no-description' | 'with-description'
): string {
  const raw = sec.characters ?? '';
  const count = filterCjk(raw).length;
  let statsMsg = `共 ${count} 字`;
  if (count > 4) statsMsg += mode === 'with-description' ? ' │ 有說明: 隨機挑 4 字' : ' │ 無說明: 全部印出';
  if (count > MAX_CHARS_PER_SECTION) statsMsg += ' │ 已截斷至 64 字';
  return statsMsg;
}

export function createSectionEditor(
  sections: SectionInput[],
  mode: 'no-description' | 'with-description',
  statsText: string,
  onSectionsChange: (sections: SectionInput[]) => void,
  onAdd: () => void,
  onRemove: (index: number) => void
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'section-block';
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  const h2 = document.createElement('h2');
  h2.textContent = '段落內容';
  h2.style.margin = '0';
  header.appendChild(h2);
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-icon';
  addBtn.textContent = '+ 新增段落';
  addBtn.addEventListener('click', onAdd);
  header.appendChild(addBtn);
  block.appendChild(header);

  const list = document.createElement('div');
  list.className = 'section-list';
  sections.forEach((sec, index) => {
    list.appendChild(createSectionItem(sec, index, mode, sections.length, onRemove, (i, next) => {
      const copy = sections.slice();
      copy[i] = next;
      onSectionsChange(copy);
    }));
  });
  block.appendChild(list);

  const stats = document.createElement('div');
  stats.className = 'global-stats';
  stats.textContent = statsText;
  block.appendChild(stats);

  return block;
}

function createSectionItem(
  sec: SectionInput,
  index: number,
  mode: 'no-description' | 'with-description',
  totalSections: number,
  onRemove: (index: number) => void,
  onUpdate: (index: number, next: SectionInput) => void
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'section-item';

  const header = document.createElement('header');
  const title = document.createElement('span');
  title.className = 'section-title';
  title.textContent = `第 ${index + 1} 段`;
  header.appendChild(title);
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-icon';
  removeBtn.textContent = '✕ 移除';
  removeBtn.disabled = totalSections <= 1;
  removeBtn.addEventListener('click', () => onRemove(index));
  header.appendChild(removeBtn);
  item.appendChild(header);

  if (mode === 'with-description') {
    const descRow = document.createElement('div');
    descRow.className = 'field-row with-desc-only';
    const descLabel = document.createElement('label');
    descLabel.textContent = '說明';
    descRow.appendChild(descLabel);
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = '書法結構說明（選填）';
    descInput.value = sec.description ?? '';
    descInput.maxLength = 50;
    descInput.addEventListener('input', () => onUpdate(index, { ...sec, description: descInput.value }));
    descRow.appendChild(descInput);
    item.appendChild(descRow);
  }

  const charRow = document.createElement('div');
  charRow.className = 'field-row';
  const charLabel = document.createElement('label');
  charLabel.textContent = '練習字';
  charRow.appendChild(charLabel);
  const charInput = document.createElement('input');
  charInput.type = 'text';
  charInput.placeholder = '輸入中文字，如：寅宙守宿';
  const charsRaw = sec.characters ?? '';
  const filtered = filterCjk(charsRaw);
  if (filtered.length > MAX_CHARS_PER_SECTION) {
    charInput.value = filtered.slice(0, MAX_CHARS_PER_SECTION);
  } else {
    charInput.value = charsRaw;
  }
  charInput.addEventListener('input', () => {
    const raw = charInput.value;
    const filtered = filterCjk(raw);
    const truncated = filtered.slice(0, MAX_CHARS_PER_SECTION);
    if (truncated.length < filtered.length) charInput.value = truncated;
    onUpdate(index, { ...sec, characters: charInput.value });
  });
  charRow.appendChild(charInput);
  item.appendChild(charRow);

  const stats = document.createElement('div');
  stats.className = 'section-stats';
  stats.textContent = getSectionStatsText(sec, mode);
  item.appendChild(stats);

  return item;
}

export function renderSectionList(
  listEl: HTMLElement,
  sections: SectionInput[],
  mode: 'no-description' | 'with-description',
  onRemove: (index: number) => void,
  onUpdate: (index: number, next: SectionInput) => void,
  _onSectionsChange: (sections: SectionInput[]) => void
): void {
  listEl.innerHTML = '';
  sections.forEach((sec, index) => {
    listEl.appendChild(createSectionItem(sec, index, mode, sections.length, onRemove, onUpdate));
  });
}

export function setGlobalStats(el: HTMLElement, text: string): void {
  el.textContent = text;
}
