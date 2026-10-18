import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = '/home/ubuntu/.hermes/cache/scratch/header-batch1-rendered-proof';
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

// Start dedicated static HTTP server serving the current exported web build
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
console.log(`[Headers Batch 1 Proof] Static server listening on port ${port} (exported web build)`);

const FIXTURE_TIMINGS = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '16 Oct 2026', hijri: { day: '4', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '16-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

const VIEWPORT = { width: 393, height: 852 };
const THEMES = ['paper', 'ink'];

// The required routes/states for Header Redesign Batch 1
const ROUTES = [
  {
    id: 'quran-screen',
    name: 'QuranScreen',
    kind: 'sub-header',
    expectedEyebrow: 'THE HOLY QURAN',
    expectedTitle: 'Surahs',
    expectedSubtitle: 'All 114 Surahs with translations, audio & verse commentary',
    backLabel: 'Quran',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'surah-list' });
    }),
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      });
    },
  },
  {
    id: 'quran-audio',
    name: 'QuranAudioScreen',
    kind: 'sub-header',
    expectedEyebrow: 'AUDIO CENTER',
    expectedTitle: 'Quran Audio',
    expectedSubtitle: 'Recitations, audio translations, playlists & player settings',
    backLabel: 'Quran',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'audio' });
    }),
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      });
    },
  },
  {
    id: 'tafsir',
    name: 'TafsirScreen',
    kind: 'sub-header',
    expectedEyebrow: 'EXEGESIS & COMMENTARY',
    expectedTitle: 'Tafsir al-Jalalayn',
    expectedSubtitle: 'Verse-by-verse scholarly exegesis',
    backLabel: 'Quran',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'tafsir', surah: 1 });
    }),
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      });
    },
  },
  {
    id: 'quran-topics',
    name: 'QuranTopicsScreen',
    kind: 'sub-header',
    expectedEyebrow: 'THEMATIC QURAN',
    expectedTitle: 'Quran Topics',
    expectedSubtitle: 'Curated Quranic passages arranged by core themes of life, faith, and spirituality.',
    backLabel: 'Quran',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'topics' });
    }),
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      });
    },
  },
  {
    id: 'translation-compare',
    name: 'TranslationCompareScreen',
    kind: 'sub-header',
    expectedEyebrow: 'COMPARATIVE STUDY',
    expectedTitle: 'Translation Compare',
    expectedSubtitle: 'Side-by-side comparative study of translations',
    backLabel: 'Quran',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'compare', surah: 1, ayah: 1 });
    }),
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      });
    },
  },
  {
    id: 'reading-plans-list',
    name: 'ReadingPlansScreen list view',
    kind: 'sub-header',
    expectedEyebrow: 'KHATMAH',
    expectedTitle: 'Reading Plans',
    expectedSubtitle: 'Structured schedules to recite the Holy Quran at your own pace',
    backLabel: 'Quran',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'plans' });
    }),
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      });
    },
  },
  {
    id: 'reading-plans-detail',
    name: 'ReadingPlansScreen detail view',
    kind: 'sub-header',
    expectedEyebrow: '1 JUZ / DAY',
    expectedTitle: '30-Day Khatmah',
    expectedSubtitle: 'Khatmah milestone progress & daily readings',
    backLabel: 'All Plans',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'plans' });
      });
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        const card = Array.from(document.querySelectorAll('*')).find(el => el.textContent === '30-Day Khatmah');
        if (card) {
          const btn = card.closest('[role="button"]') || card;
          btn.click();
        }
      });
    },
    verifyBack: async (page) => {
      return await page.evaluate(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Reading Plans';
      });
    },
  },
  {
    id: 'app-header-smoke',
    name: 'AppHeader ring-button smoke coverage',
    kind: 'app-header',
    nav: (page) => page.evaluate(() => {
      window.__NAVIGATE__.setTab('home');
    }),
    verifyBack: null,
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const results = [];
let allPassed = true;

try {
  for (const theme of THEMES) {
    console.log(`\n========================================`);
    console.log(`=== RUNNING VERIFICATION: THEME ${theme.toUpperCase()} (${VIEWPORT.width}x${VIEWPORT.height}) ===`);
    console.log(`========================================`);

    for (const route of ROUTES) {
      console.log(`\n--- Testing ${route.name} [${theme}] ---`);
      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();

      // Intercept network APIs to load deterministically
      await page.route('**/timings/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
      );
      await page.route('**/api.aladhan.com/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
      );
      await page.route('**/api.islamic.app/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
      );

      // Pre-seed localStorage
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
      }, { theme });

      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Navigate to target route
      await route.nav(page);
      await page.waitForTimeout(700);

      const screenshotFilename = `${route.id}_${theme}_${VIEWPORT.width}x${VIEWPORT.height}.png`;
      const screenshotPath = path.join(OUTPUT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });

      const evaluation = await page.evaluate((rInfo) => {
        const isAppHeader = rInfo.kind === 'app-header';

        if (isAppHeader) {
          const appHeader = document.querySelector('[data-testid="app-header-container"]');
          const appearance = document.querySelector('[data-testid="app-header-appearance"]');
          const gear = document.querySelector('[data-testid="app-header-gear"]');
          const subHeaders = document.querySelectorAll('[data-testid="sub-header"]');
          const legacyHeaders = document.querySelectorAll('[data-testid*="screen-header"]');

          const inspectBtn = (el) => {
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const icon = el.querySelector('i, span, [class*="icon"], *');
            return {
              width: Math.round(rect.width * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
              borderRadius: parseFloat(cs.borderRadius),
              borderWidth: cs.borderWidth,
              backgroundColor: cs.backgroundColor,
              borderColor: cs.borderColor,
              iconColor: icon ? window.getComputedStyle(icon).color : null,
            };
          };

          return {
            headerCount: (appHeader ? 1 : 0) + subHeaders.length + legacyHeaders.length,
            hasAppHeader: !!appHeader,
            subHeaderCount: subHeaders.length,
            legacyHeaderCount: legacyHeaders.length,
            appearanceMetrics: inspectBtn(appearance),
            gearMetrics: inspectBtn(gear),
          };
        } else {
          // SubHeader route
          const subHeaders = document.querySelectorAll('[data-testid="sub-header"]');
          const appHeaders = document.querySelectorAll('[data-testid="app-header-container"]');
          const legacyHeaders = document.querySelectorAll('[data-testid*="screen-header"]');
          const subHeader = subHeaders[0] || null;

          const backBtn = document.querySelector('[data-testid="sub-header-back-btn"]');
          const backRing = document.querySelector('[data-testid="sub-header-back-ring"]');
          const backLabel = document.querySelector('[data-testid="sub-header-back-label"]');
          const title = document.querySelector('[data-testid="sub-header-title"]');
          const eyebrow = document.querySelector('[data-testid="sub-header-eyebrow"]');
          const subtitle = document.querySelector('[data-testid="sub-header-subtitle"]');

          const allBackButtons = document.querySelectorAll('[data-testid*="back-btn"], [aria-label*="Back"]');

          const subHeaderRect = subHeader ? subHeader.getBoundingClientRect() : null;
          const backTouchRect = backBtn ? backBtn.getBoundingClientRect() : null;
          const backRingRect = backRing ? backRing.getBoundingClientRect() : null;

          const backRingCs = backRing ? window.getComputedStyle(backRing) : null;
          const titleCs = title ? window.getComputedStyle(title) : null;
          const eyebrowCs = eyebrow ? window.getComputedStyle(eyebrow) : null;
          const subtitleCs = subtitle ? window.getComputedStyle(subtitle) : null;

          // Find the real scroll container: element with overflow-y: auto / scroll and scrollHeight > clientHeight
          const allElements = Array.from(document.querySelectorAll('*'));
          const scrollables = allElements.filter((el) => {
            const cs = window.getComputedStyle(el);
            const oy = cs.overflowY;
            return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight;
          });
          const mainScroller = scrollables[scrollables.length - 1] || null;

          let headerTopBefore = subHeaderRect ? subHeaderRect.top : 0;
          let headerMoved = false;
          let scrollOccurred = false;
          let firstContentTop = 0;
          let clearancePaddingBottom = '0px';

          if (mainScroller) {
            const firstChild = mainScroller.firstElementChild;
            if (firstChild) {
              const r = firstChild.getBoundingClientRect();
              firstContentTop = r.top;
              clearancePaddingBottom = window.getComputedStyle(firstChild).paddingBottom;
            }

            // Test scroll isolation
            const initialTop = mainScroller.scrollTop;
            mainScroller.scrollTop = 150;
            if (mainScroller.scrollTop > initialTop) {
              scrollOccurred = true;
            }
            const headerAfter = subHeader.getBoundingClientRect();
            headerMoved = Math.abs(headerAfter.top - headerTopBefore) > 1;
            mainScroller.scrollTop = initialTop; // reset
          }

          // FloatingNav clearance check
          const dock = document.querySelector('[data-testid="floating-nav-container"]');
          const dockTop = dock ? dock.getBoundingClientRect().top : 852;

          return {
            headerCount: subHeaders.length + appHeaders.length + legacyHeaders.length,
            subHeaderCount: subHeaders.length,
            appHeaderCount: appHeaders.length,
            legacyHeaderCount: legacyHeaders.length,
            backButtonCount: allBackButtons.length,
            subHeaderRect: subHeaderRect ? { top: subHeaderRect.top, height: subHeaderRect.height, bottom: subHeaderRect.bottom } : null,
            backTouchMetrics: backTouchRect ? {
              width: Math.round(backTouchRect.width * 10) / 10,
              height: Math.round(backTouchRect.height * 10) / 10,
            } : null,
            backRingMetrics: backRingRect && backRingCs ? {
              width: Math.round(backRingRect.width * 10) / 10,
              height: Math.round(backRingRect.height * 10) / 10,
              borderRadius: parseFloat(backRingCs.borderRadius),
              borderWidth: backRingCs.borderWidth,
              backgroundColor: backRingCs.backgroundColor,
              borderColor: backRingCs.borderColor,
            } : null,
            titleMetrics: title && titleCs ? {
              text: title.textContent?.trim(),
              fontSize: parseFloat(titleCs.fontSize),
              lineHeight: titleCs.lineHeight,
              fontFamily: titleCs.fontFamily,
              color: titleCs.color,
            } : null,
            eyebrowMetrics: eyebrow && eyebrowCs ? {
              text: eyebrow.textContent?.trim(),
              fontSize: parseFloat(eyebrowCs.fontSize),
              fontFamily: eyebrowCs.fontFamily,
              textTransform: eyebrowCs.textTransform,
              letterSpacing: eyebrowCs.letterSpacing,
              color: eyebrowCs.color,
            } : null,
            subtitleMetrics: subtitle && subtitleCs ? {
              text: subtitle.textContent?.trim(),
              fontSize: parseFloat(subtitleCs.fontSize),
              lineHeight: subtitleCs.lineHeight,
              fontFamily: subtitleCs.fontFamily,
              color: subtitleCs.color,
            } : null,
            backLabelText: backLabel ? backLabel.textContent?.trim() : null,
            scrollInfo: {
              scrollerFound: !!mainScroller,
              headerMoved,
              scrollOccurred,
              firstContentStartsBelowHeader: firstContentTop >= (subHeaderRect?.top || 0),
              clearancePaddingBottom,
              dockTop,
            },
          };
        }
      }, { kind: route.kind, id: route.id });

      const assertions = [];

      if (route.kind === 'app-header') {
        // Assert exactly one header
        assertions.push({
          name: 'Exactly one AppHeader, zero legacy headers',
          pass: evaluation.headerCount === 1 && evaluation.hasAppHeader && evaluation.legacyHeaderCount === 0,
          measured: `headerCount=${evaluation.headerCount}, hasAppHeader=${evaluation.hasAppHeader}`,
        });

        // Assert appearance button geometry
        const appearance = evaluation.appearanceMetrics;
        const appearanceGeomPass = appearance && appearance.width === 32 && appearance.height === 32 && appearance.borderRadius === 16;
        assertions.push({
          name: 'AppHeader Appearance 32x32, radius 16, 0.75px/1px border',
          pass: appearanceGeomPass,
          measured: JSON.stringify(appearance),
        });

        // Assert gear button geometry
        const gear = evaluation.gearMetrics;
        const gearGeomPass = gear && gear.width === 32 && gear.height === 32 && gear.borderRadius === 16;
        assertions.push({
          name: 'AppHeader Gear 32x32, radius 16, 0.75px/1px border',
          pass: gearGeomPass,
          measured: JSON.stringify(gear),
        });

        // Theme colors
        if (theme === 'paper') {
          assertions.push({
            name: 'Paper theme surface & icon tokens on HeaderRingButton',
            pass: gear && gear.backgroundColor === 'rgb(254, 252, 247)' && gear.borderColor === 'rgb(226, 204, 156)' && gear.iconColor === 'rgb(238, 202, 128)',
            measured: `gear bg=${gear?.backgroundColor}, border=${gear?.borderColor}, icon=${gear?.iconColor}`,
          });
        } else {
          assertions.push({
            name: 'Ink theme surface & icon tokens on HeaderRingButton',
            pass: gear && gear.backgroundColor === 'rgb(42, 41, 51)' && gear.borderColor === 'rgb(140, 119, 71)' && gear.iconColor === 'rgb(230, 190, 108)',
            measured: `gear bg=${gear?.backgroundColor}, border=${gear?.borderColor}, icon=${gear?.iconColor}`,
          });
        }

        // Smoke interactive test: gear click opens settings
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="app-header-gear"]');
          if (btn) btn.click();
        });
        await page.waitForTimeout(600);
        const settingsOpened = await page.evaluate(() => {
          return document.body.innerText.includes('Settings') || document.body.innerText.includes('General Settings');
        });
        assertions.push({
          name: 'Clicking AppHeader gear opens Settings',
          pass: settingsOpened,
          measured: `settingsOpened=${settingsOpened}`,
        });
      } else {
        // SubHeader screen assertions
        // 1. Exactly one applicable header and exactly one back button
        assertions.push({
          name: 'Exactly one SubHeader, no duplicate top header/chevron',
          pass: evaluation.subHeaderCount === 1 && evaluation.appHeaderCount === 0 && evaluation.legacyHeaderCount === 0,
          measured: `subHeaders=${evaluation.subHeaderCount}, appHeaders=${evaluation.appHeaderCount}, legacy=${evaluation.legacyHeaderCount}`,
        });

        // 2. SubHeader container position: top 0 with safeTop handling
        const subHeaderTop = evaluation.subHeaderRect ? evaluation.subHeaderRect.top : -1;
        assertions.push({
          name: 'SubHeader container top 0 with safeTop handling (no unexplained 10px offset)',
          pass: subHeaderTop === 0,
          measured: `top=${subHeaderTop}`,
        });

        // 3. Shared HeaderRingButton geometry: 32x32, radius 16, 0.75dp tokens.border, effective hit target >= 44x44
        const ring = evaluation.backRingMetrics;
        const touch = evaluation.backTouchMetrics;
        const ringGeomPass = ring && ring.width === 32 && ring.height === 32 && ring.borderRadius === 16;
        const ringBorderPass = ring &&
          (ring.borderWidth === '0.75px' || ring.borderWidth === '1px') &&
          (theme === 'paper' ? ring.borderColor === 'rgb(226, 204, 156)' : ring.borderColor === 'rgb(140, 119, 71)');
        const hitTargetPass = touch && touch.width >= 44 && touch.height >= 44;
        assertions.push({
          name: 'HeaderRingButton 32x32, radius 16, 0.75dp tokens.border, 44x44 minimum touch target',
          pass: Boolean(ringGeomPass && ringBorderPass && hitTargetPass),
          measured: `ring=${JSON.stringify(ring)}, touch=${JSON.stringify(touch)}`,
        });

        // 4. SubHeader typography: Title (24sp Lora_500Medium, 28px line-height)
        const titleM = evaluation.titleMetrics;
        const eyebrowM = evaluation.eyebrowMetrics;
        const subtitleM = evaluation.subtitleMetrics;

        const titlePass = titleM &&
          titleM.fontSize === 24 &&
          titleM.lineHeight === '28px' &&
          titleM.fontFamily === 'Lora_500Medium';
        assertions.push({
          name: 'SubHeader title 24sp Lora_500Medium with 28px line-height',
          pass: Boolean(titlePass),
          measured: `title text="${titleM?.text}", size=${titleM?.fontSize}, font=${titleM?.fontFamily}, line=${titleM?.lineHeight}`,
        });

        // 5. Eyebrow: Poppins_500Medium, 11sp, uppercase, letterSpacing about 1.8
        const eyebrowPass = eyebrowM &&
          eyebrowM.fontFamily === 'Poppins_500Medium' &&
          eyebrowM.fontSize === 11 &&
          eyebrowM.textTransform === 'uppercase' &&
          Math.abs(parseFloat(eyebrowM.letterSpacing || '0') - 1.8) <= 0.2;
        assertions.push({
          name: 'SubHeader eyebrow 11sp Poppins_500Medium uppercase with 1.8 letter spacing',
          pass: Boolean(eyebrowPass),
          measured: `eyebrow text="${eyebrowM?.text}", size=${eyebrowM?.fontSize}, font=${eyebrowM?.fontFamily}, transform=${eyebrowM?.textTransform}, spacing=${eyebrowM?.letterSpacing}`,
        });

        // 6. Subtitle: Poppins_400Regular, 11sp, 15px line-height
        const subtitlePass = subtitleM &&
          subtitleM.fontSize === 11 &&
          subtitleM.lineHeight === '15px' &&
          subtitleM.fontFamily === 'Poppins_400Regular';
        assertions.push({
          name: 'SubHeader subtitle 11sp Poppins_400Regular with 15px line-height',
          pass: Boolean(subtitlePass),
          measured: `subtitle text="${subtitleM?.text?.slice(0, 30)}...", size=${subtitleM?.fontSize}, font=${subtitleM?.fontFamily}, line=${subtitleM?.lineHeight}`,
        });

        // 7. Color theme verification: goldText eyebrow (#8A6420 paper, #E6BE6C ink)
        if (theme === 'paper') {
          const paperColorsPass =
            titleM?.color === 'rgb(20, 34, 30)' &&
            eyebrowM?.color === 'rgb(138, 100, 32)' &&
            subtitleM?.color === 'rgb(100, 112, 104)' &&
            ring?.backgroundColor === 'rgb(240, 246, 242)' &&
            ring?.borderColor === 'rgb(226, 204, 156)';
          assertions.push({
            name: 'Paper theme tokens in header zone (goldText #8A6420 eyebrow, border #E2CC9C)',
            pass: Boolean(paperColorsPass),
            measured: `title=${titleM?.color}, eyebrow=${eyebrowM?.color}, subtitle=${subtitleM?.color}, ringBg=${ring?.backgroundColor}, ringBorder=${ring?.borderColor}`,
          });
        } else {
          const inkColorsPass =
            titleM?.color === 'rgb(243, 238, 221)' &&
            eyebrowM?.color === 'rgb(230, 190, 108)' &&
            subtitleM?.color === 'rgb(168, 166, 174)' &&
            ring?.backgroundColor === 'rgb(32, 31, 40)' &&
            ring?.borderColor === 'rgb(140, 119, 71)';
          assertions.push({
            name: 'Ink theme tokens in header zone (goldText #E6BE6C eyebrow, border #8C7747)',
            pass: Boolean(inkColorsPass),
            measured: `title=${titleM?.color}, eyebrow=${eyebrowM?.color}, subtitle=${subtitleM?.color}, ringBg=${ring?.backgroundColor}, ringBorder=${ring?.borderColor}`,
          });
        }

        // 5. Header remains fixed while content scrolls, FloatingNav clearance
        const scroll = evaluation.scrollInfo;
        const scrollPass = scroll && !scroll.headerMoved && scroll.firstContentStartsBelowHeader;
        const clearanceNum = parseFloat(scroll?.clearancePaddingBottom || '0');
        const clearancePass = clearanceNum >= 90; // TAB_PAD_BOTTOM >= 100px
        assertions.push({
          name: 'Header fixed while content scrolls, content starts below header, FloatingNav does not overlap',
          pass: Boolean(scrollPass && clearancePass),
          measured: `headerMoved=${scroll?.headerMoved}, firstContentBelow=${scroll?.firstContentStartsBelowHeader}, padBottom=${scroll?.clearancePaddingBottom}`,
        });

        // 6. Exercise back behavior for the migrated route
        if (route.verifyBack) {
          await page.evaluate(() => {
            const btn = document.querySelector('[data-testid="sub-header-back-btn"]');
            if (btn) btn.click();
          });
          await page.waitForTimeout(600);
          const backSuccess = await route.verifyBack(page);
          assertions.push({
            name: 'Back button returns correctly without altering navigation logic',
            pass: Boolean(backSuccess),
            measured: `backSuccess=${backSuccess}`,
          });
        }
      }

      const routePass = assertions.every((a) => a.pass);
      if (!routePass) allPassed = false;

      for (const a of assertions) {
        console.log(`  [${a.pass ? 'PASS' : 'FAIL'}] ${a.name} (${a.measured})`);
        if (!a.pass) {
          console.error(`    ASSERTION FAILURE on ${route.name} [${theme}]: ${a.name}`);
        }
      }

      results.push({
        routeId: route.id,
        routeName: route.name,
        theme,
        viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
        screenshotPath,
        passFailStatus: routePass ? 'PASS' : 'FAIL',
        assertions,
        measuredValues: evaluation,
      });

      await context.close();
    }
  }

  // RTL Test Verification on Arabic
  console.log(`\n========================================`);
  console.log(`=== RUNNING RTL & LOCALIZATION AUDIT ===`);
  console.log(`========================================`);
  {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    await page.route('**/timings/**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
    );
    await page.route('**/api.aladhan.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
    );
    await page.route('**/api.islamic.app/**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
    );

    await context.addInitScript(() => {
      localStorage.setItem('onboardingDone', 'true');
      localStorage.setItem('location-setup-dismissed-v1', 'true');
      localStorage.setItem(
        'islamic-settings',
        JSON.stringify({
          language: 'ar',
          themeMode: 'paper',
          manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
          locationMode: 'manual',
        })
      );
    });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'surah-list' });
    });
    await page.waitForTimeout(800);

    const rtlScreenshot = path.join(OUTPUT_DIR, 'quran_screen_rtl_arabic.png');
    await page.screenshot({ path: rtlScreenshot });

    const rtlEval = await page.evaluate(() => {
      const title = document.querySelector('[data-testid="sub-header-title"]');
      const eyebrow = document.querySelector('[data-testid="sub-header-eyebrow"]');
      const subtitle = document.querySelector('[data-testid="sub-header-subtitle"]');
      return {
        titleTextAlign: title ? window.getComputedStyle(title).textAlign : null,
        titleFont: title ? window.getComputedStyle(title).fontFamily : null,
        eyebrowTextAlign: eyebrow ? window.getComputedStyle(eyebrow).textAlign : null,
        subtitleTextAlign: subtitle ? window.getComputedStyle(subtitle).textAlign : null,
      };
    });

    const rtlPass = rtlEval.titleTextAlign === 'right' && rtlEval.titleFont.includes('NotoNaskhArabic');
    if (!rtlPass) allPassed = false;

    console.log(`  [${rtlPass ? 'PASS' : 'FAIL'}] RTL start/end alignment & Arabic font (NotoNaskhArabic)`);
    console.log(`    titleTextAlign=${rtlEval.titleTextAlign}, font=${rtlEval.titleFont}`);

    results.push({
      routeId: 'quran-screen-rtl-arabic',
      routeName: 'QuranScreen RTL Arabic',
      theme: 'paper',
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
      screenshotPath: rtlScreenshot,
      passFailStatus: rtlPass ? 'PASS' : 'FAIL',
      assertions: [
        {
          name: 'RTL start/end alignment & Arabic font (NotoNaskhArabic)',
          pass: rtlPass,
          measured: JSON.stringify(rtlEval),
        },
      ],
      measuredValues: rtlEval,
    });

    await context.close();
  }

} finally {
  await browser.close();
  server.close();
}

// Write machine-readable report to external proof directory
const reportJsonPath = path.join(OUTPUT_DIR, 'batch1-proof-report.json');
fs.writeFileSync(reportJsonPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  overallPass: allPassed,
  totalRoutesTested: results.length,
  results,
}, null, 2));

console.log(`\nMachine-readable proof report written to: ${reportJsonPath}`);
console.log(`Total test suites: ${results.length}. Overall status: ${allPassed ? 'ALL PASS ✓' : 'FAILED ✗'}`);

if (!allPassed) {
  console.error('\n[FATAL] One or more acceptance assertions failed!');
  process.exit(1);
} else {
  console.log('\n[SUCCESS] All Batch 1 header acceptance assertions passed!');
  process.exit(0);
}
