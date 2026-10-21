import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-ayah-menu-'));

fs.writeFileSync(
  path.join(tempDir, 'stub-rn.mjs'),
  "export const Platform = { OS: 'android' };\n",
);
fs.writeFileSync(
  path.join(tempDir, 'stub-settings.mjs'),
  "export function useSettings() { return { settings: { hapticsEnabled: true } }; }\n",
);
fs.writeFileSync(
  path.join(tempDir, 'stub-haptics.mjs'),
  `
export const ImpactFeedbackStyle = { Light: 'light' };
export const NotificationFeedbackType = { Success: 'success', Warning: 'warning', Error: 'error' };
export const calls = [];
export function impactAsync() { calls.push('impact'); return Promise.resolve(); }
export function notificationAsync() { calls.push('notification'); return Promise.resolve(); }
export function selectionAsync() {
  calls.push('selection');
  return Promise.reject(new Error('haptics unavailable on this device'));
}
`,
);

const modulePath = compileEsmProductionModule({
  root: ROOT,
  tmpDir: tempDir,
  sourceRelativePath: 'src/lib/haptics.ts',
  source: fs.readFileSync(path.join(ROOT, 'src/lib/haptics.ts'), 'utf8'),
  outputName: 'haptics.mjs',
  replacements: [
    ["from 'react-native'", "from './stub-rn.mjs'"],
    ["from 'expo-haptics'", "from './stub-haptics.mjs'"],
    ["from './settings'", "from './stub-settings.mjs'"],
  ],
});

const haptics = await import(pathToFileURL(modulePath).href);
const expoHaptics = await import(pathToFileURL(path.join(tempDir, 'stub-haptics.mjs')).href);

const unhandledRejections = [];
const onUnhandledRejection = (reason) => unhandledRejections.push(reason);
process.on('unhandledRejection', onUnhandledRejection);
try {
  const { haptic } = haptics.useHaptics();
  haptic('selection');
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(expoHaptics.calls, ['selection'], 'the real haptics module must invoke selection feedback');
  assert.equal(
    unhandledRejections.length,
    0,
    'a rejected native selection feedback promise must not become an unhandled rejection/crash',
  );
} finally {
  process.off('unhandledRejection', onUnhandledRejection);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('v1.1.95 ayah-menu haptics rejection test passed');

// Execute the real QuranReaderScreen component with a small hook/native harness
// so the selected-ayah Play callback is exercised, rather than copied here.
const readerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-reader-menu-'));
const readerSourcePath = path.join(ROOT, 'src/screens/QuranReaderScreen.tsx');
const readerSource = fs.readFileSync(readerSourcePath, 'utf8');
const readerSourceFile = ts.createSourceFile(
  'QuranReaderScreen.tsx',
  readerSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const readerCap = {
  callbacks: [], effects: [], states: [], setCalls: [], refEntries: [], stateCount: 0,
  stateOverrides: new Map([[39, true], [40, 1], [41, 1]]),
};
const READER_STUB = new Proxy(function () { return READER_STUB; }, {
  get(target, property) {
    if (property === 'then') return undefined;
    if (property === Symbol.toPrimitive) return () => '';
    if (property === Symbol.iterator) return function* () {};
    if (property === 'toString') return () => '';
    if (property === 'valueOf') return () => 0;
    if (typeof property === 'symbol') return undefined;
    return READER_STUB;
  },
  apply() { return READER_STUB; },
  construct() { return READER_STUB; },
});
const stopCalls = [];
const readerOverrides = {
  '../lib/theme': { useTheme: () => ({ colors: READER_STUB }) },
  '../theme/tokens': { useThemeTokens: () => ({ tokens: READER_STUB, mode: 'ink' }), getBrandLogoSource: () => null },
  '../lib/settings': {
    useSettings: () => ({
      settings: {
        quranScript: 'uthmani',
        quranFontSize: 24,
        quranLineHeight: 1.8,
        quranShowTranslation: false,
        quranArabicFont: 'amiri',
        tafsirSourceId: 'jalalayn',
        language: 'en',
        hapticsEnabled: true,
        quranGoal: { type: 'minutes', target: 15 },
      },
      setQuranFontSize: () => {}, setQuranLineHeight: () => {}, setQuranShowTranslation: () => {},
      setTafsirSourceId: () => {}, setQuranScript: () => {},
    }),
    clampQuranLineHeight: (value) => value,
    QURAN_FONT_SIZE_DEFAULT: 24,
    QURAN_FONT_SIZE_MIN: 12,
    QURAN_FONT_SIZE_MAX: 48,
    QURAN_FONT_SIZE_STEP: 1,
    QURAN_LINE_HEIGHT_MIN: 1.2,
    QURAN_LINE_HEIGHT_MAX: 3,
    QURAN_LINE_HEIGHT_STEP: 0.1,
    QURAN_LINE_HEIGHT_DEFAULT: 1.8,
  },
  '../lib/quranLanguageState': { useQuranLanguage: () => ({ language: 'en', setLanguage: () => {}, edition: { editionIdentifier: 'en.sahih', name: 'Sahih' }, flag: 'EN' }) },
  '../lib/i18n': { t: (key) => key, isRTL: () => false },
  '../lib/haptics': { useHaptics: () => ({ haptic: () => {} }) },
  '../lib/quran': {
    fetchSurah: async () => null, fetchAyahTafsir: async () => ({ text: '', edition: '' }), fetchMushafPage: async () => null,
    getMushafPageForAyah: () => 1, TOTAL_MUSHAF_PAGES: 604, getPrimarySurahForPage: () => 1,
    getBundledSurahs114: () => [],
  },
  '../lib/mushafRestoration': { resolveMushafRestorationTarget: () => null, calculateMushafScrollTarget: () => ({ isLayoutReady: false }) },
  '../lib/quranScripts': { QURAN_SCRIPTS: [{ id: 'uthmani', label: 'Uthmani' }], fetchSurahWithScript: async () => null, getScriptCacheKey: () => 'script' },
  '../lib/tafsirSources': { TAFSIR_SOURCES: [{ id: 'jalalayn', identifier: 'jalalayn', name: 'Jalalayn' }] },
  '../lib/surahAyahCounts': { SURAH_AYAH_COUNTS: [7] },
  '../lib/db': {
    loadQuranCache: () => null, saveQuranCache: () => true, loadAudioSettings: () => ({}), saveAudioSettings: () => {},
    saveLastReadPosition: () => {}, saveRecentlyPlayed: () => {},
  },
  '../lib/continuing': {
    getReadingMarkerSync: () => null, getReadingPositionSync: () => null, getReadingMarker: async () => null,
    getReadingPosition: async () => null, saveReadingPosition: () => {}, saveReadingMarker: async () => true,
    clearReadingMarker: async () => true, addReadingPositionListener: () => () => {},
  },
  '../lib/quranAudio': {
    addPlaybackStatusListener: () => () => {}, fetchReciters: async () => [], getAyahAudioUrl: () => 'ayah.mp3',
    getCurrentPlayback: () => null, getReciterCountry: () => '', getSurahAudioUrl: () => 'surah.mp3', getSurahBitrate: () => 128,
    playAyah: async () => {}, playSurah: async () => {}, stop: () => { stopCalls.push(true); return Promise.reject(new Error('audio stop failed')); },
  },
  '../lib/study': { addBookmark: () => true, getBookmarks: () => [], isBookmarked: () => false, removeBookmark: () => true, addNote: () => true },
  '../lib/quranPreloader': { preloadRemainingSurahsForEdition: () => {} },
  '../lib/recentSurahs': { recordSurahVisit: () => {} },
  '../lib/surahDownloads': { isSurahDownloaded: () => false, getSurahBitrate: () => 128, getDownloadedSurahs: () => [], formatBytes: (value) => String(value), downloadSurah: async () => null, removeSurahDownload: async () => {} },
  '../lib/quranLayoutCache': { configureQuranLayoutStorage: () => {}, recordAyahLayout: () => {}, recordHeaderLayout: () => {}, getCachedOrEstimatedOffset: () => ({ offset: 0 }), flushAyahLayoutCache: () => {}, getQuranLayoutCacheKey: () => 'layout' },
  '../lib/quranProgress': { recordQuranReadingSession: async () => {} },
  '../lib/typography': { detectScriptFromContent: () => 'arabic', MIN_SCRIPT_MULTIPLIERS: { arabic: 1.8, urdu: 2.2 } },
  '../components/ArabicText': { ArabicText: READER_STUB, AyahText: READER_STUB, QURAN_FONT_FAMILIES: { amiri: { regular: 'Amiri', bold: 'AmiriBold' } } },
  '../lib/tajweed': { stripTajweedHtml: (value) => value },
  '../lib/strings': { retry: () => 'Retry', cancel: () => 'Cancel', remove: () => 'Remove', surahLoadFailed: () => 'failed', tafsirLoadFailed: () => 'failed', downloadFailedTitle: () => 'failed', downloadFailedBody: () => 'failed' },
  '../lib/iconMap': { getBackIcon: () => 'chevron-back', getForwardIcon: () => 'chevron-forward' },
  '../lib/homeThemeTokens': { getCardShadow: () => ({}), getFloatingCardShadow: () => ({}), getPillShadow: () => ({}) },
  '../components/layout/layout.constants': { TAB_PAD_BOTTOM: () => 16, NAV_TOP: () => 16 },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
};

const importInfos = readerSourceFile.statements
  .filter((statement) => ts.isImportDeclaration(statement))
  .map((statement) => {
    const clause = statement.importClause;
    const names = [];
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) names.push(element.name.text);
    }
    return { spec: statement.moduleSpecifier.text, names };
  });

fs.writeFileSync(path.join(readerDir, 'react.mjs'), `
const cap = globalThis.__ayahReaderCap;
export const useRef = (value) => { const ref = { current: value }; cap.refEntries.push({ ref, initial: value }); return ref; };
export const useState = (initial) => {
  const index = ++cap.stateCount;
  let value = cap.stateOverrides.has(index) ? cap.stateOverrides.get(index) : (typeof initial === 'function' ? initial() : initial);
  const setter = (next) => { value = typeof next === 'function' ? next(value) : next; cap.setCalls.push([setter, value]); };
  cap.states.push({ index, get value() { return value; }, setter });
  return [value, setter];
};
export const useCallback = (fn) => { cap.callbacks.push(fn); return fn; };
export const useMemo = (fn) => { try { return fn(); } catch { return globalThis.__ayahReaderStub; } };
export const useEffect = (fn) => { cap.effects.push(fn); };
export const createElement = (type, props, ...children) => ({ type, props: props || {}, children });
export const useContext = () => globalThis.__ayahReaderStub;
export const memo = (value) => value;
export default { createElement };
`);
fs.writeFileSync(path.join(readerDir, 'react-native.mjs'), `
const noop = () => null;
export const ActivityIndicator = noop; export const Alert = { alert: noop };
export const Animated = { Value: class { constructor(value) { this.value = value; } }, timing: () => ({ start: noop }), sequence: () => ({ start: noop }), spring: () => ({ start: noop }) };
export const BackHandler = { addEventListener: () => ({ remove: noop }) }; export const Clipboard = { setString: noop };
export const FlatList = noop; export const Image = noop; export const InteractionManager = { runAfterInteractions: noop };
export const Keyboard = { addListener: () => ({ remove: noop }), dismiss: noop }; export const KeyboardAvoidingView = noop;
export const Modal = noop; export const Platform = { OS: 'android', select: (styles) => styles.android ?? styles.default };
export const ScrollView = noop; export const Share = { share: async () => {} };
export const StyleSheet = { create: (value) => value, hairlineWidth: 1, flatten: (value) => value };
export const Text = noop; export const TextInput = noop; export const TouchableOpacity = noop; export const TouchableWithoutFeedback = noop; export const View = noop;
export const useWindowDimensions = () => ({ width: 390, height: 844 });
export default {};
`);
globalThis.__ayahReaderCap = readerCap;
globalThis.__ayahReaderStub = READER_STUB;
globalThis.__ayahReaderGet = (spec, name) => readerOverrides[spec]?.[name] ?? READER_STUB;

for (const { spec, names } of importInfos) {
  let target;
  if (spec === 'react') target = path.join(readerDir, 'react.mjs');
  else if (spec === 'react-native') target = path.join(readerDir, 'react-native.mjs');
  else {
    target = path.join(readerDir, `stub-${importInfos.indexOf(importInfos.find((item) => item.spec === spec))}.mjs`);
    fs.writeFileSync(target, `${[...new Set(names)].map((name) => `export const ${name} = globalThis.__ayahReaderGet(${JSON.stringify(spec)}, ${JSON.stringify(name)});`).join('\n')}\nexport default globalThis.__ayahReaderStub;\n`);
  }
  readerSource.replaceAll(`from '${spec}'`, `from '${target}'`);
}
let transpiledReader = ts.transpileModule(readerSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  fileName: readerSourcePath,
}).outputText;
for (const { spec } of importInfos) {
  const index = importInfos.findIndex((item) => item.spec === spec);
  const target = spec === 'react' ? path.join(readerDir, 'react.mjs') : spec === 'react-native' ? path.join(readerDir, 'react-native.mjs') : path.join(readerDir, `stub-${index}.mjs`);
  transpiledReader = transpiledReader.split(`from '${spec}'`).join(`from '${target}'`);
}
const readerModulePath = path.join(readerDir, 'QuranReaderScreen.mjs');
fs.writeFileSync(readerModulePath, transpiledReader);

const readerModule = await import(pathToFileURL(readerModulePath).href);
readerCap.stateCount = 0;
readerCap.states.length = 0;
readerCap.callbacks.length = 0;
readerCap.effects.length = 0;
readerCap.setCalls.length = 0;
readerCap.refEntries.length = 0;
try { readerModule.default({ surahNumber: 1 }); } catch {}

assert.equal(typeof readerModule.getMushafSelectedToolbarTop, 'function', 'the reader must expose finite toolbar-position normalization');
assert.equal(typeof readerModule.normalizeMushafLayout, 'function', 'the reader must validate native layout measurements before caching them');
assert.equal(readerModule.normalizeMushafLayout(Number.NaN, 44), null, 'NaN layout coordinates must be rejected');
assert.deepEqual(
  JSON.parse(JSON.stringify(readerModule.normalizeMushafLayout(12, 40))),
  { y: 12, height: 40 },
  'finite positive native layout measurements must be preserved',
);
assert.equal(
  readerModule.getMushafSelectedToolbarTop(Number.NaN, Number.POSITIVE_INFINITY),
  48,
  'invalid layout values must fall back to the finite default toolbar position',
);

const pageChangeEffect = readerCap.effects.find((effect) => String(effect).includes('lastPageRef.current'));
assert.equal(typeof pageChangeEffect, 'function', 'the real reader must register a page-change selection cleanup effect');
for (const { ref, initial } of readerCap.refEntries) {
  if (initial === 1) ref.current = 2;
}
pageChangeEffect();
assert.ok(readerCap.setCalls.some(([, value]) => value === null), 'page changes must close a selected ayah before the next page lays out');
const emptyLayoutRefs = readerCap.refEntries.filter(({ initial }) =>
  initial && typeof initial === 'object' && Object.keys(initial).length === 0 &&
  // plain objects only: a page-layout map is `{}`. A Promise ref (e.g. the progress write queue
  // added in v1.1.96) also has zero keys and must NOT be expected to reset on a page change.
  Object.getPrototypeOf(initial) === Object.prototype);
assert.equal(emptyLayoutRefs.length, 4, 'the reader must own four page-layout maps');
assert.ok(emptyLayoutRefs.every(({ ref, initial }) => ref.current !== initial), 'page changes must discard all stale page-layout maps');

const playCallback = readerCap.callbacks.find((callback) => String(callback).includes('getAyahAudioUrl'));
assert.equal(typeof playCallback, 'function', 'the real reader must expose its ayah-play callback through the hook harness');

const unhandledAudioRejections = [];
const onUnhandledAudioRejection = (reason) => unhandledAudioRejections.push(reason);
process.on('unhandledRejection', onUnhandledAudioRejection);
try {
  playCallback(1, 1, 'Al-Fatihah');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stopCalls.length, 1, 'the selected-current ayah action must attempt to stop playback');
  assert.equal(
    unhandledAudioRejections.length,
    0,
    'a rejected stop operation from the selected ayah Play action must be caught before it reaches the runtime',
  );
} finally {
  process.off('unhandledRejection', onUnhandledAudioRejection);
  fs.rmSync(readerDir, { recursive: true, force: true });
}

console.log('v1.1.95 selected-ayah Play rejection test passed');
