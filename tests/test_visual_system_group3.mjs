import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Running Group 3 Tests: Visual System Invariants ---');

// 1. Verify AppText tone="faint" maps to tokens.subtle (>= 4.5:1 AA contrast)
const appTextSource = fs.readFileSync(path.join(rootDir, 'src/components/ui/AppText.tsx'), 'utf8');
assert.match(
  appTextSource,
  /} else if \(tone === 'faint'\) \{\s*resolvedColor = tokens\.subtle;\s*\}/,
  'AppText must resolve tone="faint" to tokens.subtle for >= 4.5:1 contrast'
);
console.log('✓ AppText tone="faint" mapped to tokens.subtle verified');

// 2. Verify GhostButton minHeight matches buttonTokens.minHeight (44dp)
const ghostBtnSource = fs.readFileSync(path.join(rootDir, 'src/components/ui/GhostButton.tsx'), 'utf8');
assert.match(
  ghostBtnSource,
  /minHeight:\s*buttonTokens\.minHeight/,
  'GhostButton minHeight must be buttonTokens.minHeight (44dp)'
);
console.log('✓ GhostButton minHeight aligns with buttonTokens.minHeight (44dp)');

// 3. Verify SearchField clear button hitSlop provides >= 44dp interaction envelope
const searchFieldSource = fs.readFileSync(path.join(rootDir, 'src/components/ui/SearchField.tsx'), 'utf8');
assert.match(
  searchFieldSource,
  /hitSlop=\{\{\s*top:\s*(?:10|12),\s*bottom:\s*(?:10|12),\s*left:\s*(?:10|12),\s*right:\s*(?:10|12)\s*\}\}/,
  'SearchField clear button hitSlop must provide >= 44dp hit area'
);
console.log('✓ SearchField clear button hit envelope >= 44dp verified');

// 4. Verify PremiumCard doc comment matches cardTokens.borderRadius (18dp)
const premiumCardSource = fs.readFileSync(path.join(rootDir, 'src/components/ui/PremiumCard.tsx'), 'utf8');
assert.ok(
  premiumCardSource.includes('18dp border radius (cardTokens.borderRadius)'),
  'PremiumCard doc comment must match 18dp cardTokens.borderRadius'
);
assert.ok(
  !premiumCardSource.includes('13–14.5dp border radius'),
  'PremiumCard doc comment must not contain stale 13-14.5dp claim'
);
console.log('✓ PremiumCard doc comment and border radius contract aligned');

console.log('--- Group 3 Tests PASSED ---');
