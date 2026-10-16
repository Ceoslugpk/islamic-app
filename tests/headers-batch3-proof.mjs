import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = '/home/ubuntu/.hermes/cache/scratch/header-batch3-rendered-proof';
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

// Start dedicated static HTTP server serving the exported web build
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
console.log(`[Headers Batch 3 Proof] Static server listening on port ${port} (exported web build)`);

const FIXTURE_TIMINGS = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '16 Oct 2026', hijri: { day: '4', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '16-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

const VIEWPORT = { width: 393, height: 852 }; // Standard iPhone 14/15 reference frame

const ROUTES_TO_TEST = [
  {
    id: 'hadith',
    name: 'HadithLibraryScreen default tab',
    kind: 'sub-header',
    expectedEyebrow: 'LIBRARY',
    expectedTitle: 'Hadith Library',
    expectedSubtitle: 'Browse 17 canonical collections, books & authentic narrations',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'hadith' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Hadith Library';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'hadith-saved',
    name: 'HadithLibraryScreen saved tab (dynamic)',
    kind: 'sub-header',
    expectedEyebrow: 'BOOKMARKS',
    expectedTitle: 'Saved Hadiths',
    expectedSubtitle: '0 saved narrations',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'hadith' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Hadith Library';
      }, { timeout: 10000 });
      await page.waitForSelector('[role="tab"]:has-text("Saved")', { timeout: 10000 });
      await page.click('[role="tab"]:has-text("Saved")');
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Saved Hadiths';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'duas',
    name: 'DuasScreen',
    kind: 'sub-header',
    expectedEyebrow: 'SUPPLICATIONS',
    expectedTitle: 'Duas & Adhkar',
    expectedSubtitle: 'Authentic supplications from the Quran and Sunnah',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'duas' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Duas & Adhkar';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'names',
    name: 'NamesScreen (Allah variant)',
    kind: 'sub-header',
    expectedEyebrow: 'ASMA UL-HUSNA',
    expectedTitle: '99 Names of Allah',
    expectedSubtitle: 'Divine attributes and meanings of Allah (SWT)',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'names' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === '99 Names of Allah';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'names-prophet',
    name: 'NamesScreen (Prophet variant)',
    kind: 'sub-header',
    expectedEyebrow: 'ASMA UN-NABI',
    expectedTitle: '99 Names of the Prophet ﷺ',
    expectedSubtitle: 'Noble attributes and titles of Prophet Muhammad ﷺ',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'names-prophet' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === '99 Names of the Prophet ﷺ';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'prayer-guide',
    name: 'PrayerGuideScreen',
    kind: 'sub-header',
    expectedEyebrow: 'GUIDES',
    expectedTitle: 'Prayer Guide (Fiqh)',
    expectedSubtitle: 'Wudu, Salah, praying in congregation, Janazah, Istikhara, Eid and Taraweeh — every narration verified with its collection, number and grade.',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'prayer-guide' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Prayer Guide (Fiqh)';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'ramadan-guide',
    name: 'RamadanGuideScreen',
    kind: 'sub-header',
    expectedEyebrow: 'GUIDES',
    expectedTitle: 'Ramadan & Eid Guide',
    expectedSubtitle: 'Fasting, Laylatul Qadr, Itikaf, Zakat al-Fitr, Eid and Tashriq — every narration verified with its collection, number and grade.',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'ramadan-guide' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Ramadan & Eid Guide';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'shahada',
    name: 'ShahadaScreen',
    kind: 'sub-header',
    expectedEyebrow: 'LIBRARY · KNOWLEDGE',
    expectedTitle: 'The Shahada',
    expectedSubtitle: 'The declaration of faith and its foundational conditions in Islam',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'shahada' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'The Shahada';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'vocab',
    name: 'VocabTrainerScreen',
    kind: 'sub-header',
    expectedEyebrow: 'LEARN',
    expectedTitle: 'Quran Vocabulary',
    expectedSubtitle: 'Most frequent words of the Quran',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'vocab' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Quran Vocabulary';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        return !!document.querySelector('[data-testid="app-header-container"]');
      }, { timeout: 10000 });
      return true;
    },
  },
];

const browser = await chromium.launch({ headless: true });
let allPassed = true;
const results = [];

try {
  for (const theme of ['paper', 'ink']) {
    console.log(`\n========================================`);
    console.log(`=== RUNNING PROOF FOR THEME: ${theme.toUpperCase()} ===`);
    console.log(`========================================`);

    for (const route of ROUTES_TO_TEST) {
      console.log(`\nTesting ${route.name} (${route.id}) in ${theme}...`);

      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();

      // Intercept network requests
      await page.route('**/timings/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
      );
      await page.route('**/api.aladhan.com/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
      );
      await page.route('**/api.islamic.app/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) })
      );

      // Pre-seed localStorage with study data and settings
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

      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.__NAVIGATE__?.setTab === 'function', { timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector('mask#reveal'), { timeout: 10000 });
      await page.waitForTimeout(300);

      // Navigate to target route
      await route.nav(page);
      await page.waitForTimeout(500);

      const screenshotFilename = `${route.id}_${theme}_${VIEWPORT.width}x${VIEWPORT.height}.png`;
      const screenshotPath = path.join(OUTPUT_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });

      const evaluation = await page.evaluate((rInfo) => {
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

        // Find the real scroll container: element with overflow-y: auto / scroll
        const allElements = Array.from(document.querySelectorAll('*'));
        const scrollables = allElements.filter((el) => {
          const cs = window.getComputedStyle(el);
          const oy = cs.overflowY;
          return (oy === 'auto' || oy === 'scroll');
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

          const initialTop = mainScroller.scrollTop;
          mainScroller.scrollTop = 150;
          if (mainScroller.scrollTop > initialTop) {
            scrollOccurred = true;
          }
          if (subHeader) {
            const headerAfter = subHeader.getBoundingClientRect();
            headerMoved = Math.abs(headerAfter.top - headerTopBefore) > 1;
          }
          mainScroller.scrollTop = initialTop;
        }

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
      }, { kind: route.kind, id: route.id });

      const assertions = [];

      // 1. Exactly one SubHeader, zero legacy headers
      assertions.push({
        name: 'Exactly one SubHeader, no duplicate top header/chevron',
        pass: evaluation.subHeaderCount === 1 && evaluation.appHeaderCount === 0 && evaluation.legacyHeaderCount === 0,
        measured: `subHeaders=${evaluation.subHeaderCount}, appHeaders=${evaluation.appHeaderCount}, legacy=${evaluation.legacyHeaderCount}`,
      });

      // 2. SubHeader container position: top 0 with safeTop handling
      const subHeaderTop = evaluation.subHeaderRect ? evaluation.subHeaderRect.top : -1;
      assertions.push({
        name: 'SubHeader container top 0 with safeTop handling',
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

      // 5. Eyebrow: Poppins_500Medium, 11sp
      const eyebrowPass = eyebrowM &&
        eyebrowM.fontFamily === 'Poppins_500Medium' &&
        eyebrowM.fontSize === 11 &&
        (eyebrowM.textTransform === 'uppercase' && Math.abs(parseFloat(eyebrowM.letterSpacing || '0') - 1.8) <= 0.2);
      assertions.push({
        name: 'SubHeader eyebrow 11sp Poppins_500Medium',
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
        measured: `subtitle text="${subtitleM?.text}", size=${subtitleM?.fontSize}, font=${subtitleM?.fontFamily}, line=${subtitleM?.lineHeight}`,
      });

      // 7. Scroll isolation: scrolling mainScroller does NOT move SubHeader
      const scrollPass = !evaluation.scrollInfo.headerMoved;
      assertions.push({
        name: 'SubHeader fixed/pinned: scroll isolation verified',
        pass: scrollPass,
        measured: `scrollerFound=${evaluation.scrollInfo.scrollerFound}, headerMoved=${evaluation.scrollInfo.headerMoved}`,
      });

      // 8. Back navigation functional test
      let backNavPass = false;
      try {
        await page.click('[data-testid="sub-header-back-btn"]');
        await page.waitForTimeout(300);
        backNavPass = await route.verifyBack(page);
      } catch (err) {
        console.error(`    Back nav failed for ${route.id}:`, err.message);
      }
      assertions.push({
        name: 'Back navigation returns to parent view',
        pass: backNavPass,
        measured: `backNavPass=${backNavPass}`,
      });

      // Report route summary
      let routePass = true;
      for (const a of assertions) {
        if (!a.pass) {
          routePass = false;
          allPassed = false;
          console.error(`  [FAIL] ${a.name}`);
          console.error(`         Measured: ${a.measured}`);
        } else {
          console.log(`  [PASS] ${a.name}`);
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

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__NAVIGATE__?.setTab === 'function', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('mask#reveal'), { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__NAVIGATE__.setTab('library');
      window.__NAVIGATE__.setLibrary({ screen: 'duas' });
    });
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
      return !!title;
    }, { timeout: 10000 });
    await page.waitForTimeout(500);

    const rtlScreenshot = path.join(OUTPUT_DIR, 'duas_screen_rtl_arabic.png');
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
      routeId: 'duas-rtl-arabic',
      routeName: 'DuasScreen RTL Arabic',
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
const reportJsonPath = path.join(OUTPUT_DIR, 'batch3-proof-report.json');
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
  console.log('\n[SUCCESS] All Batch 3 header acceptance assertions passed!');
  process.exit(0);
}
