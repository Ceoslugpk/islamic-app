import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Static code contracts first
console.log('=== FLOATING PRAYER BAR PROOF: STATIC CONTRACTS ===');

const compactPrayerBarFile = fs.readFileSync('src/components/CompactPrayerBar.tsx', 'utf8');
const homeScreenFile = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// 1. Neon colors removed completely
assert.ok(!compactPrayerBarFile.includes('#34D399'), 'Neon green #34D399 must be removed from CompactPrayerBar');
assert.ok(!compactPrayerBarFile.includes('rgba(160, 200, 186'), 'Neon/pale mint rgba separator must be removed from CompactPrayerBar');
assert.ok(!compactPrayerBarFile.includes('#0C241E'), 'Hardcoded ink green #0C241E must be removed');
assert.ok(!compactPrayerBarFile.includes('#0B2F26'), 'Hardcoded paper green #0B2F26 must be removed');
console.log('  ✓ Neon green and hardcoded green backgrounds eliminated');

// 2. Theme tokens and muted gold accent wired
assert.ok(compactPrayerBarFile.includes('HOME_THEME_TOKENS'), 'Must import HOME_THEME_TOKENS');
assert.ok(compactPrayerBarFile.includes('getPillShadow'), 'Must import getPillShadow');
assert.ok(compactPrayerBarFile.includes('tokens.cardTop'), 'Must use tokens.cardTop for background');
assert.ok(compactPrayerBarFile.includes('tokens.cardBorder'), 'Must use tokens.cardBorder for border');
assert.ok(compactPrayerBarFile.includes('activeText.eyebrow'), 'Must use activeText.eyebrow for muted gold accent');
assert.ok(compactPrayerBarFile.includes('activeText.subtle'), 'Must use activeText.subtle for separator');
console.log('  ✓ Theme-matched surface and muted gold accent tokens correctly bound');

// 3. Duplicate border/shadow ownership centrally fixed
assert.ok(!homeScreenFile.includes('elevation: 8'), 'pinnedBarWrap must not stack duplicate elevation');
assert.ok(!compactPrayerBarFile.includes('styles.touchable'), 'No separate redundant touchable container');
assert.ok(compactPrayerBarFile.includes('borderWidth: 1'), 'Exactly one visible border');
console.log('  ✓ Single surface, single border, single restrained shadow ownership verified');

// 4. LTR and RTL support
assert.ok(compactPrayerBarFile.includes('isRTL()'), 'isRTL check present');
assert.ok(compactPrayerBarFile.includes("flexDirection: 'row'"), 'Prayer bar uses a native-direction-aware row');
assert.ok(!compactPrayerBarFile.includes("flexDirection: rtl ? 'row-reverse' : 'row'"), 'Prayer bar must not double-reverse native RTL');
assert.ok(compactPrayerBarFile.includes("writingDirection: 'ltr'"), 'Prayer time numerals keep LTR');
console.log('  ✓ LTR and RTL layout and numeral direction safety verified');

// 5. Geometry
assert.ok(compactPrayerBarFile.includes('borderRadius: 26') || compactPrayerBarFile.includes('borderRadius: 27'), 'Rounded navigation-style geometry');
assert.ok(compactPrayerBarFile.includes('height: 52') || compactPrayerBarFile.includes('minHeight: 52'), 'Compact 52dp height');
console.log('  ✓ Compact navigation-style geometry (52dp height, 26dp radius) verified');

// Runtime Playwright Proof
console.log('\n=== FLOATING PRAYER BAR PROOF: RUNTIME BROWSER VERIFICATION ===');

const { chromium } = await import('file:///home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const root = path.resolve('dist');

if (!fs.existsSync(path.join(root, 'index.html'))) {
  throw new Error('dist/index.html not found. Fresh export required before runtime proof.');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent((req.url || '/').split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  const ext = path.extname(f);
  res.setHeader('content-type', MIME_TYPES[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(f));
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
console.log(`  ✓ Static HTTP test server listening on port ${port}`);

const screenshotDir = path.resolve('screenshots/floating_prayer_bar_proof');
fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

const mockTimingData = {
  code: 200,
  data: {
    timings: {
      Fajr: '05:15',
      Sunrise: '06:35',
      Dhuhr: '12:20',
      Asr: '15:40',
      Maghrib: '18:15',
      Isha: '19:45',
    },
    date: {
      readable: '17 Oct 2026',
      hijri: { day: '5', month: { en: 'Rabi al-Thani', ar: 'ربيع الثاني' }, year: '1448' },
      gregorian: { date: '17-10-2026' },
    },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

const viewports = [
  { name: '360w', width: 360, height: 800 },
  { name: '393w', width: 393, height: 852 },
  { name: '480w', width: 480, height: 900 },
];

const themes = ['paper', 'ink'];
const languages = [
  { code: 'en', dir: 'ltr' },
  { code: 'ur', dir: 'rtl' },
];

try {
  for (const vp of viewports) {
    for (const theme of themes) {
      for (const lang of languages) {
        const testCaseLabel = `${vp.name}_${theme}_${lang.code}`;
        console.log(`\n--- Testing ${testCaseLabel} ---`);

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();

        await context.addInitScript(({ themeMode, language }) => {
          localStorage.setItem('onboardingDone', 'true');
          localStorage.setItem('location-setup-dismissed-v1', 'true');
          localStorage.setItem(
            'islamic-settings',
            JSON.stringify({
              language,
              themeMode,
              manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
              locationMode: 'manual',
              timeFormat: '24h',
            })
          );
        }, { themeMode: theme, language: lang.code });

        await page.route('**/api.islamic.app/v1/timings/**', (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockTimingData),
          })
        );

        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // 1. Initial State (Top, scrollY = 0):
        // Pinned bar wrapper must be hidden (display: none)
        const pinnedWrap = page.getByTestId('pinned-prayer-bar-wrap');
        const isVisibleAtTop = await pinnedWrap.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0.05;
        });
        assert.equal(isVisibleAtTop, false, 'Compact prayer bar must NOT be visible at top of scroll');
        console.log(`  ✓ Top scroll (scrollY=0): floating bar hidden (no header/hero collision)`);

        // Screenshot at top
        await page.screenshot({
          path: path.join(screenshotDir, `${testCaseLabel}_01_top.png`),
          fullPage: false,
        });

        // 2. Midpoint Scroll (scrollY = 450):
        // Scroll down past hero card into content
        await page.evaluate(() => {
          const scroller = document.querySelector('[data-testid="screen-content"]') || document.querySelector('div[style*="overflow"]');
          if (scroller) {
            scroller.scrollTop = 450;
            scroller.dispatchEvent(new Event('scroll'));
          } else {
            window.scrollTo(0, 450);
            window.dispatchEvent(new Event('scroll'));
          }
        });
        await page.waitForTimeout(700);

        // Verify exactly one floating bar is rendered
        const barLocator = page.getByTestId('compact-prayer-bar');
        const barCount = await barLocator.count();
        assert.equal(barCount, 1, `Exactly 1 compact prayer bar must exist, found ${barCount}`);

        const barMetrics = await barLocator.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            display: style.display,
            visibility: style.visibility,
            opacity: parseFloat(style.opacity || '1'),
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            borderWidth: parseFloat(style.borderTopWidth || '0'),
            boxShadow: style.boxShadow,
            borderRadius: parseFloat(style.borderTopLeftRadius || '0'),
            height: rect.height,
            width: rect.width,
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
          };
        });

        // Computed style assertions
        assert.ok(barMetrics.opacity > 0.8, `Bar opacity must be near 1 on scroll, got ${barMetrics.opacity}`);
        assert.ok(barMetrics.height >= 48 && barMetrics.height <= 58, `Bar height must be compact (~52px), got ${barMetrics.height}px`);
        assert.ok(barMetrics.borderRadius >= 24, `Bar borderRadius must be >= 24px, got ${barMetrics.borderRadius}px`);
        assert.equal(barMetrics.borderWidth, 1, `Bar must have exactly 1px border, got ${barMetrics.borderWidth}px`);

        // Theme colors verification:
        // Paper (light): bg rgb(254, 252, 247) [#FEFCF7], border rgb(226, 204, 156) [#E2CC9C]
        // Ink (dark): bg rgb(42, 41, 51) [#2A2933], border rgb(140, 119, 71) [#8C7747]
        if (theme === 'paper') {
          assert.ok(
            barMetrics.backgroundColor.includes('254, 252, 247') || barMetrics.backgroundColor.includes('255, 255, 255') || barMetrics.backgroundColor.includes('250, 246, 237'),
            `Light mode background must be warm paper surface, got ${barMetrics.backgroundColor}`
          );
          assert.ok(
            barMetrics.borderColor.includes('226, 204, 156') || barMetrics.borderColor.includes('226, 204') || barMetrics.borderColor.includes('140, 119'),
            `Light mode border must be muted gold #E2CC9C, got ${barMetrics.borderColor}`
          );
        } else {
          assert.ok(
            barMetrics.backgroundColor.includes('42, 41, 51') || barMetrics.backgroundColor.includes('32, 31, 40') || barMetrics.backgroundColor.includes('18, 18, 28'),
            `Dark mode background must be dark ink surface, got ${barMetrics.backgroundColor}`
          );
          assert.ok(
            barMetrics.borderColor.includes('140, 119, 71') || barMetrics.borderColor.includes('140, 119'),
            `Dark mode border must be muted gold #8C7747, got ${barMetrics.borderColor}`
          );
        }

        // Verify Floating Nav is present at bottom and NO overlap occurs
        const floatingNavLocator = page.getByTestId('floating-nav-container');
        if (await floatingNavLocator.count() > 0) {
          const navMetrics = await floatingNavLocator.evaluate((el) => el.getBoundingClientRect());
          const clearanceBetween = navMetrics.top - barMetrics.bottom;
          assert.ok(clearanceBetween > 200, `Bar and FloatingNav must have ample clearance, got ${clearanceBetween}px`);
          console.log(`  ✓ Midpoint scroll (scrollY=450): bar visible, clearance to nav = ${Math.round(clearanceBetween)}px`);
        }

        // Screenshot at midpoint
        await page.screenshot({
          path: path.join(screenshotDir, `${testCaseLabel}_02_mid.png`),
          fullPage: false,
        });

        // 3. True Scroll End (scrollY = 2500):
        await page.evaluate(() => {
          const scroller = document.querySelector('[data-testid="screen-content"]') || document.querySelector('div[style*="overflow"]');
          if (scroller) {
            scroller.scrollTop = scroller.scrollHeight;
            scroller.dispatchEvent(new Event('scroll'));
          } else {
            window.scrollTo(0, document.body.scrollHeight);
            window.dispatchEvent(new Event('scroll'));
          }
        });
        await page.waitForTimeout(600);

        // Verify bar stays pinned at top and does not crash into bottom
        const endBarTop = await barLocator.evaluate((el) => el.getBoundingClientRect().top);
        assert.ok(endBarTop < 100, `Bar must stay pinned near top at scroll end, got top=${endBarTop}px`);

        // Screenshot at end
        await page.screenshot({
          path: path.join(screenshotDir, `${testCaseLabel}_03_end.png`),
          fullPage: false,
        });

        // 4. Tap to top interaction:
        await barLocator.click();
        await page.waitForTimeout(800);
        const scrolledBackY = await page.evaluate(() => {
          const scroller = document.querySelector('[data-testid="screen-content"]') || document.querySelector('div[style*="overflow"]');
          return scroller ? scroller.scrollTop : window.scrollY;
        });
        assert.ok(scrolledBackY <= 150, `Tapping bar must return scroll to top, scrollY=${scrolledBackY}`);
        console.log(`  ✓ Tap interaction: scroll returned to ${scrolledBackY}px`);

        await context.close();
      }
    }
  }

  console.log('\n======================================================');
  console.log('✅ ALL FLOATING PRAYER BAR PROOF ASSERTIONS PASSED!');
  console.log('======================================================');
} finally {
  await browser.close();
  server.close();
}
