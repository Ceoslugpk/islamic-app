import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

function flatten(style) {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

function transpile(relativePath) {
  return ts.transpileModule(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
}

function loadModule(relativePath, mocks) {
  const runtimeModule = { exports: {} };
  const requireFromProduction = (specifier) => {
    assert.ok(specifier in mocks, `Unexpected production import from ${relativePath}: ${specifier}`);
    return mocks[specifier];
  };
  new Function('require', 'module', 'exports', transpile(relativePath))(
    requireFromProduction,
    runtimeModule,
    runtimeModule.exports,
  );
  return runtimeModule.exports;
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...(props || {}),
      children: children.length <= 1 ? children[0] : children,
    },
  };
}

function findNode(root, predicate) {
  if (!root) return undefined;
  if (Array.isArray(root)) {
    for (const child of root) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof root !== 'object') return undefined;
  if (predicate(root)) return root;
  return findNode(root.props?.children, predicate);
}

let currentLanguage = 'ur';
const translations = new Map([
  ['Fajr', 'فجر'],
  ['Sunrise', 'طلوع آفتاب'],
  ['Dhuhr', 'ظہر'],
  ['Asr', 'عصر'],
  ['Maghrib', 'مغرب'],
  ['Isha', 'عشاء'],
]);

const React = {
  Fragment: 'Fragment',
  createElement,
  memo: (component) => component,
  useEffect: () => undefined,
  useRef: (value) => ({ current: value }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
};

const colors = {
  accent: '#b8862f',
  accentDim: '#eadcbf',
  bgBase: '#fff',
  bgSurface: '#fff',
  borderSubtle: '#ddd',
  destructive: '#c00',
  textMuted: '#777',
  textPrimary: '#111',
  textSecondary: '#555',
};
const themeTokens = {
  paper: { bgTop: '#fff', cardBorder: '#ddd' },
  ink: { bgTop: '#111', cardBorder: '#555' },
};
const fontRoles = {
  arabicNoto: 'NotoNaskhArabic_400Regular',
  arabicNotoBold: 'NotoNaskhArabic_700Bold',
  arabic: 'Amiri_400Regular',
  title: 'InstrumentSerif_400Regular',
  titleRtl: 'NotoNaskhArabic_700Bold',
  titleFallback: 'InstrumentSerif_400Regular',
  eyebrow: 'Manrope_600SemiBold',
  eyebrowFallback: 'Manrope_600SemiBold',
  subtitle: 'Manrope_400Regular',
  ui: 'Manrope_400Regular',
};
const native = {
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false) },
  Animated: {},
  Easing: {},
  Platform: { OS: 'android' },
  StyleSheet: { create: (styles) => styles, flatten },
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
};
const theme = { useTheme: () => ({ mode: 'paper', colors, tokens: colors }) };
const i18n = {
  getCurrentLanguage: () => currentLanguage,
  isRTL: () => ['ur', 'ar', 'ps'].includes(currentLanguage),
  t: (key) => translations.get(key) ?? key,
};
const typography = loadModule('src/lib/typography.ts', {});
const appText = { AppText: 'AppText' };
const diagnostic = { useAutoProbe: () => ({}) };

const inputField = loadModule('src/components/ui/InputField.tsx', {
  react: React,
  'react-native': native,
  '../../lib/theme': theme,
  '../../theme/tokens': { themeTokens, fontRoles },
  '../../lib/i18n': i18n,
  '../../lib/typography': typography,
  '../../lib/diagnostic': diagnostic,
  './AppText': appText,
}).InputField;
const searchField = loadModule('src/components/ui/SearchField.tsx', {
  react: React,
  'react-native': native,
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '../../lib/theme': theme,
  '../../theme/tokens': { themeTokens, fontRoles },
  '../../lib/i18n': i18n,
  '../../lib/typography': typography,
  '../../lib/diagnostic': diagnostic,
}).SearchField;
const compactPrayerBar = loadModule('src/components/CompactPrayerBar.tsx', {
  react: React,
  'react-native': native,
  '../lib/theme': theme,
  '../lib/homeThemeTokens': {
    HOME_THEME_TOKENS: {
      paper: { cardTop: '#fff', cardBorder: '#ddd' },
      ink: { cardTop: '#111', cardBorder: '#555' },
    },
    getPillShadow: () => ({}),
  },
  '../lib/i18n': i18n,
  '../lib/typography': typography,
  './ui/AppText': appText,
  './PrayerCountdown': { PrayerCountdown: 'PrayerCountdown' },
}).CompactPrayerBar;
const prayerTimeline = loadModule('src/components/PrayerTimeline.tsx', {
  react: React,
  'react-native': native,
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '../lib/theme': theme,
  './Card': { Card: 'Card' },
  './Hairline': { Hairline: 'Hairline' },
  '../lib/timeFormat': { formatTime: (hm, format) => format === '24h' ? hm : '5:30 AM' },
  '../lib/i18n': i18n,
  '../lib/typography': typography,
  './ui/AppText': appText,
}).PrayerTimeline;

function assertAlignment(node, expected, label) {
  assert.ok(node, `${label} must render a production node`);
  const style = flatten(node.props.style);
  assert.deepEqual(
    { textAlign: style.textAlign, writingDirection: style.writingDirection },
    expected,
    `${label} must use the shared production alignment contract`,
  );
}

const inputUrdu = inputField({ label: 'عنوان', value: 'اردو', helperText: 'مدد', placeholder: 'تلاش' });
assertAlignment(findNode(inputUrdu, (node) => node.type === 'TextInput'), { textAlign: 'right', writingDirection: 'rtl' }, 'InputField Urdu input');
assertAlignment(findNode(inputUrdu, (node) => node.type === 'AppText' && node.props.children === 'عنوان'), { textAlign: 'right', writingDirection: 'rtl' }, 'InputField Urdu label');
assertAlignment(findNode(inputUrdu, (node) => node.type === 'AppText' && node.props.children === 'مدد'), { textAlign: 'right', writingDirection: 'rtl' }, 'InputField Urdu helper');

const searchLatin = searchField({ value: 'Prayer', onChangeText: () => {} });
assertAlignment(findNode(searchLatin, (node) => node.type === 'TextInput'), { textAlign: 'right', writingDirection: 'ltr' }, 'SearchField Latin text in Urdu');

const compact = compactPrayerBar({ prayerName: 'Fajr', prayerTime: '5:30 AM' });
assertAlignment(findNode(compact, (node) => node.props?.testID === 'compact-prayer-bar-name'), { textAlign: 'right', writingDirection: 'rtl' }, 'CompactPrayerBar Urdu prayer name');
assertAlignment(findNode(compact, (node) => node.props?.testID === 'compact-prayer-bar-time'), { textAlign: 'right', writingDirection: 'ltr' }, 'CompactPrayerBar numeric time in Urdu');

const timeline = prayerTimeline({
  timings: { Fajr: '05:30', Sunrise: '06:45', Dhuhr: '12:30', Asr: '15:30', Maghrib: '18:30', Isha: '20:00' },
  completed: {},
  onTogglePrayer: () => {},
  currentPrayerSegment: null,
  progressFraction: 0,
  timeFormat: '12h',
  streak: 0,
});
assertAlignment(findNode(timeline, (node) => node.type === 'AppText' && node.props.children === 'فجر'), { textAlign: 'right', writingDirection: 'rtl' }, 'PrayerTimeline Urdu label');
assertAlignment(findNode(timeline, (node) => node.type === 'AppText' && node.props.children === '5:30 AM'), { textAlign: 'right', writingDirection: 'ltr' }, 'PrayerTimeline numeric time in Urdu');

currentLanguage = 'en';
const inputEnglish = inputField({ label: 'Title', value: 'Prayer', helperText: 'Help' });
assertAlignment(findNode(inputEnglish, (node) => node.type === 'TextInput'), { textAlign: 'left', writingDirection: 'ltr' }, 'InputField English input');

console.log('PASS: production UI call sites emit shared Urdu/LTR alignment styles');
