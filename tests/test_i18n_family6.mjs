import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const localeDir = path.join(root, 'src', 'locales');
const calls = [];
let currentLanguage = 'en';
let currentPlatform = 'web';
const channelCalls = [];
const categoryCalls = [];

const locale = Object.fromEntries(
  ['en', 'ur', 'ar'].map((name) => [name, JSON.parse(fs.readFileSync(path.join(localeDir, `${name}.json`), 'utf8'))]),
);

const translated = (key) => locale[currentLanguage][key] ?? key;
const t = (key) => {
  calls.push(String(key));
  return translated(String(key));
};

const component = () => null;
const React = {
  Fragment: 'Fragment',
  createElement: () => null,
  createContext: (value) => ({ Provider: component, Consumer: component, _currentValue: value }),
  useContext: (context) => context._currentValue,
  forwardRef: (fn) => fn,
  memo: (value) => value,
  useCallback: (fn) => fn,
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value }),
  useState: (value) => [value, () => {}],
};

const Platform = {
  get OS() {
    return currentPlatform;
  },
  select: (values) => values[currentPlatform] ?? values.default,
};

const ReactNative = new Proxy({
  Appearance: { getColorScheme: () => 'light', addChangeListener: () => ({ remove() {} }) },
  Linking: { openURL: async () => {} },
  Platform,
  StyleSheet: { create: (styles) => styles, flatten: (styles) => styles, hairlineWidth: 1, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}, { get(target, property) {
  return target[property] ?? component;
} });

const Notifications = {
  AndroidImportance: { HIGH: 4, LOW: 2, DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidNotificationPriority: { HIGH: 1 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  setNotificationHandler: () => {},
  setNotificationCategoryAsync: async (...args) => { categoryCalls.push(args); },
  setNotificationChannelAsync: async (...args) => { channelCalls.push(args); },
  dismissNotificationAsync: async () => {},
  dismissAllNotificationsAsync: async () => {},
  scheduleNotificationAsync: async () => 'notification-id',
  cancelScheduledNotificationAsync: async () => {},
  getAllScheduledNotificationsAsync: async () => [],
};

const quranAudioMock = {
  addPlaybackStatusListener: () => () => {},
  addSoundCreatedListener: () => () => {},
  CurrentPlayback: {},
  getCurrentAudioPlayer: () => null,
  getCurrentPlayback: () => null,
  getPlaybackStatus: () => ({ isPlaying: false, positionMillis: 0, durationMillis: 0 }),
  getRate: () => 1,
  subscribeToPlayback: () => () => {},
  pausePlayback: async () => {},
  resumePlayback: async () => {},
  seekPlayback: async () => {},
  playNext: async () => {},
  playPrevious: async () => {},
  skipToNext: async () => {},
  skipToPrevious: async () => {},
  stopPlayback: async () => {},
  pause: async () => {},
  resume: async () => {},
  seekTo: async () => {},
  stop: async () => {},
};

const moduleMocks = new Map([
  ['react', React],
  ['react-native', ReactNative],
  ['@expo/vector-icons', { Ionicons: component, MaterialCommunityIcons: component }],
  ['expo-linear-gradient', { LinearGradient: component }],
  ['expo-notifications', Notifications],
  ['expo-file-system/legacy', {
    cacheDirectory: '/tmp/',
    EncodingType: { Base64: 'base64' },
    getInfoAsync: async () => ({ exists: false }),
    downloadAsync: async () => ({ uri: '/tmp/audio' }),
    deleteAsync: async () => {},
    readAsStringAsync: async () => '',
    writeAsStringAsync: async () => {},
  }],
]);

function fallbackModule(request) {
  if (request.endsWith('/lib/i18n')) return { t, getCurrentLanguage: () => currentLanguage };
  if (request.endsWith('/lib/quranAudio')) return quranAudioMock;
  if (request.endsWith('/lib/db')) return { getDatabase: () => null };
  if (request.endsWith('/lib/quran')) return { getSurahByNumber: () => null };
  if (request.endsWith('/lib/tajweed')) return { TAJWEED_SCRIPT_ID: 'tajweed' };
  if (request.endsWith('/lib/settings')) return { getSetting: async () => null };
  if (request.endsWith('/components/UndoToast')) return { withUndoToast: (value) => value };
  if (request.endsWith('/components/NowPlayingBar')) return { NowPlayingBar: component };
  if (request.endsWith('/components/ResponsiveContainer')) return { ResponsiveContainer: component };
  if (request.endsWith('/components/SectionHeader')) return { SectionHeader: component };
  if (request.endsWith('/components/ScreenHeader')) return { ScreenHeader: component };
  if (request.endsWith('/components/PressableScale')) return { PressableScale: component };
  if (request.endsWith('/components/AdBanner')) return { AdBanner: component };
  if (request.endsWith('/lib/rtl')) return { isRTL: () => false };
  if (request.endsWith('/lib/dateKey')) return { getLocalDateKey: () => '2026-01-01' };
  if (request.endsWith('/lib/undoToast')) return { pushUndoToast: () => {}, useUndoToast: () => ({ saveUndoState: () => {} }), withUndoToast: (value) => value };
  if (request.endsWith('/theme/tokens')) return { spacing: {}, radii: {}, typography: {}, colors: {}, fontRoles: {}, cardTokens: {}, useThemeTokens: () => ({ tokens: {} }) };
  if (request.endsWith('/lib/homeThemeTokens')) return { getCardShadow: () => ({}), getPillShadow: () => ({}) };
  if (request.endsWith('/lib/haptics')) return { useHaptics: () => ({ impact: () => {}, notification: () => {} }) };
  return new Proxy({}, { get: () => component });
}

function resolveModule(request, fromFile) {
  if (!request.startsWith('.')) return request;
  const base = path.resolve(path.dirname(fromFile), request);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return request;
}

function loadReal(relativePath, loadLocal = true) {
  const entry = path.join(root, relativePath);
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const source = fs.readFileSync(absolute, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
      fileName: absolute,
    }).outputText;
    const module = { exports: {} };
    cache.set(absolute, module);
    const require = (request) => {
      const resolved = resolveModule(request, absolute);
      if (resolved.endsWith('/src/lib/i18n.ts') || resolved.endsWith('/src/lib/i18n.tsx')) return { t, getCurrentLanguage: () => currentLanguage };
      if (resolved.endsWith('/src/lib/settings.ts') || resolved.endsWith('/src/lib/settings.tsx')) return { getSetting: async () => null };
      if (resolved.endsWith('/src/lib/db.ts') || resolved.endsWith('/src/lib/db.native.ts')) return { getDatabase: () => null };
      if (resolved.endsWith('/src/lib/quran.ts')) return { getSurahByNumber: () => null };
      if (resolved.endsWith('/src/lib/tajweed.ts')) return { TAJWEED_SCRIPT_ID: 'tajweed' };
      if (resolved.endsWith('/src/lib/quranAudio.ts')) return quranAudioMock;
      if (moduleMocks.has(resolved)) return moduleMocks.get(resolved);
      if (moduleMocks.has(request)) return moduleMocks.get(request);
      if (!loadLocal && resolved.startsWith(path.join(root, 'src'))) return fallbackModule(request);
      if (resolved.endsWith('.ts') || resolved.endsWith('.tsx') || resolved.endsWith('.js')) return load(resolved);
      return fallbackModule(request);
    };
    new Function('require', 'module', 'exports', output)(require, module, module.exports);
    return module.exports;
  }
  return load(entry);
}

const tasbih = loadReal('src/screens/TasbihScreen.tsx');
const quranAudioScreen = loadReal('src/screens/QuranAudioScreen.tsx', false);
const quranScripts = loadReal('src/lib/quranScripts.ts');
const systemMedia = loadReal('src/lib/systemMediaAdapter.ts');
const nowPlaying = loadReal('src/lib/nowPlayingNotification.ts');

// ---- continuation family (family 6b): topics / quranTopics / notifications ----
const topics = loadReal('src/lib/topics.ts');
const quranTopics = loadReal('src/lib/quranTopics.ts');
const notifications = loadReal('src/lib/notifications.ts', false);
const umrahResources = loadReal('src/screens/UmrahResourcesScreen.tsx', false);
const umrahGuide = loadReal('src/screens/UmrahGuideScreen.tsx', false);

const topicKeys = [];
for (const topic of topics.TOPICS) {
  for (const field of ['title', 'summary', 'reference']) topicKeys.push(topic[field]);
}
const quranTopicVerseKeys = quranTopics.QURAN_TOPICS.flatMap((topic) => topic.verses.map((verse) => verse.translation));
const quranTopicTitleKeys = quranTopics.QURAN_TOPICS.map((topic) => topic.title);
const quranTopicDescriptionKeys = quranTopics.QURAN_TOPICS.map((topic) => topic.description);

// Rendered-through-t() Umrah keys, derived from the real exported data (family 1 exported them for tests).
const umrahResourceKeys = [
  ...umrahResources.PACKING_ITEMS.flatMap((row) => [row.category, row.item, row.note]),
  ...umrahResources.RECOMMENDED_BOOKS.flatMap((row) => [row.title, row.author, row.focus, row.description]),
  ...umrahResources.COMMON_MISTAKES.flatMap((row) => [row.topic, row.mistake, row.correctAction]),
  ...umrahResources.FIRST_TIMER_TIPS.flatMap((row) => [row.title, row.detail]),
];
const umrahGuideKeys = umrahGuide.UMRAH_STEPS.flatMap((step) => [
  step.title,
  step.stageName,
  step.description,
  step.location,
  ...step.keyActions,
  ...(step.duas ? step.duas.flatMap((dua) => [dua.title, dua.translation]) : []),
  ...(step.criticalNotes ? step.criticalNotes : []),
]);

const continuationExtraKeys = [
  'Your Location',
  'Fajr (tomorrow)',
  'ASSALAM O ALAIKUM',
  'Set up your\nlanguages',
  'Choose how you read and listen.',
  'Step',
  'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep... Whoever recites Ayat al-Kursi after every obligatory prayer, nothing will prevent him from entering Paradise except death.',
];

const continuationKeys = [
  ...topicKeys,
  ...quranTopicVerseKeys,
  ...continuationExtraKeys,
];
for (const topic of quranTopics.QURAN_TOPICS) {
  continuationKeys.push(topic.title, topic.description);
}

const expectedNewKeys = [
  'Madinah mushaf (default)',
  'Modern Arabic spelling',
  'South Asia conventions',
  'Colored recitation rules (islamic.app)',
  'Quran Reciter',
  'The Noble Quran · القران الكريم',
  'Quran Audio Player',
  'Media playback and lock screen controls',
  'Media playback controls for Quran audio',
  'Choose your preferred UI language',
  'APP LANGUAGE',
  'Search language...',
  'Choose translation recitation language',
  'AUDIO TRANSLATION',
  'Search audio translation...',
];

const quickQueueKeys = [
  'Al-Faatiha 1:1',
  'Ya-Sin (36)',
  'Al-Mulk (67)',
  'Ar-Rahman (55)',
  'Al-Waqi’ah (56)',
  'Al-Kahf (18)',
  'Al-Baqarah (2)',
];
expectedNewKeys.push(...quickQueueKeys);

const tasbihKeys = tasbih.DHIKR_PRESETS.map((item) => item.meaning);
for (const language of ['ur', 'ar']) {
  currentLanguage = language;
  const before = calls.length;
  const meanings = tasbih.DHIKR_PRESETS.map((item) => tasbih.getLocalizedDhikrMeaning(item));
  assert.equal(calls.length - before, tasbihKeys.length);
  assert.deepEqual(meanings, tasbih.DHIKR_PRESETS.map((item) => locale[language][item.meaning]));
}

currentLanguage = 'en';
const descriptionKeys = quranScripts.QURAN_SCRIPTS.map((item) => item.description);
assert.deepEqual(descriptionKeys, [
  'Madinah mushaf (default)',
  'Modern Arabic spelling',
  'South Asia conventions',
  'Colored recitation rules (islamic.app)',
]);
const descriptionCalls = calls.length;
quranScripts.QURAN_SCRIPTS.forEach((item) => void item.description);
assert.deepEqual(calls.slice(descriptionCalls), descriptionKeys);
const labelKeys = ['Uthmani', 'Imlaei', 'Indo-Pak', 'Tajweed'];
const labelCalls = calls.length;
assert.deepEqual(quranScripts.QURAN_SCRIPTS.map((item) => item.label), labelKeys);
assert.deepEqual(calls.slice(labelCalls), labelKeys);

const quickQueueCalls = calls.length;
assert.deepEqual(quickQueueKeys.map((key) => quranAudioScreen.getLocalizedQuickQueueLabel(key)), quickQueueKeys);
assert.deepEqual(calls.slice(quickQueueCalls), quickQueueKeys);
const sampleTitleCalls = calls.length;
assert.equal(quranAudioScreen.getAudioSampleTitle(), 'Al-Faatiha 1:1');
assert.deepEqual(calls.slice(sampleTitleCalls), ['Al-Faatiha 1:1']);

const metadataFallback = systemMedia.formatNowPlayingMetadata(null);
assert.equal(metadataFallback.title, translated('The Holy Quran'));
assert.equal(metadataFallback.artist, translated('Quran Audio'));
assert.equal(metadataFallback.albumTitle, 'Islamic');
const metadataReciter = systemMedia.formatNowPlayingMetadata({
  surah: 1,
  ayah: 0,
  reciterName: '',
  isPlaying: true,
});
assert.equal(metadataReciter.artist, translated('Quran Reciter'));
assert.equal(metadataReciter.albumTitle, translated('The Noble Quran · القران الكريم'));

currentPlatform = 'android';
await systemMedia.ensureSystemMediaNotificationChannels();
assert.deepEqual(channelCalls.map(([id, value]) => [id, value.name, value.description]), [
  ['expo_audio_channel', translated('Quran Audio Player'), translated('Media playback and lock screen controls')],
  ['now-playing', translated('Now Playing'), translated('Media playback controls for Quran audio')],
]);

currentPlatform = 'windows';
await nowPlaying.startNowPlayingNotification();
const actionTitles = categoryCalls.flatMap(([, actions]) => actions.map((action) => action.buttonTitle));
assert.deepEqual(actionTitles, ['Previous', 'Pause', 'Next', 'Stop', 'Previous', 'Play', 'Next', 'Stop'].map(translated));

// ---- continuation family: topics.ts getters translate through t() ----
for (const language of ['ur', 'ar']) {
  currentLanguage = language;
  const before = calls.length;
  const rendered = topics.TOPICS.flatMap((topic) => [topic.title, topic.summary, topic.reference]);
  assert.equal(calls.length - before, topics.TOPICS.length * 3, 'topics.ts must route title/summary/reference through t()');
  assert.deepEqual(rendered, topicKeys.map((key) => locale[language][key]));
}

// ---- continuation family: quranTopics.ts verse translations translate through t() ----
for (const language of ['ur', 'ar']) {
  currentLanguage = language;
  const before = calls.length;
  const rendered = quranTopics.QURAN_TOPICS.flatMap((topic) => topic.verses.map((verse) => verse.translation));
  assert.equal(calls.length - before, quranTopicVerseKeys.length, 'quranTopics.ts must route every verse translation through t()');
  assert.deepEqual(rendered, quranTopicVerseKeys.map((key) => locale[language][key]));
}

// ---- continuation family: notifications.ts label/prayer-name reach t() ----
currentLanguage = 'ur';
calls.length = 0;
await notifications.schedulePrayerNotifications(
  { timings: { Fajr: '05:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '18:00', Isha: '19:30' } },
  15,
  undefined,
  { Fajr: { enabled: true, adhan: true, vibration: true }, Dhuhr: { enabled: true, adhan: true, vibration: true }, Asr: { enabled: true, adhan: true, vibration: true }, Maghrib: { enabled: true, adhan: true, vibration: true }, Isha: { enabled: true, adhan: true, vibration: true } },
);
assert.ok(calls.includes('Your Location'), 'notifications.ts must route the fallback location label through t()');

for (const key of [...new Set([...expectedNewKeys, ...tasbihKeys, ...descriptionKeys, ...labelKeys, 'The Holy Quran', 'Quran Audio', 'Now Playing', 'Previous', 'Pause', 'Next', 'Stop', 'Play'])]) {
  assert.ok(Object.hasOwn(locale.en, key), `missing en key: ${key}`);
  assert.ok(Object.hasOwn(locale.ur, key), `missing ur key: ${key}`);
  assert.ok(Object.hasOwn(locale.ar, key), `missing ar key: ${key}`);
}
for (const key of expectedNewKeys) {
  assert.notEqual(locale.en[key], locale.ur[key], `English fallback remains for Urdu: ${key}`);
  assert.notEqual(locale.en[key], locale.ar[key], `English fallback remains for Arabic: ${key}`);
}

// ---- continuation family key coverage ----
const continuationUnique = [...new Set([...continuationKeys, ...umrahResourceKeys, ...umrahGuideKeys])];
for (const key of continuationUnique) {
  assert.ok(Object.hasOwn(locale.en, key), `missing en continuation key: ${key}`);
  assert.ok(Object.hasOwn(locale.ur, key), `missing ur continuation key: ${key}`);
  assert.ok(Object.hasOwn(locale.ar, key), `missing ar continuation key: ${key}`);
}
for (const key of ['Your Location', 'Fajr (tomorrow)', 'ASSALAM O ALAIKUM', 'Set up your\nlanguages', 'Choose how you read and listen.', ...quranTopicVerseKeys]) {
  assert.notEqual(locale.en[key], locale.ur[key], `English fallback remains for Urdu continuation key: ${key}`);
  assert.notEqual(locale.en[key], locale.ar[key], `English fallback remains for Arabic continuation key: ${key}`);
}
// These are the 65 keys added by this continuation pass; they must not leak into fallback locales.
// Keys that pre-existed in the locale files before this pass are excluded.
const preExistingKeys = new Set(['Prayer', 'Forgiveness', 'Gratitude', 'Step', 'Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.']);
const continuationNewKeys = [...new Set([...topicKeys, ...quranTopicVerseKeys, ...continuationExtraKeys])]
  .filter((key) => !preExistingKeys.has(key));

const localeFiles = fs.readdirSync(localeDir).filter((name) => name.endsWith('.json'));
for (const file of localeFiles.filter((name) => !['en.json', 'ur.json', 'ar.json'].includes(name))) {
  const values = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));
  for (const key of expectedNewKeys) assert.equal(Object.hasOwn(values, key), false, `${file} unexpectedly contains family 6 key: ${key}`);
  for (const key of continuationNewKeys) assert.equal(Object.hasOwn(values, key), false, `${file} unexpectedly contains family 6 continuation key: ${key}`);
}

console.log(`family6 real-source checks passed; t calls=${calls.length}; channels=${channelCalls.length}; categories=${categoryCalls.length}; continuation keys=${continuationUnique.length} (new=${continuationNewKeys.length})`);
