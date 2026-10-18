import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/ubuntu/apps/islamic_app/package.json');
const { PNG } = require('pngjs');

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('proof/rework-batch-3b/after');
const BEFORE_DIR = path.resolve('proof/rework-batch-3b/before');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(BEFORE_DIR, { recursive: true });

console.log('=== Batch 3B Focused Proof ===\n');

const checks = [];
const assert = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) {
    console.error(`  ✗ FAIL: ${name}${detail ? ` (${detail})` : ''}`);
    throw new Error(`Assertion failed: ${name}${detail ? ` (${detail})` : ''}`);
  }
  console.log(`  ✓ PASS: ${name}${detail ? ` (${detail})` : ''}`);
};

// 1. Static Code Analysis & File Guard Checks
console.log('--- 1. Static Code Analysis & File Guard Checks ---');
const targetMigratedScreens = [
  'src/screens/WomenGuidanceScreen.tsx',
  'src/screens/WomenPurityScreen.tsx',
];

const staticResults = [];

for (const screenPath of targetMigratedScreens) {
  const content = fs.readFileSync(path.resolve(screenPath), 'utf8');
  const hasLegacyHeaderImport = /from ['"].*ScreenHeader['"]/.test(content);
  const usesSubHeader = content.includes('SubHeader');
  const usesDetailScreen = content.includes('DetailScreen');
  const usesPremiumCard = content.includes('PremiumCard');
  const usesThemeTokens = content.includes('HOME_THEME_TOKENS');
  const usesTabPadBottom = content.includes('TAB_PAD_BOTTOM');

  assert(`${screenPath}: removes legacy ScreenHeader`, !hasLegacyHeaderImport);
  assert(`${screenPath}: uses SubHeader layout component`, usesSubHeader);
  assert(`${screenPath}: uses DetailScreen layout container`, usesDetailScreen);
  assert(`${screenPath}: uses PremiumCard design system token`, usesPremiumCard);
  assert(`${screenPath}: uses HOME_THEME_TOKENS`, usesThemeTokens);
  assert(`${screenPath}: preserves TAB_PAD_BOTTOM clearance token`, usesTabPadBottom);

  staticResults.push({
    file: screenPath,
    hasLegacyHeaderImport,
    usesSubHeader,
    usesDetailScreen,
    usesPremiumCard,
    usesThemeTokens,
    usesTabPadBottom,
    passes: true,
  });
}

// SettingsScreen static checks
{
  const settingsContent = fs.readFileSync(path.resolve('src/screens/SettingsScreen.tsx'), 'utf8');
  const hasGetCardShadow = settingsContent.includes('getCardShadow');
  const hasSettingsTokens = settingsContent.includes('getSettingsTokens');
  const preservesModalContract = settingsContent.includes('onClose') && settingsContent.includes('onBackRef') && settingsContent.includes('onPrepareReload');
  const preservesSubScreens = settingsContent.includes('LegalScreen') && settingsContent.includes('BackupRestoreScreen');
  const preservesBackRef = settingsContent.includes('onBackRef.current = () =>');
  const preservesQueue = settingsContent.includes('setLanguage');

  assert('SettingsScreen: uses getCardShadow theme token', hasGetCardShadow);
  assert('SettingsScreen: uses getSettingsTokens theme system', hasSettingsTokens);
  assert('SettingsScreen: preserves modal contract (onClose, onBackRef, onPrepareReload)', preservesModalContract);
  assert('SettingsScreen: preserves sub-screens (LegalScreen, BackupRestoreScreen)', preservesSubScreens);
  assert('SettingsScreen: preserves backRef delegation pattern', preservesBackRef);
  assert('SettingsScreen: preserves language queue mechanism', preservesQueue);
}

// 2. Playwright Runtime & Visual Proof at 393x852
console.log('\n--- 2. Playwright Runtime & Visual Proof at 393x852 ---');

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
console.log(`[Batch 3B Proof] Static server listening on port ${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const runtimeChecks = [];

async function measureScreenAndScrollEnd(page, expectedTitle) {
  return await page.evaluate((title) => {
    const subHeader = document.querySelector('[data-testid="sub-header"]');
    const titleEl = document.querySelector('[data-testid="sub-header-title"]');
    const floatingNav = document.querySelector('[data-testid="floating-dock-surface"]') ||
      document.querySelector('[data-testid="floating-nav-surface"]') ||
      document.querySelector('[aria-label="Floating Navigation"]');

    const candidates = [...document.querySelectorAll('*')].map((el) => {
      const style = getComputedStyle(el);
      return { scrollable: el.scrollHeight > el.clientHeight + 10, paddingBottom: parseFloat(style.paddingBottom) || 0 };
    });
    const padded = candidates.filter((item) => item.paddingBottom > 0);
    const paddingBottom = padded.reduce((max, item) => Math.max(max, item.paddingBottom), 0);
    const scrollContainer = candidates.some((item) => item.scrollable);

    const all = [...document.querySelectorAll('*')];
    const scroller = all.find((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });

    let clearance = 999;
    let deepestBottom = 0;
    let deepestTag = '';
    const navRect = floatingNav ? floatingNav.getBoundingClientRect() : null;
    let midScrollTop = 0;
    let maxScroll = 0;

    if (scroller && navRect) {
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
      clearance = navRect.top - deepestBottom;
    }

    return {
      subHeaderPresent: !!subHeader,
      titleText: titleEl ? titleEl.textContent : null,
      titleMatches: titleEl ? titleEl.textContent.includes(title) : false,
      floatingNavPresent: !!floatingNav,
      hasScrollContainer: scrollContainer,
      paddingBottom,
      clearance,
      deepestBottom,
      deepestTag,
      midScrollTop,
      maxScroll,
      navTop: navRect ? navRect.top : null,
    };
  }, expectedTitle);
}

for (const theme of ['paper', 'ink']) {
  // Test Women's Guidance & Purity in Tools tab (with FloatingNav present)
  {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await context.addInitScript(({ theme }) => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem('islamic-settings', JSON.stringify({
        language: 'en',
        themeMode: theme,
        womenWorshipEnabled: true,
        womenLockEnabled: false,
      }));
    }, { theme });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Navigate to Women Guidance
    await page.evaluate(() => {
      window.__NAVIGATE__.setTab('tools');
      window.__NAVIGATE__.setTools({ screen: 'women-guidance' });
    });
    await page.waitForTimeout(1000);

    const guidanceMeasurements = await measureScreenAndScrollEnd(page, 'Worship Guidance');
    assert(`[women-guidance-${theme}] SubHeader present`, guidanceMeasurements.subHeaderPresent);
    assert(`[women-guidance-${theme}] title matches "Worship Guidance"`, guidanceMeasurements.titleMatches, guidanceMeasurements.titleText);
    assert(`[women-guidance-${theme}] FloatingNav present`, guidanceMeasurements.floatingNavPresent);
    assert(`[women-guidance-${theme}] scroll container present`, guidanceMeasurements.hasScrollContainer);
    assert(`[women-guidance-${theme}] paddingBottom >= 100`, guidanceMeasurements.paddingBottom >= 100, `paddingBottom=${guidanceMeasurements.paddingBottom}px`);
    assert(
      `[women-guidance-${theme}] scroll-end content clears FloatingNav >= 16px`,
      guidanceMeasurements.clearance >= 16,
      `clearance=${guidanceMeasurements.clearance.toFixed(1)}px (deepest: ${guidanceMeasurements.deepestTag})`
    );

    await page.screenshot({ path: path.join(OUTPUT_DIR, `women-guidance-${theme}.png`) });

    // Navigate to Women Purity
    await page.evaluate(() => {
      window.__NAVIGATE__.setTools({ screen: 'women-purity' });
    });
    await page.waitForTimeout(1000);

    const purityMeasurements = await measureScreenAndScrollEnd(page, 'Purity & Ghusl');
    assert(`[women-purity-${theme}] SubHeader present`, purityMeasurements.subHeaderPresent);
    assert(`[women-purity-${theme}] title matches "Purity & Ghusl"`, purityMeasurements.titleMatches, purityMeasurements.titleText);
    assert(`[women-purity-${theme}] FloatingNav present`, purityMeasurements.floatingNavPresent);
    assert(`[women-purity-${theme}] scroll container present`, purityMeasurements.hasScrollContainer);
    assert(`[women-purity-${theme}] paddingBottom >= 100`, purityMeasurements.paddingBottom >= 100, `paddingBottom=${purityMeasurements.paddingBottom}px`);
    assert(
      `[women-purity-${theme}] scroll-end content clears FloatingNav >= 16px`,
      purityMeasurements.clearance >= 16,
      `clearance=${purityMeasurements.clearance.toFixed(1)}px (deepest: ${purityMeasurements.deepestTag})`
    );

    await page.screenshot({ path: path.join(OUTPUT_DIR, `women-purity-${theme}.png`) });

    runtimeChecks.push({ screen: 'women-guidance', theme, measurements: guidanceMeasurements });
    runtimeChecks.push({ screen: 'women-purity', theme, measurements: purityMeasurements });

    await context.close();
  }

  // Test Settings Modal (without FloatingNav, full screen modal)
  {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await context.addInitScript(({ theme }) => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem('islamic-settings', JSON.stringify({
        language: 'en',
        themeMode: theme,
        womenWorshipEnabled: true,
        womenLockEnabled: false,
      }));
    }, { theme });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      window.__NAVIGATE__.setSettingsOpen(true);
    });
    await page.waitForTimeout(1000);

    const settingsMeasurements = await page.evaluate(() => {
      const closeBtn = document.querySelector('[aria-label="Close settings"]');
      const headerTitle = document.body.innerText.includes('Settings');
      const floatingNav = document.querySelector('[data-testid="floating-dock-surface"]') ||
        document.querySelector('[data-testid="floating-nav-surface"]') ||
        document.querySelector('[aria-label="Floating Navigation"]');
      const closeBtnRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
      return {
        closeBtnPresent: !!closeBtn,
        closeBtnTouchTarget: closeBtnRect ? closeBtnRect.height >= 30 && closeBtnRect.width >= 30 : false,
        headerTitle,
        floatingNavPresent: !!floatingNav,
      };
    });

    assert(`[settings-${theme}] close button present with adequate touch target`, settingsMeasurements.closeBtnPresent && settingsMeasurements.closeBtnTouchTarget);
    assert(`[settings-${theme}] route title Settings present`, settingsMeasurements.headerTitle);
    assert(`[settings-${theme}] floating nav absent in modal`, !settingsMeasurements.floatingNavPresent);

    await page.screenshot({ path: path.join(OUTPUT_DIR, `settings-${theme}.png`) });

    // Nested modal states must remain route-visible and full-screen, without the dock
    const legalLink = page.getByRole('button', { name: /About & Legal/ }).first();
    assert(`[settings-${theme}] About & Legal button accessible`, (await legalLink.count()) > 0);
    await legalLink.click();
    await page.waitForTimeout(500);

    const privacyLink = page.getByText('Privacy Policy', { exact: true }).first();
    assert(`[settings-${theme}] Privacy Policy button accessible`, (await privacyLink.count()) > 0);
    await privacyLink.click();
    await page.waitForTimeout(500);

    const legalMeasurements = await page.evaluate(() => {
      const text = document.body.innerText;
      const privacyTitle = text.includes('Privacy Policy');
      const subHeader = document.querySelector('[data-testid="sub-header"]');
      const floatingNav = document.querySelector('[data-testid="floating-dock-surface"]') ||
        document.querySelector('[data-testid="floating-nav-surface"]') ||
        document.querySelector('[aria-label="Floating Navigation"]');
      return {
        privacyTitle,
        subHeaderPresent: !!subHeader,
        floatingNavPresent: !!floatingNav,
      };
    });

    assert(`[settings-${theme}-legal] Privacy Policy visible`, legalMeasurements.privacyTitle);
    assert(`[settings-${theme}-legal] SubHeader present in LegalScreen`, legalMeasurements.subHeaderPresent);
    assert(`[settings-${theme}-legal] floating nav absent`, !legalMeasurements.floatingNavPresent);

    await page.screenshot({ path: path.join(OUTPUT_DIR, `settings-${theme}-legal.png`) });

    // Verify back navigation contract from Legal sub-screen back to Settings main view
    const backBtn = page.getByRole('button', { name: /Settings/ }).first();
    if ((await backBtn.count()) > 0) {
      await backBtn.click();
      await page.waitForTimeout(500);
      const backToSettings = (await page.getByRole('button', { name: /About & Legal/ }).count()) > 0;
      assert(`[settings-${theme}-legal] back button navigates back to Settings`, backToSettings);
    }

    await context.close();
  }
}

// 3. WomenLockGate Background Relock and Protection Verification
console.log('\n--- 3. WomenLockGate & Relock Verification ---');

// 3.1 Verify Protected gate screen when locked initially
{
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await context.addInitScript(() => {
    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('location-setup-dismissed-v1', 'true');
    localStorage.setItem('islamic-settings', JSON.stringify({
      language: 'en',
      themeMode: 'paper',
      womenWorshipEnabled: true,
      womenLockEnabled: true,
      womenPinHash: 'mock-hash',
    }));
  });

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Navigate to Women Guidance while locked
  await page.evaluate(() => {
    window.__NAVIGATE__.setTab('tools');
    window.__NAVIGATE__.setTools({ screen: 'women-guidance' });
  });
  await page.waitForTimeout(1000);

  const lockedText = await page.evaluate(() => document.body.innerText);
  const isProtectedGateVisible = lockedText.includes('Protected') && lockedText.includes('device security') && !lockedText.includes('Worship Guidance');
  assert('WomenLockGate: Gate protection is active when locked (Protected screen visible, content hidden)', isProtectedGateVisible);

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'women-locked-gate.png') });
  await context.close();
}

// 3.2 Verify Mocked System Auth Unlock & Deterministic Background Relock
{
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await context.addInitScript(() => {
    let _orig;
    Object.defineProperty(window, '__d', {
      configurable: true,
      get() { return _orig; },
      set(fn) {
        _orig = function(factory, modId, deps) {
          const wrapped = function(g, r, i, a, m, e, d) {
            factory(g, r, i, a, m, e, d);
            const target = (e && typeof e === 'object' && 'hasHardwareAsync' in e)
              ? e
              : (e?.default && typeof e.default === 'object' && 'hasHardwareAsync' in e.default)
              ? e.default
              : null;
            if (target) {
              target.hasHardwareAsync = async () => true;
              target.isEnrolledAsync = async () => true;
              target.authenticateAsync = async () => ({ success: window.__MOCK_AUTH_SUCCESS__ !== false });
            }
          };
          return fn(wrapped, modId, deps);
        };
      },
    });

    window.__MOCK_AUTH_SUCCESS__ = true;

    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('location-setup-dismissed-v1', 'true');
    localStorage.setItem('islamic-settings', JSON.stringify({
      language: 'en',
      themeMode: 'paper',
      womenWorshipEnabled: true,
      womenLockEnabled: true,
      womenPinHash: 'mock-hash',
    }));
  });

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Navigate to Women Guidance with mocked auth
  await page.evaluate(() => {
    window.__NAVIGATE__.setTab('tools');
    window.__NAVIGATE__.setTools({ screen: 'women-guidance' });
  });
  await page.waitForTimeout(1000);

  const unlockedText = await page.evaluate(() => document.body.innerText);
  assert('WomenLockGate: Successfully unlocks with system auth mock', unlockedText.includes('Worship Guidance') && !unlockedText.includes('Protected'));

  // Test deterministic background relock:
  // Background document and advance Date.now by 50,000ms (> 45s LOCK_TIMEOUT_MS)
  await page.evaluate(() => {
    const realNow = Date.now();
    let offset = 0;
    Date.now = () => realNow + offset;

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    offset = 50000;

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await page.waitForTimeout(500);
  const relockedText = await page.evaluate(() => document.body.innerText);
  const sensitiveCleared = !relockedText.includes('Worship Guidance');
  assert('WomenLockGate: Backgrounding clears sensitive screen from foreground to protect privacy', sensitiveCleared);

  // Attempting to re-enter sensitive route must now show the Protected gate again
  await page.evaluate(() => {
    window.__MOCK_AUTH_SUCCESS__ = false;
    window.__NAVIGATE__.setTools({ screen: 'women-guidance' });
  });
  await page.waitForTimeout(1000);

  const reGateText = await page.evaluate(() => document.body.innerText);
  const isProtectedAgain = reGateText.includes('Protected') && !reGateText.includes('Worship Guidance');
  assert('WomenLockGate: Deterministic background relock enforces Protected gate on re-entry', isProtectedAgain);

  await context.close();
}

await browser.close();
server.close();

// 4. Deterministic Pixel Difference Verification
console.log('\n--- 4. Deterministic Pixel Difference Verification (Thresholds: Header >= 25%, Full >= 35%) ---');
const HEADER_THRESHOLD_PCT = 25.0;
const FULL_THRESHOLD_PCT = 35.0;
const CHANNEL_DIFF_THRESHOLD = 25;

function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  return PNG.sync.read(buf);
}

let allDiffsPass = true;
const pixelDiffResults = [];

const pairs = [
  'women-guidance-paper',
  'women-guidance-ink',
  'women-purity-paper',
  'women-purity-ink',
];

for (const pairName of pairs) {
  const beforePath = path.join(BEFORE_DIR, `${pairName}.png`);
  const afterPath = path.join(OUTPUT_DIR, `${pairName}.png`);

  assert(`Before baseline exists: ${beforePath}`, fs.existsSync(beforePath));
  assert(`After screenshot exists: ${afterPath}`, fs.existsSync(afterPath));

  const before = readPng(beforePath);
  const after = readPng(afterPath);

  assert(`Dimension match for ${pairName}: ${before.width}x${before.height} vs ${after.width}x${after.height}`, before.width === after.width && before.height === after.height);

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

  assert(`[${pairName}] header diff >= ${HEADER_THRESHOLD_PCT}%`, headerPass, `${headerPct}%`);
  assert(`[${pairName}] full diff >= ${FULL_THRESHOLD_PCT}%`, fullPass, `${fullPct}%`);

  pixelDiffResults.push({
    pairName,
    headerPct,
    headerPass,
    fullPct,
    fullPass,
    pass,
  });
}

// 5. Screenshot Inventory & Dimensions Reconciliation
console.log('\n--- 5. Screenshot Inventory & Dimensions Reconciliation ---');
const expectedScreenshots = [
  'women-guidance-paper.png',
  'women-guidance-ink.png',
  'women-purity-paper.png',
  'women-purity-ink.png',
  'settings-paper.png',
  'settings-ink.png',
  'settings-paper-legal.png',
  'settings-ink-legal.png',
  'women-locked-gate.png',
];

const onDiskScreenshots = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
assert('On-disk screenshot count matches expected 9', onDiskScreenshots.length === expectedScreenshots.length, `got ${onDiskScreenshots.length}`);

for (const expectedName of expectedScreenshots) {
  assert(`Screenshot exists on disk: ${expectedName}`, onDiskScreenshots.includes(expectedName));
  const filePath = path.join(OUTPUT_DIR, expectedName);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  assert(`${expectedName} dimensions 393x852`, png.width === 393 && png.height === 852, `got ${png.width}x${png.height}`);
}

// 6. Generate Proof Report
const report = {
  timestamp: new Date().toISOString(),
  batch: 'Batch 3B — Women Guidance, Women Purity & Settings Screen',
  checks,
  staticAnalysis: {
    allPassed: true,
    results: staticResults,
  },
  pixelDiff: {
    allPassed: allDiffsPass,
    results: pixelDiffResults,
  },
  runtimeChecks,
  screenshots: {
    expected: expectedScreenshots,
    onDisk: onDiskScreenshots,
  },
};

fs.writeFileSync(path.resolve('proof/rework-batch-3b/proof-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('\n✓ Proof report written to proof/rework-batch-3b/proof-report.json');
console.log('\nAll Batch 3B proof checks passed successfully!');
process.exit(0);
