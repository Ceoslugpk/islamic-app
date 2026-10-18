import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const playwrightPath = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = await import(`file://${playwrightPath}/index.mjs`);

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('proof/color-batch-3b');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('=== BATCH 3B COLOR MIGRATION CONTRACT & SCREENSHOT SUITE ===');

// --- 1. Static Contract Checks ---
console.log('\n--- 1. Static File & Theming Contracts ---');

const batch3bScreens = [
  {
    id: 'hifz',
    name: 'HifzScreen',
    file: 'src/screens/HifzScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'hifz' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'hifz-practice',
    name: 'HifzPracticeScreen',
    file: 'src/screens/HifzPracticeScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'hifz-practice', surah: 1 });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'tajweed',
    name: 'TajweedScreen',
    file: 'src/screens/TajweedScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'tajweed' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'vocab',
    name: 'VocabTrainerScreen',
    file: 'src/screens/VocabTrainerScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('library');
        window.__NAVIGATE__.setLibrary({ screen: 'vocab' });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'tafsir',
    name: 'TafsirScreen',
    file: 'src/screens/TafsirScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'tafsir', surah: 1 });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'compare',
    name: 'TranslationCompareScreen',
    file: 'src/screens/TranslationCompareScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('quran');
        window.__NAVIGATE__.setQuran({ screen: 'compare', surah: 1, ayah: 1 });
      });
      await page.waitForTimeout(600);
    },
  },
  {
    id: 'summary',
    name: 'WeeklySummaryScreen',
    file: 'src/screens/WeeklySummaryScreen.tsx',
    navigate: async (page) => {
      await page.evaluate(() => {
        window.__NAVIGATE__.setTab('tools');
        window.__NAVIGATE__.setTools({ screen: 'summary' });
      });
      await page.waitForTimeout(600);
    },
  },
];

for (const s of batch3bScreens) {
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

// Deterministic mock fixtures for Quran network requests & cache seeding
const mockSurahList = [
  {
    number: 1,
    name: 'الفاتحة',
    englishName: 'Al-Faatiha',
    englishNameTranslation: 'The Opening',
    numberOfAyahs: 7,
    revelationType: 'Meccan',
  },
  {
    number: 2,
    name: 'البقرة',
    englishName: 'Al-Baqara',
    englishNameTranslation: 'The Cow',
    numberOfAyahs: 286,
    revelationType: 'Medinan',
  },
];

const mockSurah1AyahsArabic = [
  {
    number: 1,
    numberInSurah: 1,
    text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
  {
    number: 2,
    numberInSurah: 2,
    text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
  {
    number: 3,
    numberInSurah: 3,
    text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
  {
    number: 4,
    numberInSurah: 4,
    text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
  {
    number: 5,
    numberInSurah: 5,
    text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
  {
    number: 6,
    numberInSurah: 6,
    text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
  {
    number: 7,
    numberInSurah: 7,
    text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    juz: 1,
    page: 1,
    manzil: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  },
];

const mockSurah1AyahsTranslation = [
  {
    number: 1,
    numberInSurah: 1,
    text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
  },
  {
    number: 2,
    numberInSurah: 2,
    text: '[All] praise is [due] to Allah, Lord of the worlds -',
  },
  {
    number: 3,
    numberInSurah: 3,
    text: 'The Entirely Merciful, the Especially Merciful,',
  },
  {
    number: 4,
    numberInSurah: 4,
    text: 'Sovereign of the Day of Recompense.',
  },
  {
    number: 5,
    numberInSurah: 5,
    text: 'It is You we worship and You we ask for help.',
  },
  {
    number: 6,
    numberInSurah: 6,
    text: 'Guide us to the straight path -',
  },
  {
    number: 7,
    numberInSurah: 7,
    text: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
  },
];

const mockSurah1UthmaniData = {
  number: 1,
  name: 'الفاتحة',
  englishName: 'Al-Faatiha',
  englishNameTranslation: 'The Opening',
  revelationType: 'Meccan',
  numberOfAyahs: 7,
  ayahs: mockSurah1AyahsArabic,
  edition: {
    identifier: 'quran-uthmani',
    language: 'ar',
    name: 'Uthmani',
    format: 'text',
    type: 'quran',
  },
};

const mockSurah1TranslationData = {
  number: 1,
  name: 'الفاتحة',
  englishName: 'Al-Faatiha',
  englishNameTranslation: 'The Opening',
  revelationType: 'Meccan',
  numberOfAyahs: 7,
  ayahs: mockSurah1AyahsTranslation,
  edition: {
    identifier: 'en.sahih',
    language: 'en',
    name: 'Saheeh International',
    format: 'text',
    type: 'translation',
  },
};

const mockTafsirJalalaynData = {
  number: 1,
  name: 'الفاتحة',
  englishName: 'Al-Faatiha',
  englishNameTranslation: 'The Opening',
  revelationType: 'Meccan',
  numberOfAyahs: 7,
  ayahs: [
    {
      number: 1,
      numberInSurah: 1,
      text: '{ بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ } سورة الفاتحة مكية وهي سبع آيات بالبسملة إن كانت منها والسابعة صراط الذين أنعمت عليهم إلى آخرها',
    },
    {
      number: 2,
      numberInSurah: 2,
      text: '{ ٱلْحَمْدُ للَّهِ } جملة خبرية قصد بها الثناء على الله بمضمونها على أنه تعالى مالك لجميع الحمد من الخلق',
    },
    {
      number: 3,
      numberInSurah: 3,
      text: '{ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ } أي ذي الرحمة وهي إرادة الخير لأهله',
    },
    {
      number: 4,
      numberInSurah: 4,
      text: '{ مَـٰلِكِ يَوْمِ ٱلدِّينِ } أي الجزاء وهو يوم القيامة، وخص بالذكر لأنه لا ملك ظاهرا فيه لأحد إلا لله تعالى',
    },
    {
      number: 5,
      numberInSurah: 5,
      text: '{ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ } أي نخصك بالعبادة والتوكل ونطلب منك العون وحدك',
    },
    {
      number: 6,
      numberInSurah: 6,
      text: '{ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ } أي دلنا وأرشدنا إلى الطريق القويم وهو دين الإسلام',
    },
    {
      number: 7,
      numberInSurah: 7,
      text: '{ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ } بالهداية { غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ } وهم اليهود { وَلَا ٱلضَّآلِّينَ } وهم النصارى',
    },
  ],
  edition: {
    identifier: 'ar.jalalayn',
    language: 'ar',
    name: 'تفسير الجلالين',
    format: 'text',
    type: 'tafsir',
  },
};

const mockTafsirApiList = [
  { ayah: 1, text: 'In the Name of Allah, the Entirely Merciful, the Especially Merciful. Commentary on Ayah 1.' },
  { ayah: 2, text: 'All praise is due to Allah, Lord of the worlds. Commentary on Ayah 2.' },
  { ayah: 3, text: 'The Entirely Merciful, the Especially Merciful. Commentary on Ayah 3.' },
  { ayah: 4, text: 'Sovereign of the Day of Recompense. Commentary on Ayah 4.' },
  { ayah: 5, text: 'It is You we worship and You we ask for help. Commentary on Ayah 5.' },
  { ayah: 6, text: 'Guide us to the straight path. Commentary on Ayah 6.' },
  { ayah: 7, text: 'The path of those upon whom You have bestowed favor. Commentary on Ayah 7.' },
];

const mockAyahEditions = {
  code: 200,
  status: 'OK',
  data: [
    {
      number: 1,
      text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
      edition: { identifier: 'quran-uthmani', language: 'ar', name: 'Uthmani' },
    },
    {
      number: 1,
      text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
      edition: { identifier: 'en.sahih', language: 'en', name: 'Saheeh International' },
    },
    {
      number: 1,
      text: 'شروع اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے',
      edition: { identifier: 'ur.jalandhry', language: 'ur', name: 'Fateh Muhammad Jalandhry' },
    },
    {
      number: 1,
      text: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
      edition: { identifier: 'id.indonesian', language: 'id', name: 'Bahasa Indonesia' },
    },
  ],
};

const mockSurah1DetailObj = {
  number: 1,
  name: 'الفاتحة',
  englishName: 'Al-Faatiha',
  englishNameTranslation: 'The Opening',
  numberOfAyahs: 7,
  ayahs: mockSurah1AyahsArabic.map((a, i) => ({
    ...a,
    surah: { number: 1, name: 'الفاتحة', englishName: 'Al-Faatiha' },
    translation: mockSurah1AyahsTranslation[i]?.text,
  })),
};

const mockSurah1ArabicDetailObj = {
  ...mockSurah1DetailObj,
  ayahs: mockSurah1DetailObj.ayahs.map((a) => ({ ...a, translation: undefined })),
};

const mockTafsir1CachedList = mockTafsirJalalaynData.ayahs.map((a) => ({
  ayahNumber: a.numberInSurah,
  text: a.text,
}));

const interceptedUrls = new Set();

try {
  for (const theme of themes) {
    for (const s of batch3bScreens) {
      const context = await browser.newContext({
        viewport: { width: 393, height: 852 },
      });

      // Deterministic API interception tracing actual URLs from src/lib/quran.ts and src/lib/tafsirApi.ts
      await context.route('**api.alquran.cloud/**', async (route) => {
        const url = route.request().url();
        interceptedUrls.add(url);

        // 1. Single Ayah editions (TranslationCompareScreen: /ayah/:surah::ayah/editions/...)
        if (url.includes('/ayah/') && url.includes('/editions/')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAyahEditions),
          });
          return;
        }

        // 2. Surah multi-editions / single-edition (HifzPracticeScreen & TafsirScreen: /surah/:n/editions/...)
        if (url.includes('/surah/') && url.includes('/editions/')) {
          const isTranslation = url.includes('en.sahih');
          const data = isTranslation
            ? [mockSurah1UthmaniData, mockSurah1TranslationData]
            : [mockSurah1UthmaniData];
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 200, status: 'OK', data }),
          });
          return;
        }

        // 3. Surah Tafsir (TafsirScreen: /surah/1/ar.jalalayn or similar)
        if (url.includes('/surah/') && (url.includes('/ar.') || url.includes('jalalayn') || url.includes('/tafsir'))) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 200, status: 'OK', data: mockTafsirJalalaynData }),
          });
          return;
        }

        // 4. Surah list (/surah)
        if (url.endsWith('/surah') || url.includes('/surah?')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 200, status: 'OK', data: mockSurahList }),
          });
          return;
        }

        // 5. Default single surah (/surah/1)
        if (url.includes('/surah/1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 200, status: 'OK', data: mockSurah1UthmaniData }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, status: 'OK', data: {} }),
        });
      });

      // Intercept jsDelivr tafsir CDN if queried
      await context.route('**cdn.jsdelivr.net/**', async (route) => {
        const url = route.request().url();
        interceptedUrls.add(url);
        if (url.endsWith('/1.json')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockTafsirApiList),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: 'In the Name of Allah, the Entirely Merciful, the Especially Merciful.',
            author: 'Ibn Kathir',
            language: 'en',
          }),
        });
      });

      await context.addInitScript(
        ({
          theme,
          mockSurahList,
          mockSurah1ArabicDetailObj,
          mockSurah1DetailObj,
          mockTafsir1CachedList,
        }) => {
          localStorage.setItem('onboardingDone', 'true');
          localStorage.setItem('location-setup-dismissed-v1', 'true');
          localStorage.setItem(
            'islamic-settings',
            JSON.stringify({
              language: 'en',
              themeMode: theme,
              manualLocation: { latitude: 21.42, longitude: 39.83, city: 'Makkah', label: 'Makkah' },
              locationMode: 'manual',
              tafsirSourceId: 'jalalayn',
            })
          );
          // Seed database cache via salah-db:quran:* localStorage keys (as loaded by src/lib/db.ts)
          localStorage.setItem('salah-db:quran:surah-list', JSON.stringify(mockSurahList));
          localStorage.setItem('salah-db:quran:surah:1:ar', JSON.stringify(mockSurah1ArabicDetailObj));
          localStorage.setItem('salah-db:quran:surah:1:en.sahih', JSON.stringify(mockSurah1DetailObj));
          localStorage.setItem(
            'salah-db:quran:tafsir:surah:1:ar.jalalayn',
            JSON.stringify(mockTafsir1CachedList)
          );
        },
        {
          theme,
          mockSurahList,
          mockSurah1ArabicDetailObj,
          mockSurah1DetailObj,
          mockTafsir1CachedList,
        }
      );

      const page = await context.newPage();
      try {
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__NAVIGATE__, { timeout: 10000 });

        await s.navigate(page);

        // Wait for asynchronous data fetching and rendering to settle
        await page.waitForFunction(() => {
          const text = document.body.innerText || '';
          return (
            !text.includes('Loading surah text...') &&
            !text.includes('Loading...') &&
            !text.includes('Loading')
          );
        }, { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(500);

        // --- Visual Proof Assertions: Reject visible error/retry text, reject loading, require loaded content ---
        const screenContent = await page.evaluate(() => {
          return {
            innerText: document.body.innerText || '',
          };
        });

        // 1. Error / retry text assertions
        const visibleErrorPatterns = [
          /could not load/i,
          /couldn't load/i,
          /still could not load/i,
          /\bretry\b/i,
          /check your connection/i,
        ];
        for (const pattern of visibleErrorPatterns) {
          assert.ok(
            !pattern.test(screenContent.innerText),
            `[FAILURE] ${s.name} (${theme}) shows visible error/retry text matching ${pattern}:\n"${screenContent.innerText.slice(0, 300)}"`
          );
        }

        // 2. Loading state assertions
        assert.ok(
          !/loading surah text/i.test(screenContent.innerText),
          `[FAILURE] ${s.name} (${theme}) still shows loading text: "${screenContent.innerText.slice(0, 200)}"`
        );

        // 3. Screen-specific loaded content assertions
        if (s.id === 'hifz-practice') {
          assert.ok(
            screenContent.innerText.includes('Ayah 1 of 7') || screenContent.innerText.includes('1 of 7'),
            `[FAILURE] HifzPractice (${theme}) must show 'Ayah 1 of 7', got:\n"${screenContent.innerText.slice(0, 200)}"`
          );
          assert.ok(
            screenContent.innerText.includes('Peek'),
            `[FAILURE] HifzPractice (${theme}) must show 'Peek' action button`
          );
        } else if (s.id === 'tafsir') {
          assert.ok(
            screenContent.innerText.includes('Al-Faatiha') || screenContent.innerText.includes('الفاتحة'),
            `[FAILURE] Tafsir (${theme}) must show Surah 1 title`
          );
          assert.ok(
            screenContent.innerText.includes('Ayah 1'),
            `[FAILURE] Tafsir (${theme}) must show Ayah 1 badge`
          );
          assert.ok(
            screenContent.innerText.includes('سورة الفاتحة') || screenContent.innerText.includes('تفسير') || screenContent.innerText.includes('Tafsir al-Jalalayn'),
            `[FAILURE] Tafsir (${theme}) must contain non-empty route-specific tafsir text`
          );
        } else if (s.id === 'compare') {
          assert.ok(
            screenContent.innerText.includes('Al-Faatiha') || screenContent.innerText.includes('الفاتحة'),
            `[FAILURE] TranslationCompare (${theme}) must show Surah 1 title`
          );
          assert.ok(
            screenContent.innerText.includes('Entirely Merciful') || screenContent.innerText.includes('الرحمن'),
            `[FAILURE] TranslationCompare (${theme}) must show verse translation content`
          );
        } else if (s.id === 'hifz') {
          assert.ok(
            screenContent.innerText.includes('Hifz'),
            `[FAILURE] Hifz (${theme}) must show Hifz header`
          );
        } else if (s.id === 'tajweed') {
          assert.ok(
            screenContent.innerText.includes('Tajweed'),
            `[FAILURE] Tajweed (${theme}) must show Tajweed header`
          );
        } else if (s.id === 'vocab') {
          assert.ok(
            screenContent.innerText.includes('Vocabulary') || screenContent.innerText.includes('Quranic Vocabulary'),
            `[FAILURE] VocabTrainer (${theme}) must show Vocabulary header`
          );
        } else if (s.id === 'summary') {
          assert.ok(
            screenContent.innerText.includes('Weekly Summary'),
            `[FAILURE] WeeklySummary (${theme}) must show Weekly Summary header`
          );
        }

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
          path: `proof/color-batch-3b/${shotFileName}`,
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
  console.log(`Intercepted request URLs (${interceptedUrls.size}):`);
  for (const u of interceptedUrls) {
    console.log(`  - ${u}`);
  }

  const manifest = {
    batch: 'Batch 3B (7 screens: Hifz, HifzPractice, Tajweed, VocabTrainer, Tafsir, TranslationCompare, WeeklySummary)',
    timestamp: new Date().toISOString(),
    viewports: ['393x852'],
    themes: ['paper', 'ink'],
    totalScreenshots: filesOnDisk.length,
    interceptedUrls: Array.from(interceptedUrls),
    screens: batch3bScreens.map((s) => ({ id: s.id, name: s.name, file: s.file })),
    screenshots: manifestScreenshots,
    blocked: blockedScreens,
    status: blockedScreens.length === 0 ? 'PASS' : 'BLOCKED',
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
  console.log('ALL BATCH 3B COLOR CONTRACTS VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');
} finally {
  await browser.close();
  server.close();
}
