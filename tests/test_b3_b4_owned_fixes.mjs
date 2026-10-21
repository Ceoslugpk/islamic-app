import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-b3-b4-'));
let source = fs.readFileSync(path.join(root, 'src/screens/ReadingPlansScreen.tsx'), 'utf8');
source = source.replace(/^import[\s\S]*?;\s*/gm, '');
source = "const StyleSheet = { create(value) { return value; } };\n" + source;
source = source.replace(/export default function ReadingPlansScreen/, 'function ReadingPlansScreen');
source += '\nmodule.exports = { formatPlanPortion };\n';
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  fileName: 'src/screens/ReadingPlansScreen.tsx',
}).outputText;
const file = path.join(tmp, 'ReadingPlansScreen.cjs');
fs.writeFileSync(file, output);
const production = await import(`file://${file}`);

assert.equal(
  production.formatPlanPortion("Juz 1, Rub' 1/4", (key) => ({ Juz: 'پارہ', "Rub'": 'ربع' }[key] ?? key)),
  'پارہ 1, ربع 1/4',
  "the real ReadingPlans production formatter must localize Rub'",
);
assert.equal(
  production.formatPlanPortion('Juz 1, Part 1/2', (key) => ({ Juz: 'پارہ', Part: 'حصہ' }[key] ?? key)),
  'پارہ 1, حصہ 1/2',
  'the formatter must preserve the existing Part translation',
);

console.log('PASS: ReadingPlans production formatter localizes Rub\' and preserves Part');
