import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/zakat.ts');
const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: SOURCE,
}).outputText;

const moduleObject = { exports: {} };
new Function('module', 'exports', 'require', output)(
  moduleObject,
  moduleObject.exports,
  (request) => {
    if (request === './i18n') {
      return { getCurrentLanguage: () => 'en', isAppLanguage: () => true };
    }
    throw new Error(`Unexpected import from ${SOURCE}: ${request}`);
  },
);

const { getCurrencyConfig, convertCurrency } = moduleObject.exports;
assert.equal(typeof getCurrencyConfig, 'function', 'the real getCurrencyConfig export must load');

assert.equal(getCurrencyConfig('USD').code, 'USD', 'supported currency codes remain available');
assert.throws(
  () => getCurrencyConfig('ZZZ'),
  /Unsupported currency code: ZZZ/,
  'an unknown code must be explicitly unavailable instead of silently becoming AED',
);
assert.throws(
  () => convertCurrency(100, 'ZZZ', 'USD'),
  /Unsupported currency code: ZZZ/,
  'conversion must not use AED rates for an unknown source currency',
);

console.log('v1.1.96 Zakat unknown-currency regression test passed');
