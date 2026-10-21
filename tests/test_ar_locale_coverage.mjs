import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readLocale = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src', 'locales', `${name}.json`), 'utf8'));
const en = readLocale('en');
const ar = readLocale('ar');

const tokens = (value) => [...value.matchAll(/\{\{[^{}]+\}\}/g)].map((match) => match[0]).sort();
const missing = Object.keys(en).filter((key) => !(key in ar));
const empty = Object.entries(ar)
  .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
  .map(([key]) => key);
const tokenMismatches = Object.keys(en)
  .filter((key) => key in ar && JSON.stringify(tokens(en[key])) !== JSON.stringify(tokens(ar[key])))
  .map((key) => ({ key, english: tokens(en[key]), arabic: tokens(ar[key]) }));

assert.deepEqual(missing, [], `Arabic is missing keys: ${missing.join(', ')}`);
assert.deepEqual(empty, [], `Arabic has empty/non-string values: ${empty.join(', ')}`);
assert.deepEqual(tokenMismatches, [], `Arabic placeholder mismatches: ${JSON.stringify(tokenMismatches)}`);

console.log(`Arabic coverage OK: ${Object.keys(ar).length} keys; no missing, empty, or placeholder mismatches.`);
