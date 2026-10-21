import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function compile(sourcePath) {
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
  const genericModule = new Proxy({}, { get: () => function Stub() {} });
  const localRequire = (id) => {
    if (id === 'react-native') return {
      Platform: { OS: 'android' },
      StyleSheet: { create: (styles) => styles },
    };
    return genericModule;
  };
  new Function('module', 'exports', 'require', output)(module, module.exports, localRequire);
  return module.exports;
}

const { getJuzSurahRange } = compile(path.join(ROOT, 'src/screens/QuranScreen.tsx'));
assert.equal(typeof getJuzSurahRange, 'function', 'QuranScreen must expose its production Juz range resolver');

const expectedRanges = [
  [1, 2], [2, 2], [2, 3], [3, 4], [4, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [9, 11], [11, 12], [12, 14], [15, 16], [17, 18], [18, 20], [21, 22], [23, 25], [25, 27], [27, 29],
  [29, 33], [33, 36], [36, 39], [39, 41], [41, 45], [46, 51], [51, 57], [58, 66], [67, 77], [78, 114],
];

for (let juz = 1; juz <= 30; juz += 1) {
  const range = getJuzSurahRange(juz);
  const [start, end] = range;
  assert.deepEqual(range, expectedRanges[juz - 1], `Juz ${juz} must cover the correct surah range`);
  assert.ok(end >= start, `Juz ${juz} must resolve to a non-empty range`);
  const surahs = Array.from({ length: 114 }, (_, index) => index + 1)
    .filter((surah) => surah >= start && surah <= end);
  assert.ok(surahs.length > 0, `Juz ${juz} must produce a non-empty surah list`);
  assert.ok(surahs.includes(start) && surahs.includes(end), `Juz ${juz} list must contain both range boundaries`);
}

console.log('QuranScreen Juz 1-30 production range sweep passed');
