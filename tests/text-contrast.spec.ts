/**
 * tests/text-contrast.spec.ts
 *
 * PHASE 3 BATCH 16A — Text Contrast & Theme Switching Runtime Proof Harness
 *
 * Verifies:
 * 1. Semantic text token contrast contracts against approved surfaces in light (paper) and dark (ink).
 * 2. Live browser testing across 10 representative routes:
 *    - home, quran-home, quran-reader, bookmarks, library-hub, duas, names, tools-hub, fasting, settings
 * 3. Accurate DOM inspection: computed text colors, effective opaque ancestor backgrounds, WCAG contrast thresholds.
 * 4. Live theme switching and storage persistence without unrendered route passes.
 * 5. Honest reporting of on-disk bundle state and any blocked runtime rows.
 */

// @ts-ignore
import http from 'node:http';
// @ts-ignore
import fs from 'node:fs';
// @ts-ignore
import path from 'node:path';
// @ts-ignore
import assert from 'node:assert/strict';

// Playwright loader with dynamic resolution and stable fallback
async function loadPlaywright() {
  try {
    // @ts-ignore
    return await import('playwright');
  } catch {}
  const npxDir = '/home/ubuntu/.npm/_npx';
  if (fs.existsSync(npxDir)) {
    for (const entry of fs.readdirSync(npxDir)) {
      const candidate = path.join(npxDir, entry, 'node_modules', 'playwright', 'index.mjs');
      if (fs.existsSync(candidate)) {
        return await import(`file://${candidate}`);
      }
    }
  }
  const fallback = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
  return await import(`file://${fallback}`);
}
const { chromium } = ((await loadPlaywright()) as any);

const ROOT_DIR = path.resolve('.');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Approved Semantic Tokens from src/theme/tokens.ts
const TOKENS = {
  paper: {
    heading: '#14221E', // rgb(20, 34, 30)
    body: '#14221E',
    subtle: '#647068', // rgb(100, 112, 104)
    eyebrow: '#8A6420', // rgb(138, 100, 32)
    numeralAccent: '#105A4B', // rgb(16, 90, 75)
    onGold: '#092C25', // rgb(9, 44, 37)
    onHeading: '#F6F0E1',
    onHeroMuted: '#B4D6CA',
    danger: '#C0463C',
    faint: '#A6AEA8',
    bg: '#F8F4EA',
    card: '#FEFCF7',
  },
  ink: {
    heading: '#F3EEDD', // rgb(243, 238, 221)
    body: '#F3EEDD',
    subtle: '#A8A6AE', // rgb(168, 166, 174)
    eyebrow: '#E6BE6C', // rgb(230, 190, 108)
    numeralAccent: '#EECA80', // rgb(238, 202, 128)
    onGold: '#1A1408', // rgb(26, 20, 8)
    onHeading: '#F6F0E1',
    onHeroMuted: '#B0AEB8',
    danger: '#E07A70',
    faint: '#6E6C78',
    bg: '#12121C',
    card: '#2A2933',
  },
};

// WCAG 2.1 minimum contrast for large text / UI components (3:1). The harness
// evaluates rendered text at this threshold and MUST fail the run on any violation.
export const WCAG_MIN_RUNTIME_RATIO = 3.0;

interface DOMContrastReport {
  checked: number;
  minContrast: number;
  avgContrast: number;
  lowCount: number;
  lowSamples: { text: string; fg: string; bg: string; cr: number }[];
}

export const evaluateDOMContrast = ({
  theme,
  routeId,
  minRatio,
}: {
  theme: 'paper' | 'ink';
  routeId?: string;
  minRatio: number;
}): DOMContrastReport => {
  function parseRgba(str: string): [number, number, number, number] {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return [0, 0, 0, 1];
    return [
      parseInt(m[1]),
      parseInt(m[2]),
      parseInt(m[3]),
      m[4] !== undefined ? parseFloat(m[4]) : 1,
    ];
  }

  function parseGrad(bgImg: string): [number, number, number, number] | null {
    if (!bgImg || !bgImg.includes('gradient')) return null;
    const m = bgImg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), 1];
  }

  function composite(
    fg: [number, number, number, number],
    bg: [number, number, number, number],
  ): [number, number, number, number] {
    const a = fg[3] + bg[3] * (1 - fg[3]);
    if (a === 0) return [0, 0, 0, 0];
    const r = Math.round((fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a);
    const g = Math.round((fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a);
    const b = Math.round((fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a);
    return [r, g, b, a];
  }

  function channelLum(c: number): number {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }

  function relLum(r: number, g: number, b: number): number {
    return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
  }

  function getContrast(
    c1: [number, number, number, number],
    c2: [number, number, number, number],
  ): number {
    const l1 = relLum(c1[0], c1[1], c1[2]);
    const l2 = relLum(c2[0], c2[1], c2[2]);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  const rootBg: [number, number, number, number] =
    theme === 'paper' ? [248, 244, 234, 1] : [18, 18, 28, 1];

  // Scope contrast evaluation to visible/occluding content.
  // When SettingsModal is open, evaluate only the modal subtree so underlying Fasting DOM is excluded.
  const activeModal = document.querySelector('[aria-modal="true"], [role="dialog"]');
  const rootScope: Element | Document =
    routeId === 'settings' && activeModal ? activeModal : document;

  const elements = Array.from(rootScope.querySelectorAll('*')).filter((e) => {
    if (e.children.length !== 0 || !e.textContent || e.textContent.trim().length <= 1) {
      return false;
    }
    if (routeId !== 'settings' && activeModal && activeModal.contains(e)) {
      return false;
    }
    return true;
  });

  const low: { text: string; fg: string; bg: string; cr: number }[] = [];
  let checked = 0;
  let sumContrast = 0;
  let minContrast = 999;

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > 852) continue;

    const style = window.getComputedStyle(el);
    if (
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      parseFloat(style.opacity) < 0.1
    ) {
      continue;
    }

    const fg = parseRgba(style.color);
    if (fg[3] < 0.1) continue;

    // Ancestor background traversal with opaque layer & gradient termination
    const stack: [number, number, number, number][] = [];
    let curr: Element | null = el;
    while (curr) {
      // Direct gradient on container
      const grad = parseGrad(window.getComputedStyle(curr).backgroundImage);
      if (grad) {
        stack.unshift(grad);
        break;
      }
      // Direct first child gradient (LinearGradient absolute fill layer)
      if (curr.firstElementChild) {
        const fcGrad = parseGrad(window.getComputedStyle(curr.firstElementChild).backgroundImage);
        if (fcGrad) {
          stack.unshift(fcGrad);
          break;
        }
      }
      const c = parseRgba(window.getComputedStyle(curr).backgroundColor);
      if (c[3] > 0) {
        stack.unshift(c);
        if (c[3] >= 0.98) break;
      }
      curr = curr.parentElement;
    }

    let bg = rootBg;
    if (stack.length > 0 && stack[0][3] >= 0.98) {
      bg = stack[0];
      for (let i = 1; i < stack.length; i++) bg = composite(stack[i], bg);
    } else {
      for (const l of stack) bg = composite(l, bg);
    }

    const cr = Math.round(getContrast(fg, bg) * 100) / 100;
    checked++;
    sumContrast += cr;
    if (cr < minContrast) minContrast = cr;

    if (cr < minRatio) {
      low.push({
        text: el.textContent!.trim().slice(0, 30),
        fg: style.color,
        bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
        cr,
      });
    }
  }

  return {
    checked,
    minContrast: minContrast === 999 ? 0 : minContrast,
    avgContrast: checked > 0 ? Math.round((sumContrast / checked) * 100) / 100 : 0,
    lowCount: low.length,
    lowSamples: low.slice(0, 5),
  };
};

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function calculateContrast(hex1: string, hex2: string): number {
  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function runProofHarness() {
  console.log('='.repeat(70));
  console.log('PHASE 3 BATCH 16A — TEXT CONTRAST & RUNTIME PROOF HARNESS');
  console.log('='.repeat(70));

  // 1. Static Contract & Token Contrast Mathematical Proof
  console.log('\n--- 1. Mathematical Token Contrast Verification ---');

  const contractChecks = [
    { theme: 'paper', role: 'heading', fg: TOKENS.paper.heading, bg: TOKENS.paper.card, minRatio: 7.0 },
    { theme: 'paper', role: 'body', fg: TOKENS.paper.body, bg: TOKENS.paper.card, minRatio: 7.0 },
    { theme: 'paper', role: 'subtle', fg: TOKENS.paper.subtle, bg: TOKENS.paper.card, minRatio: 4.5 },
    { theme: 'paper', role: 'eyebrow', fg: TOKENS.paper.eyebrow, bg: TOKENS.paper.card, minRatio: 4.5 },
    { theme: 'paper', role: 'numeralAccent', fg: TOKENS.paper.numeralAccent, bg: TOKENS.paper.card, minRatio: 7.0 },
    { theme: 'paper', role: 'danger', fg: TOKENS.paper.danger, bg: TOKENS.paper.card, minRatio: 4.5 },
    { theme: 'ink', role: 'heading', fg: TOKENS.ink.heading, bg: TOKENS.ink.card, minRatio: 7.0 },
    { theme: 'ink', role: 'body', fg: TOKENS.ink.body, bg: TOKENS.ink.card, minRatio: 7.0 },
    { theme: 'ink', role: 'subtle', fg: TOKENS.ink.subtle, bg: TOKENS.ink.card, minRatio: 4.5 },
    { theme: 'ink', role: 'eyebrow', fg: TOKENS.ink.eyebrow, bg: TOKENS.ink.card, minRatio: 7.0 },
    { theme: 'ink', role: 'numeralAccent', fg: TOKENS.ink.numeralAccent, bg: TOKENS.ink.card, minRatio: 7.0 },
    { theme: 'ink', role: 'danger', fg: TOKENS.ink.danger, bg: TOKENS.ink.card, minRatio: 4.5 },
  ];

  for (const check of contractChecks) {
    const ratio = calculateContrast(check.fg, check.bg);
    assert.ok(
      ratio >= check.minRatio,
      `Token [${check.theme}][${check.role}] ratio ${ratio.toFixed(2)}:1 below required ${check.minRatio}:1`,
    );
    console.log(
      `  ✓ [${check.theme.padEnd(5)}] ${check.role.padEnd(14)} ${check.fg} on ${check.bg} -> ${ratio.toFixed(2)}:1 (>= ${check.minRatio}:1)`,
    );
  }

  // 2. Runtime Browser Tests Across 10 Representative Routes
  console.log('\n--- 2. Runtime Browser Proof across 10 Representative Routes ---');

  const MIME_TYPES: Record<string, string> = {
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

  const server = http.createServer((req: any, res: any) => {
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

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const serverUrl = `http://127.0.0.1:${address.port}/`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const prayerFixture = {
    code: 200,
    data: {
      timings: {
        Fajr: '05:00',
        Sunrise: '06:20',
        Dhuhr: '12:15',
        Asr: '15:30',
        Maghrib: '18:10',
        Isha: '19:30',
      },
      date: {
        readable: '16 Oct 2026',
        hijri: { day: '1', month: { en: 'Rabi al-Thani' }, year: '1448' },
        gregorian: { date: '16-10-2026' },
      },
      meta: { timezone: 'UTC', school: 'Shafi' },
    },
  };

  const bookmarkFixture = [
    {
      surah: 1,
      ayah: 1,
      surahName: 'Al-Fatiha',
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    },
  ];

  interface RouteSpec {
    id: string;
    name: string;
    navigate: () => void;
    expectedTextSnippet: string;
  }

  const ROUTES: RouteSpec[] = [
    {
      id: 'home',
      name: 'Home Dashboard',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('home');
      },
      expectedTextSnippet: 'ISLAMIC',
    },
    {
      id: 'quran-home',
      name: 'Quran Home',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('quran');
        nav.setQuran({ screen: 'home' });
      },
      expectedTextSnippet: 'Quran',
    },
    {
      id: 'quran-reader',
      name: 'Quran Reader',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('quran');
        nav.setQuran({ screen: 'reader', surah: 1, ayah: 1 });
      },
      expectedTextSnippet: 'Quran',
    },
    {
      id: 'bookmarks',
      name: 'Bookmarks',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('quran');
        nav.setQuran({ screen: 'bookmarks' });
      },
      expectedTextSnippet: 'Bookmarks',
    },
    {
      id: 'library-hub',
      name: 'Library Hub',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('library');
        nav.setLibrary({ screen: 'hub' });
      },
      expectedTextSnippet: 'Library',
    },
    {
      id: 'duas',
      name: 'Duas & Adhkar',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('library');
        nav.setLibrary({ screen: 'duas' });
      },
      expectedTextSnippet: 'Duas',
    },
    {
      id: 'names',
      name: '99 Names of Allah',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('library');
        nav.setLibrary({ screen: 'names' });
      },
      expectedTextSnippet: 'Names of Allah',
    },
    {
      id: 'tools-hub',
      name: 'Tools Hub',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('tools');
        nav.setTools({ screen: 'hub' });
      },
      expectedTextSnippet: 'Tools',
    },
    {
      id: 'fasting',
      name: 'Fasting Tracker',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(false);
        nav.setTab('tools');
        nav.setTools({ screen: 'fasting' });
      },
      expectedTextSnippet: 'Fasting',
    },
    {
      id: 'settings',
      name: 'Settings Screen',
      navigate: () => {
        const nav = (window as any).__NAVIGATE__;
        nav.setSettingsOpen(true);
      },
      expectedTextSnippet: 'Appearance',
    },
  ];


  const blockedRows: { route: string; theme: string; reason: string }[] = [];

  try {
    for (const theme of ['paper', 'ink'] as const) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
      });

      await context.route('**/timings/**', (route: any) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(prayerFixture),
        }),
      );

      await context.addInitScript(
        ({ activeTheme, bookmarks }: { activeTheme: string; bookmarks: any }) => {
          localStorage.setItem('onboardingDone', 'true');
          localStorage.setItem('location-setup-dismissed-v1', 'true');
          localStorage.setItem('salah-db:quran:bookmarks', JSON.stringify(bookmarks));
          localStorage.setItem(
            'islamic-settings',
            JSON.stringify({
              language: 'en',
              themeMode: activeTheme,
              locationMode: 'manual',
              manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah' },
            }),
          );
        },
        { activeTheme: theme, bookmarks: bookmarkFixture },
      );

      const page = await context.newPage();
      await page.goto(serverUrl, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!(window as any).__NAVIGATE__);
      await page.waitForTimeout(600);

      for (const r of ROUTES) {
        await page.evaluate(r.navigate);
        await page.waitForTimeout(500);

        const bodyText = await page.locator('body').innerText();
        const isRendered =
          bodyText.length > 50 &&
          (!r.expectedTextSnippet ||
            bodyText.toLowerCase().includes(r.expectedTextSnippet.toLowerCase()));

        assert.ok(
          isRendered,
          `Route ${r.id} (${theme}) failed to render content! Length: ${bodyText.length}, snippet: "${r.expectedTextSnippet}"`,
        );

        const report = await page.evaluate(evaluateDOMContrast, {
          theme,
          routeId: r.id,
          minRatio: WCAG_MIN_RUNTIME_RATIO,
        });
        assert.ok(
          report.checked > 0,
          `Route ${r.id} (${theme}) has 0 text elements evaluated! Never report PASS for unrendered routes.`,
        );

        // Real, falsifiable WCAG assertion: a computed ratio below the threshold
        // is a failure, not a log line. This is what makes the harness able to go red.
        if (report.lowCount === 0) {
          console.log(
            `  ✓ [${theme.padEnd(5)}] ${r.name.padEnd(24)} Rendered: YES, Checked: ${String(
              report.checked,
            ).padStart(2)}, Min: ${report.minContrast.toFixed(2)}:1, Avg: ${report.avgContrast.toFixed(
              2,
            )}:1 [PASS]`,
          );
        } else {
          const worst = report.lowSamples[0];
          const reason = `${report.lowCount} element(s) below WCAG contrast threshold ${WCAG_MIN_RUNTIME_RATIO}:1 (worst computed ${worst?.cr.toFixed(2)}:1 on "${worst?.text}")`;
          blockedRows.push({ route: r.id, theme, reason });
          console.log(
            `  ⚠ [${theme.padEnd(5)}] ${r.name.padEnd(24)} Rendered: YES, Checked: ${String(
              report.checked,
            ).padStart(2)}, Min: ${report.minContrast.toFixed(2)}:1, Avg: ${report.avgContrast.toFixed(
              2,
            )}:1 [BLOCKED: ${reason}]`,
          );
        }
        assert.equal(
          report.lowCount,
          0,
          `Route ${r.id} (${theme}): ${report.lowCount} element(s) below WCAG ${WCAG_MIN_RUNTIME_RATIO}:1 minimum (worst ${report.minContrast.toFixed(2)}:1). Blocked rows: ${JSON.stringify(report.lowSamples)}`,
        );
      }

      await context.close();
    }

    // 3. Live-Switch & Persistence Verification
    console.log('\n--- 3. Live Theme Switching & Persistence Contract ---');
    {
      const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
      await context.addInitScript(() => {
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        if (!localStorage.getItem('islamic-settings')) {
          localStorage.setItem(
            'islamic-settings',
            JSON.stringify({
              language: 'en',
              themeMode: 'paper',
              locationMode: 'manual',
              manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah' },
            }),
          );
        }
      });

      const page = await context.newPage();
      await page.goto(serverUrl, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!(window as any).__NAVIGATE__);
      await page.evaluate(() => (window as any).__NAVIGATE__.setSettingsOpen(true));
      await page.waitForTimeout(600);

      // Verify Appearance section title color in paper mode
      const colorBefore = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find(
          (e) => e.children.length === 0 && e.textContent && e.textContent.includes('Appearance'),
        );
        return el ? window.getComputedStyle(el).color : null;
      });
      assert.equal(
        colorBefore,
        'rgb(138, 100, 32)',
        'Appearance title in paper mode must resolve to paper eyebrow token #8A6420',
      );
      console.log('  ✓ Initial paper theme verified: Appearance title resolves to #8A6420');

      // Live click Dark button in Settings
      const darkBtn = page.getByText('Dark', { exact: true }).filter({ visible: true });
      assert.ok((await darkBtn.count()) > 0, 'Dark theme button must exist in Settings');
      await darkBtn.first().click();
      await page.waitForTimeout(800);

      // Verify Appearance section title color shifted live to ink gold eyebrow token
      const colorAfter = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find(
          (e) => e.children.length === 0 && e.textContent && e.textContent.includes('Appearance'),
        );
        return el ? window.getComputedStyle(el).color : null;
      });
      assert.equal(
        colorAfter,
        'rgb(230, 190, 108)',
        'Appearance title after live switch must resolve to ink eyebrow token #E6BE6C',
      );
      console.log(
        '  ✓ Live theme switch verified: Appearance title shifted live from #8A6420 to #E6BE6C',
      );

      // Verify localStorage persistence
      const stored = await page.evaluate(() => localStorage.getItem('islamic-settings'));
      const parsedStored = stored ? JSON.parse(stored) : {};
      assert.equal(parsedStored.themeMode, 'ink', 'Settings must persist ink themeMode in localStorage');
      console.log('  ✓ Storage persistence verified: islamic-settings reflects updated themeMode "ink"');

      // Reload page to verify cold-boot with persisted theme
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!(window as any).__NAVIGATE__);
      await page.evaluate(() => (window as any).__NAVIGATE__.setSettingsOpen(true));
      await page.waitForTimeout(600);

      const colorReloaded = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find(
          (e) => e.children.length === 0 && e.textContent && e.textContent.includes('Appearance'),
        );
        return el ? window.getComputedStyle(el).color : null;
      });
      assert.equal(
        colorReloaded,
        'rgb(230, 190, 108)',
        'Cold-boot reload must preserve persisted ink theme token #E6BE6C',
      );
      console.log('  ✓ Cold-boot persistence verified: reloaded screen boots with persisted ink theme');

      // Live switch back to Light (paper)
      const lightBtn = page.getByText('Light', { exact: true }).filter({ visible: true });
      assert.ok((await lightBtn.count()) > 0, 'Light theme button must exist in Settings');
      await lightBtn.first().click();
      await page.waitForTimeout(800);

      const colorRestored = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('*')).find(
          (e) => e.children.length === 0 && e.textContent && e.textContent.includes('Appearance'),
        );
        return el ? window.getComputedStyle(el).color : null;
      });
      assert.equal(
        colorRestored,
        'rgb(138, 100, 32)',
        'Restored paper theme must resolve back to #8A6420',
      );
      console.log('  ✓ Reverse switch verified: restored back to paper theme #8A6420');

      await context.close();
    }

    console.log('\n' + '='.repeat(70));
    console.log('TEXT CONTRAST HARNESS EXECUTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Mathematical Token Proof: 12/12 PASSED`);
    console.log(`Live Theme Switch & Reverse Switch: PASSED`);
    console.log(`Cold-Boot Theme Persistence: PASSED`);
    console.log(
      `Fully Verified Zero-Violation Runtime Routes in current dist: ${
        20 - blockedRows.length
      }/20 rows`,
    );
    console.log(
      `Blocked Runtime Rows below contrast threshold: ${blockedRows.length}/20 rows`,
    );
    if (blockedRows.length > 0) {
      console.log('\nHonest Blocked Rows Breakdown:');
      blockedRows.forEach((b, idx) => {
        console.log(`  ${idx + 1}. [${b.theme}] ${b.route}: ${b.reason}`);
      });
    }
    console.log('='.repeat(70) + '\n');

    // Falsifiable gate: any runtime contrast violation fails the harness.
    // Previously this block only logged blockedRows and always exited 0.
    assert.equal(
      blockedRows.length,
      0,
      `Text contrast harness failed: ${blockedRows.length}/20 runtime route rows violate the WCAG ${WCAG_MIN_RUNTIME_RATIO}:1 threshold. See breakdown above.`,
    );
  } finally {
    await browser.close();
    server.close();
  }
}

// Only auto-run when executed directly, so the exported `evaluateDOMContrast`
// and `WCAG_MIN_RUNTIME_RATIO` can be imported by focused tests without
// launching the browser harness.
const __isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (__isDirectRun) {
  runProofHarness().catch((err) => {
    console.error('\n[FATAL] Error in text-contrast harness:', err);
    process.exit(1);
  });
}

export { runProofHarness };
