import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/ubuntu/apps/islamic_app/package.json');
const { PNG } = require('pngjs');

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const PROOF_DIR = path.resolve('proof/rework-batch-5a');
const BEFORE_DIR = path.join(PROOF_DIR, 'before');
const AFTER_DIR = path.join(PROOF_DIR, 'after');
const RESPONSIVE_DIR = path.join(PROOF_DIR, 'responsive');

fs.mkdirSync(AFTER_DIR, { recursive: true });
fs.mkdirSync(RESPONSIVE_DIR, { recursive: true });

console.log('=== Batch 5A Focused Proof ===\n');

// 1. Static Code Analysis & Contract Verification
console.log('--- 1. Static Code Analysis & Contract Verification ---');

const ownedScreens = [
  {
    path: 'src/screens/RamadanGuideScreen.tsx',
    anchors: ['RAMADAN_GUIDE_SECTIONS', 'refreshGuideItems', 'fetchHijriMonth', 'getSeasonalBanner', 'HIJRI_MONTHS', 'getNextEvent'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/PrayerGuideScreen.tsx',
    anchors: ['PRAYER_GUIDE_SECTIONS', 'SECTION_ICONS', 'refreshGuideItems', 'renderItem', 'selectedSectionId', 'hScrollRTLStyle'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/ShahadaScreen.tsx',
    anchors: ['SHAHADA_SECTIONS', 'SHAHADA_VERSE', 'heroArabic', 'declarationArabic', 'itemArabic'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/UmrahGuideScreen.tsx',
    anchors: ['UMRAH_STEPS', 'activeStepId', 'onOpenDuas', 'hScrollRTLStyle', 'backLabel'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/UmrahResourcesScreen.tsx',
    anchors: ['PACKING_ITEMS', 'RECOMMENDED_BOOKS', 'COMMON_MISTAKES', 'FIRST_TIMER_TIPS', 'packedIds', 'activeTab', 'onOpenDuas', 'packedCount'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/HajjJourneyScreen.tsx',
    anchors: ['HAJJ_DAYS', 'selectedDayId', 'onOpenDuas', 'hScrollRTLStyle', 'backLabel'],
    scrollComponent: 'DetailScreen.ScrollView',
  },
  {
    path: 'src/screens/WeeklySummaryScreen.tsx',
    anchors: ['buildWeeklySummary', 'fmtDate', 'loading', 'summary', 'backLabel'],
    scrollComponent: 'DetailScreen.ScrollView',
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
console.log(`[Batch 5A Proof] Static web server listening on port ${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const routes = [
  {
    name: 'lib-ramadan-guide',
    parentTab: 'library',
    expectedTitle: 'Ramadan & Eid Guide',
  },
  {
    name: 'lib-prayer-guide',
    parentTab: 'library',
    expectedTitle: 'Prayer Guide (Fiqh)',
  },
  {
    name: 'lib-prayer-guide-later',
    parentTab: 'library',
    expectedTitle: 'Prayer Guide (Fiqh)',
  },
  {
    name: 'lib-shahada',
    parentTab: 'library',
    expectedTitle: 'The Shahada',
  },
  {
    name: 'lib-summary',
    parentTab: 'library',
    expectedTitle: 'Weekly Summary',
  },
  {
    name: 'lib-umrah-guide',
    parentTab: 'library',
    expectedTitle: 'Umrah Guide',
  },
  {
    name: 'lib-umrah-guide-later',
    parentTab: 'library',
    expectedTitle: 'Umrah Guide',
  },
  {
    name: 'lib-hajj-journey',
    parentTab: 'library',
    expectedTitle: 'Hajj Journey',
  },
  {
    name: 'lib-hajj-journey-later',
    parentTab: 'library',
    expectedTitle: 'Hajj Journey',
  },
  {
    name: 'tools-summary',
    parentTab: 'tools',
    expectedTitle: 'Weekly Summary',
  },
  {
    name: 'tools-umrah-guide',
    parentTab: 'tools',
    expectedTitle: 'Umrah Guide',
  },
  {
    name: 'tools-umrah-resources',
    parentTab: 'tools',
    expectedTitle: 'Umrah Resources',
  },
  {
    name: 'tools-umrah-resources-later',
    parentTab: 'tools',
    expectedTitle: 'Umrah Resources',
  },
  {
    name: 'tools-hajj-journey',
    parentTab: 'tools',
    expectedTitle: 'Hajj Journey',
  },
];

async function navigateToRoute(page, routeName) {
  await page.evaluate((rName) => {
    const nav = window.__NAVIGATE__;
    if (!nav) return;
    if (rName.startsWith('lib-')) {
      nav.setTab('library');
      if (rName === 'lib-ramadan-guide') nav.setLibrary({ screen: 'ramadan-guide' });
      else if (rName === 'lib-prayer-guide' || rName === 'lib-prayer-guide-later') nav.setLibrary({ screen: 'prayer-guide' });
      else if (rName === 'lib-shahada') nav.setLibrary({ screen: 'shahada' });
      else if (rName === 'lib-summary') nav.setLibrary({ screen: 'summary' });
      else if (rName === 'lib-umrah-guide' || rName === 'lib-umrah-guide-later') nav.setLibrary({ screen: 'umrah-guide' });
      else if (rName === 'lib-hajj-journey' || rName === 'lib-hajj-journey-later') nav.setLibrary({ screen: 'hajj-journey' });
    } else if (rName.startsWith('tools-')) {
      nav.setTab('tools');
      if (rName === 'tools-summary') nav.setTools({ screen: 'summary' });
      else if (rName === 'tools-umrah-guide') nav.setTools({ screen: 'umrah-guide' });
      else if (rName === 'tools-umrah-resources' || rName === 'tools-umrah-resources-later') nav.setTools({ screen: 'umrah-resources' });
      else if (rName === 'tools-hajj-journey') nav.setTools({ screen: 'hajj-journey' });
    }
  }, routeName);

  if (routeName.endsWith('-later')) {
    await page.waitForTimeout(600);
    await page.evaluate((rName) => {
      const buttons = [...document.querySelectorAll('[role="button"], [aria-label]')];
      if (rName === 'lib-prayer-guide-later') {
        const btn = buttons.find((b) => b.textContent?.includes('Salah') || b.textContent?.includes('Prayer') || b.textContent?.includes('Wudu'));
        if (btn) btn.click();
      } else if (rName === 'lib-umrah-guide-later') {
        const btn = buttons.find((b) => b.textContent?.includes('Tawaf') || b.getAttribute('aria-label')?.includes('Tawaf'));
        if (btn) btn.click();
      } else if (rName === 'lib-hajj-journey-later') {
        const btn = buttons.find((b) => b.textContent?.includes('Day 2') || b.getAttribute('aria-label')?.includes('Day 2') || b.textContent?.includes('Arafah'));
        if (btn) btn.click();
      } else if (rName === 'tools-umrah-resources-later') {
        const btn = buttons.find((b) => b.textContent?.includes('First-Timer') || b.textContent?.includes('Tips') || b.getAttribute('aria-label')?.includes('Tips'));
        if (btn) btn.click();
      }
    }, routeName);
  }
}

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

    await navigateToRoute(page, route.name);
    await page.waitForTimeout(1000);

    const measurements = await page.evaluate((args) => {
      const { expectedTitle, parentTab } = args;
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

      // Check active parent tab
      const tabButton = document.querySelector(`[data-testid="floating-nav-tab-${parentTab}"]`);
      let activeTabMatch = false;
      if (tabButton) {
        const ariaSelected = tabButton.getAttribute('aria-selected');
        const hasActivePill = !!tabButton.querySelector('[data-testid="floating-nav-active-pill"]') ||
          !!tabButton.querySelector('[data-testid="floating-nav-active-label"]');
        activeTabMatch = ariaSelected === 'true' || hasActivePill;
      }

      // Check DetailScreen root & sole vertical scroll owner
      const detailRoot = document.querySelector('[data-testid="detail-screen-root"]');
      const detailScreenPresent = !!detailRoot;

      const all = [...document.querySelectorAll('*')];
      const verticalScrollers = all.filter((el) => {
        const s = window.getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      });

      const scroller = verticalScrollers.find((el) => detailRoot?.contains(el)) || verticalScrollers[0];
      const soleVerticalScrollOwner = detailScreenPresent && (verticalScrollers.length <= 1 || verticalScrollers.every(s => detailRoot.contains(s)));

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
        activeTabMatch,
        floatingNavPresent: !!floatingNav,
        floatingNavRect,
        detailScreenPresent,
        soleVerticalScrollOwner,
        clearance,
        deepestBottom,
        deepestTag,
        midScrollTop,
        maxScroll,
      };
    }, { expectedTitle: route.expectedTitle, parentTab: route.parentTab });

    const screenshotName = `${route.name}-${theme}-393x852.png`;
    const afterPath = path.join(AFTER_DIR, screenshotName);
    await page.screenshot({ path: afterPath });

    const routePass = measurements.subHeaderPresent &&
      measurements.floatingNavPresent &&
      measurements.titleMatches &&
      measurements.activeTabMatch &&
      measurements.detailScreenPresent &&
      measurements.subHeaderRect &&
      measurements.subHeaderRect.height > 0 &&
      measurements.clearance >= 16;

    if (!routePass) allRuntimePass = false;

    console.log(`  ${routePass ? '✓' : '✗'} [${theme}] ${route.name}: SubHeader=${measurements.subHeaderPresent}, Title="${measurements.titleText}", TabActive=${measurements.activeTabMatch}, FloatingNav=${measurements.floatingNavPresent}, H-Height=${measurements.subHeaderRect?.height}px, Clearance=${measurements.clearance.toFixed(1)}px (deepest: ${measurements.deepestTag})`);

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

// 4. Responsive Verification at 360x852 and 430x852
console.log('\n--- 4. Responsive Viewport Verification (360x852 & 430x852) ---');

const responsiveViewports = [
  { width: 360, height: 852, label: '360x852' },
  { width: 430, height: 852, label: '430x852' },
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

    await navigateToRoute(page, route.name);
    await page.waitForTimeout(1000);

    const measurements = await page.evaluate((args) => {
      const { expectedTitle, parentTab } = args;
      const subHeader = document.querySelector('[data-testid="sub-header"]');
      const title = document.querySelector('[data-testid="sub-header-title"]');
      const floatingNav = document.querySelector('[data-testid="floating-dock-surface"]') ||
        document.querySelector('[data-testid="floating-nav-surface"]') ||
        document.querySelector('[aria-label="Floating Navigation"]');
      const detailRoot = document.querySelector('[data-testid="detail-screen-root"]');

      const tabButton = document.querySelector(`[data-testid="floating-nav-tab-${parentTab}"]`);
      let activeTabMatch = false;
      if (tabButton) {
        const ariaSelected = tabButton.getAttribute('aria-selected');
        const hasActivePill = !!tabButton.querySelector('[data-testid="floating-nav-active-pill"]') ||
          !!tabButton.querySelector('[data-testid="floating-nav-active-label"]');
        activeTabMatch = ariaSelected === 'true' || hasActivePill;
      }

      return {
        subHeaderPresent: !!subHeader,
        titleMatches: title ? title.textContent.includes(expectedTitle) : false,
        activeTabMatch,
        floatingNavPresent: !!floatingNav,
        detailScreenPresent: !!detailRoot,
      };
    }, { expectedTitle: route.expectedTitle, parentTab: route.parentTab });

    const filename = `${route.name}-paper-${vp.label}.png`;
    await page.screenshot({ path: path.join(RESPONSIVE_DIR, filename) });

    const pass = measurements.subHeaderPresent &&
      measurements.titleMatches &&
      measurements.activeTabMatch &&
      measurements.floatingNavPresent &&
      measurements.detailScreenPresent;

    if (!pass) allRuntimePass = false;

    console.log(`  ${pass ? '✓' : '✗'} [${vp.label}] ${route.name}: subHeader=${measurements.subHeaderPresent}, titleMatch=${measurements.titleMatches}, tabActive=${measurements.activeTabMatch}, floatingNav=${measurements.floatingNavPresent}`);

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

// Responsive screenshots (360x852 & 430x852)
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
  batch: 'Batch 5A — RamadanGuide, PrayerGuide, Shahada, UmrahGuide, UmrahResources, HajjJourney, WeeklySummary',
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
  console.error('\nBatch 5A proof check finished with failures: strict threshold gates or checks unmet.');
  process.exit(1);
} else {
  console.log('\nAll Batch 5A proof checks passed successfully!');
  process.exit(0);
}
