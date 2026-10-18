import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const dist = path.resolve('dist');
const output = path.resolve('proof/color-batch-3c');
const screens = [
  ['women-cycle', 'WomenCycle', 'Cycle Tracker'],
  ['women-guidance', 'WomenGuidance', 'Worship Guidance'],
  ['women-purity', 'WomenPurity', 'Purity & Ghusl'],
  ['women-qada', 'WomenQada', 'Qada Fasts'],
  ['zakat', 'Zakat', 'Zakat'],
];
for (const [, name] of screens) {
  const source = fs.readFileSync(`src/screens/${name}Screen.tsx`, 'utf8');
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b|rgba?\(|HOME_THEME_TOKENS|backgroundColor:\s*(?:tokens\.accent|tokens\.gold)\b/, `${name} source palette`);
}
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.resolve(dist, '.' + (urlPath === '/' ? '/index.html' : urlPath));
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const expected = screens.flatMap(([id]) => ['paper', 'ink'].map(theme => `${id}_${theme}_393x852.png`));
const rows = [];
try {
  for (const theme of ['paper', 'ink']) for (const [id, name, title] of screens) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    try {
      await context.addInitScript(theme => {
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem('islamic-settings', JSON.stringify({ language: 'en', themeMode: theme, locationMode: 'manual', manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah' }, womenWorshipEnabled: true, womenLockEnabled: false, womenPinHash: null }));
      }, theme);
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!window.__NAVIGATE__, { timeout: 15000 });
      await page.waitForTimeout(900);
      await page.evaluate(id => { window.__NAVIGATE__.setTab('tools'); window.__NAVIGATE__.setTools({ screen: id }); }, id);
      await page.getByText(title, { exact: true }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(400);
      const visible = await page.locator('body').innerText();
      assert.doesNotMatch(visible, /could(?:n’t|n't| not) load|try again|unlock women|enter pin|turn on women's worship/i, `${id}/${theme} error or privacy gate`);
      if (id !== 'zakat') assert.match(visible, /Private|Purity|Qada|Worship/i, `${id}/${theme} unique content`);
      const styles = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="detail-screen-root"]');
        const gradients = [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).backgroundImage.includes('gradient')).length;
        return { rootBackground: root ? getComputedStyle(root).backgroundColor : null, gradients };
      });
      const file = `${id}_${theme}_393x852.png`;
      await page.screenshot({ path: path.join(output, file) });
      if (id === 'women-qada') {
        const emptyAction = page.getByText('+ Log Missed Fast', { exact: true }).last();
        await emptyAction.evaluate(el => {
          for (let parent = el.parentElement; parent; parent = parent.parentElement) {
            if (parent.scrollHeight > parent.clientHeight + 10) { parent.scrollTop = parent.scrollHeight; return; }
          }
          throw new Error('Qada has no scroll owner');
        });
        await page.waitForTimeout(200);
        const box = await emptyAction.boundingBox();
        assert.ok(box && box.y + box.height < 785, `${id}/${theme} empty action is obscured by the bottom dock: ${JSON.stringify(box)}`);
      }
      rows.push({ id, name, theme, file, title, bytes: fs.statSync(path.join(output, file)).size, ...styles });
      console.log('PASS', id, theme, styles);
    } finally { await context.close(); }
  }
  const actual = fs.readdirSync(output).filter(f => f.endsWith('.png')).sort();
  assert.deepEqual(actual, expected.sort());
  assert.equal(rows.length, 10);
  // The proof-only unlocked fixture must not mask a regression in the real gate.
  const locked = await browser.newContext({ viewport: { width: 393, height: 852 } });
  try {
    await locked.addInitScript(() => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem('islamic-settings', JSON.stringify({ language: 'en', themeMode: 'paper', womenWorshipEnabled: true, womenLockEnabled: true }));
    });
    const page = await locked.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.__NAVIGATE__);
    await page.waitForTimeout(900);
    await page.evaluate(() => { window.__NAVIGATE__.setTab('tools'); window.__NAVIGATE__.setTools({ screen: 'women-cycle' }); });
    await page.getByText('Protected', { exact: true }).filter({ visible: true }).waitFor({ timeout: 10000 });
    assert.equal(await page.getByText('Cycle Tracker', { exact: true }).filter({ visible: true }).count(), 0);
  } finally { await locked.close(); }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ batch: '3C', status: 'PASS', totalScreenshots: rows.length, screenshots: rows }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
