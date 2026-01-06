import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('visual smoke snapshots', async ({ page, browserName }) => {
  const outDir = path.resolve(__dirname, '..', 'visual-screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const base = process.env.E2E_FRONTEND_URL || 'http://localhost:5173';
  // ensure logged in (set token)
  await page.addInitScript(() => window.localStorage.setItem('access_token', 'mock-token'));

  const pages = [
    { url: '/', name: 'dashboard' },
    { url: '/tags', name: 'tags' },
    { url: '/merchant/9e2e0978-1f3f-43da-860b-791508a0b1fa', name: 'merchant' },
    { url: '/t/demo-token', name: 'token' },
  ];

  for (const p of pages) {
    await page.goto(base + p.url, { waitUntil: 'networkidle' });
    // give the page a moment to settle animations and theme changes
    await page.waitForTimeout(600);
    const file = path.join(outDir, `${browserName}-${p.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
  }
});


