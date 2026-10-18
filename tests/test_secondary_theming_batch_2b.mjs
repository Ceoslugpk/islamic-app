import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('proof/color-batch-2b');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('=== BATCH 2B COLOR MIGRATION CONTRACT & SCREENSHOT SUITE ===');

// --- 1. Static Contract Checks ---
console.log('\n--- 1. Static File & Theming Contracts ---');

const batch2bScreens = [
  {
    id: 'mosque',
    name: 'MosqueFinderScreen',
    file: 'src/screens/MosqueFinderScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'mosque' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'qibla',
    name: 'QiblaScreen',
    file: 'src/screens/QiblaScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'qibla' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'prayer-reminders',
    name: 'PrayerRemindersScreen',
    file: 'src/screens/PrayerRemindersScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'prayer-reminders' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'quran-audio',
    name: 'QuranAudioScreen',
    file: 'src/screens/QuranAudioScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'audio' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'quran-home',
    name: 'QuranHomeScreen',
    file: 'src/screens/QuranHomeScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'home' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'quran-reader',
    name: 'QuranReaderScreen',
    file: 'src/screens/QuranReaderScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'reader', surah: 1, ayah: 1 });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'onboarding',
    name: 'OnboardingScreen',
    file: 'src/screens/OnboardingScreen.tsx',
    isOnboarding: true,
    navigate: async (page) => {
      // Onboarding renders at root when onboardingDone is false
      await page.waitForTimeout(600);
    },
  },
];

for (const s of batch2bScreens) {
  assert.ok(fs.existsSync(s.file), `Screen file ${s.file} must exist`);
  const content = fs.readFileSync(s.file, 'utf8');

  // Must have 0 raw hex literals, except for QuranReaderScreen which preserves 5 semantic highlight colors
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  if (s.name === 'QuranReaderScreen') {
    const allowed = ['#c26e1740', '#0f5a4a40', '#1e40af40', '#7c3aed40', '#be185d40'];
    const unexpectedHex = hexMatches.filter(h => !allowed.includes(h.toLowerCase()));
    assert.equal(
      unexpectedHex.length,
      0,
      `${s.name} must have 0 non-highlight raw hex literals, found: ${unexpectedHex.join(', ')}`
    );
  } else {
    assert.equal(
      hexMatches.length,
      0,
      `${s.name} must have 0 raw hex color literals, found: ${hexMatches.join(', ')}`
    );
  }

  // Must not use green tokens.accent for filled button background
  const greenButtonRegex = /backgroundColor:\s*(?:[^,\n}]*?\?\s*)?tokens\.accent\b/;
  assert.ok(
    !greenButtonRegex.test(content),
    `${s.name} must not use tokens.accent as button/filled control background`
  );

  console.log(`  ✓ ${s.name}: verified theming contract (0 presentation hex literals, no green filled buttons)`);
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
    for (const s of batch2bScreens) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
      });

      await context.addInitScript(({ theme, isOnboarding }) => {
        if (isOnboarding) {
          localStorage.setItem('onboardingDone', 'false');
        } else {
          localStorage.setItem('onboardingDone', 'true');
        }
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
      }, { theme, isOnboarding: !!s.isOnboarding });

      const page = await context.newPage();
      try {
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        if (!s.isOnboarding) {
          await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__, { timeout: 10000 });
        }

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
          path: `proof/color-batch-2b/${shotFileName}`,
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

  // --- 3. Programmatic Inspection & Manifest Creation ---
  console.log('\n--- 3. Programmatic Inspection & Manifest Generation ---');

  const filesOnDisk = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));
  console.log(`Total screenshots generated on disk: ${filesOnDisk.length}`);

  const manifest = {
    batch: 'Batch 2B (7 screens: MosqueFinder, Qibla, PrayerReminders, QuranAudio, QuranHome, QuranReader, Onboarding)',
    timestamp: new Date().toISOString(),
    viewports: ['393x852'],
    themes: ['paper', 'ink'],
    totalScreenshots: filesOnDisk.length,
    screens: batch2bScreens.map((s) => ({ id: s.id, name: s.name, file: s.file })),
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

  assert.equal(filesOnDisk.length, 14, `Expected exactly 14 screenshots, found ${filesOnDisk.length}`);

  console.log('\n======================================================');
  console.log('ALL BATCH 2B COLOR CONTRACTS VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');
} finally {
  await browser.close();
  server.close();
}
