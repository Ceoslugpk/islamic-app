import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);

function loadTsModule(relativePath) {
  const filename = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const runtimeModule = { exports: {} };
  const requireFromProduction = (specifier) => {
    throw new Error(`Unexpected runtime dependency from ${relativePath}: ${specifier}`);
  };
  const execute = new Function('require', 'module', 'exports', output.outputText);
  execute(requireFromProduction, runtimeModule, runtimeModule.exports);
  return runtimeModule.exports;
}

const { getTextAlignment } = loadTsModule('src/lib/typography.ts');
assert.equal(typeof getTextAlignment, 'function', 'typography must export the alignment contract helper');

const cases = [
  ['Urdu script in Urdu', 'اردو متن', 'ur', 'body', { textAlign: 'right', writingDirection: 'rtl' }],
  ['Urdu script in uppercase regional Urdu tag', 'اردو متن', 'UR-PK', 'body', { textAlign: 'right', writingDirection: 'rtl' }],
  ['Arabic script in Arabic', 'النص العربي', 'ar', 'body', { textAlign: 'right', writingDirection: 'rtl' }],
  ['Arabic script with numeral variant', 'النص العربي', 'en', 'numeral', { textAlign: 'right', writingDirection: 'rtl' }],
  ['Arabic script in LTR locale', 'العربية', 'en', 'body', { textAlign: 'right', writingDirection: 'rtl' }],
  ['Latin content in Urdu', 'Prayer times', 'ur', 'body', { textAlign: 'right', writingDirection: 'ltr' }],
  ['Numeric content in Urdu', '12:45', 'ur', 'numeral', { textAlign: 'right', writingDirection: 'ltr' }],
  ['Latin content in English', 'Prayer times', 'en', 'body', { textAlign: 'left', writingDirection: 'ltr' }],
  ['Numeric content in English', '12:45', 'en', 'numeral', { textAlign: 'left', writingDirection: 'ltr' }],
];

for (const [label, content, language, variant, expected] of cases) {
  assert.deepEqual(
    getTextAlignment(content, language, variant),
    expected,
    `${label} must follow the documented text alignment contract`,
  );
}

console.log(`PASS: ${cases.length} real typography alignment cases`);
