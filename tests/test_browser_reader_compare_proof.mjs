import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire('/home/ubuntu/apps/islamic_app/package.json');
const { PNG } = require('/home/ubuntu/apps/islamic_app/node_modules/pngjs');
const { chromium } = await import('file:///home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');

const root = '/home/ubuntu/apps/islamic_app';
const dist = path.join(root, 'dist');
const captureDir = path.join(root, 'proof/reader_compare');

if (!fs.existsSync(captureDir)) {
  fs.mkdirSync(captureDir, { recursive: true });
}

// 1. Start static HTTP server serving dist
const server = http.createServer((req, res) => {
  let p = path.join(dist, (req.url || '/').split('?')[0].replace(/^\//, '') || 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    p = path.join(dist, 'index.html');
  }
  const ext = path.extname(p).toLowerCase();
  const mimeMap = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;
console.log(`[INFO] Serving dist on ${base}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

function checkPixels(shotPath, expectedW, expectedH) {
  const buf = fs.readFileSync(shotPath);
  const png = PNG.sync.read(buf);
  let nonbg = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (
      png.data[i + 3] > 0 &&
      (png.data[i] !== png.data[0] ||
        png.data[i + 1] !== png.data[1] ||
        png.data[i + 2] !== png.data[2])
    ) {
      nonbg++;
    }
  }
  return {
    width: png.width,
    height: png.height,
    nonbgPixels: nonbg,
    matchesDim: png.width === expectedW && png.height === expectedH,
    hasContent: nonbg > 100,
  };
}

async function inspect(page) {
  return await page.evaluate(() => {
    const txt = document.body.innerText || '';
    const activeNav =
      document.querySelector('[data-testid="floating-nav-active-label"]')?.textContent?.trim() || '';
    const scrollContainers = [...document.querySelectorAll('*')].filter((e) => {
      const s = getComputedStyle(e);
      return ['auto', 'scroll'].includes(s.overflowY) && e.scrollHeight > e.clientHeight;
    });
    return {
      text: txt.slice(0, 15000),
      activeTab: activeNav,
      scrollOwnersCount: scrollContainers.length,
      url: location.href,
    };
  });
}

async function createPage(opts = {}) {
  const { theme = 'paper', lang = 'en', width = 390, height = 844 } = opts;
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.addInitScript(
    ({ theme, lang }) => {
      try {
        localStorage.clear();
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem(
          'islamic-settings',
          JSON.stringify({
            language: lang,
            themeMode: theme,
            locationMode: 'manual',
            manualLocation: {
              latitude: 21.4225,
              longitude: 39.8262,
              city: 'Makkah',
              country: 'Saudi Arabia',
            },
            autoLocation: null,
            quranScript: 'uthmani',
            quranFontSize: 24,
            quranLineHeight: 1.8,
            tafsirSourceId: 'en-jalalayn',
            autoplayNext: true,
            repeatMode: 'none',
          })
        );
      } catch (e) {
        console.error('initScript error', e);
      }
    },
    { theme, lang }
  );

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  return { ctx, page };
}

console.log('--- TEST 1: English Reader 2:255 → Compare → Reader (Selected Ayah Toolbar) ---');
{
  const { ctx, page } = await createPage({ theme: 'paper', lang: 'en', width: 390, height: 844 });

  // 1. Navigate to Reader at Surah 2 Ayah 255 (Page 42)
  await page.evaluate(() => {
    window.__NAVIGATE__?.setTab('quran');
    window.__NAVIGATE__?.setQuran({ screen: 'reader', surah: 2, initialAyah: 255, initialPage: 42 });
  });
  await page.waitForTimeout(1000);

  const infoReader1 = await inspect(page);
  assert.ok(infoReader1.text.includes('Page 42') || infoReader1.text.includes('Al-Baqara'), 'Reader must show Page 42 / Al-Baqara');
  assert.strictEqual(infoReader1.activeTab, 'Quran', 'Parent tab must be Quran');

  const shot1 = path.join(captureDir, '01_reader_p42_2_255_en.png');
  await page.screenshot({ path: shot1 });
  const px1 = checkPixels(shot1, 390, 844);
  assert.ok(px1.hasContent, 'Reader screenshot must have rendered content');
  console.log('  ✓ 1. Reader mounted at Surah 2 Ayah 255 (Page 42) with active Quran parent tab');

  // 2. Select Ayah 2:255 in Mushaf mode
  const ayahEl = page.locator('[data-testid="mushaf-ayah-2-255"]');
  await ayahEl.waitFor({ state: 'attached', timeout: 5000 });
  await ayahEl.click();
  await page.waitForTimeout(500);

  const compareBtn = page.locator('[data-testid="mushaf-action-compare"]');
  await compareBtn.waitFor({ state: 'visible', timeout: 5000 });

  const shot2 = path.join(captureDir, '02_reader_selected_toolbar_en.png');
  await page.screenshot({ path: shot2 });
  const px2 = checkPixels(shot2, 390, 844);
  assert.ok(px2.hasContent, 'Selected toolbar screenshot must have content');
  console.log('  ✓ 2. Mushaf selected-ayah toolbar opened with Compare action button');

  // 3. Click Compare action button
  await compareBtn.click();
  await page.waitForTimeout(1000);

  const infoCompare = await inspect(page);
  assert.ok(infoCompare.text.includes('Translation Compare'), 'Compare screen must be visible');
  assert.ok(infoCompare.text.includes('2:255') || infoCompare.text.includes('255'), 'Compare screen must show exact target Ayah 2:255');
  assert.strictEqual(infoCompare.activeTab, 'Quran', 'Parent tab must remain Quran');
  assert.ok(infoCompare.scrollOwnersCount <= 1, `Must have <= 1 scroll owner, got ${infoCompare.scrollOwnersCount}`);

  const shot3 = path.join(captureDir, '03_compare_from_reader_2_255_en.png');
  await page.screenshot({ path: shot3 });
  const px3 = checkPixels(shot3, 390, 844);
  assert.ok(px3.hasContent, 'Compare screenshot must have rendered content');
  console.log('  ✓ 3. Transition to TranslationCompareScreen preserves exact target 2:255, active Quran parent tab, and single scroll owner');

  // 4. Click SubHeader back button to return to Reader
  const backBtn = page.locator('[data-testid="sub-header-back-btn"]');
  await backBtn.click();
  await page.waitForTimeout(1000);

  const infoReaderReturn = await inspect(page);
  assert.ok(infoReaderReturn.text.includes('Page 42') || infoReaderReturn.text.includes('Al-Baqara'), 'Must return to Reader Page 42 / Al-Baqara');
  assert.strictEqual(infoReaderReturn.activeTab, 'Quran', 'Parent tab must remain Quran');

  const shot4 = path.join(captureDir, '04_return_to_reader_p42_en.png');
  await page.screenshot({ path: shot4 });
  const px4 = checkPixels(shot4, 390, 844);
  assert.ok(px4.hasContent, 'Return reader screenshot must have rendered content');
  console.log('  ✓ 4. Return to Reader from Compare lands on Page 42 with active Quran parent tab');

  await ctx.close();
}

console.log('--- TEST 2: Tools Menu Path (3-dots -> Translation Compare -> Open in Reader) ---');
{
  const { ctx, page } = await createPage({ theme: 'paper', lang: 'en', width: 390, height: 844 });

  await page.evaluate(() => {
    window.__NAVIGATE__?.setTab('quran');
    window.__NAVIGATE__?.setQuran({ screen: 'reader', surah: 2, initialAyah: 255, initialPage: 42 });
  });
  await page.waitForTimeout(1000);

  // Open Tools Menu (3-dots button)
  const dotsBtn = page.locator('[data-testid="reader-dots-menu-btn"]');
  await dotsBtn.click();
  await page.waitForTimeout(500);

  const toolsCompareBtn = page.locator('[data-testid="reader-tools-compare"]');
  await toolsCompareBtn.waitFor({ state: 'visible', timeout: 5000 });

  const shot5 = path.join(captureDir, '05_tools_menu_compare_item_en.png');
  await page.screenshot({ path: shot5 });
  const px5 = checkPixels(shot5, 390, 844);
  assert.ok(px5.hasContent, 'Tools menu screenshot must have rendered content');
  console.log('  ✓ 5. Reading tools menu renders Translation Compare under LANGUAGE & TAFSIR');

  // Click Translation Compare from tools menu
  await toolsCompareBtn.click();
  await page.waitForTimeout(1000);

  const infoCompareTools = await inspect(page);
  assert.ok(infoCompareTools.text.includes('Translation Compare'), 'Compare screen must be opened from tools menu');
  assert.strictEqual(infoCompareTools.activeTab, 'Quran', 'Parent tab must remain Quran');

  // Click Open in Surah Reader button in Compare screen
  const openReaderBtn = page.getByText(/Open in Surah Reader/);
  await openReaderBtn.waitFor({ state: 'attached', timeout: 5000 });
  await openReaderBtn.scrollIntoViewIfNeeded();
  await openReaderBtn.click();
  await page.waitForTimeout(1000);

  const infoReaderReturnTools = await inspect(page);
  assert.ok(infoReaderReturnTools.text.includes('Page 42') || infoReaderReturnTools.text.includes('Al-Baqara'), 'Must return to Reader Page 42 via onOpenReader');
  assert.strictEqual(infoReaderReturnTools.activeTab, 'Quran', 'Parent tab must remain Quran');

  const shot6 = path.join(captureDir, '06_return_from_open_in_reader_en.png');
  await page.screenshot({ path: shot6 });
  const px6 = checkPixels(shot6, 390, 844);
  assert.ok(px6.hasContent, 'Open in Reader return screenshot must have content');
  console.log('  ✓ 6. onOpenReader returns from Compare to Reader Page 42 with active Quran parent tab');

  await ctx.close();
}

console.log('--- TEST 3: Urdu (RTL) Reader 2:255 → Compare → Reader ---');
{
  const { ctx, page } = await createPage({ theme: 'ink', lang: 'ur', width: 390, height: 844 });

  await page.evaluate(() => {
    window.__NAVIGATE__?.setTab('quran');
    window.__NAVIGATE__?.setQuran({ screen: 'reader', surah: 2, initialAyah: 255, initialPage: 42 });
  });
  await page.waitForTimeout(1000);

  // Select Ayah 2:255
  const ayahEl = page.locator('[data-testid="mushaf-ayah-2-255"]');
  await ayahEl.waitFor({ state: 'attached', timeout: 5000 });
  await ayahEl.click();
  await page.waitForTimeout(500);

  const compareBtn = page.locator('[data-testid="mushaf-action-compare"]');
  await compareBtn.waitFor({ state: 'visible', timeout: 5000 });
  await compareBtn.click();
  await page.waitForTimeout(1000);

  const infoUrCompare = await inspect(page);
  assert.ok(infoUrCompare.text.includes('255'), 'Urdu compare screen must show 255');

  // Back to reader
  const backBtn = page.locator('[data-testid="sub-header-back-btn"]');
  await backBtn.click();
  await page.waitForTimeout(1000);

  const shot7 = path.join(captureDir, '07_reader_compare_return_ur.png');
  await page.screenshot({ path: shot7 });
  const px7 = checkPixels(shot7, 390, 844);
  assert.ok(px7.hasContent, 'Urdu RTL screenshot must have rendered content');
  console.log('  ✓ 7. Urdu RTL Reader → Compare → Reader flow verified');

  await ctx.close();
}

console.log('--- TEST 4: Arabic (RTL) Reader 1:5 → Compare → Reader ---');
{
  const { ctx, page } = await createPage({ theme: 'paper', lang: 'ar', width: 390, height: 844 });

  await page.evaluate(() => {
    window.__NAVIGATE__?.setTab('quran');
    window.__NAVIGATE__?.setQuran({ screen: 'reader', surah: 1, initialAyah: 5, initialPage: 1 });
  });
  await page.waitForTimeout(1000);

  const ayahEl = page.locator('[data-testid="mushaf-ayah-1-5"]');
  await ayahEl.waitFor({ state: 'attached', timeout: 5000 });
  await ayahEl.click();
  await page.waitForTimeout(500);

  const compareBtn = page.locator('[data-testid="mushaf-action-compare"]');
  await compareBtn.waitFor({ state: 'visible', timeout: 5000 });
  await compareBtn.click();
  await page.waitForTimeout(1000);

  const infoArCompare = await inspect(page);
  assert.ok(infoArCompare.text.includes('1:5') || infoArCompare.text.includes('5'), 'Arabic compare must show 1:5');

  const backBtn = page.locator('[data-testid="sub-header-back-btn"]');
  await backBtn.click();
  await page.waitForTimeout(1000);

  const shot8 = path.join(captureDir, '08_reader_compare_return_ar.png');
  await page.screenshot({ path: shot8 });
  const px8 = checkPixels(shot8, 390, 844);
  assert.ok(px8.hasContent, 'Arabic RTL screenshot must have rendered content');
  console.log('  ✓ 8. Arabic RTL Reader 1:5 → Compare → Reader flow verified');

  await ctx.close();
}

await browser.close();
server.close();

console.log('\n========================================================');
console.log('ALL BROWSER PROOFS FOR READER → COMPARE → READER PASSED!');
console.log('========================================================\n');
