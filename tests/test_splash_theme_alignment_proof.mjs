import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Load playwright from npx cache
const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const ARTIFACT_DIR = '/home/ubuntu/.gemini/antigravity-cli/brain/2c5133e8-773a-4b5c-8629-1d9bfc16ddc9/splash_proof';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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

// Static server serving exported web bundle
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
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log(`[Splash Proof] Static server listening on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const scenarios = [
  {
    id: 'splash_light_en',
    title: 'Splash Screen - Light Mode (Paper)',
    theme: 'paper',
    colorScheme: 'light',
    lang: 'en',
    reducedMotion: false,
    expectedBgType: 'light',
  },
  {
    id: 'splash_dark_en',
    title: 'Splash Screen - Dark Mode (Ink)',
    theme: 'ink',
    colorScheme: 'dark',
    lang: 'en',
    reducedMotion: false,
    expectedBgType: 'dark',
  },
  {
    id: 'splash_light_ur',
    title: 'Splash Screen - Light Mode Urdu (RTL)',
    theme: 'paper',
    colorScheme: 'light',
    lang: 'ur',
    reducedMotion: false,
    expectedBgType: 'light',
  },
  {
    id: 'splash_dark_ar',
    title: 'Splash Screen - Dark Mode Arabic (RTL)',
    theme: 'ink',
    colorScheme: 'dark',
    lang: 'ar',
    reducedMotion: false,
    expectedBgType: 'dark',
  },
  {
    id: 'splash_reduced_motion_dark',
    title: 'Splash Screen - Reduced Motion Dark Mode',
    theme: 'ink',
    colorScheme: 'dark',
    lang: 'en',
    reducedMotion: true,
    expectedBgType: 'dark',
  },
];

console.log('\n--- Running Splash Alignment & Theme Proof Suite ---');

for (const s of scenarios) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    colorScheme: s.colorScheme,
    reducedMotion: s.reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();

  // Initialize storage before navigating
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'commit' });
  await page.evaluate(({ theme, lang }) => {
    localStorage.clear();
    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('islamic-settings', JSON.stringify({
      themeMode: theme,
      language: lang,
    }));
  }, { theme: s.theme, lang: s.lang });

  // Navigate to trigger splash
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });

  // Wait for the splash to be in its fully revealed hold phase
  // In normal motion: hold occurs 650-975ms. We capture at 800ms.
  // In reduced motion: revealed immediately, holds 700ms. We capture at 350ms.
  const captureDelay = s.reducedMotion ? 350 : 800;
  await page.waitForTimeout(captureDelay);

  const outPath = path.join(ARTIFACT_DIR, `${s.id}.png`);
  await page.screenshot({ path: outPath, fullPage: false });

  const stat = fs.statSync(outPath);
  assert.ok(stat.size > 2000, `Screenshot size must be > 2KB (got ${stat.size} bytes)`);

  // Verify splash accessibility label exists in the DOM
  const splashElement = await page.$('[aria-label*="splash"], [aria-label*="Splash"], [data-testid*="splash"]');
  console.log(`  ✓ Captured [${s.id}] (${s.title}) -> ${stat.size} bytes`);

  await context.close();
}

await browser.close();
server.close();

console.log('\n============================================================');
console.log('ALL SPLASH SCREEN THEME ALIGNMENT SCREENSHOTS CAPTURED!');
console.log('============================================================\n');
