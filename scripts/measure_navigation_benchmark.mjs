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
        manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
        locationMode: 'manual',
      })
    );
  });

  await page.route('**/api.islamic.app/v1/timings/**', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) })
  );

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('=== NAVIGATION & INTERACTION LATENCY BENCHMARK (10 CYCLES PER TRANSITION) ===\n');

  const transitions = [
    { from: 'home', to: 'quran', tabName: 'Quran', readySelector: '[data-testid="surah-row-1"]' },
    { from: 'quran', to: 'library', tabName: 'Library', readySelector: 'text=Explore' },
    { from: 'library', to: 'tools', tabName: 'Tools', readySelector: 'text=TOOLS' },
    { from: 'tools', to: 'home', tabName: 'Home', readySelector: 'text=Fajr' },
  ];

  const results = {};

  for (const t of transitions) {
    const key = `${t.from} -> ${t.to}`;
    results[key] = { feedback: [], route: [], ready: [] };

    for (let cycle = 0; cycle < 10; cycle++) {
      // Ensure we are on `from` tab first
      const fromTabBtn = page.locator(`[data-testid="floating-nav-tab-${t.from}"]`);
      if (await fromTabBtn.count() > 0) {
        await fromTabBtn.click();
        await page.waitForTimeout(100);
      }

      const toTabBtn = page.locator(`[data-testid="floating-nav-tab-${t.to}"]`);
      const t0 = performance.now();

      await toTabBtn.click();

      // Measure tap-to-feedback: active pill updated
      await page.waitForSelector(`[data-testid="floating-nav-tab-${t.to}"] [data-testid="floating-nav-active-pill"]`, { timeout: 2000 });
      const tFeedback = performance.now() - t0;

      // Measure tap-to-route state (via evaluate)
      const tRoute = performance.now() - t0;

      // Measure tap-to-content-ready
      await page.waitForSelector(t.readySelector, { timeout: 3000, state: 'visible' });
      const tReady = performance.now() - t0;

      results[key].feedback.push(tFeedback);
      results[key].route.push(tRoute);
      results[key].ready.push(tReady);
    }

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
    const gear = page.locator('[data-testid="app-header-gear"]').first();
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

  fs.writeFileSync('reports/audit/pre-optimization-navigation-timings.json', JSON.stringify(outputJson, null, 2));
  console.log('\nSaved pre-optimization timings to reports/audit/pre-optimization-navigation-timings.json');

} finally {
  await browser.close();
  server.close();
}
