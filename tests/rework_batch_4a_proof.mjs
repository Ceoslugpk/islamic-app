import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/ubuntu/apps/islamic_app/package.json');
const { PNG } = require('pngjs');

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const PROOF_DIR = path.resolve('proof/rework-batch-4a');
const BEFORE_DIR = path.join(PROOF_DIR, 'before');
const AFTER_DIR = path.join(PROOF_DIR, 'after');
const RESPONSIVE_DIR = path.join(PROOF_DIR, 'responsive');

fs.mkdirSync(AFTER_DIR, { recursive: true });
fs.mkdirSync(RESPONSIVE_DIR, { recursive: true });

console.log('=== Batch 4A Focused Proof ===\n');

// 1. Static Code Analysis & Contract Verification
console.log('--- 1. Static Code Analysis & Contract Verification ---');

const ownedScreens = [
  {
    path: 'src/screens/BookmarksScreen.tsx',
    anchors: ['getBookmarks', 'removeBookmark', 'addBookmark', 'withUndoToast'],
    scrollComponent: 'DetailScreen.FlatList',
  },
  {
    path: 'src/screens/DuasScreen.tsx',
    anchors: ['DUA_CATEGORIES', 'DUAS_DATA', 'useSearchHistory', 'captureRef'],
    scrollComponent: 'DetailScreen.FlatList',
  },
  {
    path: 'src/screens/HadithLibraryScreen.tsx',
    anchors: ['fetchHadithCollections', 'fetchHadithBooks', 'fetchHadithsInBook', 'loadSavedHadiths', 'saveRecentHadith'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/HifzScreen.tsx',
    anchors: ['loadHifzStatuses', 'handleCycleStatus', 'saveHifzStatus', 'setPracticeSurah', 'SURAHS_114'],
    scrollComponent: 'DetailScreen.FlatList',
  },
  {
    path: 'src/screens/HifzPracticeScreen.tsx',
    anchors: ['fetchSurah', 'SURAHS_114', 'peekedCount', 'handleReveal'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/MadinahLiveScreen.tsx',
    anchors: ['LiveVideoPlayer', 'MADINAH_CHANNEL_ID', 'openYouTubeLive'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/MakkahLiveScreen.tsx',
    anchors: ['LiveVideoPlayer', 'MAKKAH_CHANNEL_ID', 'openYouTubeLive'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/NamesScreen.tsx',
    anchors: ['fetchNames', 'NAMES_99', 'PROPHET_NAMES_99', 'variant', 'useSearchHistory'],
    scrollComponent: 'DetailScreen.FlatList',
  },
];

let allStaticPass = true;
const staticResults = [];

for (const screen of ownedScreens) {
  const content = fs.readFileSync(path.resolve(screen.path), 'utf8');
  const hasLegacyHeaderImport = /from ['"].*ScreenHeader['"]/.test(content);
  const usesLegacyHeaderTag = /<ScreenHeader[\s/>]/.test(content);
  const usesSubHeader = content.includes('SubHeader');
  const usesDetailScreen = content.includes('DetailScreen');
  const usesExpectedScroll = content.includes(screen.scrollComponent);
  const hasManualTabPadBottom = /TAB_PAD_BOTTOM/.test(content);

  const missingAnchors = screen.anchors.filter((a) => !content.includes(a));
  const anchorsPass = missingAnchors.length === 0;

  const passes = !hasLegacyHeaderImport &&
    !usesLegacyHeaderTag &&
    usesSubHeader &&
    usesDetailScreen &&
    usesExpectedScroll &&
    !hasManualTabPadBottom &&
    anchorsPass;

  if (!passes) allStaticPass = false;

  staticResults.push({
    file: screen.path,
    noLegacyHeader: !hasLegacyHeaderImport && !usesLegacyHeaderTag,
    usesSubHeader,
    usesDetailScreen,
    usesExpectedScroll,
    noManualTabPadBottom: !hasManualTabPadBottom,
    anchorsPass,
    missingAnchors,
    passes,
  });

  console.log(`  ${passes ? '✓' : '✗'} ${screen.path}: SubHeader=${usesSubHeader}, DetailScreen=${usesDetailScreen}, Scroll=${screen.scrollComponent}, NoManualPad=${!hasManualTabPadBottom}, Anchors=${anchorsPass ? 'ALL' : 'MISSING: ' + missingAnchors.join(',')}`);
}

// 2. Playwright Web Server Setup
console.log('\n--- 2. Playwright Runtime & Visual Proof Setup ---');

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
console.log(`[Batch 4A Proof] Static web server listening on port ${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const routes = [
  {
    name: 'bookmarks',
    parentTab: 'quran',
    navigate: (nav) => {
      nav.setTab('quran');
      nav.setQuran({ screen: 'bookmarks' });
    },
    expectedTitle: 'Bookmarks',
  },
  {
    name: 'hifz',
    parentTab: 'quran',
    navigate: (nav) => {
      nav.setTab('quran');
      nav.setQuran({ screen: 'hifz' });
    },
    expectedTitle: 'Hifz Tracker',
  },
  {
    name: 'hifz-practice',
    parentTab: 'quran',
    navigate: (nav) => {
      nav.setTab('quran');
      nav.setQuran({ screen: 'hifz-practice', surah: 1 });
    },
    expectedTitle: 'Al-Fatihah',
  },
  {
    name: 'names',
    parentTab: 'library',
    navigate: (nav) => {
      nav.setTab('library');
      nav.setLibrary({ screen: 'names' });
    },
    expectedTitle: '99 Names of Allah',
  },
  {
    name: 'names-prophet',
    parentTab: 'library',
    navigate: (nav) => {
      nav.setTab('library');
      nav.setLibrary({ screen: 'names-prophet' });
    },
    expectedTitle: '99 Names of the Prophet ﷺ',
  },
  {
    name: 'duas',
    parentTab: 'library',
    navigate: (nav) => {
      nav.setTab('library');
      nav.setLibrary({ screen: 'duas' });
    },
    expectedTitle: 'Duas & Adhkar',
  },
  {
    name: 'hadith',
    parentTab: 'library',
    navigate: (nav) => {
      nav.setTab('library');
      nav.setLibrary({ screen: 'hadith' });
    },
    expectedTitle: 'Hadith Library',
  },
  {
    name: 'makkah-live',
    parentTab: 'tools',
    navigate: (nav) => {
      nav.setTab('tools');
      nav.setTools({ screen: 'makkah-live' });
    },
    expectedTitle: 'Makkah Live TV',
  },
  {
    name: 'madinah-live',
    parentTab: 'tools',
    navigate: (nav) => {
      nav.setTab('tools');
      nav.setTools({ screen: 'madinah-live' });
    },
    expectedTitle: 'Madinah Live',
  },
];

const runtimeChecks = [];
let allRuntimePass = true;

// 3. Capture After Screenshots at 393x852 in Paper and Ink themes
console.log('\n--- 3. Capturing 393x852 Screenshots (Paper & Ink) ---');

for (const theme of ['paper', 'ink']) {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await context.addInitScript(({ theme }) => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem('islamic-settings', JSON.stringify({
        language: 'en',
        themeMode: theme,
        locationMode: 'manual',
        manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
        hifzTargetDays: 365,
      }));
    }, { theme });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate((rName) => {
      const nav = window.__NAVIGATE__;
      if (!nav) return;
      if (rName === 'bookmarks') {
        nav.setTab('quran');
        nav.setQuran({ screen: 'bookmarks' });
      } else if (rName === 'hifz') {
        nav.setTab('quran');
        nav.setQuran({ screen: 'hifz' });
      } else if (rName === 'hifz-practice') {
        nav.setTab('quran');
        nav.setQuran({ screen: 'hifz-practice', surah: 1 });
      } else if (rName === 'names') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'names' });
      } else if (rName === 'names-prophet') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'names-prophet' });
      } else if (rName === 'duas') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'duas' });
      } else if (rName === 'hadith') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'hadith' });
      } else if (rName === 'makkah-live') {
        nav.setTab('tools');
        nav.setTools({ screen: 'makkah-live' });
      } else if (rName === 'madinah-live') {
        nav.setTab('tools');
        nav.setTools({ screen: 'madinah-live' });
      }
    }, route.name);

    await page.waitForTimeout(1000);

    const measurements = await page.evaluate((expectedTitle) => {
      const subHeader = document.querySelector('[data-testid="sub-header"]');
      const title = document.querySelector('[data-testid="sub-header-title"]');
      const floatingNav = document.querySelector('[data-testid="floating-dock-surface"]') ||
        document.querySelector('[data-testid="floating-nav-surface"]') ||
        document.querySelector('[aria-label="Floating Navigation"]');

      let subHeaderRect = null;
      if (subHeader) {
        const r = subHeader.getBoundingClientRect();
        subHeaderRect = { x: r.x, y: r.y, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      }

      let floatingNavRect = null;
      if (floatingNav) {
        const r = floatingNav.getBoundingClientRect();
        floatingNavRect = { x: r.x, y: r.y, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      }

      // Check bottom clearance of scroll containers
      const candidates = [...document.querySelectorAll('*')].map((el) => {
        const style = window.getComputedStyle(el);
        return {
          scrollable: el.scrollHeight > el.clientHeight + 10,
          paddingBottom: parseFloat(style.paddingBottom) || 0,
        };
      });
      const padded = candidates.filter((item) => item.paddingBottom > 0);
      const bottomClearance = padded.reduce((max, item) => Math.max(max, item.paddingBottom), 0);
      const hasScrollContainer = candidates.some((item) => item.scrollable);

      // Mid-scroll and true-end scroll measurement
      const all = [...document.querySelectorAll('*')];
      const scroller = all.find((el) => {
        const s = window.getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      });

      let clearance = 999;
      let deepestBottom = 0;
      let deepestTag = '';
      let midScrollTop = 0;
      let maxScroll = 0;

      if (scroller && floatingNavRect) {
        maxScroll = scroller.scrollHeight - scroller.clientHeight;
        scroller.scrollTop = Math.round(maxScroll / 2);
        midScrollTop = scroller.scrollTop;

        scroller.scrollTop = scroller.scrollHeight;
        const leaves = [...scroller.querySelectorAll('*')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.height > 0 && r.width > 0 && el.children.length === 0 && (el.textContent?.trim() || el.tagName === 'INPUT' || el.tagName === 'BUTTON');
        });
        for (const leaf of leaves) {
          const r = leaf.getBoundingClientRect();
          if (r.bottom > deepestBottom) {
            deepestBottom = r.bottom;
            deepestTag = leaf.textContent?.trim().slice(0, 30) || leaf.tagName;
          }
        }
        clearance = floatingNavRect.top - deepestBottom;

        // Reset scroll position back to top before capturing screenshot
        scroller.scrollTop = 0;
      }

      return {
        subHeaderPresent: !!subHeader,
        subHeaderRect,
        titleText: title ? title.textContent : null,
        titleMatches: title ? title.textContent.includes(expectedTitle) : false,
        floatingNavPresent: !!floatingNav,
        floatingNavRect,
        hasScrollContainer,
        bottomClearance,
        clearance,
        deepestBottom,
        deepestTag,
        midScrollTop,
        maxScroll,
      };
    }, route.expectedTitle);

    const screenshotName = `${route.name}-${theme}-393x852.png`;
    const afterPath = path.join(AFTER_DIR, screenshotName);
    await page.screenshot({ path: afterPath });

    const routePass = measurements.subHeaderPresent &&
      measurements.floatingNavPresent &&
      measurements.titleMatches &&
      measurements.subHeaderRect &&
      measurements.subHeaderRect.height > 0 &&
      measurements.clearance >= 16;

    if (!routePass) allRuntimePass = false;

    console.log(`  ${routePass ? '✓' : '✗'} [${theme}] ${route.name}: SubHeader=${measurements.subHeaderPresent}, Title="${measurements.titleText}", FloatingNav=${measurements.floatingNavPresent}, H-Height=${measurements.subHeaderRect?.height}px, Clearance=${measurements.clearance.toFixed(1)}px (deepest: ${measurements.deepestTag})`);

    runtimeChecks.push({
      route: route.name,
      theme,
      screenshotName,
      measurements,
      routePass,
    });

    await context.close();
  }
}

// 4. Responsive Verification at 360x780 and 430x932
console.log('\n--- 4. Responsive Viewport Verification (360x780 & 430x932) ---');

const responsiveViewports = [
  { width: 360, height: 780, label: '360x780' },
  { width: 430, height: 932, label: '430x932' },
];

const responsiveChecks = [];

for (const vp of responsiveViewports) {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(() => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem('islamic-settings', JSON.stringify({
        language: 'en',
        themeMode: 'paper',
        locationMode: 'manual',
        manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
        hifzTargetDays: 365,
      }));
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate((rName) => {
      const nav = window.__NAVIGATE__;
      if (!nav) return;
      if (rName === 'bookmarks') {
        nav.setTab('quran');
        nav.setQuran({ screen: 'bookmarks' });
      } else if (rName === 'hifz') {
        nav.setTab('quran');
        nav.setQuran({ screen: 'hifz' });
      } else if (rName === 'hifz-practice') {
        nav.setTab('quran');
        nav.setQuran({ screen: 'hifz-practice', surah: 1 });
      } else if (rName === 'names') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'names' });
      } else if (rName === 'names-prophet') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'names-prophet' });
      } else if (rName === 'duas') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'duas' });
      } else if (rName === 'hadith') {
        nav.setTab('library');
        nav.setLibrary({ screen: 'hadith' });
      } else if (rName === 'makkah-live') {
        nav.setTab('tools');
        nav.setTools({ screen: 'makkah-live' });
      } else if (rName === 'madinah-live') {
        nav.setTab('tools');
        nav.setTools({ screen: 'madinah-live' });
      }
    }, route.name);

    await page.waitForTimeout(1000);

    const measurements = await page.evaluate((expectedTitle) => {
      const subHeader = document.querySelector('[data-testid="sub-header"]');
      const title = document.querySelector('[data-testid="sub-header-title"]');
      const floatingNav = document.querySelector('[data-testid="floating-dock-surface"]') ||
        document.querySelector('[data-testid="floating-nav-surface"]') ||
        document.querySelector('[aria-label="Floating Navigation"]');

      return {
        subHeaderPresent: !!subHeader,
        titleMatches: title ? title.textContent.includes(expectedTitle) : false,
        floatingNavPresent: !!floatingNav,
      };
    }, route.expectedTitle);

    const filename = `${route.name}-paper-${vp.label}.png`;
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, filename) });

    const pass = measurements.subHeaderPresent && measurements.titleMatches && measurements.floatingNavPresent;
    if (!pass) allRuntimePass = false;

    console.log(`  ${pass ? '✓' : '✗'} [${vp.label}] ${route.name}: subHeader=${measurements.subHeaderPresent}, titleMatch=${measurements.titleMatches}, floatingNav=${measurements.floatingNavPresent}`);

    responsiveChecks.push({
      route: route.name,
      viewport: vp.label,
      measurements,
      pass,
    });

    await context.close();
  }
}

await browser.close();
server.close();

// 5. Deterministic Pixel Difference Calculation against Real HEAD Baseline
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

for (const theme of ['paper', 'ink']) {
  for (const route of routes) {
    const filename = `${route.name}-${theme}-393x852.png`;
    const beforePath = path.join(BEFORE_DIR, filename);
    const afterPath = path.join(AFTER_DIR, filename);

    if (!fs.existsSync(beforePath)) {
      console.log(`  ✗ Missing before baseline: ${beforePath}`);
      allDiffsPass = false;
      pixelDiffResults.push({
        pairName: `${route.name}-${theme}`,
        error: `Missing before baseline at ${beforePath}`,
        pass: false,
      });
      continue;
    }

    const before = readPng(beforePath);
    const after = readPng(afterPath);

    if (before.width !== after.width || before.height !== after.height) {
      throw new Error(`Dimension mismatch for ${filename}: ${before.width}x${before.height} vs ${after.width}x${after.height}`);
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

    console.log(`  ${pass ? '✓' : '✗'} [${route.name}-${theme}]: Header=${headerPct}% (gate>=${HEADER_THRESHOLD_PCT}%), Full=${fullPct}% (gate>=${FULL_THRESHOLD_PCT}%) -> ${pass ? 'PASS' : 'FAIL'}`);

    pixelDiffResults.push({
      route: route.name,
      theme,
      pairName: `${route.name}-${theme}`,
      headerPct,
      headerPass,
      fullPct,
      fullPass,
      pass,
    });
  }
}

// 6. Complete Screenshot Inventory & Dimension Reconciliation
console.log('\n--- 6. Screenshot Inventory & Dimension Reconciliation ---');
let allInventoryPass = true;
const inventoryResults = [];

// Primary 393x852 screenshots
const expectedPrimaryScreenshots = [];
for (const theme of ['paper', 'ink']) {
  for (const route of routes) {
    expectedPrimaryScreenshots.push(`${route.name}-${theme}-393x852.png`);
  }
}
const onDiskPrimary = fs.readdirSync(AFTER_DIR).filter((f) => f.endsWith('.png'));
const primaryCountPass = onDiskPrimary.length === expectedPrimaryScreenshots.length;
if (!primaryCountPass) allInventoryPass = false;
console.log(`  ${primaryCountPass ? '✓' : '✗'} Primary after screenshots count: ${onDiskPrimary.length} / ${expectedPrimaryScreenshots.length}`);

for (const name of expectedPrimaryScreenshots) {
  const filePath = path.join(AFTER_DIR, name);
  const exists = fs.existsSync(filePath);
  let dimPass = false;
  let dims = null;
  if (exists) {
    const png = readPng(filePath);
    dims = { width: png.width, height: png.height };
    dimPass = png.width === 393 && png.height === 852;
  }
  const itemPass = exists && dimPass;
  if (!itemPass) allInventoryPass = false;
  inventoryResults.push({ file: name, exists, dims, expected: { width: 393, height: 852 }, pass: itemPass });
}

// Responsive screenshots (360x780 & 430x932)
const expectedResponsiveScreenshots = [];
for (const vp of responsiveViewports) {
  for (const route of routes) {
    expectedResponsiveScreenshots.push({ name: `${route.name}-paper-${vp.label}.png`, width: vp.width, height: vp.height });
  }
}
const onDiskResponsive = fs.readdirSync(RESPONSIVE_DIR).filter((f) => f.endsWith('.png'));
const responsiveCountPass = onDiskResponsive.length === expectedResponsiveScreenshots.length;
if (!responsiveCountPass) allInventoryPass = false;
console.log(`  ${responsiveCountPass ? '✓' : '✗'} Responsive screenshots count: ${onDiskResponsive.length} / ${expectedResponsiveScreenshots.length}`);

for (const item of expectedResponsiveScreenshots) {
  const filePath = path.join(RESPONSIVE_DIR, item.name);
  const exists = fs.existsSync(filePath);
  let dimPass = false;
  let dims = null;
  if (exists) {
    const png = readPng(filePath);
    dims = { width: png.width, height: png.height };
    dimPass = png.width === item.width && png.height === item.height;
  }
  const itemPass = exists && dimPass;
  if (!itemPass) allInventoryPass = false;
  inventoryResults.push({ file: item.name, exists, dims, expected: { width: item.width, height: item.height }, pass: itemPass });
}

// 7. Generate Proof Report
const report = {
  timestamp: new Date().toISOString(),
  batch: 'Batch 4A — Bookmarks, Duas, HadithLibrary, HifzPractice, Hifz, MadinahLive, MakkahLive, Names',
  staticAnalysis: {
    allPassed: allStaticPass,
    results: staticResults,
  },
  runtimeChecks: {
    allPassed: allRuntimePass,
    results: runtimeChecks,
    responsiveResults: responsiveChecks,
  },
  pixelDiff: {
    allPassed: allDiffsPass,
    thresholds: {
      headerThresholdPct: HEADER_THRESHOLD_PCT,
      fullThresholdPct: FULL_THRESHOLD_PCT,
      channelDiffThreshold: CHANNEL_DIFF_THRESHOLD,
    },
    results: pixelDiffResults,
  },
  inventory: {
    allPassed: allInventoryPass,
    primaryCount: onDiskPrimary.length,
    responsiveCount: onDiskResponsive.length,
    results: inventoryResults,
  },
};

const reportPath = path.join(PROOF_DIR, 'proof-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`\n✓ Proof report written to ${reportPath}`);

if (!allStaticPass || !allRuntimePass || !allDiffsPass || !allInventoryPass) {
  console.error('\nBatch 4A proof check finished with failures: strict threshold gates or checks unmet.');
  process.exit(1);
} else {
  console.log('\nAll Batch 4A proof checks passed successfully!');
  process.exit(0);
}
