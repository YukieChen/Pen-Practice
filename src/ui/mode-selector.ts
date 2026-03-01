/**
 * Step 2: 模式選擇 — 兩張卡片、綁定 mode（06 §6.1）
 * 放在「練習內容」下方，選系統預設後可立即改說明列與否
 */
import type { ContentMode } from '../types';

export function createModeSelector(
  current: ContentMode,
  onSelect: (mode: ContentMode) => void
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'section-block';
  const h2 = document.createElement('h2');
  h2.textContent = '字帖格式';
  block.appendChild(h2);

  const cards = document.createElement('div');
  cards.className = 'mode-cards';

  const noDesc = document.createElement('div');
  noDesc.className = 'mode-card' + (current === 'no-description' ? ' selected' : '');
  noDesc.setAttribute('role', 'button');
  noDesc.setAttribute('tabindex', '0');
  const p1 = document.createElement('div');
  p1.className = 'mode-preview';
  noDesc.appendChild(p1);
  const n1 = document.createElement('div');
  n1.className = 'mode-name';
  n1.textContent = '不需要說明列';
  noDesc.appendChild(n1);
  const h1 = document.createElement('div');
  h1.className = 'mode-hint';
  h1.textContent = '每段僅練習字，每頁 16 字';
  noDesc.appendChild(h1);
  noDesc.addEventListener('click', () => onSelect('no-description'));
  noDesc.addEventListener('keydown', (e) => e.key === 'Enter' && onSelect('no-description'));
  cards.appendChild(noDesc);

  const withDesc = document.createElement('div');
  withDesc.className = 'mode-card' + (current === 'with-description' ? ' selected' : '');
  withDesc.setAttribute('role', 'button');
  withDesc.setAttribute('tabindex', '0');
  const p2 = document.createElement('div');
  p2.className = 'mode-preview';
  withDesc.appendChild(p2);
  const n2 = document.createElement('div');
  n2.className = 'mode-name';
  n2.textContent = '需要說明列';
  withDesc.appendChild(n2);
  const h2h = document.createElement('div');
  h2h.className = 'mode-hint';
  h2h.textContent = '每段可加說明，每頁 4 段';
  withDesc.appendChild(h2h);
  withDesc.addEventListener('click', () => onSelect('with-description'));
  withDesc.addEventListener('keydown', (e) => e.key === 'Enter' && onSelect('with-description'));
  cards.appendChild(withDesc);

  block.appendChild(cards);
  return block;
}

export function updateModeSelectorCards(
  root: HTMLElement,
  current: ContentMode
): void {
  const cards = root.querySelectorAll('.mode-card');
  cards[0]?.classList.toggle('selected', current === 'no-description');
  cards[1]?.classList.toggle('selected', current === 'with-description');
}
