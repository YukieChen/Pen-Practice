/**
 * E2E S2: 有說明列 + 多段多字 + 頁數與說明列正確（06 §7.2）
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('S2: 切換為有說明列後，段落出現說明欄', async ({ page }) => {
  const withDescCard = page.locator('.mode-card').nth(1);
  await withDescCard.click();

  await expect(page.locator('body')).toHaveClass(/mode-with-description/);
  const firstSection = page.locator('.section-item').first();
  await expect(firstSection.locator('input[placeholder*="書法結構說明"]')).toBeVisible();
  await expect(firstSection.locator('input[placeholder*="寅宙"]')).toBeVisible();
});

test('S2: 多段多字時全局統計顯示段數與頁數', async ({ page }) => {
  await page.locator('.mode-card').nth(1).click();

  const firstDesc = page.locator('.section-item').first().locator('input[placeholder*="說明"]');
  const firstChars = page.locator('.section-item').first().locator('input[placeholder*="寅宙"]');
  await firstDesc.fill('天覆');
  await firstChars.fill('天地玄黃');

  const stats = page.locator('.global-stats');
  await expect(stats).toContainText('有說明');
  await expect(stats).toContainText('頁');
});
