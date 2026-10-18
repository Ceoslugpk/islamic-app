import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('proof/color-batch-2a');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('=== BATCH 2A COLOR MIGRATION CONTRACT & SCREENSHOT SUITE ===');

// --- 1. Static Contract Checks ---
console.log('\n--- 1. Static File & Theming Contracts ---');

const batch2aScreens = [
  {
    id: 'prayer-guide',
    name: 'PrayerGuideScreen',
    file: 'src/screens/PrayerGuideScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'prayer-guide' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'ramadan-guide',
    name: 'RamadanGuideScreen',
    file: 'src/screens/RamadanGuideScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'ramadan-guide' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'names',
    name: 'NamesScreen',
    file: 'src/screens/NamesScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'names' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'quran-topics',
    name: 'QuranTopicsScreen',
    file: 'src/screens/QuranTopicsScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'topics' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'notes',
    name: 'NotesScreen',
    file: 'src/screens/NotesScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'notes' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'reading-plans',
    name: 'ReadingPlansScreen',
    file: 'src/screens/ReadingPlansScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'plans' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'makkah-live',
    name: 'MakkahLiveScreen',
    file: 'src/screens/MakkahLiveScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'makkah-live' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'salah-tracker',
    name: 'SalahTrackerScreen',
    file: 'src/screens/SalahTrackerScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'tracker' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'home-hub',
    name: 'HomeScreen',
    file: 'src/screens/HomeScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('home');
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'quran-hub',
    name: 'QuranScreen',
    file: 'src/screens/QuranScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'surah-list' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'library-hub',
    name: 'LibraryScreen',
    file: 'src/screens/LibraryScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'hub' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'tools-hub',
    name: 'ToolsScreen',
    file: 'src/screens/ToolsScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'hub' });
      });
      await page.waitForTimeout(600);
    },
  },
];

for (const s of batch2aScreens) {
  assert.ok(fs.existsSync(s.file), `Screen file ${s.file} must exist`);
  const content = fs.readFileSync(s.file, 'utf8');

  // Must have 0 raw hex literals
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.equal(
    hexMatches.length,
    0,
    `${s.name} must have 0 raw hex color literals, found: ${hexMatches.join(', ')}`
  );

  // Must not use green tokens.accent for filled button background
  const greenButtonRegex = /backgroundColor:\s*(?:[^}]*?\?\s*)?tokens\.accent\b/;
  assert.ok(
    !greenButtonRegex.test(content),
    `${s.name} must not use tokens.accent as button/filled control background`
  );

  console.log(`  ✓ ${s.name}: verified 0 raw hex literals, no green filled buttons`);
}

// --- 2. Runtime Server & Playwright Browser Tests ---
console.log('\n--- 2. Runtime Browser Tests & Screenshot Generation ---');

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
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
console.log(`Static server running on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const themes = ['paper', 'ink'];
const manifestScreenshots = [];
const blockedScreens = [];

try {
  for (const theme of themes) {
    for (const s of batch2aScreens) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
      });

      await context.addInitScript(({ theme }) => {
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem(
          'islamic-settings',
          JSON.stringify({
            language: 'en',
            themeMode: theme,
            manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
            locationMode: 'manual',
          })
        );
        localStorage.setItem(
          'salah-db:quran:notes',
          JSON.stringify([
            { id: '1', surah: 1, ayah: 1, text: 'Opening verse reflection', createdAt: Date.now() },
          ])
        );
      }, { theme });

      const page = await context.newPage();
      try {
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__, { timeout: 10000 });

        await s.navigate(page);
        await page.waitForTimeout(700);

        const shotFileName = `${s.id}_${theme}_393x852.png`;
        const shotPath = path.join(OUTPUT_DIR, shotFileName);
        await page.screenshot({ path: shotPath, fullPage: false });

        const evalResult = await page.evaluate(() => {
          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          let pureWhiteCount = 0;
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const bg = window.getComputedStyle(el).backgroundColor;
              if (bg === 'rgb(255, 255, 255)' || bg === '#ffffff' || bg === '#fff') {
                pureWhiteCount++;
              }
            }
          }
          return { bodyBg, pureWhiteCount };
        });

        const stat = fs.statSync(shotPath);
        assert.ok(stat.size > 0, `Screenshot ${shotFileName} must not be empty`);

        manifestScreenshots.push({
          id: s.id,
          screen: s.name,
          theme,
          file: shotFileName,
          path: `proof/color-batch-2a/${shotFileName}`,
          bytes: stat.size,
          dimensions: '393x852',
          bodyBg: evalResult.bodyBg,
          pureWhiteElements: evalResult.pureWhiteCount,
        });

        console.log(`  ✓ [PASS] ${s.name} (${theme}) -> ${shotFileName} (${stat.size} bytes)`);
      } catch (err) {
        console.error(`  ✗ [FAIL] ${s.name} (${theme}): ${err.message}`);
        blockedScreens.push({ id: s.id, screen: s.name, theme, error: err.message });
      } finally {
        await context.close();
      }
    }
  }

  // --- 3. Pixel Level Inspection & Manifest Creation ---
  console.log('\n--- 3. Programmatic Inspection & Manifest Generation ---');

  const filesOnDisk = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
  console.log(`Total screenshots generated on disk: ${filesOnDisk.length}`);

  const manifest = {
    batch: 'Batch 2A (12 screens: 8 secondary + 4 hub screens)',
    timestamp: new Date().toISOString(),
    viewports: ['393x852'],
    themes: ['paper', 'ink'],
    totalScreenshots: filesOnDisk.length,
    screens: batch2aScreens.map((s) => ({ id: s.id, name: s.name, file: s.file })),
    screenshots: manifestScreenshots,
    blocked: blockedScreens,
    status: blockedScreens.length === 0 ? 'PASS' : 'PARTIAL',
  };

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`  ✓ Manifest written to ${manifestPath}`);

  if (blockedScreens.length > 0) {
    console.error(`\nFound ${blockedScreens.length} blocked screenshots.`);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('ALL BATCH 2A COLOR CONTRACTS VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');
} finally {
  await browser.close();
  server.close();
}
