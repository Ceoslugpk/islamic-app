import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tajweed-fix-'));
fs.writeFileSync(path.join(tempDir, 'stubDb.mjs'), 'export function loadQuranCache() { return null; }\nexport function saveQuranCache() { return true; }\n');

const tajweedPath = compileEsmProductionModule({
  root: repoRoot,
  tmpDir: tempDir,
  sourceRelativePath: 'src/lib/tajweed.ts',
  source: fs.readFileSync(path.join(repoRoot, 'src/lib/tajweed.ts'), 'utf8'),
  outputName: 'tajweed.mjs',
  replacements: [["from './db'", "from './stubDb.mjs'"]],
});
const { parseTajweedHtml, parseQuranhubTajweed, stripTajweedHtml } = await import(tajweedPath);
const parsed = parseTajweedHtml('أَحَدٌ <tajweed class=ham_wasl>ٱ</tajweed> لِلَّهِ');
assert.deepEqual(parsed, [
  { text: 'أَحَدٌ ' },
  { text: 'ٱ', rule: 'silent' },
  { text: ' لِلَّهِ' },
], 'plain chunks must retain the spaces that separate adjacent rendered spans');

assert.deepEqual(
  parseQuranhubTajweed('أَحَدٌ [h[ٱ] لِلَّهِ'),
  [{ text: 'أَحَدٌ ' }, { text: 'ٱ', rule: 'silent' }, { text: ' لِلَّهِ' }],
  'QuranHub parsing remains unchanged'
);
assert.equal(
  stripTajweedHtml('  أَحَدٌ <tajweed class=ham_wasl>ٱ</tajweed>  '),
  'أَحَدٌ ٱ',
  'whole-verse trimming remains intact'
);
console.log('TAJWEED FIX TEST PASSED');
