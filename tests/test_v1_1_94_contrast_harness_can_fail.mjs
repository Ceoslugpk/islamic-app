// @ts-nocheck
/**
 * tests/test_v1_1_94_contrast_harness_can_fail.mjs
 *
 * Falsifiability proof for the WCAG contrast gate in `tests/text-contrast.spec.ts`.
 *
 * The spec computes per-element contrast ratios but historically only *logged*
 * violations (audit F-43). This test imports the REAL `evaluateDOMContrast`
 * function from the spec (not a copy), runs it in a real Chromium page against
 * synthetic DOM with a known contrast ratio, and proves that:
 *
 *   RED   — a below-threshold pair is reported as a violation (lowCount > 0),
 *           so the spec's `assert.equal(report.lowCount, 0, ...)` gate throws.
 *   GREEN — a compliant pair yields lowCount === 0 and the gate passes.
 *
 * "Production behaviour" here is the rendered text-vs-background colour pair;
 * the mutation flips it from violating to compliant and back.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateDOMContrast,
  WCAG_MIN_RUNTIME_RATIO,
} from './text-contrast.spec.ts';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {}
  const npxDir = '/home/ubuntu/.npm/_npx';
  if (fs.existsSync(npxDir)) {
    for (const entry of fs.readdirSync(npxDir)) {
      const candidate = path.join(npxDir, entry, 'node_modules', 'playwright', 'index.mjs');
      if (fs.existsSync(candidate)) return await import(`file://${candidate}`);
    }
  }
  const fallback = '/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
  return await import(`file://${fallback}`);
}

const { chromium } = await loadPlaywright();

console.log('='.repeat(70));
console.log('CONTRAST HARNESS FALSIFIABILITY PROOF (F-43)');
console.log('='.repeat(70));
console.log(`WCAG runtime threshold under test: ${WCAG_MIN_RUNTIME_RATIO}:1`);

assert.equal(typeof evaluateDOMContrast, 'function', 'evaluateDOMContrast must be importable');
assert.equal(WCAG_MIN_RUNTIME_RATIO, 3.0, 'WCAG runtime threshold must be 3.0:1');

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

/**
 * Render a single opaque page whose body background is `bg` and whose only
 * text leaf has computed color `fg`. Returns the real harness report.
 */
async function runHarnessOnColors(fg, bg) {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  try {
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:${bg}">
         <span id="t">Contrast sample text</span>
       </body></html>`,
    );
    await page.addStyleTag({ content: `#t { color: ${fg}; font-size: 16px; }` });
    return await page.evaluate(evaluateDOMContrast, {
      theme: 'paper',
      routeId: 'synthetic',
      minRatio: WCAG_MIN_RUNTIME_RATIO,
    });
  } finally {
    await page.close();
  }
}

let failed = false;
try {
  // ---- RED: deliberately violating pair -----------------------------------
  // #777777 on #888888 -> ~1.13:1, far below 3:1.
  const violating = await runHarnessOnColors('rgb(119, 119, 119)', 'rgb(136, 136, 136)');
  console.log(
    `\n[RED candidate] fg=#777 bg=#888 -> checked=${violating.checked} lowCount=${violating.lowCount} min=${violating.minContrast.toFixed(2)}:1`,
  );
  assert.ok(
    violating.checked > 0,
    'Harness must evaluate at least one text element (else the gate is vacuous)',
  );
  assert.ok(
    violating.lowCount > 0,
    `Harness MUST flag the violating pair (lowCount > 0), got ${violating.lowCount}`,
  );
  assert.ok(
    violating.minContrast < WCAG_MIN_RUNTIME_RATIO,
    `Computed min contrast ${violating.minContrast} must be below ${WCAG_MIN_RUNTIME_RATIO}`,
  );

  // The exact gate the spec now applies must throw on this report.
  assert.throws(
    () =>
      assert.equal(
        violating.lowCount,
        0,
        `Route synthetic (paper): ${violating.lowCount} element(s) below WCAG ${WCAG_MIN_RUNTIME_RATIO}:1`,
      ),
    /below WCAG/,
    'The spec gate assert.equal(lowCount, 0) MUST throw for a violating pair',
  );
  console.log('  ✓ RED confirmed: violating pair is reported and the spec gate throws');

  // ---- GREEN: compliant pair ----------------------------------------------
  // #14221E on #FEFCF7 -> ~14:1.
  const compliant = await runHarnessOnColors('rgb(20, 34, 30)', 'rgb(254, 252, 247)');
  console.log(
    `\n[GREEN candidate] fg=#14221E bg=#FEFCF7 -> checked=${compliant.checked} lowCount=${compliant.lowCount} min=${compliant.minContrast.toFixed(2)}:1`,
  );
  assert.ok(compliant.checked > 0, 'Harness must evaluate at least one text element');
  assert.equal(compliant.lowCount, 0, 'Compliant pair must yield lowCount === 0');
  assert.ok(
    compliant.minContrast >= WCAG_MIN_RUNTIME_RATIO,
    `Computed min contrast ${compliant.minContrast} must be >= ${WCAG_MIN_RUNTIME_RATIO}`,
  );
  assert.doesNotThrow(() =>
    assert.equal(compliant.lowCount, 0, 'no violation'),
  );
  console.log('  ✓ GREEN confirmed: compliant pair passes and the spec gate does not throw');

  console.log('\n' + '='.repeat(70));
  console.log('CONTRAST HARNESS CAN GO RED — PROOF COMPLETE');
  console.log('='.repeat(70) + '\n');
} catch (err) {
  failed = true;
  console.error('\n[FAIL] Contrast falsifiability proof failed:', err);
} finally {
  await browser.close();
}

process.exit(failed ? 1 : 0);
