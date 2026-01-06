const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.E2E_FRONTEND_URL || 'http://localhost:5173/', { waitUntil: 'networkidle' });
  const html = await page.content();
  console.log(html.slice(0, 5000));
  await browser.close();
})();


