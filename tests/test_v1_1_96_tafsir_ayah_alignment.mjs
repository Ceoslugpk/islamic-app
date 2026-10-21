import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(ROOT, 'src/screens/TafsirScreen.tsx');
const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
  fileName: sourcePath,
}).outputText;

const module = { exports: {} };
const tokens = new Proxy({}, { get: () => '#ffffff' });
const react = {
  __esModule: true,
  default: { createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }) },
  useCallback: (callback) => callback,
  useEffect: () => {},
  useRef: (value) => ({ current: value }),
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
};
const imports = {
  react,
  'react-native': {
    BackHandler: { addEventListener: () => ({ remove: () => {} }) },
    FlatList: 'FlatList', Modal: 'Modal', StyleSheet: { create: (styles) => styles },
    TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    View: 'View', useWindowDimensions: () => ({ width: 390, height: 844 }),
  },
  '../components/ui/AppText': { AppText: 'AppText' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '../theme/tokens': { useThemeTokens: () => ({ tokens, mode: 'ink' }), cardTokens: {} },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  '../lib/homeThemeTokens': { getCardShadow: () => ({}) },
  '../components/layout/layout.constants': { TAB_PAD_BOTTOM: () => 0 },
  '../lib/i18n': { isRTL: () => false, t: (value) => value },
  '../lib/surahNamesLocalized': {
    getLocalizedSurahName: (_number, fallback) => fallback,
    normalizeSearchText: (value) => value,
  },
  '../components/layout/SubHeader': { SubHeader: 'SubHeader' },
  '../components/layout/DetailScreen': { DetailScreen: 'DetailScreen' },
  '../components/ArabicText': { ArabicText: 'ArabicText' },
  '../components/Hairline': { Hairline: 'Hairline' },
  '../components/Skeleton': { SkeletonCard: 'SkeletonCard' },
  '../components/EmptyState': { EmptyState: 'EmptyState' },
  '../lib/quran': { fetchSurah: async () => null, fetchSurahList: async () => [], fetchSurahTafsir: async () => [] },
  '../lib/settings': { useSettings: () => ({ settings: { tafsirSourceId: 'default' }, setTafsirSourceId: () => {} }) },
  '../lib/tafsirSources': { TAFSIR_SOURCES: [{ id: 'default', identifier: 'ar.jalalayn', languageCode: 'ar', language: 'Arabic', name: 'Jalalayn' }] },
  '../lib/rtl': { isRtlScript: () => false },
};
const localRequire = (id) => {
  assert.ok(Object.prototype.hasOwnProperty.call(imports, id), `Unexpected import: ${id}`);
  return imports[id];
};
new Function('module', 'exports', 'require', output)(module, module.exports, localRequire);

const { buildTafsirDisplayItems } = module.exports;
assert.equal(typeof buildTafsirDisplayItems, 'function', 'TafsirScreen must expose its production row mapper');

const detail = {
  ayahs: [
    { numberInSurah: 1, text: 'Arabic one' },
    { numberInSurah: 2, text: 'Arabic two' },
    { numberInSurah: 3, text: 'Arabic three' },
  ],
};
const sparseTafsir = [
  { ayahNumber: 1, text: 'Tafsir one' },
  { ayahNumber: 3, text: 'Tafsir three' },
];
assert.deepEqual(buildTafsirDisplayItems(detail, sparseTafsir), [
  { ayahNumber: 1, arabicText: 'Arabic one', text: 'Tafsir one' },
  { ayahNumber: 2, arabicText: 'Arabic two', text: null },
  { ayahNumber: 3, arabicText: 'Arabic three', text: 'Tafsir three' },
], 'a missing tafsir ayah must be represented explicitly, not filled from its neighbour');

const mismatched = buildTafsirDisplayItems(detail, [
  { ayahNumber: 3, text: 'Tafsir three' },
]);
assert.equal(mismatched.find((row) => row.ayahNumber === 3).arabicText, 'Arabic three', 'Arabic must match by ayah number');
assert.equal(mismatched.find((row) => row.ayahNumber === 2).text, null, 'missing source entry must not borrow ayah 3 commentary');

const extraTafsir = buildTafsirDisplayItems(detail, [
  { ayahNumber: 4, text: 'Orphan commentary' },
]);
assert.deepEqual(extraTafsir.at(-1), { ayahNumber: 4, arabicText: null, text: 'Orphan commentary' }, 'mismatched source entries must remain explicit');

console.log('v1.1.96 Tafsir ayah-alignment production test passed');
