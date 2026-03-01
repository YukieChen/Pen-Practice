/**
 * E2E S1: 無說明列 + 手動輸入 + 產生 → 下載 1 頁 PDF（06 §7.1）
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('鋼筆字字帖產生器');
});

test('S1: 載入後 Step1 為無說明、Step2 為手動', async ({ page }) => {
  const firstCard = page.locator('.mode-card').first();
  await expect(firstCard).toHaveClass(/selected/);
  await expect(firstCard.locator('.mode-name')).toHaveText('不需要說明列');

  const manualTab = page.getByRole('button', { name: '手動輸入' });
  await expect(manualTab).toHaveClass(/selected/);
});

test('S1: 輸入 8 字後產生按鈕可點、點擊後有 progress 並觸發下載', async ({ page }) => {
  const sectionList = page.locator('.section-list');
  await expect(sectionList).toBeVisible();

  const firstCharInput = page.locator('.section-item').first().locator('input[placeholder*="寅宙"]');
  await firstCharInput.fill('甲乙丙丁戊己庚辛');

  const generateBtn = page.getByRole('button', { name: /產生字帖 PDF/ });
  await expect(generateBtn).toBeEnabled();

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await generateBtn.click();

  await expect(page.locator('.progress-bar')).toBeVisible({ timeout: 5000 });

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/鋼筆字帖_.*\.pdf$/);
  const path = await download.path();
  expect(path).toBeTruthy();
});

test('S1: 空白輸入時產生與下載設定檔按鈕皆禁用', async ({ page }) => {
  const sectionInputs = page.locator('.section-item input[placeholder*="寅宙"]');
  const count = await sectionInputs.count();
  for (let i = 0; i < count; i++) {
    await sectionInputs.nth(i).fill('');
  }
  const generateBtn = page.getByRole('button', { name: /產生字帖 PDF/ });
  const configBtn = page.getByRole('button', { name: '下載設定檔' });
  await expect(generateBtn).toBeDisabled();
  await expect(configBtn).toBeDisabled();
});
