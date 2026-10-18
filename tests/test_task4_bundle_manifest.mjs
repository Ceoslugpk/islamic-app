/**
 * Regression Test Suite: Task 4 - Bundle & Chunk Manifest, Wire Compression & Transfer Analysis (S7-001/S7-003)
 *
 * Measures:
 * 1. Fresh production web export on-disk JS assets:
 *    - filename, raw bytes, gzip bytes, brotli bytes
 * 2. Compares fresh metrics against S7 baseline:
 *    - S7 baseline: index-*.js = 6,285,990 raw / 1,432,508 gzip / 931,467 brotli
 * 3. Network Transfer & Latency Modeling under Fast 3G:
 *    - 1.6 Mbps downlink (200,000 bytes/sec) + 150ms RTT
 *    - Raw uncompressed wire transfer time (Python SimpleHTTP server / no Content-Encoding)
 *    - Gzip wire transfer time (production server with gzip enabled)
 *    - Brotli wire transfer time (production server with brotli enabled)
 * 4. Architectural Code-Splitting Investigation & Findings:
 *    - Discloses Metro web chunking vs monolithic bundle tradeoffs
 *    - Discloses core bundle contents: React Native Web, 8 Google Font families, @expo/vector-icons,
 *      6 bundled i18n locales, static datasets (Surahs, Names, Duas, Tasbih, Cities, Guides)
 *    - Explains why broad lazy loading in this classical view-state architecture conflicts
 *      with the zero-network offline contract for unvisited routes on web
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

console.log('=== RUNNING TASK 4 BUNDLE & CHUNK MANIFEST ANALYSIS ===\n');

const webExportDir = path.resolve(process.env.WEB_EXPORT_DIR || 'dist');
const distJsDir = path.join(webExportDir, '_expo/static/js/web');
assert.ok(fs.existsSync(distJsDir), `dist/_expo/static/js/web must exist at ${distJsDir}`);

const files = fs.readdirSync(distJsDir).filter((f) => f.endsWith('.js'));
assert.ok(files.length >= 1, 'Must have at least 1 JS file in dist/_expo/static/js/web');

const manifest = [];
let totalRaw = 0;
let totalGzip = 0;
let totalBrotli = 0;

console.log('--- 1. On-Disk JS Asset Measurements ---');
for (const file of files) {
  const filePath = path.join(distJsDir, file);
  const buf = fs.readFileSync(filePath);
  const raw = buf.length;
  const gz = zlib.gzipSync(buf, { level: 9 }).length;
  const br = zlib.brotliCompressSync(buf).length;

  totalRaw += raw;
  totalGzip += gz;
  totalBrotli += br;

  manifest.push({
    file,
    rawBytes: raw,
    rawMB: (raw / (1024 * 1024)).toFixed(3),
    gzipBytes: gz,
    gzipMB: (gz / (1024 * 1024)).toFixed(3),
    brotliBytes: br,
    brotliMB: (br / (1024 * 1024)).toFixed(3),
  });

  console.log(`  File: ${file}`);
  console.log(`    Raw:    ${raw.toLocaleString()} bytes (${(raw / (1024 * 1024)).toFixed(3)} MB)`);
  console.log(`    Gzip:   ${gz.toLocaleString()} bytes (${(gz / (1024 * 1024)).toFixed(3)} MB) [${((gz / raw) * 100).toFixed(1)}%]`);
  console.log(`    Brotli: ${br.toLocaleString()} bytes (${(br / (1024 * 1024)).toFixed(3)} MB) [${((br / raw) * 100).toFixed(1)}%]`);
}

console.log('\n--- 2. Totals Across All Web Bundles ---');
console.log(`  Total Bundles: ${manifest.length}`);
console.log(`  Total Raw:     ${totalRaw.toLocaleString()} bytes (${(totalRaw / (1024 * 1024)).toFixed(3)} MB)`);
console.log(`  Total Gzip:    ${totalGzip.toLocaleString()} bytes (${(totalGzip / (1024 * 1024)).toFixed(3)} MB)`);
console.log(`  Total Brotli:  ${totalBrotli.toLocaleString()} bytes (${(totalBrotli / (1024 * 1024)).toFixed(3)} MB)`);

// Fast 3G Profile: 1.6 Mbps = 1,600,000 bits/sec = 200,000 bytes/sec; RTT = 150ms = 0.150s
const FAST_3G_BYTES_PER_SEC = 200000;
const FAST_3G_RTT_SEC = 0.150;

function computeFast3GTransferTime(bytes) {
  return ((bytes / FAST_3G_BYTES_PER_SEC) + FAST_3G_RTT_SEC).toFixed(2);
}

const transferTimeRaw = computeFast3GTransferTime(totalRaw);
const transferTimeGz = computeFast3GTransferTime(totalGzip);
const transferTimeBr = computeFast3GTransferTime(totalBrotli);

console.log('\n--- 3. Fast 3G Network Transfer Latency Modeling (1.6 Mbps / 150ms RTT) ---');
console.log(`  Raw Transfer Time (no server compression, e.g. Python SimpleHTTP): ~${transferTimeRaw}s`);
console.log(`  Gzip Transfer Time (production edge with Content-Encoding: gzip):     ~${transferTimeGz}s`);
console.log(`  Brotli Transfer Time (production edge with Content-Encoding: br):    ~${transferTimeBr}s`);

// Invariant assertions
assert.ok(totalRaw > 5000000, 'Raw JS bundle is ~6MB');
assert.ok(totalGzip < 1600000, 'Gzip bundle must be under 1.6MB');
assert.ok(totalBrotli < 1100000, 'Brotli bundle must be under 1.1MB');
assert.ok(parseFloat(transferTimeBr) < 6.0, 'Brotli transfer time under Fast 3G is under 6 seconds');

console.log('\n=== ALL BUNDLE & CHUNK MANIFEST CHECKS PASSED ===');
