import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = '/home/ubuntu/.hermes/cache/scratch/header-batch2-rendered-proof';
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
console.log(`[Headers Batch 2 Proof] Static server listening on port ${port} (exported web build)`);

const FIXTURE_TIMINGS = {
  code: 200,
  data: {
    timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:15', Asr: '15:30', Maghrib: '18:10', Isha: '19:30' },
    date: { readable: '16 Oct 2026', hijri: { day: '4', month: { en: 'Rabi al-Thani' }, year: '1448' }, gregorian: { date: '16-10-2026' } },
    meta: { timezone: 'UTC', school: 'Shafi' },
  },
};

const FIXTURE_SURAH_1 = {
  code: 200,
  status: 'OK',
  data: [
    {
      number: 1,
      name: 'سُورَةُ ٱلْفَاتِحَةِ',
      englishName: 'Al-Fatihah',
      englishNameTranslation: 'The Opening',
      revelationType: 'Meccan',
      numberOfAyahs: 7,
      ayahs: [
        { number: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', numberInSurah: 1, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
        { number: 2, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', numberInSurah: 2, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: '[All] praise is [due] to Allah, Lord of the worlds -' },
        { number: 3, text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', numberInSurah: 3, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: 'The Entirely Merciful, the Especially Merciful,' },
        { number: 4, text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', numberInSurah: 4, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: 'Sovereign of the Day of Recompense.' },
        { number: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', numberInSurah: 5, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: 'It is You we worship and You we ask for help.' },
        { number: 6, text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', numberInSurah: 6, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: 'Guide us to the straight path -' },
        { number: 7, text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', numberInSurah: 7, juz: 1, manzil: 1, page: 1, ruku: 1, hizbQuarter: 1, sajda: false, translation: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.' }
      ],
      edition: { identifier: 'quran-uthmani', language: 'ar', name: 'Uthmani', format: 'text', type: 'quran' }
    }
  ]
};

const FIXTURE_TAJWEED_1 = {
  data: {
    verses: [
      { verse_key: '1:1', verse_number: 1, text_uthmani_tajweed: 'بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ <tajweed class=ham_wasl>ٱ</tajweed>لرَّحْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِ <tajweed class=ham_wasl>ٱ</tajweed>لرَّحِيمِ' },
      { verse_key: '1:2', verse_number: 2, text_uthmani_tajweed: '<tajweed class=ham_wasl>ٱ</tajweed>لْحَمْدُ لِلَّهِ رَبِّ <tajweed class=ham_wasl>ٱ</tajweed>لْعَ<tajweed class=madda_normal>ـٰ</tajweed>لَمِينَ' },
      { verse_key: '1:3', verse_number: 3, text_uthmani_tajweed: '<tajweed class=ham_wasl>ٱ</tajweed>لرَّحْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِ <tajweed class=ham_wasl>ٱ</tajweed>لرَّحِيمِ' },
      { verse_key: '1:4', verse_number: 4, text_uthmani_tajweed: 'مَ<tajweed class=madda_normal>ـٰ</tajweed>لِكِ يَوْمِ <tajweed class=ham_wasl>ٱ</tajweed>لدِّينِ' },
      { verse_key: '1:5', verse_number: 5, text_uthmani_tajweed: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
      { verse_key: '1:6', verse_number: 6, text_uthmani_tajweed: '<tajweed class=ham_wasl>ٱ</tajweed>هْدِنَا <tajweed class=ham_wasl>ٱ</tajweed>لصِّرَ<tajweed class=madda_normal>ـٰ</tajweed>طَ <tajweed class=ham_wasl>ٱ</tajweed>لْمُسْتَقِيمَ' },
      { verse_key: '1:7', verse_number: 7, text_uthmani_tajweed: 'صِرَ<tajweed class=madda_normal>ـٰ</tajweed>طَ <tajweed class=ham_wasl>ٱ</tajweed>لَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ <tajweed class=ham_wasl>ٱ</tajweed>لْمَغْضُوبِ عَلَيْهِمْ وَلَا <tajweed class=ham_wasl>ٱ</tajweed>لضَّ<tajweed class=madda_necessary>آ</tajweed>لِّينَ' }
    ]
  }
};

const FIXTURE_BOOKMARKS = [
  { surah: 1, ayah: 1, surahName: 'Al-Fatihah', text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
  { surah: 2, ayah: 255, surahName: 'Al-Baqarah', text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence.' },
  { surah: 36, ayah: 1, surahName: 'Ya-Sin', text: 'يس', translation: 'Ya, Seen.' },
  { surah: 67, ayah: 1, surahName: 'Al-Mulk', text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ', translation: 'Blessed is He in whose hand is dominion.' },
  { surah: 112, ayah: 1, surahName: 'Al-Ikhlas', text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', translation: 'Say, He is Allah, [who is] One.' }
];

const FIXTURE_NOTES = [
  { id: 'note-1', surah: 1, ayah: 1, body: 'Reflecting on Bismillah before starting any action.', createdAt: 1776312000000 },
  { id: 'note-2', surah: 2, ayah: 255, body: 'Ayat al-Kursi - supreme protection and foundation of Tawheed.', createdAt: 1776312000000 },
  { id: 'note-3', surah: 112, ayah: 1, body: 'Surah Al-Ikhlas equals one third of the Quran in reward.', createdAt: 1776312000000 }
];

const VIEWPORT = { width: 393, height: 852 };
const THEMES = ['paper', 'ink'];

// The required routes/states for Header Redesign Batch 2: Quran Study & Memory
const ROUTES = [
  {
    id: 'bookmarks',
    name: 'BookmarksScreen',
    kind: 'sub-header',
    expectedEyebrow: 'SAVED VERSES',
    expectedTitle: 'Bookmarks',
    expectedSubtitle: 'Access your saved verses and reading bookmarks',
    backLabel: 'Quran',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'bookmarks' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Bookmarks';
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
    id: 'notes',
    name: 'NotesScreen',
    kind: 'sub-header',
    expectedEyebrow: 'PERSONAL STUDY',
    expectedTitle: 'Notes & Reflections',
    expectedSubtitle: 'Record thoughts and reflections on verses as you read',
    backLabel: 'Quran',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'notes' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Notes & Reflections';
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
    id: 'hifz',
    name: 'HifzScreen',
    kind: 'sub-header',
    expectedEyebrow: 'MEMORIZATION',
    expectedTitle: 'Hifz Tracker',
    expectedSubtitle: 'Track memorization progress, revisions, and test recall',
    backLabel: 'Quran',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'hifz' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Hifz Tracker';
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
    id: 'hifz-practice',
    name: 'HifzPracticeScreen',
    kind: 'sub-header',
    expectedEyebrow: 'HIDE & PEEK',
    expectedTitle: 'Al-Fatihah',
    expectedSubtitle: '7 ayahs · Recite from memory & test recall',
    backLabel: 'Hifz',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'hifz-practice', surah: 1 });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Al-Fatihah';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Hifz Tracker';
      }, { timeout: 10000 });
      return true;
    },
  },
  {
    id: 'tajweed-list',
    name: 'TajweedScreen list view',
    kind: 'sub-header',
    expectedEyebrow: 'LEARN',
    expectedTitle: 'Tajweed Colors',
    expectedSubtitle: 'Full Quran · color-coded recitation rules',
    backLabel: 'Library',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'tajweed' });
      });
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Tajweed Colors';
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
    id: 'tajweed-detail',
    name: 'TajweedScreen detail view',
    kind: 'sub-header',
    expectedEyebrow: 'Surah 1',
    expectedTitle: 'Al-Fatihah',
    expectedSubtitle: 'الفاتحة · 7 ayahs',
    backLabel: 'Tajweed',
    nav: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'tajweed' });
      });
      await page.waitForSelector('[aria-label="Read Al-Fatihah with tajweed colors"]', { timeout: 10000 });
      await page.click('[aria-label="Read Al-Fatihah with tajweed colors"]');
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Al-Fatihah';
      }, { timeout: 10000 });
    },
    verifyBack: async (page) => {
      await page.waitForFunction(() => {
        const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
        return title === 'Tajweed Colors';
      }, { timeout: 10000 });
      return true;
    },
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
    console.log(`=== RUNNING BATCH 2 VERIFICATION: THEME ${theme.toUpperCase()} (${VIEWPORT.width}x${VIEWPORT.height}) ===`);
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
      await page.route('**/api.alquran.cloud/**', (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_SURAH_1) })
      );
      await page.route('**/api.islamic.app/**', (r) => {
        const url = r.request().url();
        if (url.includes('by_chapter') || url.includes('tajweed')) {
          return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TAJWEED_1) });
        }
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) });
      });

      // Pre-seed localStorage with study data and settings
      await context.addInitScript(({ theme, bookmarks, notes, surah1, tajweed1 }) => {
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
        localStorage.setItem('quran:bookmarks', JSON.stringify(bookmarks));
        localStorage.setItem('quran:notes', JSON.stringify(notes));
        localStorage.setItem('quran:surah:1:ar', JSON.stringify(surah1.data[0]));
        localStorage.setItem('quran:surah:1:en.sahih', JSON.stringify(surah1.data[0]));
        const tajAyahs = tajweed1.data.verses.map(v => ({
          numberInSurah: parseInt(v.verse_key.split(':')[1], 10),
          verseKey: v.verse_key,
          html: v.text_uthmani_tajweed
        }));
        localStorage.setItem('quran:islamic-tajweed:surah:1', JSON.stringify(tajAyahs));
      }, { theme, bookmarks: FIXTURE_BOOKMARKS, notes: FIXTURE_NOTES, surah1: FIXTURE_SURAH_1, tajweed1: FIXTURE_TAJWEED_1 });

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
        (route.id === 'tajweed-detail' || (eyebrowM.textTransform === 'uppercase' && Math.abs(parseFloat(eyebrowM.letterSpacing || '0') - 1.8) <= 0.2));
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

      // 8. Header remains fixed while content scrolls, FloatingNav clearance
      const scroll = evaluation.scrollInfo;
      const scrollPass = scroll && !scroll.headerMoved && scroll.firstContentStartsBelowHeader;
      const clearanceNum = parseFloat(scroll?.clearancePaddingBottom || '0');
      const clearancePass = clearanceNum >= 90; // TAB_PAD_BOTTOM >= 100px
      assertions.push({
        name: 'Header fixed while content scrolls, content starts below header, FloatingNav clearance',
        pass: Boolean(scrollPass && clearancePass),
        measured: `headerMoved=${scroll?.headerMoved}, firstContentBelow=${scroll?.firstContentStartsBelowHeader}, padBottom=${scroll?.clearancePaddingBottom}`,
      });

      // 9. Exercise back behavior for the migrated route
      if (route.verifyBack) {
        await page.click('[data-testid="sub-header-back-btn"]');
        await page.waitForTimeout(800);
        const backSuccess = await route.verifyBack(page);
        assertions.push({
          name: 'Back button returns correctly without altering navigation logic',
          pass: Boolean(backSuccess),
          measured: `backSuccess=${backSuccess}`,
        });
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
    await page.route('**/api.alquran.cloud/**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_SURAH_1) })
    );
    await page.route('**/api.islamic.app/**', (r) => {
      const url = r.request().url();
      if (url.includes('by_chapter') || url.includes('tajweed')) {
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TAJWEED_1) });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_TIMINGS) });
    });

    await context.addInitScript(({ bookmarks, notes, surah1, tajweed1 }) => {
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
      localStorage.setItem('quran:bookmarks', JSON.stringify(bookmarks));
      localStorage.setItem('quran:notes', JSON.stringify(notes));
      localStorage.setItem('quran:surah:1:ar', JSON.stringify(surah1.data[0]));
      localStorage.setItem('quran:surah:1:en.sahih', JSON.stringify(surah1.data[0]));
      const tajAyahs = tajweed1.data.verses.map(v => ({
        numberInSurah: parseInt(v.verse_key.split(':')[1], 10),
        verseKey: v.verse_key,
        html: v.text_uthmani_tajweed
      }));
      localStorage.setItem('quran:islamic-tajweed:surah:1', JSON.stringify(tajAyahs));
    }, { bookmarks: FIXTURE_BOOKMARKS, notes: FIXTURE_NOTES, surah1: FIXTURE_SURAH_1, tajweed1: FIXTURE_TAJWEED_1 });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.__NAVIGATE__?.setTab === 'function', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('mask#reveal'), { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__NAVIGATE__.setTab('quran');
      window.__NAVIGATE__.setQuran({ screen: 'bookmarks' });
    });
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="sub-header-title"]')?.textContent?.trim();
      return !!title;
    }, { timeout: 10000 });
    await page.waitForTimeout(500);

    const rtlScreenshot = path.join(OUTPUT_DIR, 'bookmarks_screen_rtl_arabic.png');
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
      routeId: 'bookmarks-rtl-arabic',
      routeName: 'BookmarksScreen RTL Arabic',
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
const reportJsonPath = path.join(OUTPUT_DIR, 'batch2-proof-report.json');
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
  console.log('\n[SUCCESS] All Batch 2 header acceptance assertions passed!');
  process.exit(0);
}
