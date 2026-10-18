import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const SCREENSHOTS_DIR = path.resolve('screenshots/tools_hub_verification');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

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
  if (!fs.existsSync(filePath)) {
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
console.log(`[Verification] Static server running on port ${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const viewports = [
  { width: 360, height: 800, name: '360' },
  { width: 393, height: 852, name: '393' },
  { width: 430, height: 932, name: '430' },
];

const themes = ['paper', 'ink'];

for (const vp of viewports) {
  for (const theme of themes) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await context.addInitScript((th) => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem(
        'islamic-settings',
        JSON.stringify({
          language: 'en',
          themeMode: th === 'ink' ? 'dark' : 'light',
          manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
          locationMode: 'manual',
          womenWorshipConsent: true,
          womenWorshipEnabled: true,
        })
      );
    }, theme);

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Switch to Tools tab
    const toolsTab = page.getByRole('tab', { name: 'Tools' });
    await toolsTab.click();
    await page.waitForTimeout(1000);

    // Capture screenshot of Tools screen
    const shotPath = path.join(SCREENSHOTS_DIR, `tools_hub_${vp.name}_${theme}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });

    // Evaluate Tools screen content
    const evaluation = await page.evaluate(() => {
      const qiblaCards = document.querySelectorAll('[data-testid="tools-card-qibla"]');
      const cycleCards = document.querySelectorAll('[data-testid="tools-card-women-cycle"]');
      const allText = document.body.innerText;

      // Check tracker grid cards order
      const trackerWrap = document.querySelector('.css-view-175oi2r'); // general search or test IDs
      const testIds = Array.from(document.querySelectorAll('[data-testid^="tools-card-"]'))
        .map(el => el.getAttribute('data-testid'));

      return {
        qiblaCount: qiblaCards.length,
        cycleCount: cycleCards.length,
        hasCycleTrackerText: allText.includes('Cycle Tracker'),
        testIds,
      };
    });

    console.log(`[${vp.name}][${theme}] qiblaCount=${evaluation.qiblaCount}, cycleCount=${evaluation.cycleCount}, hasCycleTrackerText=${evaluation.hasCycleTrackerText}`);
    assert.equal(evaluation.qiblaCount, 1, `Expected exactly 1 Qibla card on Tools hub in ${vp.name} ${theme}`);
    assert.equal(evaluation.cycleCount, 0, `Expected 0 Cycle Tracker cards on Tools hub in ${vp.name} ${theme}`);
    assert.equal(evaluation.hasCycleTrackerText, false, `Expected 'Cycle Tracker' to NOT be visible on Tools hub in ${vp.name} ${theme}`);

    // Verify exact visible order in Trackers & Calculators:
    // Fasting, Qada Fasts, Zakat, Qibla, Tasbih, Weekly Summary
    const expectedTrackers = [
      'tools-card-fasting',
      'tools-card-women-qada',
      'tools-card-zakat',
      'tools-card-qibla',
      'tools-card-tasbih',
      'tools-card-summary',
    ];
    const trackerIds = evaluation.testIds.filter(id => expectedTrackers.includes(id));
    assert.deepEqual(trackerIds, expectedTrackers, `Tracker grid items order mismatch: ${JSON.stringify(trackerIds)}`);

    await context.close();
  }
}

// Now test Settings -> Women's Worship path
console.log('\n--- Testing Settings -> Women\'s Worship path ---');
{
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
        womenWorshipConsent: true,
        womenWorshipEnabled: true,
      })
    );
  });

  // Verify source/render path contracts for Settings -> Women's Worship
  const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
  assert.ok(settingsScreenCode.includes('title={t("Cycle Tracker")}'), 'SettingsScreen must contain Cycle Tracker title');
  assert.ok(settingsScreenCode.includes("onOpenToolsItem('women-cycle')"), 'SettingsScreen must wire onOpenToolsItem("women-cycle")');
  assert.ok(settingsScreenCode.includes("Protect Women's Worship"), 'SettingsScreen must preserve Women\'s Worship protection row');
  console.log('  ✓ SettingsScreen Women\'s Worship source contract verified (Cycle Tracker, onOpenToolsItem, security lock)');

  const appCode = fs.readFileSync('App.tsx', 'utf8');
  assert.ok(appCode.includes("tools.screen === 'women-cycle'"), 'App.tsx must preserve tools.screen === "women-cycle" route');
  assert.ok(appCode.includes('<WomenLockGate>'), 'App.tsx must gate women\'s screens with WomenLockGate');
  console.log('  ✓ App.tsx WomenLockGate and women-cycle router path verified');

  await context.close();
}

await browser.close();
server.close();
console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
