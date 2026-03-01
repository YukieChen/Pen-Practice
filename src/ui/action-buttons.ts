/**
 * 動作區 — 產生 PDF、下載設定檔、progress、錯誤（06 §6.9–6.10）
 */
export function createActionButtons(
  isReady: boolean,
  isGenerating: boolean,
  progress: number,
  error: string | null,
  onGenerate: () => void,
  onDownloadConfig: () => void
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'section-block';

  const row = document.createElement('div');
  row.className = 'action-row';

  const btnPdf = document.createElement('button');
  btnPdf.type = 'button';
  btnPdf.className = 'btn-primary';
  btnPdf.textContent = isGenerating ? `產生中... ${progress}%` : '產生字帖 PDF';
  btnPdf.disabled = !isReady || isGenerating;
  if (!isReady) btnPdf.title = '請先輸入至少一個中文字';
  btnPdf.addEventListener('click', onGenerate);
  row.appendChild(btnPdf);

  const btnConfig = document.createElement('button');
  btnConfig.type = 'button';
  btnConfig.className = 'btn-secondary';
  btnConfig.textContent = '下載設定檔';
  btnConfig.disabled = !isReady || isGenerating;
  btnConfig.addEventListener('click', onDownloadConfig);
  row.appendChild(btnConfig);

  block.appendChild(row);

  if (isGenerating) {
    const prog = document.createElement('div');
    prog.className = 'progress-bar';
    prog.setAttribute('role', 'progressbar');
    prog.setAttribute('aria-valuenow', String(progress));
    prog.setAttribute('aria-valuemin', '0');
    prog.setAttribute('aria-valuemax', '100');
    const fill = document.createElement('span');
    fill.style.display = 'block';
    fill.style.height = '100%';
    fill.style.width = `${progress}%`;
    fill.style.background = 'var(--color-primary)';
    fill.style.transition = 'width 0.2s';
    prog.appendChild(fill);
    block.appendChild(prog);
  }

  if (error) {
    const err = document.createElement('div');
    err.className = 'error-message';
    err.textContent = error;
    block.appendChild(err);
  }

  return block;
}

export function updateActionButtons(
  root: HTMLElement,
  isReady: boolean,
  isGenerating: boolean,
  progress: number,
  error: string | null,
  _onGenerate: () => void,
  _onDownloadConfig: () => void
): void {
  const btnPdf = root.querySelector('.btn-primary');
  const btnConfig = root.querySelector('.btn-secondary');
  if (btnPdf instanceof HTMLButtonElement) {
    btnPdf.textContent = isGenerating ? `產生中... ${progress}%` : '產生字帖 PDF';
    btnPdf.disabled = !isReady || isGenerating;
    btnPdf.title = !isReady ? '請先輸入至少一個中文字' : '';
  }
  if (btnConfig instanceof HTMLButtonElement) {
    btnConfig.disabled = !isReady || isGenerating;
  }
  let prog = root.querySelector('.progress-bar');
  if (isGenerating && !prog) {
    prog = document.createElement('div');
    prog.className = 'progress-bar';
    const fill = document.createElement('span');
    fill.style.display = 'block';
    fill.style.height = '100%';
    fill.style.background = 'var(--color-primary)';
    fill.style.transition = 'width 0.2s';
    prog.appendChild(fill);
    root.appendChild(prog);
  }
  if (prog && isGenerating) {
    const fill = prog.querySelector('span');
    if (fill instanceof HTMLElement) fill.style.width = `${progress}%`;
  } else if (prog && !isGenerating) {
    prog.remove();
  }
  let errEl = root.querySelector('.error-message');
  if (error && !errEl) {
    errEl = document.createElement('div');
    errEl.className = 'error-message';
    root.appendChild(errEl);
  }
  if (errEl) {
    errEl.textContent = error;
    errEl.classList.toggle('hidden', !error);
  }
}
