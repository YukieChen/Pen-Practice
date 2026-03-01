/**
 * E2E S5: 上傳字體（正常/缺字/損壞）→ 預覽與警告（06 §7.5）
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('S5: 選擇上傳字體後第二個選項為選中', async ({ page }) => {
  await page.locator('.font-option').nth(1).getByText('上傳字體', { exact: true }).click();
  await expect(page.locator('.font-option').nth(1)).toHaveClass(/selected/);
});

test('S5: 上傳非字體檔（損壞）時顯示錯誤', async ({ page }) => {
  await page.locator('.font-option').nth(1).click();

  const fileInput = page.locator('.font-option input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'fake.ttf',
    mimeType: 'font/ttf',
    buffer: Buffer.from('not a real font', 'utf-8'),
  });

  await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
});
