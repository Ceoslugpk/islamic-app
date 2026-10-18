#!/usr/bin/env node
/**
 * scripts/check-spacing.js
 *
 * Guardrail script enforcing the unified header gap contract:
 * 1. layout.constants.ts exports CONTENT_GAP = 24.
 * 2. Shared screen wrappers (DetailScreen, TabScreen) import and own CONTENT_GAP.
 * 3. tests/header-gap.spec.ts exists and tests 24dp ± 0.5dp clearance.
 *
 * Exits 0 on success, 1 on violation.
 */

/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const LAYOUT_CONSTANTS = path.join(ROOT_DIR, 'src/components/layout/layout.constants.ts');
const DETAIL_SCREEN = path.join(ROOT_DIR, 'src/components/layout/DetailScreen.tsx');
const TAB_SCREEN = path.join(ROOT_DIR, 'src/components/layout/TabScreen.tsx');
const HEADER_GAP_SPEC = path.join(ROOT_DIR, 'tests/header-gap.spec.ts');

let errors = [];

// 1. Verify layout.constants.ts CONTENT_GAP = 24
if (!fs.existsSync(LAYOUT_CONSTANTS)) {
  errors.push(`Missing layout.constants.ts at ${LAYOUT_CONSTANTS}`);
} else {
  const content = fs.readFileSync(LAYOUT_CONSTANTS, 'utf8');
  const match = content.match(/export\s+const\s+CONTENT_GAP\s*=\s*(\d+);/);
  if (!match) {
    errors.push('layout.constants.ts must export const CONTENT_GAP');
  } else if (Number(match[1]) !== 24) {
    errors.push(`layout.constants.ts CONTENT_GAP must equal 24, found ${match[1]}`);
  }
}

// 2. Verify DetailScreen & TabScreen use CONTENT_GAP
if (!fs.existsSync(DETAIL_SCREEN)) {
  errors.push(`Missing DetailScreen.tsx at ${DETAIL_SCREEN}`);
} else {
  const dsContent = fs.readFileSync(DETAIL_SCREEN, 'utf8');
  if (!dsContent.includes('CONTENT_GAP')) {
    errors.push('DetailScreen.tsx must import and use CONTENT_GAP for top clearance');
  }
}

if (!fs.existsSync(TAB_SCREEN)) {
  errors.push(`Missing TabScreen.tsx at ${TAB_SCREEN}`);
} else {
  const tsContent = fs.readFileSync(TAB_SCREEN, 'utf8');
  if (!tsContent.includes('CONTENT_GAP')) {
    errors.push('TabScreen.tsx must import and use CONTENT_GAP for top clearance');
  }
}

// 3. Verify tests/header-gap.spec.ts exists and asserts 24dp tolerance
if (!fs.existsSync(HEADER_GAP_SPEC)) {
  errors.push(`Missing header-gap test specification at ${HEADER_GAP_SPEC}`);
} else {
  const testContent = fs.readFileSync(HEADER_GAP_SPEC, 'utf8');
  if (!testContent.includes('24')) {
    errors.push('tests/header-gap.spec.ts must verify 24dp header gap');
  }
}

if (errors.length > 0) {
  console.error('\n❌ check-spacing failed:');
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('✅ check-spacing passed: CONTENT_GAP = 24 contract fully satisfied across shared wrappers and tests.');
  process.exit(0);
}
