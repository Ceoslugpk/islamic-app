import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');

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
  } catch (err) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log(`[Batch 2 Regression Test] Static server running on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const screens = [
  {
    id: 'hifz',
    name: 'HifzScreen',
    parentTab: 'quran',
    route: { screen: 'hifz' },
  },
  {
    id: 'hifz_practice',
    name: 'HifzPracticeScreen',
    parentTab: 'quran',
    route: { screen: 'hifz' },
    customNav: async (page) => {
      const practiceBtn = page.locator('[aria-label*="Practice"]').first();
      await practiceBtn.waitFor({ state: 'visible', timeout: 5000 });
      await practiceBtn.click({ force: true });
      await page.waitForTimeout(500);
    },
  },
  {
    id: 'plans',
    name: 'ReadingPlansScreen',
    parentTab: 'quran',
    route: { screen: 'plans' },
  },
  {
    id: 'bookmarks',
    name: 'BookmarksScreen',
    parentTab: 'quran',
    route: { screen: 'bookmarks' },
  },
  {
    id: 'notes',
    name: 'NotesScreen',
    parentTab: 'quran',
    route: { screen: 'notes' },
  },
  {
    id: 'tajweed',
    name: 'TajweedScreen',
    parentTab: 'library',
    route: { screen: 'tajweed' },
  },
  {
    id: 'vocab',
    name: 'VocabTrainerScreen',
    parentTab: 'library',
    route: { screen: 'vocab' },
  },
];

const testThemes = ['paper', 'ink'];

try {
  for (const screen of screens) {
    console.log(`\nVerifying Batch 2 Screen: ${screen.name} (Parent: ${screen.parentTab})`);

    for (const theme of testThemes) {
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
        // Seed test data
        localStorage.setItem(
          'salah-db:quran:bookmarks',
          JSON.stringify([
            {
              surah: 1,
              ayah: 1,
              surahName: 'Al-Fatiha',
              text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
            },
          ])
        );
        localStorage.setItem(
          'salah-db:quran:notes',
          JSON.stringify([
            {
              id: 'note-1',
              surah: 1,
              ayah: 1,
              body: 'Test note on opening reflection.',
              createdAt: Date.now() - 3600000,
            },
          ])
        );
        localStorage.setItem(
          'hifz-statuses-v1',
          JSON.stringify({ 1: 'memorized', 112: 'revising', 113: 'memorized', 114: 'memorized' })
        );
      }, { theme });

      const page = await context.newPage();

      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1400);

      await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__);

      await page.evaluate(({ parentTab, route }) => {
        if (window.__NAVIGATE__) {
          window.__NAVIGATE__.setTab(parentTab);
          if (parentTab === 'quran') {
            window.__NAVIGATE__.setQuran(route);
          } else if (parentTab === 'library') {
            window.__NAVIGATE__.setLibrary(route);
          }
        }
      }, { parentTab: screen.parentTab, route: screen.route });

      await page.waitForTimeout(600);

      if (screen.customNav) {
        await screen.customNav(page);
      }

      const res = await page.evaluate((expectedTab) => {
        // 1. AppHeader absent
        const headerWordmark = Array.from(document.querySelectorAll('*')).find(
          (el) => el.textContent === 'ISLAMIC' && el.children.length === 0
        );

        // 2. FloatingNav present, rounded, active tab
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
          const s = window.getComputedStyle(el);
          if (s.boxShadow && s.boxShadow !== 'none') {
            cardShadowCount++;
          }
        }

        // 4. Scroll-end clearance
        const scrollables = Array.from(document.querySelectorAll('*')).filter((el) => {
          const style = window.getComputedStyle(el);
          return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        const scrollable = scrollables[scrollables.length - 1];
        let paddingBottom = null;
        let hasClearance = false;
        if (scrollable) {
          const content = scrollable.firstElementChild || scrollable;
          paddingBottom = window.getComputedStyle(content).paddingBottom;
          const padVal = parseFloat(paddingBottom) || 0;
          hasClearance = padVal >= 80;
        } else {
          hasClearance = true; // Content fits in viewport
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
      }, screen.parentTab);

      assert.equal(res.hasAppHeader, false, `[${theme}] ${screen.name} must NOT have global AppHeader`);
      assert.equal(res.hasFloatingNav, true, `[${theme}] ${screen.name} must have FloatingNav visible`);
      assert.equal(res.isRounded, true, `[${theme}] ${screen.name} FloatingNav must be rounded (found ${res.navBorderRadius})`);
      assert.equal(res.isTabActive, true, `[${theme}] ${screen.name} FloatingNav active tab must be '${screen.parentTab}'`);
      assert.ok(res.cardShadowCount > 0, `[${theme}] ${screen.name} must have elevated card shadows (found ${res.cardShadowCount})`);
      assert.ok(res.hasClearance, `[${theme}] ${screen.name} must have scroll clearance >= 80px (found ${res.paddingBottom})`);

      console.log(`  ✓ [${theme.toUpperCase()}] No AppHeader, FloatingNav(active=${screen.parentTab}, rounded=${res.navBorderRadius}), Shadows=${res.cardShadowCount}, PadBottom=${res.paddingBottom}`);
      await context.close();
    }
  }

  console.log(`\n======================================================`);
  console.log(`ALL BATCH 2 SECONDARY ROUTE CONTRACT CHECKS PASSED!`);
  console.log(`======================================================\n`);
} finally {
  await browser.close();
  server.close();
}
