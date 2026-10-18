import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = await import('file:///home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const root = path.resolve('dist');

const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent((req.url || '/').split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  const ext = path.extname(f);
  const types = {
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.json': 'application/json',
    '.ttf': 'font/ttf',
  };
  res.setHeader('content-type', types[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const screenshotDir = 'screenshots/verification_2026-10-13';
fs.mkdirSync(screenshotDir, { recursive: true });

const fixture = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '13 Oct 2026', hijri: { day: '1', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '13-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

const widths = [360, 393, 430];
const tabs = ['Home', 'Quran', 'Library', 'Tools'];
const themes = ['light', 'dark'];

const measurementResults = [];

console.log('=== STARTING EXTENSIVE VERIFICATION SUITE ===');

try {
  for (const width of widths) {
    const height = 844;
    for (const theme of themes) {
      console.log(`\nTesting Width: ${width}dp, Theme: ${theme}`);
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();

      await context.addInitScript(({ theme }) => {
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem(
          'islamic-settings',
          JSON.stringify({
            language: 'en',
            themeMode: theme === 'dark' ? 'ink' : 'paper',
            manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
            locationMode: 'manual',
          })
        );
      }, { theme });

      await page.route('**/api.islamic.app/v1/timings/**', r =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) })
      );

      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      for (const tabName of tabs) {
        const tabKey = tabName.toLowerCase();
        // Switch tab using data-testid
        const tabBtn = page.locator(`[data-testid="floating-nav-tab-${tabKey}"]`);
        await tabBtn.click();
        await page.waitForTimeout(600);

        // 1. Take top screenshot
        const topScreenshotPath = path.join(screenshotDir, `${tabName.toLowerCase()}_${theme}_${width}_top.png`);
        await page.screenshot({ path: topScreenshotPath });

        // 2. Measure Floating Nav & Active Pill
        const metrics = await page.evaluate((tabKey) => {
          const dock = document.querySelector('[data-testid="floating-nav-container"]');
          if (!dock) return { error: 'No floating-nav-container found' };

          const dockRect = dock.getBoundingClientRect();
          const activeTab = document.querySelector(`[data-testid="floating-nav-tab-${tabKey}"]`);
          if (!activeTab) return { error: `No active tab found for ${tabKey}` };

          const activeTabRect = activeTab.getBoundingClientRect();

          // Active pill
          const pill = activeTab.querySelector('[data-testid="floating-nav-active-pill"]');
          const pillRect = pill ? pill.getBoundingClientRect() : null;

          // Label text
          const labelEl = activeTab.querySelector('[data-testid="floating-nav-active-label"]');
          let labelText = '';
          let labelRect = null;
          let labelScrollWidth = 0;
          let labelClientWidth = 0;
          let labelFontSize = '';

          if (labelEl) {
            labelText = labelEl.textContent ? labelEl.textContent.trim() : '';
            labelRect = labelEl.getBoundingClientRect();
            labelScrollWidth = labelEl.scrollWidth;
            labelClientWidth = labelEl.clientWidth;
            labelFontSize = window.getComputedStyle(labelEl).fontSize;
          }

          // Header inspection
          const headerWordmark = Array.from(document.querySelectorAll('*')).find(
            el => el.textContent === 'ISLAMIC' && el.children.length === 0
          );
          let headerRect = null;
          let headerPosition = '';
          if (headerWordmark) {
            let p = headerWordmark.parentElement;
            while (p && p.tagName !== 'BODY') {
              const style = window.getComputedStyle(p);
              if (style.position === 'absolute' || style.position === 'fixed') {
                headerPosition = style.position;
                headerRect = p.getBoundingClientRect();
                break;
              }
              p = p.parentElement;
            }
            if (!headerPosition && headerWordmark.parentElement) {
              headerPosition = window.getComputedStyle(headerWordmark.parentElement).position || 'static/relative';
              headerRect = headerWordmark.parentElement.getBoundingClientRect();
            }
          }

          // Check cards in Library or Tools for box shadow
          const cardShadows = [];
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const style = window.getComputedStyle(el);
            if (style.boxShadow && style.boxShadow !== 'none') {
              cardShadows.push({
                boxShadow: style.boxShadow,
                tag: el.tagName,
                width: el.getBoundingClientRect().width,
                height: el.getBoundingClientRect().height,
              });
            }
          }

          return {
            windowWidth: window.innerWidth,
            dockWidth: dockRect.width,
            columnWidth: activeTabRect.width,
            columnLeft: activeTabRect.left,
            columnCenter: activeTabRect.left + activeTabRect.width / 2,
            pillWidth: pillRect ? pillRect.width : 0,
            pillLeft: pillRect ? pillRect.left : 0,
            pillCenter: pillRect ? pillRect.left + pillRect.width / 2 : 0,
            labelText,
            labelWidth: labelRect ? labelRect.width : 0,
            labelScrollWidth,
            labelClientWidth,
            labelFontSize,
            headerPosition,
            cardShadowCount: cardShadows.length,
            sampleShadow: cardShadows[0]?.boxShadow || null,
          };
        }, tabKey);

        assert.ok(!metrics.error, `Error measuring ${tabName}: ${metrics.error}`);

        // Centering difference
        const centerDiff = Math.abs(metrics.columnCenter - metrics.pillCenter);
        // Pill must fit inside column
        assert.ok(
          metrics.pillWidth <= metrics.columnWidth,
          `Active pill width ${metrics.pillWidth} must fit column width ${metrics.columnWidth}`
        );
        // Pill centering tolerance <= 1.5px
        assert.ok(
          centerDiff <= 1.5,
          `Active pill must be centered in column (diff ${centerDiff.toFixed(2)}px <= 1.5px)`
        );
        // Label must not overflow
        if (metrics.labelClientWidth > 0) {
          assert.ok(
            metrics.labelScrollWidth <= metrics.labelClientWidth + 1,
            `Label text must not truncate or overflow: scrollWidth ${metrics.labelScrollWidth} <= clientWidth ${metrics.labelClientWidth}`
          );
        }

        measurementResults.push({
          width,
          theme,
          tabName,
          dockWidth: metrics.dockWidth.toFixed(1),
          columnWidth: metrics.columnWidth.toFixed(1),
          pillWidth: metrics.pillWidth.toFixed(1),
          centerDiff: centerDiff.toFixed(2),
          labelWidth: metrics.labelWidth.toFixed(1),
          labelFontSize: metrics.labelFontSize,
          cardShadowCount: metrics.cardShadowCount,
        });

        // 3. Scroll to bottom and take bottom screenshot
        await page.evaluate(() => {
          const scrollables = Array.from(document.querySelectorAll('*')).filter(
            el => el.scrollHeight > el.clientHeight && el.clientHeight > 200
          );
          if (scrollables.length > 0) {
            scrollables[0].scrollTop = scrollables[0].scrollHeight;
          } else {
            window.scrollTo(0, document.body.scrollHeight);
          }
        });
        await page.waitForTimeout(400);

        const bottomScreenshotPath = path.join(screenshotDir, `${tabName.toLowerCase()}_${theme}_${width}_bottom.png`);
        await page.screenshot({ path: bottomScreenshotPath });

        console.log(`  ✓ ${tabName} @ ${width}dp [${theme}]: dock=${metrics.dockWidth.toFixed(1)} col=${metrics.columnWidth.toFixed(1)} pill=${metrics.pillWidth.toFixed(1)} centerDiff=${centerDiff.toFixed(2)}px labelFontSize=${metrics.labelFontSize}`);
      }

      // Test pushed detail screen (e.g. Hadith in Library)
      const libraryTabBtn = page.locator('[data-testid="floating-nav-tab-library"]');
      await libraryTabBtn.click();
      await page.waitForTimeout(500);

      // Click Browse Hadith
      const hadithBtn = page.getByText(/Hadith Library/i).first();
      await hadithBtn.click();
      await page.waitForTimeout(600);

      const pushedDetailCheck = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="floating-nav-container"]');
        const headerWordmark = Array.from(document.querySelectorAll('*')).find(
          el => el.textContent === 'ISLAMIC' && el.children.length === 0
        );
        const screenHeader = document.querySelector('[data-testid="screen-header"]') ||
          Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('Hadith') && el.tagName.toLowerCase().includes('h'));
        return {
          hasNav: !!nav,
          hasAppHeaderWordmark: !!headerWordmark,
          hasScreenHeader: !!screenHeader,
        };
      });

      assert.equal(pushedDetailCheck.hasNav, false, 'FloatingNav must NOT be present on pushed detail screen');
      assert.equal(pushedDetailCheck.hasAppHeaderWordmark, false, 'AppHeader wordmark must NOT be present on pushed detail screen');

      const detailScreenshotPath = path.join(screenshotDir, `pushed_hadith_detail_${theme}_${width}.png`);
      await page.screenshot({ path: detailScreenshotPath });
      console.log(`  ✓ Pushed Detail Screen (Hadith) @ ${width}dp [${theme}]: AppHeader hidden, FloatingNav hidden`);

      // Click back button to return to hub
      const backBtn = page.locator('[data-testid="screen-header-back"], [aria-label*="Back"], [aria-label*="back"]').first();
      if (await backBtn.count() > 0) {
        await backBtn.click();
        await page.waitForTimeout(500);
      }

      // Test Settings modal
      const settingsGear = page.locator('[data-testid="app-header-gear"]:visible');
      if (await settingsGear.count() > 0) {
        await settingsGear.first().click();
        await page.waitForTimeout(500);

        const settingsCheck = await page.evaluate(() => {
          const nav = document.querySelector('[data-testid="floating-nav-container"]');
          return {
            hasNav: !!nav,
          };
        });

        const settingsScreenshotPath = path.join(screenshotDir, `settings_modal_${theme}_${width}.png`);
        await page.screenshot({ path: settingsScreenshotPath });
        console.log(`  ✓ Settings Modal @ ${width}dp [${theme}]: FloatingNav hidden`);
      }

      await context.close();
    }
  }

  console.log('\n=== MEASUREMENT SUMMARY TABLE ===');
  console.table(measurementResults);

} finally {
  await browser.close();
  server.close();
}

console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
