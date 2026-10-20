import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Guards the wiring defect that three QA rounds missed: layout refs were declared
// but never assigned, and parentIdentity strings referenced testIDs that do not
// exist. Engine tests pass with synthetic rects, so this asserts production wiring.
const root = process.cwd();
const screens = [
  'src/screens/DownloadsScreen.tsx',
  'src/screens/PrayerRemindersScreen.tsx',
  'src/screens/MosqueFinderScreen.tsx',
];
const stateFile = 'src/lib/diagnostic/diagnosticState.ts';

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const VIRTUAL_IDS = new Set(['detail-screen-root']);
const isTemplate = (s) => s.includes('${');

const stateSrc = read(stateFile);
const failures = [];
let checks = 0;

const screenSrc = new Map(screens.map((f) => [f, read(f)]));

const testIdsIn = (src) => {
  const ids = new Set();
  for (const m of src.matchAll(/testID=\{[^}]*?["'`]([\w-]+)["'`]/g)) ids.add(m[1]);
  for (const m of src.matchAll(/testID:\s*['"]([\w-]+)['"]/g)) ids.add(m[1]);
  return ids;
};

for (const file of screens) {
  const src = screenSrc.get(file);

  // 1. Every layout ref declared must be assigned.
  const declared = [...src.matchAll(/const\s+(\w*LayoutRef)\s*=\s*useRef/g)].map((m) => m[1]);
  for (const ref of declared) {
    checks++;
    if (!new RegExp(`${ref}\\.current\\s*=`).test(src)) {
      failures.push(`${file}: layout ref "${ref}" declared but never assigned`);
    }
  }

  // 2. parentIdentity values used by this screen must exist as testIDs in it.
  const ids = testIdsIn(src);
  const localIdentities = new Set();
  for (const m of src.matchAll(/parentIdentity:\s*['"`]([^'"`]+)['"`]/g)) localIdentities.add(m[1]);

  for (const id of localIdentities) {
    if (VIRTUAL_IDS.has(id) || isTemplate(id)) continue;
    checks++;
    if (!ids.has(id)) {
      failures.push(`${file}: parentIdentity "${id}" has no matching testID in this screen`);
    }
  }

  // 3. A viewport must not be its own coordinate frame.
  for (const m of src.matchAll(/diag\.recordNamed\('listViewport'[\s\S]{0,400}?\}\)/g)) {
    checks++;
    if (/frameWidth:\s*e\?\.nativeEvent\?\.layout\?\.width/.test(m[0])) {
      failures.push(`${file}: listViewport compares against its own width`);
    }
  }
}

// 4. Presets in diagnosticState must reference IDs that some production screen renders,
//    either literally or through a template such as `prayer-reminders-chip-${value}`.
const allScreenSrc = fs
  .readdirSync(path.join(root, 'src/screens'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => fs.readFileSync(path.join(root, 'src/screens', f), 'utf8'))
  .join('\n');

const renderedByAnyScreen = (id) => {
  if (allScreenSrc.includes(id)) return true;
  const prefix = id.replace(/-\d+$/, '');
  return allScreenSrc.includes(`${prefix}-\${`);
};

for (const m of stateSrc.matchAll(/parentIdentity:\s*['"]([^'"]+)['"]/g)) {
  const id = m[1];
  if (VIRTUAL_IDS.has(id) || isTemplate(id)) continue;
  checks++;
  if (!renderedByAnyScreen(id)) {
    failures.push(`${stateFile}: preset parentIdentity "${id}" is not rendered by any production screen`);
  }
}

if (failures.length) {
  console.error('\nDIAGNOSTIC WIRING FAILURES:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}

console.log(`  ✓ Diagnostic wiring verified (${checks} checks): refs assigned, identities real, no self-referential viewport frames`);
