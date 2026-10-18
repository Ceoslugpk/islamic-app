/**
 * tests/test_hub_headers_non_sticky.mjs
 *
 * Strict regression coverage for all four top-level hub screens:
 * Home, Quran, Library, Tools
 *
 * Verifies non-sticky header behavior across:
 * - 4 hubs (Home, Quran, Library, Tools)
 * - 2 themes: Light (paper) and Dark (ink)
 * - 2 languages: English (en, LTR) and Urdu (ur, RTL)
 * - 2 viewports: 393x852 (standard) and 360x800 (compact)
 * Total: 32 matrix configurations.
 *
 * Assertions per configuration:
 * 1. Initial header Y measured at scroll = 0
 * 2. Scroll-owner identity identified on actual content scroller
 * 3. Top gap between headerBottom and first visible semantic content element is 24 ± 0.5dp
 * 4. Midpoint real scroll on scroll-owner proves header Y moves (non-sticky)
 * 5. True-end real scroll on scroll-owner proves header Y moves (non-sticky)
 * 6. Bottom clearance to floating nav at true-end is 32 ± 0.5dp
 * 7. Missing or blocked elements result in BLOCKED (fails test, never silent PASS)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Static Contracts Verification
console.log('=== STATIC CONTRACTS: TRANSPARENT HUB HEADERS & OPAQUE SECONDARY ===');
const appHeaderFile = fs.readFileSync('src/components/layout/AppHeader.tsx', 'utf8');
const appTsxFile = fs.readFileSync('App.tsx', 'utf8');
const subHeaderFile = fs.readFileSync('src/components/layout/SubHeader.tsx', 'utf8');

assert.ok(appHeaderFile.includes('transparent?: boolean;'), 'AppHeaderProps must declare transparent?: boolean');
assert.ok(appHeaderFile.includes('transparent = false'), 'AppHeader must default transparent to false (opaque fallback)');
assert.ok(appHeaderFile.includes("transparent ? 'transparent' : tokens.bgTop"), 'AppHeader must switch backgroundColor between transparent and tokens.bgTop');
assert.ok(appTsxFile.includes('<AppHeader\n        transparent'), 'App.tsx sharedTabHeader must pass transparent={true}');
assert.ok(subHeaderFile.includes('backgroundColor: tokens.bgTop'), 'SubHeader must remain opaque tokens.bgTop');
console.log('  ✓ Static contracts passed: AppHeader transparent prop, opaque default fallback, SubHeader opaque preserved.\n');

async function loadPlaywright() {
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

const { chromium } = await loadPlaywright();

const ROOT_DIR = path.resolve('.');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error('ERROR: dist/ directory does not exist. Run web export first.');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let p = path.join(DIST_DIR, req.url === '/' ? 'index.html' : (req.url || '').split('?')[0]);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST_DIR, 'index.html');
  const ext = path.extname(p);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
const port = server.address().port;

const FIXTURE_TIMINGS = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '16 Oct 2026', hijri: { day: '4', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '16-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

const HUBS = [
  { id: 'home', title: 'Home', nav: "window.__NAVIGATE__.setTab('home')" },
  { id: 'quran', title: 'Quran', nav: "window.__NAVIGATE__.setTab('quran'); window.__NAVIGATE__.setQuran({ screen: 'home' })" },
  { id: 'library', title: 'Library', nav: "window.__NAVIGATE__.setTab('library'); window.__NAVIGATE__.setLibrary({ screen: 'hub' })" },
  { id: 'tools', title: 'Tools', nav: "window.__NAVIGATE__.setTab('tools'); window.__NAVIGATE__.setTools({ screen: 'hub' })" },
];

const THEMES = ['paper', 'ink'];
const LANGUAGES = ['en', 'ur'];
const VIEWPORTS = [
  { width: 393, height: 852, label: '393x852' },
  { width: 360, height: 800, label: '360x800' },
];

const browser = await chromium.launch({ headless: true });

console.log('================================================================================');
console.log('STRICT HUB HEADERS NON-STICKY & SPACING PROOF (4 HUBS x 8 CONFIGS = 32 RUNS)');
console.log('================================================================================\n');

const results = [];
let failCount = 0;
let blockedCount = 0;

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const lang of LANGUAGES) {
      const cfgKey = `${vp.label}_${theme}_${lang}`;
      console.log(`\n--- Config: ${cfgKey} (Viewport: ${vp.width}x${vp.height}, Theme: ${theme}, Lang: ${lang}) ---`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });

      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.includes('api.aladhan.com') || url.includes('api.islamic.app') || url.includes('interpreter')) {
          if (url.includes('interpreter')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ elements: [] }) });
          }
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) });
        }
        return route.continue();
      });

      await context.addInitScript(({ themeMode, language }) => {
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('location-setup-dismissed-v1', 'true');
        localStorage.setItem('islamic-settings', JSON.stringify({
          language,
          themeMode,
          manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
          locationMode: 'manual',
          womenWorshipEnabled: true,
          womenLockEnabled: false,
        }));
      }, { themeMode: theme, language: lang });

      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);

      for (const hub of HUBS) {
        // Navigate to hub
        await page.evaluate(hub.nav);
        await page.waitForTimeout(600);

        const m = await page.evaluate(async (hubId) => {
          const isVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const s = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && rect.right > 0 && rect.left < window.innerWidth;
          };

          const isRealHeader = (el) => {
            if (!isVisible(el)) return false;
            const cs = window.getComputedStyle(el);
            if (cs.position === 'absolute' && (el.children.length === 0 || cs.pointerEvents === 'none')) {
              return false;
            }
            return true;
          };

          const appHeader = Array.from(document.querySelectorAll('[data-testid="app-header"]')).find(isRealHeader) ||
                            Array.from(document.querySelectorAll('[data-testid="app-header-container"]')).find(isRealHeader);

          if (!appHeader) {
            return { status: 'BLOCKED', blockReason: 'AppHeader element not found' };
          }

          const HEADER_FADE = 10;
          const initialHeaderRect = appHeader.getBoundingClientRect();
          const initialHeaderY = Math.round(initialHeaderRect.top * 10) / 10;
          const headerBottom = Math.round((initialHeaderRect.bottom - HEADER_FADE) * 10) / 10;
          const headerHeight = Math.round(initialHeaderRect.height * 10) / 10;

          const screenContents = Array.from(document.querySelectorAll('[data-testid="screen-content"]')).filter(isVisible);
          const screenContent = screenContents.find((el) => !el.parentElement?.closest('[data-testid="screen-content"]')) || screenContents[0] || null;

          if (!screenContent) {
            return { status: 'BLOCKED', blockReason: 'screen-content scroller element not found' };
          }

          const scrollables = [screenContent, ...Array.from(screenContent.querySelectorAll('*'))]
            .filter(isVisible)
            .filter((el) => {
              const s = window.getComputedStyle(el);
              const isScrollable = (s.overflowY === 'auto' || s.overflowY === 'scroll');
              return isScrollable && (el.scrollHeight > el.clientHeight || el === screenContent);
            });

          let scroller = screenContent;
          if (scrollables.length > 0) {
            scroller = scrollables.reduce((best, el) => {
              const bestRange = best.scrollHeight - best.clientHeight;
              const range = el.scrollHeight - el.clientHeight;
              return range >= bestRange ? el : best;
            }, scrollables[0]);
          }

          const scrollOwner = scroller === screenContent
            ? 'screen-content'
            : `${scroller.tagName.toLowerCase()}${scroller.getAttribute('data-testid') ? `[data-testid="${scroller.getAttribute('data-testid')}"]` : ''}`;

          // Check if scroller contains the header
          const headerInsideScroller = scroller.contains(appHeader);

          // Measure top gap
          const isDirect = screenContent === scroller || ['auto', 'scroll'].includes(window.getComputedStyle(screenContent).overflowY);
          const wrapper = isDirect && screenContent.firstElementChild ? screenContent.firstElementChild : screenContent;

          const isLayoutWrapper = (el) => {
            if (/^(BUTTON|A|INPUT|TEXTAREA|SELECT|IMG)$/.test(el.tagName)) return false;
            if (['button', 'tab', 'checkbox', 'searchbox', 'link'].includes(el.getAttribute('role') || '')) return false;
            if (['card', 'chip', 'chip-selected', 'badge'].includes(el.getAttribute('data-testid') || '')) return false;
            const r = el.getBoundingClientRect();
            for (let i = 0; i < el.children.length; i++) {
              const c = el.children[i];
              if (isVisible(c)) {
                const cr = c.getBoundingClientRect();
                if (Math.abs(cr.top - r.top) < 1.0) return true;
              }
            }
            return false;
          };

          const contentCandidates = Array.from(screenContent.querySelectorAll('*')).filter((el) => {
            if (!isVisible(el)) return false;
            if (appHeader.contains(el)) return false;
            if (el.closest('svg')) return false;
            const cs = window.getComputedStyle(el);
            if (cs.position === 'absolute' || cs.position === 'fixed') return false;
            if (el.closest('[data-testid="floating-nav-container"]')) return false;
            if (el === wrapper) return false;
            if (isLayoutWrapper(el)) return false;
            const hasDirectText = Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0);
            const semanticTag = /^(BUTTON|A|INPUT|TEXTAREA|SELECT|IMG|LI|ARTICLE|SECTION|H[1-6])$/.test(el.tagName);
            const hasRole = Boolean(el.getAttribute('role'));
            const hasTestId = Boolean(el.getAttribute('data-testid'));
            const hasSurface = (parseFloat(cs.borderRadius) || 0) > 0 && ((parseFloat(cs.borderWidth) || 0) > 0 || (parseFloat(cs.paddingTop) || 0) > 0);
            return hasDirectText || semanticTag || hasRole || hasTestId || hasSurface;
          });

          contentCandidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
          const first = contentCandidates[0] || null;

          if (!first) {
            return { status: 'BLOCKED', blockReason: 'First visible content candidate not found' };
          }

          const firstTop = Math.round(first.getBoundingClientRect().top * 10) / 10;
          const topGap = Math.round((firstTop - headerBottom) * 10) / 10;

          // Midpoint scroll
          const maxScroll = scroller.scrollHeight - scroller.clientHeight;
          const midScroll = Math.max(50, Math.round(maxScroll / 2));
          scroller.scrollTop = midScroll;
          scroller.dispatchEvent(new Event('scroll'));
          await new Promise((res) => setTimeout(res, 80));

          const midHeaderRect = appHeader.getBoundingClientRect();
          const midHeaderY = Math.round(midHeaderRect.top * 10) / 10;
          const headerDeltaMid = Math.round((midHeaderY - initialHeaderY) * 10) / 10;
          const headerMovedMid = Math.abs(headerDeltaMid) > 1;

          // True-end scroll
          let stableCount = 0;
          let lastH = 0;
          for (let i = 0; i < 30; i++) {
            scroller.scrollTop = scroller.scrollHeight;
            scroller.dispatchEvent(new Event('scroll'));
            await new Promise((res) => setTimeout(res, 50));
            if (scroller.scrollHeight === lastH && scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 2) {
              stableCount++;
              if (stableCount >= 2) break;
            } else {
              stableCount = 0;
            }
            lastH = scroller.scrollHeight;
          }

          const endHeaderRect = appHeader.getBoundingClientRect();
          const endHeaderY = Math.round(endHeaderRect.top * 10) / 10;
          const headerDeltaEnd = Math.round((endHeaderY - initialHeaderY) * 10) / 10;
          const headerMovedEnd = Math.abs(headerDeltaEnd) > 1;

          // Bottom clearance
          const floatingNav = document.querySelector('[data-testid="floating-nav-container"]');
          let bottomGap = null;
          if (floatingNav) {
            const navTop = floatingNav.getBoundingClientRect().top;
            const bottomContentRoot = scroller;
            const bottomWrapper = (bottomContentRoot.firstElementChild && bottomContentRoot.children.length === 1)
              ? bottomContentRoot.firstElementChild
              : bottomContentRoot;

            const allContent = Array.from(bottomContentRoot.querySelectorAll('*')).filter((el) => {
              if (!isVisible(el)) return false;
              if (el.closest('svg')) return false;
              const s = window.getComputedStyle(el);
              if (s.position === 'absolute' || s.position === 'fixed') return false;
              if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el !== scroller) return false;
              if (el.closest('[data-testid="floating-nav-container"], [data-testid="app-header"], [data-testid="app-header-container"]')) return false;
              if (el === bottomWrapper) return false;
              return true;
            });

            const nonWrapper = allContent.filter((el) => {
              if (el.children.length === 1) {
                const c = el.children[0];
                if (isVisible(c)) {
                  const r1 = el.getBoundingClientRect();
                  const r2 = c.getBoundingClientRect();
                  if (Math.abs(r1.bottom - r2.bottom) < 0.5 && Math.abs(r1.top - r2.top) < 0.5 && Math.abs(r1.height - r2.height) < 0.5) {
                    return false;
                  }
                }
              }
              return true;
            });

            let greatestBottom = -Infinity;
            for (const el of nonWrapper) {
              const rect = el.getBoundingClientRect();
              if (rect.bottom > greatestBottom) {
                greatestBottom = rect.bottom;
              }
            }

            if (greatestBottom > -Infinity) {
              bottomGap = Math.round((navTop - greatestBottom) * 10) / 10;
            }
          }

          // Background transparency
          const isTransparent = (bg) => {
            if (!bg) return true;
            const c = bg.trim().toLowerCase();
            return c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || c === 'rgba(0,0,0,0)';
          };

          const csAppHeader = window.getComputedStyle(appHeader);
          const appHeaderBg = csAppHeader.backgroundColor;
          const bgEl = appHeader.querySelector('[data-testid="app-header-bg"] > div, [data-testid="app-header-bg"]');
          const csBgEl = bgEl ? window.getComputedStyle(bgEl) : null;
          const containerEl = appHeader.querySelector('[data-testid="app-header-container"]') || appHeader;
          const csContainerEl = window.getComputedStyle(containerEl);

          const isTransparentHeader = isTransparent(appHeaderBg) &&
            (!csBgEl || isTransparent(csBgEl.backgroundColor)) &&
            isTransparent(csContainerEl.backgroundColor);

          // Readability & contrast
          const wordmark = appHeader.querySelector('[data-testid="app-header-wordmark"]');
          const appearance = appHeader.querySelector('[data-testid="app-header-appearance"]');
          const gear = appHeader.querySelector('[data-testid="app-header-gear"]');

          const isWordmarkReadable = Boolean(wordmark && isVisible(wordmark) && (wordmark.textContent || '').trim().length > 0);
          const isAppearanceReadable = Boolean(appearance && isVisible(appearance));
          const isGearReadable = Boolean(gear && isVisible(gear));
          const readabilityPass = isWordmarkReadable && isAppearanceReadable && isGearReadable;

          // No decorative overlap
          const headerRow = appHeader.querySelector('[data-testid="app-header-row"]') || appHeader;
          const rowRect = headerRow.getBoundingClientRect();
          const overlappingElements = Array.from(document.querySelectorAll('*')).filter((el) => {
            if (!isVisible(el)) return false;
            if (appHeader.contains(el)) return false;
            if (el.contains(appHeader)) return false;
            const r = el.getBoundingClientRect();
            const intersects = !(r.right <= rowRect.left || r.left >= rowRect.right || r.bottom <= rowRect.top || r.top >= rowRect.bottom);
            if (!intersects) return false;
            const s = window.getComputedStyle(el);
            if (s.position === 'absolute' || s.position === 'fixed') {
              return s.pointerEvents !== 'none' && s.display !== 'none' && s.visibility !== 'hidden';
            }
            return false;
          });
          const noDecorativeOverlap = overlappingElements.length === 0;

          return {
            status: 'MEASURED',
            scrollOwner,
            headerInsideScroller,
            initialHeaderY,
            headerHeight,
            headerBottom,
            firstElement: first.tagName.toLowerCase(),
            firstTop,
            topGap,
            midScroll,
            midHeaderY,
            headerDeltaMid,
            headerMovedMid,
            endHeaderY,
            headerDeltaEnd,
            headerMovedEnd,
            bottomGap,
            isTransparentHeader,
            readabilityPass,
            noDecorativeOverlap,
            appHeaderBg,
          };
        }, hub.id);

        if (m.status === 'BLOCKED') {
          console.error(`  ❌ [${hub.id}] BLOCKED: ${m.blockReason}`);
          blockedCount++;
          results.push({
            hub: hub.id,
            config: cfgKey,
            status: 'BLOCKED',
            cause: m.blockReason,
          });
          continue;
        }

        // Strict assertions
        const topGapPass = Math.abs(m.topGap - 24) <= 0.5;
        const bottomGapPass = m.bottomGap !== null && Math.abs(m.bottomGap - 32) <= 0.5;
        const nonStickyPass = m.headerMovedMid && m.headerMovedEnd;
        const transparentPass = m.isTransparentHeader;
        const readabilityPass = m.readabilityPass;
        const noOverlapPass = m.noDecorativeOverlap;
        const pass = topGapPass && bottomGapPass && nonStickyPass && transparentPass && readabilityPass && noOverlapPass;

        if (!pass) failCount++;

        const row = {
          hub: hub.id,
          config: cfgKey,
          scrollOwner: m.scrollOwner,
          initialY: m.initialHeaderY,
          midY: m.midHeaderY,
          deltaMid: m.headerDeltaMid,
          endY: m.endHeaderY,
          deltaEnd: m.headerDeltaEnd,
          topGap: m.topGap,
          topGapPass,
          bottomGap: m.bottomGap,
          bottomGapPass,
          nonStickyPass,
          transparentPass,
          readabilityPass,
          noOverlapPass,
          status: pass ? 'PASS' : 'FAIL',
        };

        results.push(row);

        console.log(
          `  ${pass ? '✓' : '✗'} [${hub.id.padEnd(7)}] ` +
          `transparent:${transparentPass ? 'YES' : 'NO'} | ` +
          `readable:${readabilityPass ? 'YES' : 'NO'} | ` +
          `overlap:${noOverlapPass ? 'NONE' : 'COLLISION'} | ` +
          `topGap:${String(m.topGap).padStart(4)} (${topGapPass ? 'PASS' : 'FAIL'}) | ` +
          `botGap:${String(m.bottomGap).padStart(4)} (${bottomGapPass ? 'PASS' : 'FAIL'}) | ` +
          `scroller:${m.scrollOwner}`
        );
      }

      // Representative secondary route: Quran Audio (SubHeader)
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'audio' });
      });
      await page.waitForTimeout(600);

      const secM = await page.evaluate(() => {
        const isVisible = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
        };

        const subHeader = document.querySelector('[data-testid="sub-header"], [data-testid="subheader"]');
        const appHeaderCount = Array.from(document.querySelectorAll('[data-testid="app-header"], [data-testid="app-header-container"]')).filter(isVisible).length;

        if (!subHeader) {
          return { status: 'BLOCKED', blockReason: 'SubHeader not found on secondary route' };
        }

        const cs = window.getComputedStyle(subHeader);
        const bg = cs.backgroundColor;
        const isOpaque = !bg.includes('rgba') || !bg.endsWith(', 0)');

        return {
          status: 'MEASURED',
          subHeaderFound: true,
          appHeaderCount,
          subHeaderBg: bg,
          isOpaque,
        };
      });

      if (secM.status === 'BLOCKED') {
        console.error(`  ❌ [sec-audio] BLOCKED: ${secM.blockReason}`);
        failCount++;
      } else {
        const secPass = secM.subHeaderFound && secM.isOpaque && secM.appHeaderCount === 0;
        if (!secPass) failCount++;
        console.log(`  ${secPass ? '✓' : '✗'} [sec-audio] opaqueSubHeader:${secM.subHeaderBg} | appHeaderCount:${secM.appHeaderCount} (${secPass ? 'PASS' : 'FAIL'})`);
      }

      await context.close();
    }
  }
}

await browser.close();
server.close();

console.log('\n================================================================================');
console.log('SUMMARY TABLE');
console.log('================================================================================');
console.log('Hub      Config            InitY  MidY     EndY     TopGap (24±0.5)  BotGap (32±0.5)  Status');
console.log('-------  ----------------  -----  -------  -------  ---------------  ---------------  ------');
for (const r of results) {
  if (r.status === 'BLOCKED') {
    console.log(`${r.hub.padEnd(7)}  ${r.config.padEnd(16)}  BLOCKED: ${r.cause}`);
  } else {
    console.log(
      `${r.hub.padEnd(7)}  ` +
      `${r.config.padEnd(16)}  ` +
      `${String(r.initialY).padStart(5)}  ` +
      `${String(r.midY).padStart(7)}  ` +
      `${String(r.endY).padStart(7)}  ` +
      `${(String(r.topGap) + 'dp ' + (r.topGapPass ? '✓' : '✗')).padStart(15)}  ` +
      `${(String(r.bottomGap) + 'dp ' + (r.bottomGapPass ? '✓' : '✗')).padStart(15)}  ` +
      `${r.status}`
    );
  }
}

console.log('================================================================================');
console.log(`Total runs: ${results.length} | Passed: ${results.filter(r => r.status === 'PASS').length} | Failed: ${failCount} | Blocked: ${blockedCount}`);
console.log('================================================================================');

if (failCount > 0 || blockedCount > 0) {
  console.error('\n❌ STRICT HUB HEADERS NON-STICKY PROOF FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ ALL 32 MATRIX CONFIGURATIONS SATISFIED ALL NON-STICKY & SPACING CONTRACTS!');
  process.exit(0);
}
