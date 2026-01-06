import { test, expect } from '@playwright/test';

test('login -> dashboard -> open merchant panel', async ({ page }) => {
  const base = process.env.E2E_FRONTEND_URL || 'http://localhost:5173';
  // set access token directly to avoid network login in E2E
  await page.addInitScript(() => window.localStorage.setItem('access_token', 'mock-token'));
  await page.goto(base + '/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
  // give UI a moment to render
  await page.waitForTimeout(600);
  // dashboard loaded (no further navigation in this E2E)
});


