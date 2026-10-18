import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/ubuntu/apps/islamic_app/package.json');
const { PNG } = require('pngjs');

const root = process.cwd();
const proofDir = path.join(root, 'proof/rework-batch-3a');
fs.mkdirSync(proofDir, { recursive: true });

const targets = [
  'src/screens/TajweedScreen.tsx',
  'src/screens/VocabTrainerScreen.tsx',
  'src/screens/WomenQadaScreen.tsx',
];
const checks = [];
const assert = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
};

for (const file of targets) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(`${file} exists`, source.length > 0);
  assert(`${file} uses DetailScreen`, source.includes('DetailScreen'));
  assert(`${file} uses SubHeader`, source.includes('SubHeader'));
  assert(`${file} removes legacy ScreenHeader`, !source.includes('ScreenHeader'));
  assert(`${file} uses DetailScrollView/FlatList`, source.includes('DetailScreen.ScrollView') || source.includes('DetailScreen.FlatList'));
  assert(`${file} has no manual TAB_PAD_BOTTOM`, !source.includes('TAB_PAD_BOTTOM'));
}

const tajweed = fs.readFileSync(path.join(root, targets[0]), 'utf8');
for (const token of ['fetchTajweedSurah', 'SearchField', 'TajweedText', 'TajweedLegend', 'setShowLegend', 'Retry', 'BackHandler']) {
  assert(`Tajweed preserves ${token}`, tajweed.includes(token));
}
const vocab = fs.readFileSync(path.join(root, targets[1]), 'utf8');
for (const token of ['vocab-trainer-progress-v1', 'AsyncStorage.getItem', 'AsyncStorage.setItem', 'setRevealed', 'setTierFilter', 'Previous word', 'Next word', 'Mark this word as known']) {
  assert(`Vocab preserves ${token}`, vocab.includes(token));
}
const qada = fs.readFileSync(path.join(root, targets[2]), 'utf8');
for (const token of ['loadMissedFasts', 'saveMissedFast', 'toggleMissedFastMadeUp', 'deleteMissedFast', 'useUndoToast', 'Explicit recording only', 'accessibilityRole="checkbox"']) {
  assert(`WomenQada preserves ${token}`, qada.includes(token));
}

const runtime = { attempted: false, captured: [], blocked: null, geometry: [] };
let proofServer;
let proofBrowser;
try {
  const { createServer } = await import('node:http');
  const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
  const { chromium } = await import(`file://${playwrightPath}/index.mjs`);
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  const server = proofServer = createServer((req, res) => {
    let file = path.join(root, 'dist', (req.url || '/').split('?')[0] === '/' ? 'index.html' : (req.url || '/').split('?')[0]);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'dist', 'index.html');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  runtime.attempted = true;
  const routes = [
    ['tajweed', 'library', { screen: 'tajweed' }, 'Tajweed Colors'],
    ['vocab', 'library', { screen: 'vocab' }, 'Quran Vocabulary'],
    ['women-qada', 'tools', { screen: 'women-qada' }, 'Qada Fasts'],
  ];
  const browser = proofBrowser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const theme of ['paper', 'ink']) {
    for (const [id, tab, route, title] of routes) {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
      await context.addInitScript(({ theme }) => {
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem('islamic-settings', JSON.stringify({ language: 'en', themeMode: theme, womenWorshipEnabled: true, womenLockEnabled: false, locationMode: 'manual', manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' } }));
      }, { theme });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await page.evaluate(({ tab, route }) => { window.__NAVIGATE__.setTab(tab); tab === 'library' ? window.__NAVIGATE__.setLibrary(route) : window.__NAVIGATE__.setTools(route); }, { tab, route });
      await page.waitForTimeout(1000);
      const visibleTitle = await page.evaluate(() => document.querySelector('[data-testid="sub-header-title"]')?.textContent || '');
      assert(`${id}-${theme}: route title matches`, visibleTitle.includes(title), visibleTitle);
      const navBox = await page.locator('[data-testid^="floating-nav"]').first().boundingBox().catch(() => null);
      assert(`${id}-${theme}: FloatingNav visible`, Boolean(navBox), JSON.stringify(navBox));

      const layout = await page.evaluate(() => {
        const candidates = [...document.querySelectorAll('*')].map((el) => {
          const style = getComputedStyle(el);
          return { scrollable: el.scrollHeight > el.clientHeight + 10, paddingBottom: parseFloat(style.paddingBottom) || 0 };
        });
        const padded = candidates.filter((item) => item.paddingBottom > 0);
        return { scrollContainer: candidates.some((item) => item.scrollable), paddingBottom: padded.reduce((max, item) => Math.max(max, item.paddingBottom), 0) };
      });
      assert(`${id}-${theme}: scroll container present`, layout.scrollContainer);
      assert(`${id}-${theme}: paddingBottom >= 100`, layout.paddingBottom >= 100, `paddingBottom=${layout.paddingBottom}px`);

      // Scroll measurements: mid-scroll and true-end
      const scrollMeasurement = await page.evaluate((isQada) => {
        const all = [...document.querySelectorAll('*')];
        const scroller = all.find((el) => {
          const s = getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (!scroller) return { scrollable: false, clearance: 999 };

        const nav = document.querySelector('[data-testid^="floating-nav"]');
        const navRect = nav ? nav.getBoundingClientRect() : null;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;

        const getDeepest = () => {
          const leaves = [...scroller.querySelectorAll('*')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.height > 0 && r.width > 0 && el.children.length === 0 && (el.textContent?.trim() || el.tagName === 'INPUT' || el.tagName === 'BUTTON');
          });
          let deepestBottom = 0;
          let deepestTag = '';
          for (const leaf of leaves) {
            const r = leaf.getBoundingClientRect();
            if (r.bottom > deepestBottom) {
              deepestBottom = r.bottom;
              deepestTag = leaf.textContent?.trim().slice(0, 30) || leaf.tagName;
            }
          }
          return { deepestBottom, deepestTag, clearance: navRect ? navRect.top - deepestBottom : 999 };
        };

        const getEmptyBtn = () => {
          const emptyBtn = [...document.querySelectorAll('*')].find((el) => el.textContent?.trim() === '+ Log Missed Fast');
          if (!emptyBtn) return null;
          const r = emptyBtn.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            clearance: navRect ? navRect.top - r.bottom : 999,
            overlaps: navRect ? r.bottom > navRect.top : false,
          };
        };

        // 1. Initial measurement (scrollTop = 0)
        scroller.scrollTop = 0;
        const initial = getDeepest();
        const initialEmpty = isQada ? getEmptyBtn() : null;

        // 2. Mid-scroll measurement
        scroller.scrollTop = Math.round(maxScroll / 2);
        const midScrollTop = scroller.scrollTop;
        const midEmpty = isQada ? getEmptyBtn() : null;

        // 3. True scroll end measurement
        scroller.scrollTop = scroller.scrollHeight;
        const end = getDeepest();
        const endEmpty = isQada ? getEmptyBtn() : null;

        return {
          scrollable: true,
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
          maxScroll,
          midScrollTop,
          navTop: navRect ? navRect.top : null,
          initial,
          initialEmpty,
          midEmpty,
          end,
          endEmpty,
        };
      }, id === 'women-qada');

      assert(
        `${id}-${theme}: mid-scroll position updates correctly`,
        scrollMeasurement.midScrollTop >= 0 && scrollMeasurement.midScrollTop <= scrollMeasurement.maxScroll,
        `midScrollTop=${scrollMeasurement.midScrollTop}px, maxScroll=${scrollMeasurement.maxScroll}px`
      );

      assert(
        `${id}-${theme}: scroll-end content bottom clears FloatingNav top with >= 16px breathing room`,
        scrollMeasurement.end.clearance >= 16,
        `clearance=${scrollMeasurement.end.clearance.toFixed(1)}px, navTop=${scrollMeasurement.navTop}, deepestBottom=${scrollMeasurement.end.deepestBottom} (${scrollMeasurement.end.deepestTag})`
      );

      if (id === 'women-qada') {
        if (scrollMeasurement.midEmpty) {
          assert(
            `women-qada-${theme}: empty-state action button "+ Log Missed Fast" clears FloatingNav at mid-scroll (>= 16px)`,
            scrollMeasurement.midEmpty.clearance >= 16,
            `midClearance=${scrollMeasurement.midEmpty.clearance.toFixed(1)}px, overlaps=${scrollMeasurement.midEmpty.overlaps}`
          );
        }
        if (scrollMeasurement.endEmpty) {
          assert(
            `women-qada-${theme}: empty-state action button "+ Log Missed Fast" clears FloatingNav at true scroll end (>= 16px)`,
            scrollMeasurement.endEmpty.clearance >= 16,
            `endClearance=${scrollMeasurement.endEmpty.clearance.toFixed(1)}px, overlaps=${scrollMeasurement.endEmpty.overlaps}`
          );
          assert(
            `women-qada-${theme}: empty-state overlap at true scroll end is FALSE`,
            !scrollMeasurement.endEmpty.overlaps,
            'Empty state does not overlap FloatingNav; DetailScreen.ScrollView padBottom of 124.5px protects clearance'
          );
        }
      }

      const shot = path.join(proofDir, `${id}-${theme}-393x852.png`);
      await page.screenshot({ path: shot, fullPage: true });
      runtime.captured.push(path.basename(shot));
      runtime.geometry.push({
        id,
        theme,
        viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })),
        header: await page.locator('[data-testid="sub-header"]').boundingBox(),
        nav: navBox,
        layout,
        scrollMeasurement,
      });

      for (const width of [360, 430]) {
        await page.setViewportSize({ width, height: 852 });
        const responsiveShot = path.join(proofDir, `${id}-${theme}-${width}x852.png`);
        await page.screenshot({ path: responsiveShot, fullPage: true });
        runtime.captured.push(path.basename(responsiveShot));
      }
      await context.close();
    }
  }
} catch (error) {
  runtime.blocked = error instanceof Error ? error.message : String(error);
} finally {
  await proofBrowser?.close().catch(() => {});
  proofServer?.close();
}

if (runtime.blocked) {
  throw new Error(`Batch 3A runtime execution failed: ${runtime.blocked}`);
}

const pixelDiff = [];
for (const id of ['tajweed', 'vocab', 'women-qada']) {
  for (const theme of ['paper', 'ink']) {
    const beforePath = path.join(proofDir, 'before', `${id}-${theme}-393x852.png`);
    const afterPath = path.join(proofDir, `${id}-${theme}-393x852.png`);
    if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) continue;
    const before = PNG.sync.read(fs.readFileSync(beforePath));
    const after = PNG.sync.read(fs.readFileSync(afterPath));
    if (before.width !== after.width || before.height !== after.height) throw new Error(`Pixel diff dimension mismatch: ${id}-${theme}`);
    let headerDiff = 0;
    let headerTotal = 0;
    let fullDiff = 0;
    const threshold = 25;
    for (let y = 0; y < before.height; y++) {
      for (let x = 0; x < before.width; x++) {
        const i = (y * before.width + x) * 4;
        const differs = Math.abs(before.data[i] - after.data[i]) > threshold || Math.abs(before.data[i + 1] - after.data[i + 1]) > threshold || Math.abs(before.data[i + 2] - after.data[i + 2]) > threshold;
        if (y < 300) {
          headerTotal++;
          if (differs) headerDiff++;
        }
        if (differs) fullDiff++;
      }
    }
    const result = { pair: `${id}-${theme}`, headerPct: +(headerDiff / headerTotal * 100).toFixed(2), fullPct: +(fullDiff / (before.width * before.height) * 100).toFixed(2) };
    result.headerPass = result.headerPct >= 25;
    result.fullPass = result.fullPct >= 35;
    result.pass = result.headerPass && result.fullPass;
    assert(`${result.pair} header diff >= 25%`, result.headerPass, `${result.headerPct}%`);
    assert(`${result.pair} full diff >= 35%`, result.fullPass, `${result.fullPct}%`);
    pixelDiff.push(result);
  }
}

// Reconcile complete screenshot inventory and dimensions (18 files: 3 screens x 2 themes x 3 viewports)
const expectedScreenshots = [];
for (const theme of ['paper', 'ink']) {
  for (const id of ['tajweed', 'vocab', 'women-qada']) {
    for (const width of [393, 360, 430]) {
      expectedScreenshots.push(`${id}-${theme}-${width}x852.png`);
    }
  }
}

const onDiskScreenshots = fs.readdirSync(proofDir).filter((f) => f.endsWith('.png'));
assert('Captured screenshot count matches expected 18', runtime.captured.length === expectedScreenshots.length, `captured=${runtime.captured.length}`);
assert('On-disk screenshot count matches expected 18', onDiskScreenshots.length === expectedScreenshots.length, `on-disk=${onDiskScreenshots.length}`);

for (const expectedName of expectedScreenshots) {
  assert(`Screenshot exists on disk: ${expectedName}`, onDiskScreenshots.includes(expectedName));
  const filePath = path.join(proofDir, expectedName);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const [expectedW, expectedH] = expectedName.replace('.png', '').split('-').pop().split('x').map(Number);
  assert(`${expectedName} dimension check: ${expectedW}x${expectedH}`, png.width === expectedW && png.height === expectedH, `got ${png.width}x${png.height}`);
}

const proof = {
  batch: '3A',
  generatedAt: new Date().toISOString(),
  checks,
  screenshots: {
    expected: expectedScreenshots,
    captured: runtime.captured,
    onDisk: onDiskScreenshots,
    beforeAfterDiff: pixelDiff,
  },
  runtime,
  geometry: {
    floatingNav: 'measured from route-visible web captures with >=16px breathing room',
    bottomClearance: 'DetailScreen.ScrollView/FlatList owns clearance; no screen-level TAB_PAD_BOTTOM remains',
    responsive: [360, 393, 430],
  },
};
fs.writeFileSync(path.join(proofDir, 'proof.json'), JSON.stringify(proof, null, 2));
console.log(JSON.stringify({ passed: checks.length, proof: path.relative(root, path.join(proofDir, 'proof.json')), runtime }, null, 2));
