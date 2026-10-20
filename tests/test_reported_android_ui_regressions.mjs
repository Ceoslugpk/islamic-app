import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import ts from 'typescript';

function load(file, modules) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    assert.ok(name in modules, 'Unexpected import: ' + name);
    return modules[name];
  }, module, module.exports);
  return module.exports;
}
function elements(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(elements)];
}

const native = {
  Platform: { OS: 'android' },
  StyleSheet: { create: (s) => s },
  View: 'View', TouchableOpacity: 'TouchableOpacity',
  Animated: { View: 'AnimatedView', Value: class { constructor(value) { this.value = value; } } },
  useWindowDimensions: () => ({ width: 393, height: 852 }),
};
const tokens = load('src/lib/homeThemeTokens.ts', { 'react-native': native });
let mode = 'paper';
const theme = { useTheme: () => ({ mode }), getCardShadow: tokens.getCardShadow };
const { SystemBarBackgrounds } = load('src/components/layout/SystemBarBackgrounds.tsx', {
  react: React, 'react-native': native, '../../lib/theme': theme, '../../lib/homeThemeTokens': tokens,
});
for (mode of ['paper', 'ink']) {
  for (const [topInset, bottomInset] of [[0, 0], [24, 48], [28, 24], [44, 0]]) {
    const bars = elements(SystemBarBackgrounds({ topInset, bottomInset })).filter((e) => e.props?.testID);
    assert.equal(bars.length, Number(topInset > 0) + Number(bottomInset > 0));
    for (const bar of bars) {
      const style = Object.assign({}, ...bar.props.style);
      const top = bar.props.testID.includes('status');
      assert.equal(style.height, top ? topInset : bottomInset);
      assert.equal(style.backgroundColor, top ? tokens.HOME_THEME_TOKENS[mode].bgTop : tokens.HOME_THEME_TOKENS[mode].bgBottom);
      assert.match(style.backgroundColor, /^#[0-9a-f]{6}$/i, 'System bars must have opaque surfaces');
      assert.equal(style.position, 'absolute', 'Bar protection must not add duplicate inset spacing');
      assert.equal(style[top ? 'top' : 'bottom'], 0);
      assert.equal(bar.props.pointerEvents, 'none');
      assert.equal(bar.props.accessible, false);
      assert.ok(style.zIndex > 100);
    }
  }
}
console.log('✓ Actual system-bar component covers status/navigation insets in both themes without consuming layout');

const { OfflineBanner } = load('src/components/OfflineBanner.tsx', {
  react: React, 'react-native': native,
  '@expo/vector-icons': { Ionicons: 'Icon' },
  '../lib/theme': { useTheme: () => ({ colors: { accentDim: '#eee', borderSubtle: '#aaa', accent: '#105A4B' } }) },
  '../lib/strings': { offlineUsingSavedData: () => 'Offline' },
  '../lib/i18n': { t: (key) => key },
  './ui/AppText': { AppText: 'AppText' },
});
for (const inset of [0, 24, 44]) {
  const banner = OfflineBanner({ topInset: inset });
  const style = Object.assign({}, ...banner.props.style);
  const text = elements(banner).find((element) => element.type === 'AppText');
  assert.equal(text?.props?.children, 'Offline', 'OfflineBanner must execute the lazy saved-data string export');
  assert.equal(style.paddingTop, 6 + inset, 'Offline text stays below the system-bar surface');
  assert.equal(style.paddingTop + style.paddingVertical + style.marginBottom, 12, 'Offline notice must not duplicate the following screen top inset');
}

const storage = new Map();
let legacy = null;
const mapped = [];
const service = load('src/lib/continuing.ts', {
  '@react-native-async-storage/async-storage': {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => storage.set(key, value),
    removeItem: async (key) => storage.delete(key),
  },
  './surahAyahCounts': { SURAH_AYAH_COUNTS: [7, 286, ...Array(112).fill(200)] },
  './quran': { getMushafPageForAyah: (surah, ayah) => { mapped.push([surah, ayah]); return 293; } },
  './db': { loadLastReadPosition: () => legacy },
});
assert.equal(await service.getContinueReadingPosition(), null);
legacy = { surah: 18, ayah: 5, page: 293, updatedAt: 123 };
assert.deepEqual(await service.getContinueReadingPosition(), { surah: 18, ayah: 5, page: 293, savedAt: 123 });
legacy = { surah: 18, ayah: 5, updatedAt: 124 };
assert.equal((await service.getContinueReadingPosition()).page, 293);
assert.deepEqual(mapped.at(-1), [18, 5]);
legacy = { surah: 115, ayah: 1 };
assert.equal(await service.getContinueReadingPosition(), null, 'Invalid legacy data must not open an invalid reader target');
legacy = { surah: 18, ayah: 5, page: 293, updatedAt: 123 };
await service.saveReadingPosition(2, 255, 42);
assert.equal((await service.getContinueReadingPosition()).surah, 2);
await service.saveReadingMarker(36, 58, 443);
assert.equal((await service.getContinueReadingPosition()).surah, 36);
await service.clearReadingMarker();
assert.equal((await service.getContinueReadingPosition()).surah, 2);
await service.clearReadingPosition();
assert.equal((await service.getContinueReadingPosition()).surah, 18);
console.log('✓ Production reading service resumes legacy records and preserves manual-marker/automatic-position priority');

let latest = async () => null;
let cached = null;
const hookReact = {
  ...React,
  memo: (component) => component,
  useState: (initial) => [initial === null ? cached : typeof initial === 'function' ? initial() : initial, () => {}],
  useMemo: (factory) => factory(), useCallback: (callback) => callback,
  useRef: (value) => ({ current: value }), useEffect: () => {},
};
const { ContinueReadingCard } = load('src/components/ContinueReadingCard.tsx', {
  react: hookReact, 'react-native': native,
  './ui/AppText': { AppText: 'AppText' },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  '../lib/theme': theme,
  '../lib/haptics': { useHaptics: () => ({ haptic: () => {} }) },
  '../lib/continuing': { getContinueReadingPosition: () => latest(), addReadingPositionListener: () => () => {} },
  '../lib/surahNamesLocalized': { getLocalizedSurahName: (_n, name) => name },
  '../lib/surahs114': { SURAHS_114: [{ number: 1, englishName: 'Al-Fatihah', numberOfAyahs: 7 }] },
  './GeometricPattern': { GeometricPattern: 'Pattern' },
  'expo-linear-gradient': { LinearGradient: 'Gradient' },
  '../lib/constants': tokens,
  '../lib/i18n': { isRTL: () => false, t: (key) => key },
});
async function pressCard(reader = true) {
  const calls = [];
  const card = ContinueReadingCard({
    onOpenReader: reader ? (...args) => calls.push(['reader', ...args]) : undefined,
    onOpenQuranTab: () => calls.push(['hub']),
  });
  const button = elements(card).find((e) => e.type === 'TouchableOpacity');
  await button.props.onPress();
  return calls;
}
assert.deepEqual(await pressCard(), [['reader', 1, 1, 1]], 'No saved position must open the first reader page rather than the Quran hub');
latest = async () => ({ surah: 18, ayah: 5, page: 293 });
assert.deepEqual(await pressCard(), [['reader', 18, 5, 293]]);
latest = async () => { throw new Error('Storage unavailable'); };
assert.deepEqual(await pressCard(), [['reader', 1, 1, 1]]);
cached = { surah: 2, ayah: 255, page: 42 };
assert.deepEqual(await pressCard(), [['reader', 2, 255, 42]]);
cached = null;
latest = async () => null;
assert.deepEqual(await pressCard(false), [['hub']], 'Optional hub fallback applies only when no reader callback exists');
console.log('✓ Actual Home card press opens the reader for saved, empty, cached, and failed-storage cases');
