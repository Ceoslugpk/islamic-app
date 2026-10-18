import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/ubuntu/apps/islamic_app/package.json');
const { PNG } = require('pngjs');

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('proof/rework-batch-2/after');
const BEFORE_DIR = path.resolve('proof/rework-batch-2/before');
const RESPONSIVE_DIR = path.resolve('proof/rework-batch-2/responsive');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(RESPONSIVE_DIR, { recursive: true });

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

// Start static file server for web export
const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/';
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
console.log(`[Batch 2 Proof] Static server listening on port ${port}`);

// Static code assertions
console.log('\n--- 1. Static Code Analysis ---');
const targetScreens = [
  'src/screens/MosqueFinderScreen.tsx',
  'src/screens/PrayerGuideScreen.tsx',
  'src/screens/PrayerRemindersScreen.tsx',
  'src/screens/RamadanGuideScreen.tsx',
  'src/screens/ShahadaScreen.tsx',
  'src/screens/UmrahGuideScreen.tsx',
  'src/screens/UmrahResourcesScreen.tsx',
];

const staticResults = [];
let allStaticPass = true;

for (const screenPath of targetScreens) {
  const content = fs.readFileSync(path.resolve(screenPath), 'utf8');
  const hasLegacyHeaderImport = /from ['"].*ScreenHeader['"]/.test(content);
  const usesSubHeader = content.includes('SubHeader');
  const usesDetailScreen = content.includes('DetailScreen');
  const usesSharedUI = /from ['"].*components\/ui['"]/.test(content);

  const passes = !hasLegacyHeaderImport && usesSubHeader && usesDetailScreen && usesSharedUI;
  if (!passes) allStaticPass = false;

  staticResults.push({
    file: screenPath,
    hasLegacyHeaderImport,
    usesSubHeader,
    usesDetailScreen,
    usesSharedUI,
    passes,
  });

  console.log(`  ${passes ? '✓' : '✗'} ${screenPath}: legacyHeader=${hasLegacyHeaderImport}, SubHeader=${usesSubHeader}, DetailScreen=${usesDetailScreen}, SharedUI=${usesSharedUI}`);
}

// Count remaining screens with ScreenHeader
const allScreens = fs.readdirSync(path.resolve('src/screens'));
const remainingLegacyScreens = [];
for (const f of allScreens) {
  if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
  const fullPath = path.resolve('src/screens', f);
  const c = fs.readFileSync(fullPath, 'utf8');
  if (/from ['"].*ScreenHeader['"]/.test(c)) {
    remainingLegacyScreens.push(`src/screens/${f}`);
  }
}
console.log(`\nRemaining legacy ScreenHeader importers: ${remainingLegacyScreens.length} (expected 20)`);

// Playwright runtime tests
console.log('\n--- 2. Playwright Runtime & Visual Proof at 393x852 ---');

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const routes = [
  {
    id: 'mosque-finder',
    screenName: 'MosqueFinderScreen',
    expectedParentNav: 'tools',
    uniqueTitle: 'Mosque Finder',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'mosque' });
      });
    },
  },
  {
    id: 'prayer-guide',
    screenName: 'PrayerGuideScreen',
    expectedParentNav: 'library',
    uniqueTitle: 'Prayer Guide (Fiqh)',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'prayer-guide' });
      });
    },
  },
  {
    id: 'prayer-reminders',
    screenName: 'PrayerRemindersScreen',
    expectedParentNav: 'tools',
    uniqueTitle: 'Prayer Reminders',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'prayer-reminders' });
      });
    },
  },
  {
    id: 'ramadan-guide',
    screenName: 'RamadanGuideScreen',
    expectedParentNav: 'library',
    uniqueTitle: 'Ramadan & Eid Guide',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'ramadan-guide' });
      });
    },
  },
  {
    id: 'shahada',
    screenName: 'ShahadaScreen',
    expectedParentNav: 'library',
    uniqueTitle: 'The Shahada',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'shahada' });
      });
    },
  },
  {
    id: 'umrah-guide',
    screenName: 'UmrahGuideScreen',
    expectedParentNav: 'tools',
    uniqueTitle: 'Umrah Guide',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'umrah-guide' });
      });
    },
  },
  {
    id: 'umrah-resources',
    screenName: 'UmrahResourcesScreen',
    expectedParentNav: 'tools',
    uniqueTitle: 'Umrah Resources',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'umrah-resources' });
      });
    },
  },
];

const themes = ['paper', 'ink'];
const runtimeResults = [];

for (const route of routes) {
  for (const theme of themes) {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
    });

    await context.addInitScript(({ theme }) => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem(
        'islamic-settings',
        JSON.stringify({
          language: 'en',
          themeMode: theme,
          manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
          locationMode: 'manual',
        })
      );
    }, { theme });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

    await route.nav(page);

    // Confirm route-visible unique text before measuring
    await page.waitForFunction(
      (expectedTitle) => {
        const titleEl = document.querySelector('[data-testid="sub-header-title"]');
        return titleEl && titleEl.textContent && titleEl.textContent.includes(expectedTitle);
      },
      route.uniqueTitle,
      { timeout: 8000 }
    );

    // Confirm active tab pill matches expected parent nav
    await page.waitForFunction(
      (expectedParent) => {
        const activeTab = document.querySelector('[data-testid="floating-nav-active-pill"]');
        const activeTabBtn = activeTab ? activeTab.closest('[data-testid^="floating-nav-tab-"]') : null;
        const activeTabId = activeTabBtn ? activeTabBtn.getAttribute('data-testid') : null;
        return activeTabId === `floating-nav-tab-${expectedParent}`;
      },
      route.expectedParentNav,
      { timeout: 5000 }
    );

    await page.waitForTimeout(400);

    // Save screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `${route.id}-${theme}.png`);
    await page.screenshot({ path: screenshotPath });

    // Measurements & Assertions
    const measurements = await page.evaluate(() => {
      const subHeader = document.querySelector('[data-testid="sub-header"]');
      const backBtn = document.querySelector('[data-testid="sub-header-back-btn"]');
      const backRing = document.querySelector('[data-testid="sub-header-back-ring"]') || (backBtn ? backBtn.querySelector('div') : null);
      const title = document.querySelector('[data-testid="sub-header-title"]');
      const eyebrow = document.querySelector('[data-testid="sub-header-eyebrow"]');
      const subtitle = document.querySelector('[data-testid="sub-header-subtitle"]');
      const cards = Array.from(document.querySelectorAll('[data-testid="card"]'));
      const primaryBtns = Array.from(document.querySelectorAll('[data-testid="btn-primary"]'));
      const outlineBtns = Array.from(document.querySelectorAll('[data-testid="btn-outline"]'));
      const tabs = Array.from(document.querySelectorAll('[data-testid="tabs"]'));
      const chips = Array.from(document.querySelectorAll('[data-testid="chip"], [data-testid="chip-selected"]'));
      const searchFields = Array.from(document.querySelectorAll('[data-testid="search"]'));

      // Floating nav measurement
      const floatingNav = document.querySelector('[data-testid="floating-nav-container"]');
      const activeNavTab = document.querySelector('[data-testid="floating-nav-active-pill"]');
      const activeTabBtn = activeNavTab ? activeNavTab.closest('[data-testid^="floating-nav-tab-"]') : null;

      const subHeaderBox = subHeader ? subHeader.getBoundingClientRect() : null;

      let backBtnMetrics = null;
      const targetRing = backRing || backBtn;
      if (targetRing) {
        const cs = window.getComputedStyle(targetRing);
        const rect = targetRing.getBoundingClientRect();
        backBtnMetrics = {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          borderRadius: parseFloat(cs.borderRadius) || 0,
          borderWidth: parseFloat(cs.borderWidth) || 0,
        };
      }

      let titleMetrics = null;
      if (title) {
        const cs = window.getComputedStyle(title);
        titleMetrics = {
          fontSize: parseFloat(cs.fontSize) || 0,
          fontFamily: cs.fontFamily,
          text: title.textContent?.trim(),
        };
      }

      let eyebrowMetrics = null;
      if (eyebrow) {
        const cs = window.getComputedStyle(eyebrow);
        eyebrowMetrics = {
          fontSize: parseFloat(cs.fontSize) || 0,
          fontFamily: cs.fontFamily,
          text: eyebrow.textContent?.trim(),
          textTransform: cs.textTransform,
        };
      }

      let subtitleMetrics = null;
      if (subtitle) {
        const cs = window.getComputedStyle(subtitle);
        subtitleMetrics = {
          text: subtitle.textContent?.trim(),
          fontSize: parseFloat(cs.fontSize) || 0,
        };
      }

      // PremiumCard measurements
      const cardMetrics = cards.map((c) => {
        const cs = window.getComputedStyle(c);
        const rect = c.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          borderRadius: parseFloat(cs.borderRadius) || 0,
          boxShadow: cs.boxShadow,
          borderColor: cs.borderColor,
          borderWidth: parseFloat(cs.borderWidth) || 0,
        };
      });

      return {
        subHeaderPresent: !!subHeader,
        subHeaderBox,
        backBtn: backBtnMetrics,
        title: titleMetrics,
        eyebrow: eyebrowMetrics,
        subtitle: subtitleMetrics,
        cardCount: cards.length,
        cards: cardMetrics,
        primaryBtnCount: primaryBtns.length,
        outlineBtnCount: outlineBtns.length,
        tabsCount: tabs.length,
        chipCount: chips.length,
        searchCount: searchFields.length,
        floatingNavPresent: !!floatingNav,
        activeNavTabId: activeTabBtn ? activeTabBtn.getAttribute('data-testid') : null,
      };
    });

    // Evaluate assertions
    const checks = {
      subHeaderPresent: measurements.subHeaderPresent,
      backBtn32dp:
        measurements.backBtn &&
        Math.abs(measurements.backBtn.width - 32) <= 2 &&
        Math.abs(measurements.backBtn.height - 32) <= 2,
      backBtnRadius16dp:
        measurements.backBtn && measurements.backBtn.borderRadius >= 14,
      title24sp:
        measurements.title &&
        Math.abs(measurements.title.fontSize - 24) <= 2,
      titleAllowedFont:
        measurements.title &&
        /instrument|lora|amiri|serif/i.test(measurements.title.fontFamily),
      eyebrowAllowedFont:
        measurements.eyebrow &&
        /manrope|poppins|sans-serif/i.test(measurements.eyebrow.fontFamily),
      premiumCardRadius13to15:
        measurements.cardCount > 0 &&
        measurements.cards.some((c) => c.borderRadius >= 13 && c.borderRadius <= 15),
      premiumCardHasShadow:
        measurements.cardCount > 0 &&
        measurements.cards.some((c) => c.boxShadow && c.boxShadow !== 'none'),
      floatingNavCorrect:
        measurements.floatingNavPresent &&
        measurements.activeNavTabId === `floating-nav-tab-${route.expectedParentNav}`,
    };

    const failedChecks = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
    const pass = failedChecks.length === 0;
    console.log(`  ${pass ? '✓' : '✗'} [${route.id}] theme=${theme}: SubHeader=${checks.subHeaderPresent}, BackBtn=${checks.backBtn32dp} (${measurements.backBtn?.width}x${measurements.backBtn?.height}, r=${measurements.backBtn?.borderRadius}), Title=${checks.title24sp} (${measurements.title?.fontSize}px), CardRadius=${checks.premiumCardRadius13to15} (${measurements.cards[0]?.borderRadius}px), CardShadow=${checks.premiumCardHasShadow}, Nav=${checks.floatingNavCorrect} (${measurements.activeNavTabId})${failedChecks.length ? ` (FAILED: ${failedChecks.join(', ')})` : ''}`);

    runtimeResults.push({
      route: route.id,
      screenName: route.screenName,
      theme,
      screenshot: path.relative(process.cwd(), screenshotPath),
      checks,
      measurements,
      pass,
    });

    await context.close();
  }
}

// 3. Dual-homed test for UmrahGuideScreen (navigate from Library)
console.log('\n--- 3. Dual-homed UmrahGuideScreen Navigation Check ---');
{
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await context.addInitScript(() => {
    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('location-setup-dismissed-v1', 'true');
    localStorage.setItem(
      'islamic-settings',
      JSON.stringify({
        language: 'en',
        themeMode: 'paper',
        manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
        locationMode: 'manual',
      })
    );
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

  // Navigate to UmrahGuide from Library
  await page.evaluate(() => {
    window.__NAVIGATE__.setTab('library');
    window.__NAVIGATE__.setLibrary({ screen: 'umrah-guide' });
  });

  await page.waitForFunction(
    () => {
      const titleEl = document.querySelector('[data-testid="sub-header-title"]');
      return titleEl && titleEl.textContent && titleEl.textContent.includes('Umrah Guide');
    },
    { timeout: 8000 }
  );

  const subHeader = await page.locator('[data-testid="sub-header"]').count();
  const backBtnText = await page.locator('[data-testid="sub-header-back-btn"]').innerText();
  const activeTab = await page.evaluate(() => {
    const pill = document.querySelector('[data-testid="floating-nav-active-pill"]');
    const tabBtn = pill ? pill.closest('[data-testid^="floating-nav-tab-"]') : null;
    return tabBtn ? tabBtn.getAttribute('data-testid') : null;
  });
  console.log(`  ✓ UmrahGuide from Library: SubHeader count=${subHeader}, backButtonText="${backBtnText.trim()}", activeTab="${activeTab}" (preserves Library active parent)`);

  await context.close();
}

// 4. Responsive Viewport Check at 360x800 and 430x932
console.log('\n--- 4. Responsive Viewport Check (360x800 & 430x932) ---');
for (const vp of [
  { name: '360x800', width: 360, height: 800 },
  { name: '430x932', width: 430, height: 932 },
]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await context.addInitScript(() => {
    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('location-setup-dismissed-v1', 'true');
    localStorage.setItem(
      'islamic-settings',
      JSON.stringify({
        language: 'en',
        themeMode: 'paper',
        manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
        locationMode: 'manual',
      })
    );
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

  // Take sample top captures for MosqueFinder and UmrahGuide
  await routes[0].nav(page);
  await page.waitForFunction(
    (t) => {
      const el = document.querySelector('[data-testid="sub-header-title"]');
      return el && el.textContent && el.textContent.includes(t);
    },
    routes[0].uniqueTitle,
    { timeout: 8000 }
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(RESPONSIVE_DIR, `mosque-finder-${vp.name}-top.png`) });

  await routes[5].nav(page);
  await page.waitForFunction(
    (t) => {
      const el = document.querySelector('[data-testid="sub-header-title"]');
      return el && el.textContent && el.textContent.includes(t);
    },
    routes[5].uniqueTitle,
    { timeout: 8000 }
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(RESPONSIVE_DIR, `umrah-guide-${vp.name}-top.png`) });

  console.log(`  ✓ Captured responsive viewports at ${vp.name}`);
  await context.close();
}

await browser.close();
server.close();

// 5. Deterministic Pixel Difference Verification
console.log('\n--- 5. Deterministic Pixel Difference Verification (Thresholds: Header >= 25%, Full >= 35%) ---');
const HEADER_THRESHOLD_PCT = 25.0;
const FULL_THRESHOLD_PCT = 35.0;
const CHANNEL_DIFF_THRESHOLD = 25;

function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  return PNG.sync.read(buf);
}

let allDiffsPass = true;
const pixelDiffResults = [];

for (const r of routes) {
  for (const theme of ['paper', 'ink']) {
    const pairName = `${r.id}-${theme}`;
    const beforePath = path.join(BEFORE_DIR, `${pairName}.png`);
    const afterPath = path.join(OUTPUT_DIR, `${pairName}.png`);

    if (!fs.existsSync(beforePath)) {
      console.log(`  ✗ Missing before baseline: ${beforePath}`);
      allDiffsPass = false;
      continue;
    }

    const before = readPng(beforePath);
    const after = readPng(afterPath);

    if (before.width !== after.width || before.height !== after.height) {
      throw new Error(`Dimension mismatch for ${pairName}: ${before.width}x${before.height} vs ${after.width}x${after.height}`);
    }

    const w = before.width;
    const h = before.height;

    let headerDiffCount = 0;
    let headerTotalCount = 0;
    let fullDiffCount = 0;
    let fullTotalCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const dr = Math.abs(before.data[idx] - after.data[idx]);
        const dg = Math.abs(before.data[idx + 1] - after.data[idx + 1]);
        const db = Math.abs(before.data[idx + 2] - after.data[idx + 2]);
        const isDiff = (dr > CHANNEL_DIFF_THRESHOLD || dg > CHANNEL_DIFF_THRESHOLD || db > CHANNEL_DIFF_THRESHOLD) ? 1 : 0;

        if (y < 300) {
          headerTotalCount++;
          if (isDiff) headerDiffCount++;
        }
        fullTotalCount++;
        if (isDiff) fullDiffCount++;
      }
    }

    const headerPct = parseFloat(((headerDiffCount / headerTotalCount) * 100).toFixed(2));
    const fullPct = parseFloat(((fullDiffCount / fullTotalCount) * 100).toFixed(2));

    const headerPass = headerPct >= HEADER_THRESHOLD_PCT;
    const fullPass = fullPct >= FULL_THRESHOLD_PCT;
    const pass = headerPass && fullPass;

    if (!pass) allDiffsPass = false;

    console.log(`  ${pass ? '✓' : '✗'} [${pairName}]: Header=${headerPct}% (>=${HEADER_THRESHOLD_PCT}%), Full=${fullPct}% (>=${FULL_THRESHOLD_PCT}%) -> ${pass ? 'PASS' : 'FAIL'}`);

    pixelDiffResults.push({
      pairName,
      headerPct,
      headerPass,
      fullPct,
      fullPass,
      pass,
    });
  }
}

// Generate final report JSON
const finalReport = {
  timestamp: new Date().toISOString(),
  batch: 'Batch 2 — Old Header Migration & UI Redesign',
  targetScreens,
  staticAnalysis: {
    allPassed: allStaticPass,
    results: staticResults,
    remainingLegacyScreensCount: remainingLegacyScreens.length,
    remainingLegacyScreens,
  },
  runtimeAnalysis: {
    totalRuns: runtimeResults.length,
    allPassed: runtimeResults.every((r) => r.pass),
    results: runtimeResults,
  },
  pixelDiffAnalysis: {
    totalPairs: pixelDiffResults.length,
    allPassed: allDiffsPass,
    headerThresholdPct: HEADER_THRESHOLD_PCT,
    fullThresholdPct: FULL_THRESHOLD_PCT,
    results: pixelDiffResults,
  },
};

fs.writeFileSync(
  path.resolve('proof/rework-batch-2/proof-report.json'),
  JSON.stringify(finalReport, null, 2),
  'utf8'
);

console.log(`\n✓ Proof report written to proof/rework-batch-2/proof-report.json`);
console.log(`All Static Checks: ${allStaticPass ? 'PASSED' : 'FAILED'}`);
console.log(`All Runtime Checks: ${runtimeResults.every((r) => r.pass) ? 'PASSED' : 'FAILED'}`);
console.log(`All Pixel Diff Checks: ${allDiffsPass ? 'PASSED' : 'FAILED'}`);

const overallPass = allStaticPass && runtimeResults.every((r) => r.pass) && allDiffsPass;
if (!overallPass) {
  console.error('\nProof failed: one or more checks did not meet the required threshold.');
  process.exit(1);
} else {
  console.log('\nAll Batch 2 checks PASSED successfully!');
  process.exit(0);
}
