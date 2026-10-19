/* Optional rendered review: export web first, then run with Playwright + Chromium.
 * See docs/ui-review.md. Network requests are blocked so this checks offline UI;
 * prayer times below are screenshot fixtures, never application data.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const app = fs.readFileSync('App.tsx', 'utf8');
const routes = [{ id: 'home', tab: 'home' }];
for (const [type, tab, setter] of [
  ['QuranView', 'quran', 'setQuran'], ['LibraryView', 'library', 'setLibrary'], ['ToolsView', 'tools', 'setTools'],
]) {
  const union = app.split('export type ' + type + ' =')[1].split(/\n(?:export |function )/)[0];
  for (const match of union.matchAll(/screen: '([^']+)'/g)) {
    const screen = match[1];
    routes.push({ id: `${tab}-${screen}`, tab, setter, view: { screen, ...(screen === 'reader' || screen === 'hifz-practice' ? { surah: 1 } : {}) } });
  }
}
routes.push({ id: 'settings', settings: true });
for (const legal of ['privacy', 'terms', 'data', 'licenses', 'services', 'contact']) {
  routes.push({ id: `settings-${legal}`, settings: true, legal });
}
routes.push({ id: 'settings-backup', settings: true, backup: true });
const root = path.resolve('dist');
const out = process.env.UI_REVIEW_OUT || '/tmp/islamic-ui-review';
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((request, response) => {
  let file = path.resolve(root, '.' + decodeURIComponent((request.url || '/').split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  const contentType = { '.js': 'application/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.wasm': 'application/wasm' }[path.extname(file)] || 'application/octet-stream';
  response.writeHead(200, { 'content-type': contentType });
  response.end(fs.readFileSync(file));
});

async function review() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const findings = [];
  try {
    for (const language of ['en', 'ur']) for (const themeMode of ['paper', 'ink']) {
      const config = `${language}-${themeMode}`;
      const directory = path.join(out, config);
      fs.mkdirSync(directory, { recursive: true });
      const context = await browser.newContext({ viewport: { width: Number(process.env.UI_REVIEW_WIDTH || 393), height: 852 }, reducedMotion: 'reduce' });
      await context.addInitScript(({ language, themeMode }) => {
        if (location.hostname !== '127.0.0.1') return;
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem('islamic-settings', JSON.stringify({ language, themeMode, manualLocation: { latitude: 21.42, longitude: 39.83, label: 'Makkah' }, locationMode: 'manual', methodId: 16, madhab: 'shafi' }));
        const now = new Date();
        const date = [String(now.getDate()).padStart(2, '0'), String(now.getMonth() + 1).padStart(2, '0'), now.getFullYear()].join('-');
        const data = { timings: { Fajr: '05:10', Sunrise: '06:25', Dhuhr: '12:25', Asr: '15:45', Maghrib: '18:20', Isha: '19:40' }, hijri: { day: '8', month: '5', monthEn: 'Jumada al-awwal', year: '1448' }, gregorian: date, readable: date, method: 'Islamic.app', timezone: 'Asia/Riyadh' };
        localStorage.setItem(`salah-db:prayer:${date}:21.4200,39.8300:16:shafi:`, JSON.stringify({ payload: JSON.stringify(data), date, location: '21.42,39.83', method: 16, madhab: 'shafi' }));
      }, { language, themeMode });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' });
      await page.waitForFunction(() => !!window.__NAVIGATE__);
      await page.waitForTimeout(2100);
      for (const route of routes) {
        errors.length = 0;
        await page.evaluate((route) => {
          const nav = window.__NAVIGATE__;
          nav.closeLiveStream();
          nav.setSettingsOpen(!!route.settings);
          if (!route.settings) {
            nav.setTab(route.tab);
            if (route.setter) nav[route.setter](route.view);
          }
        }, route);
        if (route.settings) {
          await page.waitForFunction(() => !!window.__SETTINGS_NAV__);
          await page.evaluate((route) => {
            window.__SETTINGS_NAV__.setActiveLegalScreen(route.legal || null);
            window.__SETTINGS_NAV__.setShowBackupRestore(!!route.backup);
          }, route);
        }
        await page.waitForTimeout(180);
        const clipped = await page.evaluate(() => [...document.querySelectorAll('[dir="auto"]')].flatMap((element) => {
          if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return [];
          const box = element.getBoundingClientRect();
          if (box.width <= 5 || box.height <= 5 || box.top >= innerHeight || box.bottom <= 0 || element.children.length || element.tagName === 'INPUT') return [];
          return element.scrollHeight > element.clientHeight + 3 || element.scrollWidth > element.clientWidth + 3
            ? [{ text: element.textContent.slice(0, 100), width: box.width, height: box.height }] : [];
        }));
        await page.screenshot({ path: path.join(directory, route.id + '.png') });
        if (process.env.UI_REVIEW_LOWER) {
          await page.evaluate(() => {
            for (const element of document.querySelectorAll('*')) {
              const style = getComputedStyle(element);
              if (element.checkVisibility() && ['scroll', 'auto'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 80) element.scrollTop = element.scrollHeight;
            }
          });
          await page.waitForTimeout(80);
          await page.screenshot({ path: path.join(directory, route.id + '-bottom.png') });
        }
        findings.push({ config, route: route.id, errors: [...errors], clipped });
      }
      await context.close();
      console.log(`${config}: ${routes.length} screen states reviewed`);
    }
    fs.writeFileSync(path.join(out, 'findings.json'), JSON.stringify(findings, null, 2));
    assert.equal(findings.reduce((total, item) => total + item.errors.length, 0), 0, 'Rendered screens must not throw runtime errors');
    assert.equal(findings.reduce((total, item) => total + item.clipped.length, 0), 0, 'Review findings.json for clipped visible text');
    console.log(`Screenshots and findings: ${out}`);
  } finally {
    await browser.close();
    server.close();
  }
}
review().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
