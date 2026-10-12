import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Load playwright
const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const SCREENSHOT_DIR = path.resolve('screenshots/onboarding_qa');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
};

// Simple static server
const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/';
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log(`[Onboarding QA] Server listening on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const scenarios = [
  { name: 'onboarding_320_light', width: 320, height: 600, theme: 'paper', rtl: false },
  { name: 'onboarding_320_dark', width: 320, height: 600, theme: 'ink', rtl: false },
  { name: 'onboarding_390_light', width: 390, height: 844, theme: 'paper', rtl: false },
  { name: 'onboarding_390_dark', width: 390, height: 844, theme: 'ink', rtl: false },
  { name: 'onboarding_390_rtl_light', width: 390, height: 844, theme: 'paper', rtl: true },
  { name: 'onboarding_390_rtl_dark', width: 390, height: 844, theme: 'ink', rtl: true },
  { name: 'onboarding_1024_light', width: 1024, height: 768, theme: 'paper', rtl: false },
  { name: 'onboarding_1024_dark', width: 1024, height: 768, theme: 'ink', rtl: false },
];

try {
  for (const s of scenarios) {
    console.log(`[Onboarding QA] Testing scenario: ${s.name} (${s.width}x${s.height}, ${s.theme}, RTL=${s.rtl})...`);
    const context = await browser.newContext({
      viewport: { width: s.width, height: s.height },
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(`[PageError] ${err.message}`);
    });

    // Seed localStorage so app is on Onboarding screen (onboardingDone is NOT set or false)
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'commit' });
    await page.evaluate(({ theme, rtl }) => {
      localStorage.clear();
      localStorage.setItem('onboardingDone', 'false');
      localStorage.setItem('islamic-settings', JSON.stringify({
        themeMode: theme,
        language: rtl ? 'ar' : 'en',
      }));
    }, { theme: s.theme, rtl: s.rtl });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    // Wait for splash screen to dismiss or elements to appear
    await page.waitForTimeout(2000);

    // Locate the theme toggle button
    const toggle = page.locator('[data-testid="onboarding-theme-toggle"], [accessibilityLabel*="Theme"], [aria-label*="Theme"]');
    const toggleCount = await toggle.count();
    console.log(`  Found ${toggleCount} theme toggle element(s)`);

    // Capture screenshot
    const shotPath = path.join(SCREENSHOT_DIR, `${s.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`  Saved screenshot: ${shotPath}`);

    if (consoleErrors.length > 0) {
      console.warn(`  Warnings/Errors in ${s.name}:`, consoleErrors);
    }

    await context.close();
  }

  // Test interactive theme toggle click with animation
  console.log('[Onboarding QA] Testing live theme toggle interaction and crossfade...');
  const interactiveContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const interactivePage = await interactiveContext.newPage();
  await interactivePage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'commit' });
  await interactivePage.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('onboardingDone', 'false');
    localStorage.setItem('islamic-settings', JSON.stringify({
      themeMode: 'paper',
      language: 'en',
    }));
  });
  await interactivePage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await interactivePage.waitForTimeout(2000);

  // Click toggle
  const toggleBtn = interactivePage.locator('[data-testid="onboarding-theme-toggle"], [accessibilityLabel*="Theme"], [aria-label*="Theme"]').first();
  console.log('  Clicking onboarding theme toggle (light -> dark)...');
  await toggleBtn.click();
  // Wait 150ms (during crossfade)
  await interactivePage.waitForTimeout(150);
  await interactivePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'onboarding_mid_transition.png') });
  // Wait for transition to complete
  await interactivePage.waitForTimeout(400);
  await interactivePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'onboarding_after_toggle_dark.png') });

  // Click toggle again (dark -> light)
  console.log('  Clicking onboarding theme toggle (dark -> light)...');
  await toggleBtn.click();
  await interactivePage.waitForTimeout(400);
  await interactivePage.screenshot({ path: path.join(SCREENSHOT_DIR, 'onboarding_after_toggle_light.png') });

  // Verify settings persisted in localStorage
  const persistedSettings = await interactivePage.evaluate(() => {
    return JSON.parse(localStorage.getItem('islamic-settings') || '{}');
  });
  console.log(`  Persisted themeMode after toggles: ${persistedSettings.themeMode}`);

  await interactiveContext.close();

} finally {
  await browser.close();
  server.close();
}

console.log('[Onboarding QA] All scenarios executed successfully!');
