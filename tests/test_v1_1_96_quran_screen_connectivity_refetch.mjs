import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function compile(sourcePath, requireMap) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    assert.ok(Object.prototype.hasOwnProperty.call(requireMap, id), `Unexpected import: ${id}`);
    return requireMap[id];
  };
  new Function('module', 'exports', 'require', output)(module, module.exports, localRequire);
  return module.exports;
}

class HookEngine {
  constructor(component, props) {
    this.component = component;
    this.props = props;
    this.hooks = [];
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.needsRender = false;
    this.output = null;
  }

  useState(initial) {
    const index = this.hookIndex++;
    if (!this.hooks[index]) {
      this.hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
    }
    const state = this.hooks[index];
    return [state.value, (next) => {
      const value = typeof next === 'function' ? next(state.value) : next;
      if (!Object.is(value, state.value)) {
        state.value = value;
        this.needsRender = true;
      }
    }];
  }

  useRef(initial) {
    const index = this.hookIndex++;
    if (!this.hooks[index]) this.hooks[index] = { ref: { current: initial } };
    return this.hooks[index].ref;
  }

  useMemo(factory, deps) {
    const index = this.hookIndex++;
    const previous = this.hooks[index];
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
      this.hooks[index] = { deps, value: factory() };
    }
    return this.hooks[index].value;
  }

  useCallback(callback, deps) {
    return this.useMemo(() => callback, deps);
  }

  useEffect(effect, deps) {
    const index = this.hookIndex++;
    const previous = this.hooks[index];
    const changed = !previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]));
    this.hooks[index] = { deps, cleanup: previous?.cleanup };
    if (changed) this.pendingEffects.push({ index, effect });
  }

  render() {
    this.hookIndex = 0;
    this.pendingEffects = [];
    this.output = this.component(this.props);
    for (const { index, effect } of this.pendingEffects) {
      const previousCleanup = this.hooks[index].cleanup;
      previousCleanup?.();
      this.hooks[index].cleanup = effect();
    }
  }

  async settleAfterRender() {
    for (let pass = 0; pass < 12; pass += 1) {
      await Promise.resolve();
      await Promise.resolve();
      if (!this.needsRender) return;
      this.needsRender = false;
      this.render();
    }
    throw new Error('Hook engine did not settle; likely an effect/state loop');
  }
}

const reactBase = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...(props || {}), children: children.length <= 1 ? children[0] : children },
  }),
};
const dimensions = { width: 390, height: 844 };
const tokens = new Proxy({}, { get: () => '#ffffff' });
let refreshKey = 0;
let forcedFetches = 0;
let ordinaryFetches = 0;
const translate = (value) => value;
const surah = {
  number: 1,
  name: 'الفاتحة',
  englishName: 'Al-Fatihah',
  englishNameTranslation: 'The Opening',
  numberOfAyahs: 7,
  revelationType: 'Meccan',
};

let engine;
const react = {
  __esModule: true,
  default: reactBase,
  useState: (...args) => engine.useState(...args),
  useRef: (...args) => engine.useRef(...args),
  useMemo: (...args) => engine.useMemo(...args),
  useCallback: (...args) => engine.useCallback(...args),
  useEffect: (...args) => engine.useEffect(...args),
};

const quranScreen = compile(path.join(ROOT, 'src/screens/QuranScreen.tsx'), {
  react,
  'react-native': {
    FlatList: 'FlatList',
    RefreshControl: 'RefreshControl',
    ScrollView: 'ScrollView',
    StyleSheet: { create: (styles) => styles },
    TextInput: 'TextInput',
    TouchableOpacity: 'TouchableOpacity',
    useWindowDimensions: () => dimensions,
    View: 'View',
    Platform: { OS: 'android' },
  },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  'react-i18next': { useTranslation: () => ({ t: translate }) },
  '../theme/tokens': { fontRoles: { arabicNoto: 'arabic' }, useThemeTokens: () => ({ tokens, mode: 'ink' }) },
  '../lib/i18n': { isRTL: () => false },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  '../lib/homeThemeTokens': { getCardShadow: () => ({}), getPillShadow: () => ({}) },
  '../components/layout/layout.constants': { TAB_PAD_BOTTOM: () => 0 },
  '../lib/iconMap': { getForwardIcon: () => 'chevron-forward' },
  '../lib/quran': {
    fetchSurahList: (force) => {
      if (force) forcedFetches += 1;
      else ordinaryFetches += 1;
      return Promise.resolve([{ ...surah }]);
    },
    fetchSurahListForLanguage: () => Promise.resolve({}),
  },
  '../components/ArabicText': { ArabicText: 'ArabicText' },
  '../components/ui/AppText': { AppText: 'AppText' },
  '../components/layout/SubHeader': { SubHeader: 'SubHeader' },
  '../components/layout/DetailScreen': { DetailScreen: 'DetailScreen' },
  '../components/Hairline': { Hairline: 'Hairline' },
  '../lib/quranLanguageState': {
    useQuranLanguage: () => ({
      language: 'en',
      edition: { language: 'en', editionIdentifier: 'en.sahih', name: 'Sahih International' },
      flag: '🇬🇧',
    }),
  },
  '../components/QuranLanguageModal': { QuranLanguageModal: 'QuranLanguageModal' },
  '../lib/quranLanguages': {
    getLocalizedTranslatorName: (_id, name) => name,
    getLocalizedLanguageName: (language) => language,
  },
  '../lib/surahNamesLocalized': {
    getLocalizedSurahName: (_number, fallback) => fallback,
    getLocalizedLanguageName: (language) => language,
  },
  '../lib/useConnectivity': { useConnectivity: () => ({ refreshKey }) },
  '../components/Skeleton': { SurahSkeleton: 'SurahSkeleton', Skeleton: 'Skeleton' },
  '../lib/rtl': { hScrollRTLStyle: () => ({}) },
}).default;

engine = new HookEngine(quranScreen, { onOpenSurah: () => {} });
engine.render();
await engine.settleAfterRender();
assert.equal(ordinaryFetches, 1, 'the initial list load should run once');
assert.equal(forcedFetches, 0, 'no forced refresh should run before connectivity returns');

refreshKey = 1;
engine.render();
await engine.settleAfterRender();
assert.equal(forcedFetches, 1, 'one connectivity transition should force exactly one refresh');

engine.render();
await engine.settleAfterRender();
assert.equal(forcedFetches, 1, 'the same refreshKey must not refetch after its own state update');

refreshKey = 2;
engine.render();
await engine.settleAfterRender();
assert.equal(forcedFetches, 2, 'a later connectivity transition should force one additional refresh');

console.log('v1.1.96 QuranScreen connectivity-transition production test passed');
