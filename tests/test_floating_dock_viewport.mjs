import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = await import('file:///home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent((req.url || '/').split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.setHeader('content-type', f.endsWith('.js') ? 'application/javascript' : 'text/html');
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const evidence = 'screenshots/floating_dock_fix_2026-10-13';
fs.mkdirSync(evidence, { recursive: true });

const fixture = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '13 Oct 2026', hijri: { day: '1', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '13-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

try {
  for (const [width, height] of [[360, 844], [430, 932]]) {
    for (const theme of ['paper', 'ink']) {
      for (const route of ['Home', 'Quran']) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();

        await context.addInitScript(theme => {
          localStorage.setItem('onboardingDone', 'true');
          localStorage.setItem('location-setup-dismissed-v1', 'true');
          localStorage.setItem(
            'islamic-settings',
            JSON.stringify({
              language: 'en',
              themeMode: theme === 'ink' ? 'dark' : 'light',
              manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
              locationMode: 'manual',
            })
          );
        }, theme);

        await page.route('**/api.islamic.app/v1/timings/**', r =>
          r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) })
        );

        await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1400);

        if (route === 'Quran') {
          await page.getByRole('tab', { name: 'Quran' }).click();
          await page.waitForTimeout(800);
        }

        const state = () =>
          page.evaluate(route => {
            const tab = [...document.querySelectorAll('[role="tab"]')].find(
              e => e.getAttribute('aria-label') === route
            );
            const dock = document.querySelector('[data-testid="floating-nav-container"]');
            const nr = dock?.getBoundingClientRect();
            const visible = e => {
              const r = e.getBoundingClientRect();
              const s = getComputedStyle(e);
              return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
            };
            const sc = [...document.querySelectorAll('*')]
              .filter(
                e =>
                  visible(e) &&
                  ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) &&
                  e.clientHeight > 200 &&
                  e.scrollHeight > e.clientHeight
              )
              .sort((a, b) => b.clientHeight - a.clientHeight)[0];

            if (!tab || !sc || !nr) return null;
            const r = sc.getBoundingClientRect();
            return {
              active: tab.getAttribute('aria-label'),
              navTop: nr.top,
              navBottom: nr.bottom,
              scrollTop: r.top,
              scrollBottom: r.bottom,
              client: sc.clientHeight,
              scroll: sc.scrollHeight,
            };
          }, route);

        const m = await state();
        assert.ok(m, `${route} ${width} ${theme}: expected visible active-tab dock and scrollable viewport`);
        assert.equal(m.active, route, `wrong active route: ${m.active}`);

        // Target architecture assertions:
        // 1. Scroller fills available height behind floating nav (below shared AppHeader)
        assert.ok(m.client >= height - 36, `${route}: scene must fill available height behind floating nav, got ${m.client} vs ${height - 34}`);
        // 2. Dock is an absolute floating overlay
        assert.ok(m.navTop < height && m.navTop > height - 100, `${route}: dock must float near bottom, got ${m.navTop}`);

        const screenText = await page.locator('body').innerText();
        assert.ok(!/Can't load prayer times|Preparing dashboard/i.test(screenText), 'error/loading overlay remains');
        assert.ok(
          route === 'Home'
            ? screenText.includes('Assalam o Alaikum')
            : screenText.includes('Surahs') && screenText.includes('Al-Faatiha'),
          `${route} route content not visible`
        );

        for (const point of ['top', 'middle', 'end']) {
          if (point === 'middle') {
            await page.evaluate(() => {
              const s = [...document.querySelectorAll('*')]
                .filter(
                  e =>
                    e.clientHeight > 200 &&
                    e.scrollHeight > e.clientHeight &&
                    ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)
                )
                .sort((a, b) => b.clientHeight - a.clientHeight)[0];
              if (s) s.scrollTop = s.scrollHeight / 2;
            });
            await page.waitForTimeout(200);
          }

          if (point === 'end') {
            const endData = await page.evaluate(async route => {
              const dock = document.querySelector('[data-testid="floating-nav-container"]');
              const dockRect = dock.getBoundingClientRect();
              const scroller = [...document.querySelectorAll('*')].find(
                e => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && e.clientHeight > 200
              );

              if (route === 'Quran') {
                for (let i = 0; i < 20; i++) {
                  scroller.scrollTop += 500;
                  await new Promise(r => setTimeout(r, 30));
                }
              }
              scroller.scrollTop = scroller.scrollHeight;
              await new Promise(r => setTimeout(r, 200));

              let lastEl;
              if (route === 'Home') {
                lastEl = scroller.lastElementChild?.lastElementChild;
              } else {
                const rows = [...document.querySelectorAll('[data-testid^="surah-row-"]')];
                lastEl = rows[rows.length - 1];
              }

              const lastRect = lastEl ? lastEl.getBoundingClientRect() : null;

              // Sensitivity control test:
              // Removing the bottom padding from content container must cause terminal content to intersect dock
              const contentContainer = scroller.firstElementChild;
              const origPadBottom = contentContainer.style.paddingBottom;
              contentContainer.style.paddingBottom = '0px';
              scroller.scrollTop = scroller.scrollHeight;
              const unpaddedLastRect = lastEl ? lastEl.getBoundingClientRect() : null;
              contentContainer.style.paddingBottom = origPadBottom;
              scroller.scrollTop = scroller.scrollHeight;

              return {
                dockTop: dockRect.top,
                lastBottom: lastRect ? lastRect.bottom : null,
                unpaddedLastBottom: unpaddedLastRect ? unpaddedLastRect.bottom : null,
              };
            }, route);

            assert.ok(
              endData.lastBottom && endData.lastBottom <= endData.dockTop + 1,
              `${route} terminal content hidden by dock: lastBottom=${endData.lastBottom} dockTop=${endData.dockTop}`
            );

            assert.ok(
              endData.unpaddedLastBottom && endData.unpaddedLastBottom > endData.dockTop,
              `${route} sensitivity control: removing paddingBottom must intersect dock, unpaddedLastBottom=${endData.unpaddedLastBottom} dockTop=${endData.dockTop}`
            );
          }

          await page.screenshot({ path: `${evidence}/${width}x${height}_${theme}_${route}_${point}.png` });
        }

        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log('PASS floating dock viewport regression matrix; full-screen overlay architecture verified');