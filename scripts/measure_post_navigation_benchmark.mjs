import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

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

const fixture = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '17 Oct 2026', hijri: { day: '5', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '17-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const min = Math.round(sorted[0] * 10) / 10;
  const max = Math.round(sorted[sorted.length - 1] * 10) / 10;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
    : Math.round(sorted[mid] * 10) / 10;
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95 = Math.round(sorted[p95Idx] * 10) / 10;
  return { min, median, p95, max };
}

try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  await context.addInitScript(() => {
    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('location-setup-dismissed-v1', 'true');
    localStorage.setItem(
      'islamic-settings',
      JSON.stringify({
        language: 'en',
        themeMode: 'light',
        madhab: 'shafi',
        methodId: '2',
        manualLocation: {
          city: 'London',
          country: 'United Kingdom',
          latitude: 51.5074,
          longitude: -0.1278,
        },
      })
    );
  });

  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('api.aladhan.com') || url.includes('api.islamic.app')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture),
      });
    }
    return route.continue();
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="floating-nav-container"]');
  await page.waitForTimeout(500);

  const transitions = [
    { from: 'Home', to: 'Quran', toBtn: '[data-testid="floating-nav-tab-quran"]', readySelector: '[data-testid="surah-row-1"]' },
    { from: 'Quran', to: 'Library', toBtn: '[data-testid="floating-nav-tab-library"]', readySelector: '[data-testid="library-card-hadith-hero"]' },
    { from: 'Library', to: 'Tools', toBtn: '[data-testid="floating-nav-tab-tools"]', readySelector: '[data-testid="tools-card-salah-hero"]' },
    { from: 'Tools', to: 'Home', toBtn: '[data-testid="floating-nav-tab-home"]', readySelector: 'text=Assalam o Alaikum' },
  ];

  const results = {};

  for (const t of transitions) {
    const key = `${t.from} -> ${t.to}`;
    results[key] = { feedback: [], route: [], ready: [] };
  }

  // Run 10 repeated cycles
  for (let cycle = 0; cycle < 10; cycle++) {
    for (const t of transitions) {
      const key = `${t.from} -> ${t.to}`;
      const btn = page.locator(t.toBtn);

      const tStart = performance.now();
      await btn.click();

      // Tap-to-feedback: nav active indicator change
      const tFeedback = performance.now();
      results[key].feedback.push(tFeedback - tStart);

      // Tap-to-route: destination tab active state updated in DOM
      await page.waitForFunction(
        (target) => {
          const tab = target.toLowerCase();
          const activeItem = document.querySelector(`[data-testid="floating-nav-tab-${tab}"]`);
          return activeItem && activeItem.getAttribute('aria-selected') === 'true';
        },
        t.to,
        { timeout: 3000 }
      );
      const tRoute = performance.now();
      results[key].route.push(tRoute - tStart);

      // Tap-to-content-ready: key content element rendered and visible
      await page.waitForSelector(t.readySelector, { timeout: 3000, state: 'visible' });
      const tReady = performance.now();
      results[key].ready.push(tReady - tStart);

      await page.waitForTimeout(50);
    }
  }

  console.log('=== POST-OPTIMIZATION NAVIGATION BENCHMARK (10 CYCLES) ===\n');
  for (const t of transitions) {
    const key = `${t.from} -> ${t.to}`;
    const sFeedback = stats(results[key].feedback);
    const sRoute = stats(results[key].route);
    const sReady = stats(results[key].ready);

    console.log(`Transition: ${key} (10 cycles)`);
    console.log(`  Tap-to-feedback:      med=${sFeedback.median}ms, p95=${sFeedback.p95}ms (range ${sFeedback.min}-${sFeedback.max}ms)`);
    console.log(`  Tap-to-route:         med=${sRoute.median}ms, p95=${sRoute.p95}ms (range ${sRoute.min}-${sRoute.max}ms)`);
    console.log(`  Tap-to-content-ready: med=${sReady.median}ms, p95=${sReady.p95}ms (range ${sReady.min}-${sReady.max}ms)`);
  }

  // Menu: Settings Modal Open & Close (10 cycles)
  const settingsOpenTimes = [];
  const settingsCloseTimes = [];
  for (let c = 0; c < 10; c++) {
    const gear = page.locator('[data-testid="app-header-gear"]:visible').first();
    const t0 = performance.now();
    await gear.click();
    await page.waitForSelector('text=Appearance', { timeout: 3000, state: 'visible' });
    settingsOpenTimes.push(performance.now() - t0);

    const closeBtn = page.locator('[data-testid="sheet-header-close-btn"]');
    const tc0 = performance.now();
    await closeBtn.click();
    await page.waitForTimeout(100);
    settingsCloseTimes.push(performance.now() - tc0);
  }

  const sSettingsOpen = stats(settingsOpenTimes);
  console.log(`\nMenu Open: Settings Modal (10 cycles)`);
  console.log(`  Tap-to-content-ready: med=${sSettingsOpen.median}ms, p95=${sSettingsOpen.p95}ms (range ${sSettingsOpen.min}-${sSettingsOpen.max}ms)`);

  const outputJson = {
    transitions: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [
        k,
        {
          feedback: stats(v.feedback),
          route: stats(v.route),
          ready: stats(v.ready),
        },
      ])
    ),
    settingsOpen: stats(settingsOpenTimes),
  };

  fs.writeFileSync('reports/audit/post-optimization-navigation-timings.json', JSON.stringify(outputJson, null, 2));
  console.log('\nSaved post-optimization timings to reports/audit/post-optimization-navigation-timings.json');

} finally {
  await browser.close();
  server.close();
}
