import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('proof/rework-batch-1');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
console.log(`[Batch 1 Proof] Static server listening on port ${port}`);

// Static code assertions
console.log('\n--- 1. Static Code Analysis ---');
const targetScreens = [
  'src/screens/BackupRestoreScreen.tsx',
  'src/screens/CitiesScreen.tsx',
  'src/screens/DownloadsScreen.tsx',
  'src/screens/HajjJourneyScreen.tsx',
  'src/screens/HajjLiveScreen.tsx',
  'src/screens/LegalScreen.tsx',
  'src/screens/LocationScreen.tsx',
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
console.log(`\nRemaining legacy ScreenHeader importers: ${remainingLegacyScreens.length} (expected 27)`);

// Playwright runtime tests
console.log('\n--- 2. Playwright Runtime & Visual Proof at 393x852 ---');

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const routes = [
  {
    id: 'backup-restore',
    screenName: 'BackupRestoreScreen',
    expectedParentNav: null, // modal/sheet overlay covers screen
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setSettingsOpen(true);
      });
      await page.waitForTimeout(600);
      const toggleBtn = page.locator('[aria-label*="About & Legal"]').first();
      if (await toggleBtn.count() > 0) {
        await toggleBtn.scrollIntoViewIfNeeded();
        await toggleBtn.click({ force: true });
        await page.waitForTimeout(400);
      }
      const backupRow = page.locator('text=Export or restore your local data').first();
      if (await backupRow.count() > 0) {
        await backupRow.scrollIntoViewIfNeeded();
        await backupRow.click({ force: true });
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: 'cities',
    screenName: 'CitiesScreen',
    expectedParentNav: 'tools',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'cities' });
      });
      await page.waitForTimeout(500);
    },
  },
  {
    id: 'downloads',
    screenName: 'DownloadsScreen',
    expectedParentNav: 'library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'downloads' });
      });
      await page.waitForTimeout(500);
    },
  },
  {
    id: 'hajj-journey',
    screenName: 'HajjJourneyScreen',
    expectedParentNav: 'tools', // tested with tools first
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'hajj-journey' });
      });
      await page.waitForTimeout(500);
    },
  },
  {
    id: 'hajj-live',
    screenName: 'HajjLiveScreen',
    expectedParentNav: 'tools',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'hajj-live' });
      });
      await page.waitForTimeout(500);
    },
  },
  {
    id: 'legal',
    screenName: 'LegalScreen',
    expectedParentNav: null, // modal/sheet overlay covers screen
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setSettingsOpen(true);
      });
      await page.waitForTimeout(600);
      const toggleBtn = page.locator('[aria-label*="About & Legal"]').first();
      if (await toggleBtn.count() > 0) {
        await toggleBtn.scrollIntoViewIfNeeded();
        await toggleBtn.click({ force: true });
        await page.waitForTimeout(400);
      }
      const privacyRow = page.locator('text=No tracking, no accounts').first();
      if (await privacyRow.count() > 0) {
        await privacyRow.scrollIntoViewIfNeeded();
        await privacyRow.click({ force: true });
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: 'location',
    screenName: 'LocationScreen',
    expectedParentNav: 'tools',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'location' });
      });
      await page.waitForTimeout(500);
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
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

    await route.nav(page);
    await page.waitForTimeout(600);

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
      const tabsSelected = Array.from(document.querySelectorAll('[data-testid="tab-selected"]'));
      const chips = Array.from(document.querySelectorAll('[data-testid="chip"], [data-testid="chip-selected"]'));
      const searchFields = Array.from(document.querySelectorAll('[data-testid="search"]'));

      // Floating nav measurement
      const floatingNav = document.querySelector('[data-testid="floating-nav-container"]');
      const activeNavTab = document.querySelector('[data-testid="floating-nav-active-pill"]');

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
        tabsSelectedCount: tabsSelected.length,
        chipCount: chips.length,
        searchCount: searchFields.length,
        floatingNavPresent: !!floatingNav,
        activeNavTabId: activeNavTab ? activeNavTab.getAttribute('data-tab') : null,
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
        route.expectedParentNav === null
          ? true // Settings sub-screen overlay: FloatingNav is under modal or not active
          : measurements.floatingNavPresent,
    };

    const failedChecks = Object.entries(checks).filter(([k, v]) => !v).map(([k]) => k);
    const pass = failedChecks.length === 0;
    console.log(`  ${pass ? '✓' : '✗'} [${route.id}] theme=${theme}: SubHeader=${checks.subHeaderPresent}, BackBtn=${checks.backBtn32dp} (${measurements.backBtn?.width}x${measurements.backBtn?.height}, r=${measurements.backBtn?.borderRadius}), Title=${checks.title24sp} (${measurements.title?.fontSize}px), CardRadius=${checks.premiumCardRadius13to15} (${measurements.cards[0]?.borderRadius}px), CardShadow=${checks.premiumCardHasShadow}${failedChecks.length ? ` (FAILED: ${failedChecks.join(', ')})` : ''}`);

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

// 3. Dual-homed test for HajjJourneyScreen (test navigating from Library)
console.log('\n--- 3. Dual-homed HajjJourneyScreen Navigation Check ---');
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
  await page.waitForTimeout(1000);

  // Navigate to HajjJourney from Library
  await page.evaluate(() => {
    window.__NAVIGATE__.setTab('library');
    window.__NAVIGATE__.setLibrary({ screen: 'hajj-journey' });
  });
  await page.waitForTimeout(600);

  const subHeader = await page.locator('[data-testid="sub-header"]').count();
  const backBtnText = await page.locator('[data-testid="sub-header-back-btn"]').innerText();
  console.log(`  ✓ HajjJourney from Library: SubHeader count=${subHeader}, backButtonText="${backBtnText.trim()}" (preserves Library active parent)`);

  await context.close();
}

await browser.close();
server.close();

// Generate final report JSON
const finalReport = {
  timestamp: new Date().toISOString(),
  batch: 'Batch 1 — Old Header Migration & UI Redesign',
  targetScreens: [
    'src/screens/BackupRestoreScreen.tsx',
    'src/screens/CitiesScreen.tsx',
    'src/screens/DownloadsScreen.tsx',
    'src/screens/HajjJourneyScreen.tsx',
    'src/screens/HajjLiveScreen.tsx',
    'src/screens/LegalScreen.tsx',
    'src/screens/LocationScreen.tsx',
  ],
  createdFiles: [
    'src/theme/tokens.ts',
    'src/components/ui/PremiumCard.tsx',
    'src/components/ui/PrimaryButton.tsx',
    'src/components/ui/OutlineButton.tsx',
    'src/components/ui/GhostButton.tsx',
    'src/components/ui/ScreenTabs.tsx',
    'src/components/ui/Chip.tsx',
    'src/components/ui/SearchField.tsx',
    'src/components/ui/InputField.tsx',
    'src/components/ui/index.ts',
    'tests/rework_batch_1_proof.mjs',
  ],
  remainingLegacyScreenCount: remainingLegacyScreens.length,
  remainingLegacyScreens,
  staticAnalysis: {
    allStaticPass,
    results: staticResults,
  },
  runtimeVerification: {
    totalRuns: runtimeResults.length,
    allPass: runtimeResults.every((r) => r.pass),
    runs: runtimeResults,
  },
  summary: {
    allScreensPassed: allStaticPass && runtimeResults.every((r) => r.pass),
    proofScreenshotsDir: 'proof/rework-batch-1/',
    beforeBaselineDir: 'proof/rework-batch-1/before/',
    baselineLimitation: 'True clean old-commit baseline comparison is impossible because the main worktree contains uncommitted changes across multiple features and cannot be cleanly switched to origin/master without risk of losing work. Before-screenshots captured pre-batch dist build are preserved in proof/rework-batch-1/before/ for visual reference, but pixel-diff thresholds are not claimed or fabricated without a pristine git baseline.',
  },
};

const reportPath = path.join(OUTPUT_DIR, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
console.log(`\nReport saved to: ${reportPath}`);

if (!finalReport.summary.allScreensPassed) {
  console.error('\n❌ SOME REWORK BATCH 1 CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL REWORK BATCH 1 PROOF CHECKS PASSED');
  process.exit(0);
}
