import { test, expect } from '@playwright/test'

test('NFC flow visual smoke', async ({ page }) => {
  await page.goto('http://localhost:5173/t/demo-token')
  await expect(page.locator('.nfc-card')).toBeVisible()
  // Step 1: select first platform
  const firstChip = page.locator('.platform-chip').first()
  await firstChip.click()
  await page.locator('button', { hasText: '下一步' }).click()
  // Step 2: generate AI
  await page.locator('button', { hasText: 'AI 生成评价' }).click()
  await page.waitForTimeout(800) // wait for mock response
  await expect(page.locator('.nfc-card')).toContainText('已生成')
  // Step 3: next open platform
  await page.locator('button', { hasText: '下一步：打开平台' }).click()
  await expect(page).toHaveURL(/\/t\/demo-token\/publish\//i)
})


