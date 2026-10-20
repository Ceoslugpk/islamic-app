import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const I18N_SOURCE = process.env.I18N_LAYOUT_CONTRACT_SOURCE || path.join(ROOT, 'src/lib/i18n.ts');

function compileI18n(sourcePath, requireMap, documentElement) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(requireMap, id)) return requireMap[id];
    throw new Error(`Unexpected import while executing ${sourcePath}: ${id}`);
  };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
    document: { documentElement },
  });
  return module.exports;
}

function loadRealI18n({ platform, syncLanguage }) {
  const runtime = {
    language: 'en',
    syncCache: syncLanguage ? { 'app-language': { language: syncLanguage } } : {},
    nativeCalls: [],
  };
  const documentElement = { dir: '', lang: '' };
  const storage = {
    async getItem(key) {
      assert.equal(key, 'islamic-settings');
      return null;
    },
    async setItem(key) {
      assert.equal(key, 'islamic-settings');
    },
  };
  const i18nextInstance = {
    language: 'en',
    use() { return this; },
    init(options) {
      this.language = options.lng;
      runtime.language = options.lng;
      return this;
    },
    changeLanguage(language) {
      this.language = language;
      runtime.language = language;
    },
    t(key) { return key; },
  };
  const i18next = {
    __esModule: true,
    default: i18nextInstance,
    use: () => i18nextInstance,
    init: (options) => i18nextInstance.init(options),
    changeLanguage: (language) => i18nextInstance.changeLanguage(language),
    t: (key) => i18nextInstance.t(key),
  };
  const nativeDirection = {
    isRTL: false,
    allowRTL(value) { runtime.nativeCalls.push(['allowRTL', value]); },
    forceRTL(value) {
      runtime.nativeCalls.push(['forceRTL', value]);
      this.isRTL = value;
    },
  };
  const reactNative = { I18nManager: nativeDirection, Platform: { OS: platform } };
  const locales = {
    en: { __esModule: true, default: {} },
    ur: { __esModule: true, default: {} },
    ar: { __esModule: true, default: {} },
    hi: { __esModule: true, default: {} },
    ml: { __esModule: true, default: {} },
    si: { __esModule: true, default: {} },
    bn: { __esModule: true, default: {} },
    ms: { __esModule: true, default: {} },
    ta: { __esModule: true, default: {} },
    id: { __esModule: true, default: {} },
    ps: { __esModule: true, default: {} },
  };
  const module = compileI18n(I18N_SOURCE, {
    i18next,
    'react-i18next': { initReactI18next: {}, useTranslation: () => ({ i18n: i18nextInstance, t: (key) => key }) },
    'expo-localization': { getLocales: () => [{ languageCode: 'en' }] },
    '@react-native-async-storage/async-storage': { __esModule: true, default: storage },
    'react-native': reactNative,
    './db': {
      loadQuranCache: (key) => runtime.syncCache[key] ?? null,
      saveQuranCache: (key, value) => { runtime.syncCache[key] = value; return true; },
    },
    ...Object.fromEntries(Object.entries(locales).map(([code, value]) => [`../locales/${code}.json`, value])),
  }, documentElement);
  return { module, runtime, documentElement };
}

export function assertRealI18nLayoutDirectionContract() {
  const web = loadRealI18n({ platform: 'web', syncLanguage: null });
  for (const language of ['ur', 'ar', 'en']) {
    web.module.prepareNativeLayoutDirection(language);
    const expectedDirection = ['ur', 'ar'].includes(language) ? 'rtl' : 'ltr';
    assert.deepEqual(web.runtime.nativeCalls, [], `${language} preparation must not call native RTL APIs after mount`);
    assert.deepEqual(
      [web.documentElement.dir, web.documentElement.lang],
      [expectedDirection, language],
      `${language} preparation must update the web direction and document language`
    );
    assert.equal(
      web.runtime.syncCache['app-language']?.language,
      language,
      `${language} preparation must stage the synchronous language mirror`
    );
  }

  const native = loadRealI18n({ platform: 'android', syncLanguage: 'ur' });
  const bootCalls = [['allowRTL', true], ['forceRTL', true]];
  assert.deepEqual(native.runtime.nativeCalls, bootCalls, 'native boot must apply direction exactly once from the mirror');
  native.module.applyRTL(true);
  assert.deepEqual(native.runtime.nativeCalls, bootCalls, 'repeated boot reconciliation must not write native direction again');
  for (const language of ['ur', 'ar', 'en']) {
    native.module.prepareNativeLayoutDirection(language);
    assert.deepEqual(native.runtime.nativeCalls, bootCalls, `${language} preparation must leave native direction unchanged`);
    assert.equal(native.runtime.syncCache['app-language']?.language, language);
  }
}
