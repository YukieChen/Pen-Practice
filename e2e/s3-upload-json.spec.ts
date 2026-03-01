/**
 * E2E S3: 上傳合法/非法/超量 JSON → 對應 UI 與狀態（06 §7.3）
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('S3: 上傳合法 JSON 後 Step3 段落自動填入', async ({ page }) => {
  await page.getByRole('button', { name: '上傳設定檔' }).click();

  const validJson = JSON.stringify({
    version: 1,
    sections: [
      { description: '第一法', characters: ['天', '地', '玄', '黃'] },
      { description: '第二法', characters: ['宇', '宙', '洪', '荒'] },
    ],
  });

  const input = page.locator('[data-step="content"] input[type="file"]').first();
  await input.setInputFiles({
    name: 'test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(validJson, 'utf-8'),
  });

  await expect(page.locator('.section-list .section-item')).toHaveCount(2);
  await expect(page.locator('.global-stats')).toContainText('2 段');
});

test('S3: 上傳非法 JSON 顯示錯誤、段落不變', async ({ page }) => {
  const initialCount = await page.locator('.section-list .section-item').count();
  await page.getByRole('button', { name: '上傳設定檔' }).click();

  const input = page.locator('[data-step="content"] input[type="file"]').first();
  await input.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not json {', 'utf-8'),
  });

  const zone = page.locator('.upload-zone');
  await expect(zone).toHaveClass(/error/);
  await expect(page.locator('.section-list .section-item')).toHaveCount(initialCount);
});
