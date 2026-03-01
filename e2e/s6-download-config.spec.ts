/**
 * E2E S6: 下載設定檔 → 再上傳 → 內容一致（06 §7.6）
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('S6: 填段落後下載設定檔，再上傳後段落內容一致', async ({ page }) => {
  await page.locator('.section-item').first().locator('input[placeholder*="寅宙"]').fill('永字八法');
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.getByRole('button', { name: '下載設定檔' }).click();
  const download = await downloadPromise;
  const filename = await download.path();
  expect(filename).toBeTruthy();

  const content = fs.readFileSync(filename!, 'utf-8');
  const parsed = JSON.parse(content);
  expect(parsed.version).toBe(1);
  expect(parsed.sections).toBeDefined();
  const firstSection = parsed.sections[0];
  expect(firstSection.characters).toContain('永');
});

test('S6: 下載檔名格式為 字帖設定_日期_時間.json', async ({ page }) => {
  await page.locator('.section-item').first().locator('input[placeholder*="寅宙"]').fill('甲');
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.getByRole('button', { name: '下載設定檔' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^字帖設定_.*\.json$/);
});
