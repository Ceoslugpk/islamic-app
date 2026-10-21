import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function reactMock() {
  const react = {
    createElement: () => null,
    useCallback: (fn) => fn,
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  };
  react.default = react;
  return react;
}

function loadReader() {
  const filename = path.join(ROOT, 'src/screens/QuranReaderScreen.tsx');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const react = reactMock();
  const rn = {
    Platform: { OS: 'android', select: (styles) => styles.android ?? styles.default },
    StyleSheet: { absoluteFill: {}, create: (styles) => styles, hairlineWidth: 0.5 },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
  const generic = new Proxy({}, {
    get: (_target, property) => property === '__esModule' ? true : (() => null),
  });
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => {
      if (request === 'react') return react;
      if (request === 'react-native') return rn;
      if (request === '../lib/quranLayoutCache') return { configureQuranLayoutStorage: () => {} };
      if (request === '../lib/quran') return { TOTAL_MUSHAF_PAGES: 604, getMushafPageForAyah: () => 1 };
      return generic;
    },
    console,
    Array,
    Date,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename });
  return moduleObject.exports;
}

const reader = loadReader();
assert.equal(typeof reader.getLoadedMushafAyah, 'function');

const page = {
  pageNumber: 221,
  ayahs: [
    { number: 1, numberInSurah: 107, surah: { number: 10 } },
    { number: 2, numberInSurah: 1, surah: { number: 11 } },
  ],
};

const loadedAfterUncachedPageOnlyFalse = reader.getLoadedMushafAyah(page, null, 221, 221);
assert.deepEqual(
  JSON.parse(JSON.stringify(loadedAfterUncachedPageOnlyFalse)),
  JSON.parse(JSON.stringify(page.ayahs[0])),
  'a completed uncached page load with pageOnly=false must advance the saved position to the first ayah on the new page',
);

const restored = reader.getLoadedMushafAyah(page, { surah: 11, ayah: 1 }, 221, 221);
assert.deepEqual(
  JSON.parse(JSON.stringify(restored)),
  JSON.parse(JSON.stringify(page.ayahs[1])),
  'an exact restoration target must still win over the page-first fallback',
);

console.log('v1.1.96 Quran page-position refs test passed');
