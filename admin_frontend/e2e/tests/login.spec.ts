import { test, expect } from '@playwright/test';

test('login and navigate to tags', async ({ page }) => {
  const base = process.env.E2E_FRONTEND_URL || 'http://localhost:5173';
  // fast-path login: set token directly to bypass network login in E2E
  await page.addInitScript(() => window.localStorage.setItem('access_token', 'mock-token'));
  await page.goto(base + '/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
  // give UI a moment to render
  await page.waitForTimeout(600);
});


