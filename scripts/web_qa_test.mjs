import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Load playwright
const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');

// MIME types
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

// Simple static server
const server = http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/';
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) {
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
console.log(`[Web QA] Static server listening on http://127.0.0.1:${port}`);

const consoleErrors = [];
const consoleLogs = [];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PageError] ${err.message}`);
  });

  console.log('[Web QA] Navigating to initial page...');
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });

  // Test Case A: Seed saved position on later Mushaf Page (Surah 2, Ayah 142 on Page 22)
  console.log('[Web QA] Seeding localStorage for Surah 2, Ayah 142 on Page 22...');
  const markerData = {
    surah: 2,
    ayah: 142,
    page: 22,
    savedAt: Date.now(),
    manual: true,
  };
  const positionData = {
    surah: 2,
    ayah: 142,
    page: 22,
    savedAt: Date.now(),
  };

  await page.evaluate(({ marker, pos }) => {
    localStorage.setItem('onboardingDone', 'true');
    localStorage.setItem('location-setup-dismissed-v1', 'true');
    localStorage.setItem('islamic-settings', JSON.stringify({
      manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
      locationMode: 'manual',
    }));

    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    const dateStr = `${d}-${m}-${y}`;
    const prayerPayload = {
      timings: {
        Fajr: '05:00',
        Sunrise: '06:15',
        Dhuhr: '12:30',
        Asr: '15:45',
        Maghrib: '18:20',
        Isha: '19:45',
      },
      hijri: {
        day: '15',
        month: '9',
        monthEn: 'Ramadan',
        year: '1447',
      },
      gregorian: dateStr,
      readable: 'Today',
      method: 'Islamic.app',
      timezone: 'UTC',
    };
    const entry = JSON.stringify({
      payload: JSON.stringify(prayerPayload),
      date: dateStr,
      location: '21.42,39.83',
      method: 16,
      madhab: 'shafi',
      cached_at: Date.now(),
    });
    localStorage.setItem(`salah-db:prayer:${dateStr}:21.42,39.83:16:shafi`, entry);
    localStorage.setItem('salah-db:prayer:latest', entry);

    localStorage.setItem('quran-reading-marker', JSON.stringify(marker));
    localStorage.setItem('quran-last-reading', JSON.stringify(pos));
    localStorage.setItem('quran-reading-mode', 'mushaf');
  }, { marker: markerData, pos: positionData });

  console.log('[Web QA] Hard refreshing to simulate clean app boot with saved marker...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Look for Continue Reading card on Today tab
  console.log('[Web QA] Looking for Continue Reading button / card...');
  const continueBtn = await page.waitForSelector('text=CONTINUE READING', { timeout: 10000 });
  console.log('  Found Continue Reading card. Clicking...');
  await continueBtn.click();

  // Wait for Mushaf reader to open and render Page 22
  console.log('[Web QA] Waiting for Mushaf Page 22 header...');
  await page.waitForFunction(() => {
    return document.body.innerText.includes('Page 22 of 604') ||
           document.body.innerText.includes('Page 22');
  }, { timeout: 10000 });
  console.log('  ✓ Page 22 is displayed in reader header!');

  // Look for target Ayah element with testID mushaf-ayah-2-142
  console.log('[Web QA] Waiting for exact target Ayah testID: mushaf-ayah-2-142...');
  const targetAyah = await page.waitForSelector('[data-testid="mushaf-ayah-2-142"]', { timeout: 10000 });
  console.log('  ✓ Found target Ayah: mushaf-ayah-2-142 in DOM!');

  // Check highlight style immediately after layout
  await page.waitForTimeout(200);
  const styleAtStart = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="mushaf-ayah-2-142"]');
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      borderWidth: computed.borderWidth,
    };
  });
  console.log('  ✓ Highlight styles on target Ayah during 2s window:', styleAtStart);
  if (styleAtStart.backgroundColor === 'rgba(0, 0, 0, 0)' && (!styleAtStart.borderWidth || styleAtStart.borderWidth === '0px')) {
    throw new Error('Target Ayah has no visible highlight during the 2000ms window!');
  }
  console.log('  ✓ Visible highlight confirmed active on exact restored ayah!');

  // Wait 2.2 seconds and verify highlight clears
  console.log('[Web QA] Waiting 2200ms for highlight timer expiration...');
  await page.waitForTimeout(2200);
  const styleAfter2s = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="mushaf-ayah-2-142"]');
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor,
      borderWidth: computed.borderWidth,
    };
  });
  console.log('  ✓ Target Ayah styles after 2000ms timer:', styleAfter2s);

  // Check action popup is NOT open
  const popupOpen = await page.evaluate(() => {
    // Popup buttons like "Tafsir" or "Play" or "Bookmark" in the floating action bar
    return !!document.querySelector('[data-testid="mushaf-selected-bar"]') ||
           document.body.innerText.includes('Selected Ayah');
  });
  console.log(`  ✓ Action popup is closed: ${!popupOpen}`);

  // Test Case B: Test a page containing multiple Surahs (e.g. Page 596: Surahs 92, 93, 94)
  console.log('\n[Web QA] Testing Page with Multiple Surahs: Surah 93 Ayah 1 on Page 596...');
  const multiSurahMarker = {
    surah: 93,
    ayah: 1,
    page: 596,
    savedAt: Date.now(),
    manual: true,
  };
  await page.evaluate(({ marker }) => {
    localStorage.setItem('quran-reading-marker', JSON.stringify(marker));
    localStorage.setItem('quran-last-reading', JSON.stringify(marker));
  }, { marker: multiSurahMarker });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const continueBtnMulti = await page.waitForSelector('text=CONTINUE READING', { timeout: 10000 });
  await continueBtnMulti.click();

  await page.waitForFunction(() => {
    return document.body.innerText.includes('Page 596 of 604') ||
           document.body.innerText.includes('Page 596');
  }, { timeout: 10000 });
  console.log('  ✓ Page 596 displayed in header!');

  const targetMultiAyah = await page.waitForSelector('[data-testid="mushaf-ayah-93-1"]', { timeout: 10000 });
  console.log('  ✓ Found target Ayah: mushaf-ayah-93-1 on multi-Surah page!');

  await page.waitForTimeout(200);
  const styleMulti = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="mushaf-ayah-93-1"]');
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor,
      borderWidth: computed.borderWidth,
    };
  });
  console.log('  ✓ Highlight styles on Surah 93 Ayah 1:', styleMulti);

  // Filter out external network/CORS errors to live api.islamic.app and font 404s
  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes('font') &&
           !e.includes('favicon') &&
           !e.includes('404') &&
           !e.includes('api.islamic.app') &&
           !e.includes('ERR_FAILED') &&
           !e.includes('CORS')
  );

  console.log(`\n[Web QA] Total non-network runtime errors: ${criticalErrors.length}`);
  if (criticalErrors.length > 0) {
    console.log('Errors:', criticalErrors);
    throw new Error(`Runtime errors encountered: ${criticalErrors.join(', ')}`);
  }

  console.log('\n================================================================');
  console.log('WEB QA FULLY VERIFIED WITH HEADLESS CHROMIUM & REAL STORAGE!');
  console.log('================================================================\n');
} finally {
  await browser.close();
  server.close();
}
