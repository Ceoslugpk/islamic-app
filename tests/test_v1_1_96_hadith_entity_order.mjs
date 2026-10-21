import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/hadithApi.ts');
const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: SOURCE,
}).outputText;

const moduleObject = { exports: {} };
const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
new Function('module', 'exports', 'require', output)(
  moduleObject,
  moduleObject.exports,
  (request) => {
    if (request === '@react-native-async-storage/async-storage') {
      return { __esModule: true, default: storage };
    }
    if (request === './quran') return { fetchWithTimeout: async () => { throw new Error('unused'); } };
    if (request === './useConnectivity') return { isAppOnline: () => true };
    throw new Error(`Unexpected import from ${SOURCE}: ${request}`);
  },
);

const { cleanHadithText } = moduleObject.exports;
assert.equal(typeof cleanHadithText, 'function', 'the real cleanHadithText export must load');

assert.equal(
  cleanHadithText('<p>&amp;lt; &amp;quot; &amp;amp;</p>'),
  '&lt; &quot; &amp;',
  'literal encoded entities must be decoded once, with ampersand replacement last',
);

console.log('v1.1.96 Hadith entity-order regression test passed');
