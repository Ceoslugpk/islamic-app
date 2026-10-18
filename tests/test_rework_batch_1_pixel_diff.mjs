import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const PAIRS = [
  'backup-restore-paper',
  'backup-restore-ink',
  'cities-paper',
  'cities-ink',
  'downloads-paper',
  'downloads-ink',
  'hajj-journey-paper',
  'hajj-journey-ink',
  'hajj-live-paper',
  'hajj-live-ink',
  'legal-paper',
  'legal-ink',
  'location-paper',
  'location-ink',
];

const HEADER_THRESHOLD_PCT = 25.0;
const FULL_THRESHOLD_PCT = 35.0;
const CHANNEL_DIFF_THRESHOLD = 25; // difference > 25 on any RGB channel

function readPng(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  return PNG.sync.read(buf);
}

function runPixelDiffTest() {
  console.log('========================================================================');
  console.log('REWORK BATCH 1 DETERMINISTIC PIXEL DIFF VERIFICATION');
  console.log(`Criteria: Header y<300 diff >= ${HEADER_THRESHOLD_PCT}%, Full page diff >= ${FULL_THRESHOLD_PCT}%`);
  console.log(`Pixel change condition: Math.max(|dr|, |dg|, |db|) > ${CHANNEL_DIFF_THRESHOLD}`);
  console.log('========================================================================\n');

  let allPassed = true;
  const results = [];

  for (const pair of PAIRS) {
    const beforePath = path.resolve('proof/rework-batch-1/before', `${pair}.png`);
    const afterPath = path.resolve('proof/rework-batch-1', `${pair}.png`);

    const before = readPng(beforePath);
    const after = readPng(afterPath);

    if (before.width !== after.width || before.height !== after.height) {
      throw new Error(`Dimension mismatch for ${pair}: before(${before.width}x${before.height}) vs after(${after.width}x${after.height})`);
    }

    const w = before.width;
    const h = before.height;

    let headerDiffCount = 0;
    let headerTotalCount = 0;
    let fullDiffCount = 0;
    let fullTotalCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const dr = Math.abs(before.data[idx] - after.data[idx]);
        const dg = Math.abs(before.data[idx + 1] - after.data[idx + 1]);
        const db = Math.abs(before.data[idx + 2] - after.data[idx + 2]);
        const isDiff = (dr > CHANNEL_DIFF_THRESHOLD || dg > CHANNEL_DIFF_THRESHOLD || db > CHANNEL_DIFF_THRESHOLD) ? 1 : 0;

        if (y < 300) {
          headerTotalCount++;
          if (isDiff) headerDiffCount++;
        }
        fullTotalCount++;
        if (isDiff) fullDiffCount++;
      }
    }

    const headerPct = parseFloat(((headerDiffCount / headerTotalCount) * 100).toFixed(2));
    const fullPct = parseFloat(((fullDiffCount / fullTotalCount) * 100).toFixed(2));

    const headerPass = headerPct >= HEADER_THRESHOLD_PCT;
    const fullPass = fullPct >= FULL_THRESHOLD_PCT;
    const pairPass = headerPass && fullPass;

    if (!pairPass) {
      allPassed = false;
    }

    results.push({
      pair,
      headerPct,
      headerPass,
      fullPct,
      fullPass,
      pairPass,
    });

    const statusBadge = pairPass ? '✓ PASS' : '✗ FAIL';
    console.log(
      `  ${statusBadge.padEnd(8)} ${pair.padEnd(22)} | Header: ${headerPct.toFixed(2).padStart(5)}% (req >= ${HEADER_THRESHOLD_PCT}%) ${headerPass ? 'OK' : 'FAIL'} | Full: ${fullPct.toFixed(2).padStart(5)}% (req >= ${FULL_THRESHOLD_PCT}%) ${fullPass ? 'OK' : 'FAIL'}`
    );
  }

  console.log('\n------------------------------------------------------------------------');
  if (allPassed) {
    console.log('✅ ALL 14 REWORK BATCH 1 PAIRS MET THE STRICT PIXEL-DIFF GATES');
  } else {
    console.error('❌ SOME REWORK BATCH 1 PAIRS FAILED THE PIXEL-DIFF GATES');
  }
  console.log('========================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runPixelDiffTest();
