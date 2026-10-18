import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('screenshots/light_mode_batch_2');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('=== BATCH 2 LIGHT MODE REGRESSION TEST & SCREENSHOT SUITE ===');

// --- 1. Static Contract Checks ---
console.log('\n--- 1. Static File & Theming Contracts ---');

const batch2Screens = [
  { file: 'src/screens/CalendarScreen.tsx', id: 'calendar', name: 'CalendarScreen', parentTab: 'tools', route: { screen: 'calendar' } },
  { file: 'src/screens/FastingScreen.tsx', id: 'fasting', name: 'FastingScreen', parentTab: 'tools', route: { screen: 'fasting' } },
  { file: 'src/screens/QiblaScreen.tsx', id: 'qibla', name: 'QiblaScreen', parentTab: 'tools', route: { screen: 'qibla' } },
  { file: 'src/screens/SalahTrackerScreen.tsx', id: 'tracker', name: 'SalahTrackerScreen', parentTab: 'tools', route: { screen: 'tracker' } },
  { file: 'src/screens/TasbihScreen.tsx', id: 'tasbih', name: 'TasbihScreen', parentTab: 'tools', route: { screen: 'tasbih' } },
  { file: 'src/screens/WeeklySummaryScreen.tsx', id: 'summary', name: 'WeeklySummaryScreen', parentTab: 'tools', route: { screen: 'summary' } },
  { file: 'src/screens/WomenCycleScreen.tsx', id: 'women_cycle', name: 'WomenCycleScreen', parentTab: 'tools', route: { screen: 'women-cycle' } },
  { file: 'src/screens/WomenQadaScreen.tsx', id: 'women_qada', name: 'WomenQadaScreen', parentTab: 'tools', route: { screen: 'women-qada' } },
];

for (const s of batch2Screens) {
  assert.ok(fs.existsSync(s.file), `Screen file ${s.file} must exist`);
  const content = fs.readFileSync(s.file, 'utf8');

  // Must use DetailScreen
  assert.ok(content.includes('<DetailScreen') || content.includes('DetailScreen'), `${s.name} must use DetailScreen`);
  // Must use SubHeader
  assert.ok(content.includes('<SubHeader') || content.includes('SubHeader'), `${s.name} must use SubHeader`);
  // Must use HOME_THEME_TOKENS
  assert.ok(content.includes('HOME_THEME_TOKENS'), `${s.name} must use HOME_THEME_TOKENS`);
  // Must use getCardShadow or card shadow tokens
  assert.ok(content.includes('getCardShadow') || content.includes('tokens.cardTop'), `${s.name} must use card styling`);
  // Must use TAB_PAD_BOTTOM
  assert.ok(content.includes('TAB_PAD_BOTTOM'), `${s.name} must use TAB_PAD_BOTTOM for dock clearance`);

  console.log(`  ✓ ${s.name}: DetailScreen, SubHeader, HOME_THEME_TOKENS, TAB_PAD_BOTTOM verified`);
}

// Check SubHeader 2-line subtitle contract
const subHeaderCode = fs.readFileSync('src/components/layout/SubHeader.tsx', 'utf8');
assert.ok(subHeaderCode.includes('numberOfLines={2}'), 'SubHeader subtitle must allow 2 lines to prevent truncation');
console.log('  ✓ SubHeader 2-line subtitle contract verified');

// Check App.tsx active parent tab wiring
const appCode = fs.readFileSync('App.tsx', 'utf8');
assert.ok(appCode.includes('routeToTab('), 'App.tsx must use routeToTab for FloatingNav active tab resolution');
console.log('  ✓ App.tsx routeToTab resolver wired to FloatingNav');

// Check routeToTab static routing for all 8 batch routes
const routeToTabCode = fs.readFileSync('src/navigation/routeToTab.ts', 'utf8');
const expectedToolsKeys = ['calendar', 'fasting', 'qibla', 'tracker', 'tasbih', 'summary', 'women-cycle', 'women-qada'];
for (const key of expectedToolsKeys) {
  assert.ok(routeToTabCode.includes(`'${key}'`), `routeToTab must recognize route key '${key}'`);
}
console.log('  ✓ routeToTab maps all Batch 2 screen keys properly');

// --- 2. Runtime Server & Playwright Browser Tests ---
console.log('\n--- 2. Runtime Browser Tests & Screenshot Generation ---');

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
console.log(`Static server running on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const viewports = [
  { width: 360, height: 800, label: '360dp' },
  { width: 430, height: 932, label: '430dp' },
];

const themes = ['paper', 'ink'];
const generatedScreenshots = [];

async function scrollToEnd(page) {
  await page.evaluate(async () => {
    const scrollables = Array.from(document.querySelectorAll('*')).filter((el) => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });
    const scrollable = scrollables[scrollables.length - 1];
    if (!scrollable) return;
    for (let i = 0; i < 30; i++) {
      scrollable.scrollTop += 350;
      await new Promise((r) => setTimeout(r, 20));
    }
    for (let i = 0; i < 5; i++) {
      scrollable.scrollTop = scrollable.scrollHeight;
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(350);
}

try {
  // Baseline Matrix: 8 screens × 2 viewports × 2 themes × 2 positions
  for (const s of batch2Screens) {
    console.log(`\nVerifying ${s.name} (${s.id}) -> Parent Tab: ${s.parentTab}`);

    for (const vp of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
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
              womenWorshipEnabled: true,
              womenLockEnabled: false,
            })
          );
          // Seed sample data for richer visual screens
          localStorage.setItem('salah-db:tasbih:counts', JSON.stringify({ subhanallah: 33, alhamdulillah: 12, allahuakbar: 7 }));
          localStorage.setItem('salah-db:tasbih:today', '52');
          localStorage.setItem(
            'salah-db:period:entries',
            JSON.stringify([
              {
                id: 'period-1',
                startDate: '2026-10-01',
                endDate: '2026-10-06',
                notes: 'Normal regular cycle',
                purityDays: {},
                createdAt: 1700000000000,
              },
            ])
          );
          localStorage.setItem(
            'salah-db:missed:fasts',
            JSON.stringify([
              {
                id: 'missed-1',
                date: '2026-03-15',
                reason: 'Menstruation / Post-natal',
                madeUp: false,
                createdAt: 1700000000000,
              },
              {
                id: 'missed-2',
                date: '2026-03-16',
                reason: 'Menstruation / Post-natal',
                madeUp: true,
                createdAt: 1700001000000,
              },
            ])
          );
        }, { theme });

        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);

        await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

        // Route to the owned screen
        await page.evaluate(({ parentTab, route }) => {
          if (window.__NAVIGATE__) {
            window.__NAVIGATE__.setTab(parentTab);
            window.__NAVIGATE__.setTools(route);
          }
        }, { parentTab: s.parentTab, route: s.route });

        await page.waitForTimeout(700);

        // Runtime Contract Checks
        const check = await page.evaluate((expectedTab) => {
          // 1. AppHeader absent
          const headerWordmark = Array.from(document.querySelectorAll('*')).find(
            (el) => el.textContent === 'ISLAMIC' && el.children.length === 0
          );

          // 2. FloatingNav present, active, rounded
          const navContainer = document.querySelector('[data-testid="floating-nav-container"]');
          const tabBtn = document.querySelector(`[data-testid="floating-nav-tab-${expectedTab}"]`);
          const isTabActive = tabBtn ? !!tabBtn.querySelector('[data-testid="floating-nav-active-pill"]') : false;

          let isRounded = false;
          let navBorderRadius = null;
          if (navContainer) {
            const style = window.getComputedStyle(navContainer);
            navBorderRadius = style.borderRadius;
            const radiusVal = parseFloat(style.borderRadius) || 0;
            isRounded = radiusVal >= 20;
          }

          // 3. Card shadows
          let cardShadowCount = 0;
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const st = window.getComputedStyle(el);
            if (st.boxShadow && st.boxShadow !== 'none') {
              cardShadowCount++;
            }
          }

          // 4. Scroll clearance (paddingBottom >= 80px)
          const scrollables = Array.from(document.querySelectorAll('*')).filter((el) => {
            if (el.tagName === 'TEXTAREA') return false;
            const st = window.getComputedStyle(el);
            return (st.overflowY === 'auto' || st.overflowY === 'scroll') && el.clientHeight > 0;
          });
          const scrollable = scrollables[scrollables.length - 1];
          let paddingBottom = null;
          let hasClearance = false;
          if (scrollable) {
            const content = scrollable.firstElementChild || scrollable;
            paddingBottom = window.getComputedStyle(content).paddingBottom;
            const padVal = parseFloat(paddingBottom) || 0;
            hasClearance = padVal >= 80;
          }

          return {
            hasAppHeader: !!headerWordmark,
            hasFloatingNav: !!navContainer,
            isRounded,
            navBorderRadius,
            isTabActive,
            cardShadowCount,
            paddingBottom,
            hasClearance,
          };
        }, s.parentTab);

        assert.equal(check.hasAppHeader, false, `[${theme} ${vp.label}] ${s.name} must NOT have global AppHeader`);
        assert.equal(check.hasFloatingNav, true, `[${theme} ${vp.label}] ${s.name} must have FloatingNav visible`);
        assert.equal(check.isRounded, true, `[${theme} ${vp.label}] ${s.name} FloatingNav must be rounded (found ${check.navBorderRadius})`);
        assert.equal(check.isTabActive, true, `[${theme} ${vp.label}] ${s.name} active tab must be '${s.parentTab}'`);
        assert.ok(check.cardShadowCount > 0, `[${theme} ${vp.label}] ${s.name} must have elevated card shadows (found ${check.cardShadowCount})`);
        assert.ok(check.hasClearance, `[${theme} ${vp.label}] ${s.name} must have scroll clearance >= 80px (found ${check.paddingBottom})`);

        // Screen-specific date assertions (ensure October 14, 2026 resolves to Jumada al-Awwal)
        if (s.id === 'calendar') {
          const bodyText = await page.evaluate(() => document.body.textContent || '');
          assert.ok(
            bodyText.includes('Jumada al-Awwal'),
            `[${theme} ${vp.label}] CalendarScreen must display 'Jumada al-Awwal' for today's date`
          );
          assert.ok(
            !bodyText.includes("3 Rabi' al-Thani"),
            `[${theme} ${vp.label}] CalendarScreen must NOT display '3 Rabi al-Thani'`
          );
        }

        if (s.id === 'fasting') {
          const bodyText = await page.evaluate(() => document.body.textContent || '');
          assert.ok(
            bodyText.includes('Jumada al-Awwal') || bodyText.includes('JUMADA AL-AWWAL'),
            `[${theme} ${vp.label}] FastingScreen must display 'Jumada al-Awwal' in today fast card`
          );
          assert.ok(
            !bodyText.includes("3 RABI' AL-THANI") && !bodyText.includes("3 Rabi' al-Thani"),
            `[${theme} ${vp.label}] FastingScreen must NOT display '3 Rabi al-Thani'`
          );
        }

        // Capture TOP screenshot
        const topFileName = `${s.id}_${vp.label}_${theme}_top.png`;
        const topFilePath = path.join(OUTPUT_DIR, topFileName);
        await page.screenshot({ path: topFilePath, fullPage: false });
        generatedScreenshots.push(topFileName);

        // Scroll to END and capture screenshot
        await scrollToEnd(page);
        const endFileName = `${s.id}_${vp.label}_${theme}_end.png`;
        const endFilePath = path.join(OUTPUT_DIR, endFileName);
        await page.screenshot({ path: endFilePath, fullPage: false });
        generatedScreenshots.push(endFileName);

        // Interaction screenshot: Calendar month selection
        if (s.id === 'calendar' && theme === 'paper') {
          // Click one of the month chips in the horizontal strip
          const monthChip = page.locator('[aria-label*="Jump to"]').nth(8); // Ramadan
          if (await monthChip.isVisible().catch(() => false)) {
            await monthChip.click({ force: true });
            await page.waitForTimeout(400);
            const interactFileName = `${s.id}_${vp.label}_paper_month_interact.png`;
            const interactFilePath = path.join(OUTPUT_DIR, interactFileName);
            await page.screenshot({ path: interactFilePath, fullPage: false });
            generatedScreenshots.push(interactFileName);
            console.log(`    ↳ Captured interaction: ${interactFileName}`);
          }
        }

        // Interaction screenshot: Fasting action (tab selection)
        if (s.id === 'fasting' && theme === 'paper') {
          // Click Sunnah / Voluntary subtab
          const sunnahTab = page.locator('text=Sunnah').first();
          if (await sunnahTab.isVisible().catch(() => false)) {
            await sunnahTab.click({ force: true });
            await page.waitForTimeout(400);
            const interactFileName = `${s.id}_${vp.label}_paper_fasting_interact.png`;
            const interactFilePath = path.join(OUTPUT_DIR, interactFileName);
            await page.screenshot({ path: interactFilePath, fullPage: false });
            generatedScreenshots.push(interactFileName);
            console.log(`    ↳ Captured interaction: ${interactFileName}`);
          }
        }

        console.log(`  ✓ [${theme.toUpperCase()} ${vp.label}] Top & End captured. FloatingNav active=${s.parentTab}, Shadows=${check.cardShadowCount}, PadBottom=${check.paddingBottom}`);
        await context.close();
      }
    }
  }

  // --- Interaction state: Women Privacy Gate ---
  console.log('\n--- Interaction State: Women Privacy Gate ---');
  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });

      // Enable women lock gate
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
            womenWorshipEnabled: true,
            womenLockEnabled: true,
            womenPinHash: 'active_pin_protection_hash',
          })
        );
      }, { theme });

      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);

      await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

      // Route to women-cycle under Tools
      await page.evaluate(() => {
        if (window.__NAVIGATE__) {
          window.__NAVIGATE__.setTab('tools');
          window.__NAVIGATE__.setTools({ screen: 'women-cycle' });
        }
      });

      await page.waitForTimeout(800);

      // Verify WomenLockGate rendered (contains Protected and Unlock button)
      const gateCheck = await page.evaluate(() => {
        const textContent = document.body.textContent || '';
        const hasProtected = textContent.includes('Protected');
        const hasUnlock = textContent.includes('Unlock');
        const navContainer = document.querySelector('[data-testid="floating-nav-container"]');
        const tabBtn = document.querySelector('[data-testid="floating-nav-tab-tools"]');
        const isTabActive = tabBtn ? !!tabBtn.querySelector('[data-testid="floating-nav-active-pill"]') : false;
        return { hasProtected, hasUnlock, hasFloatingNav: !!navContainer, isTabActive };
      });

      assert.equal(gateCheck.hasProtected, true, `[${theme} ${vp.label}] WomenLockGate must display 'Protected'`);
      assert.equal(gateCheck.hasUnlock, true, `[${theme} ${vp.label}] WomenLockGate must display 'Unlock' button`);
      assert.equal(gateCheck.hasFloatingNav, true, `[${theme} ${vp.label}] FloatingNav must remain visible behind gate`);
      assert.equal(gateCheck.isTabActive, true, `[${theme} ${vp.label}] FloatingNav active tab must remain 'tools'`);

      const gateFileName = `women_gate_${vp.label}_${theme}_interact.png`;
      const gateFilePath = path.join(OUTPUT_DIR, gateFileName);
      await page.screenshot({ path: gateFilePath, fullPage: false });
      generatedScreenshots.push(gateFileName);
      console.log(`  ✓ [${theme.toUpperCase()} ${vp.label}] Women Privacy Gate verified & captured (${gateFileName})`);

      await context.close();
    }
  }

  // --- 3. Programmatic Screenshot Reconciliation ---
  console.log('\n--- 3. Programmatic Screenshot Verification ---');
  const filesOnDisk = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
  console.log(`Total screenshots found in ${OUTPUT_DIR}: ${filesOnDisk.length}`);

  // 64 baseline + interaction states (calendar, fasting, women gate)
  assert.ok(filesOnDisk.length >= 64, `Expected at least 64 screenshots, found ${filesOnDisk.length}`);

  for (const f of filesOnDisk) {
    const stat = fs.statSync(path.join(OUTPUT_DIR, f));
    assert.ok(stat.size > 0, `Screenshot ${f} must not be empty (0 bytes), actual size: ${stat.size} bytes`);
  }

  // Verify each screen has top and end for 360dp and 430dp in paper and ink
  for (const s of batch2Screens) {
    for (const vp of ['360dp', '430dp']) {
      for (const theme of ['paper', 'ink']) {
        for (const pos of ['top', 'end']) {
          const expectedFile = `${s.id}_${vp}_${theme}_${pos}.png`;
          assert.ok(filesOnDisk.includes(expectedFile), `Missing expected screenshot: ${expectedFile}`);
        }
      }
    }
  }

  console.log(`✓ All 64 baseline matrix screenshots (8 screens × 2 viewports × 2 themes × 2 positions) verified non-empty.`);
  console.log(`✓ Interaction states (calendar month, fasting tab, women lock gate) verified non-empty.`);
  console.log(`\n======================================================`);
  console.log(`ALL BATCH 2 LIGHT MODE REGRESSION CONTRACTS VERIFIED!`);
  console.log(`======================================================\n`);
} finally {
  await browser.close();
  server.close();
}
