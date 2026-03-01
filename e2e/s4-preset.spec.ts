/**
 * E2E S4: 選擇預設批次/全部 → 統計與產生正確（06 §7.4）
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('S4: 點選系統預設 Tab 後可見 7 個預設按鈕', async ({ page }) => {
  await page.getByRole('button', { name: '系統預設' }).click();
  const presetBtns = page.locator('.preset-btn');
  await expect(presetBtns).toHaveCount(7);
});

test('S4: 點選「全部 92 法」後統計列顯示 92 段與頁數', async ({ page }) => {
  await page.getByRole('button', { name: '系統預設' }).click();
  await page.locator('.preset-btn').filter({ hasText: '全部 92 法' }).click();

  const stats = page.locator('.global-stats');
  await expect(stats).toContainText('92 段');
  await expect(stats).toContainText('頁');
});
