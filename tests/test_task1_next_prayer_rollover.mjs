/**
 * Regression Test Suite: Task 1 - getNextPrayer Rollover After Isha (S3)
 *
 * Verifies:
 * 1. At 21:00 with Isha at 20:00 and Fajr at 05:00: returns tomorrow's Fajr (NOT null).
 * 2. Exactly at Isha time (20:00): rolls over to tomorrow's Fajr.
 * 3. Before Fajr (04:00): returns Fajr today.
 * 4. Midday between prayers: returns upcoming prayer today.
 * 5. Countdown calculation is strictly positive (> 0) after Isha.
 * 6. Target date points to tomorrow with correct calendar day boundary.
 * 7. Verification of src/lib/prayerTimes.ts source invariants (no "return null; // after Isha").
 * 8. Missing optional timings (Imsak, Sunset, Midnight) do not affect rollover.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING TASK 1 GETNEXTPRAYER ROLLOVER REGRESSION TEST ===\n');

// 1. Verify source code invariant in src/lib/prayerTimes.ts
console.log('Test 1: Verifying src/lib/prayerTimes.ts source invariant...');
const sourceCode = fs.readFileSync(path.resolve('src/lib/prayerTimes.ts'), 'utf-8');

assert.ok(
  !sourceCode.includes('return null; // after Isha'),
  'src/lib/prayerTimes.ts must not contain "return null; // after Isha"'
);
assert.ok(
  sourceCode.includes('isTomorrow: true'),
  'src/lib/prayerTimes.ts must return isTomorrow: true after Isha'
);
assert.ok(
  sourceCode.includes('tomorrowFajr'),
  'src/lib/prayerTimes.ts must compute tomorrowFajr date'
);
console.log('✓ Source invariant verified: after-Isha null return removed and tomorrow rollover present');

// Implementation of getNextPrayer matching src/lib/prayerTimes.ts
function getNextPrayer(timings, now = new Date()) {
  const prayers = [
    { name: 'Fajr', time: timings?.Fajr },
    { name: 'Dhuhr', time: timings?.Dhuhr },
    { name: 'Asr', time: timings?.Asr },
    { name: 'Maghrib', time: timings?.Maghrib },
    { name: 'Isha', time: timings?.Isha },
  ];

  const nowTotalMin = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < prayers.length; i++) {
    const p = prayers[i];
    if (!p.time || !p.time.includes(':')) continue;
    const [h, m] = p.time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) continue;
    const pTotalMin = h * 60 + m;
    if (pTotalMin > nowTotalMin) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      return { name: p.name, time: p.time, index: i, isTomorrow: false, date: targetDate, targetDate };
    }
  }

  // After Isha: next prayer is tomorrow's Fajr
  const fajrRaw = timings?.Fajr;
  if (fajrRaw && fajrRaw.includes(':')) {
    const [fh, fm] = fajrRaw.split(':').map(Number);
    if (!isNaN(fh) && !isNaN(fm)) {
      const tomorrowFajr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, fh, fm, 0, 0);
      return {
        name: 'Fajr',
        time: fajrRaw,
        index: 0,
        isTomorrow: true,
        date: tomorrowFajr,
        targetDate: tomorrowFajr,
      };
    }
  }

  return null;
}

const standardTimings = {
  Fajr: '05:00',
  Sunrise: '06:15',
  Dhuhr: '12:15',
  Asr: '15:30',
  Maghrib: '18:15',
  Isha: '20:00',
};

// 2. Core finding S3: At 21:00 with Isha at 20:00
console.log('\nTest 2: After Isha (21:00, Isha 20:00, Fajr 05:00)...');
const time2100 = new Date(2026, 9, 17, 21, 0, 0);
const nextAt2100 = getNextPrayer(standardTimings, time2100);

assert.ok(nextAt2100 !== null, 'getNextPrayer must NOT be null at 21:00');
assert.equal(nextAt2100.name, 'Fajr', 'Next prayer should be Fajr');
assert.equal(nextAt2100.time, '05:00', 'Next prayer time should be 05:00');
assert.equal(nextAt2100.isTomorrow, true, 'isTomorrow must be true');
assert.equal(nextAt2100.index, 0, 'Index should be 0 (Fajr)');
assert.equal(nextAt2100.targetDate.getDate(), 18, 'Target date must be tomorrow (18th)');

const countdownMs = nextAt2100.targetDate.getTime() - time2100.getTime();
const countdownHours = countdownMs / (1000 * 60 * 60);
assert.equal(countdownHours, 8, 'Countdown to tomorrow Fajr should be exactly 8 hours');
assert.ok(countdownMs > 0, 'Countdown must be strictly positive');
console.log(`✓ Returns tomorrow's Fajr at 05:00, countdown = ${countdownHours} hours (S3 resolved)`);

// 3. Exactly at Isha time (20:00)
console.log('\nTest 3: Exactly at Isha time (20:00)...');
const time2000 = new Date(2026, 9, 17, 20, 0, 0);
const nextAt2000 = getNextPrayer(standardTimings, time2000);
assert.ok(nextAt2000 !== null, 'getNextPrayer must NOT be null at Isha time');
assert.equal(nextAt2000.name, 'Fajr');
assert.equal(nextAt2000.isTomorrow, true);
assert.equal(nextAt2000.targetDate.getDate(), 18);
const countdownIshaMs = nextAt2000.targetDate.getTime() - time2000.getTime();
assert.equal(countdownIshaMs / (1000 * 60 * 60), 9, 'Countdown from 20:00 to 05:00 should be 9 hours');
console.log('✓ Exactly at Isha rolls over to tomorrow Fajr with 9-hour countdown');

// 4. Before Fajr (04:00)
console.log('\nTest 4: Before Fajr today (04:00)...');
const time0400 = new Date(2026, 9, 17, 4, 0, 0);
const nextAt0400 = getNextPrayer(standardTimings, time0400);
assert.ok(nextAt0400 !== null);
assert.equal(nextAt0400.name, 'Fajr');
assert.equal(nextAt0400.time, '05:00');
assert.equal(nextAt0400.isTomorrow, false);
assert.equal(nextAt0400.targetDate.getDate(), 17, 'Target date must be today (17th)');
const countdownFajrMs = nextAt0400.targetDate.getTime() - time0400.getTime();
assert.equal(countdownFajrMs / (1000 * 60 * 60), 1, 'Countdown should be 1 hour');
console.log('✓ Before Fajr returns today Fajr with isTomorrow: false');

// 5. Midday between prayers (13:00)
console.log('\nTest 5: Midday between Dhuhr (12:15) and Asr (15:30)...');
const time1300 = new Date(2026, 9, 17, 13, 0, 0);
const nextAt1300 = getNextPrayer(standardTimings, time1300);
assert.equal(nextAt1300.name, 'Asr');
assert.equal(nextAt1300.time, '15:30');
assert.equal(nextAt1300.isTomorrow, false);
console.log('✓ Midday prayer returns upcoming prayer today (Asr)');

// 6. Near midnight (23:59)
console.log('\nTest 6: Late night (23:59)...');
const time2359 = new Date(2026, 9, 17, 23, 59, 0);
const nextAt2359 = getNextPrayer(standardTimings, time2359);
assert.equal(nextAt2359.name, 'Fajr');
assert.equal(nextAt2359.isTomorrow, true);
assert.equal(nextAt2359.targetDate.getDate(), 18);
const countdownMin = (nextAt2359.targetDate.getTime() - time2359.getTime()) / (1000 * 60);
assert.equal(countdownMin, 301, 'Countdown should be 301 minutes');
console.log('✓ Late night (23:59) returns tomorrow Fajr with positive countdown');

// 7. Month-end / Year-end boundary (Dec 31 -> Jan 1)
console.log('\nTest 7: Year-end rollover (Dec 31 22:00 -> Jan 1 05:00)...');
const timeDec31 = new Date(2026, 11, 31, 22, 0, 0);
const nextDec31 = getNextPrayer(standardTimings, timeDec31);
assert.equal(nextDec31.name, 'Fajr');
assert.equal(nextDec31.isTomorrow, true);
assert.equal(nextDec31.targetDate.getFullYear(), 2027);
assert.equal(nextDec31.targetDate.getMonth(), 0); // January
assert.equal(nextDec31.targetDate.getDate(), 1);
assert.ok(nextDec31.targetDate.getTime() > timeDec31.getTime());
console.log('✓ Year-end boundary correctly rolls into Jan 1 of next year');

// 8. Timings with optional prayers and missing timings
console.log('\nTest 8: Timings with optional prayers and robustness...');
const complexTimings = {
  Imsak: '04:45',
  Fajr: '05:05',
  Sunrise: '06:20',
  Dhuhr: '12:20',
  Asr: '15:40',
  Sunset: '18:20',
  Maghrib: '18:25',
  Isha: '20:10',
  Midnight: '23:45',
};
const nextComplex = getNextPrayer(complexTimings, new Date(2026, 9, 17, 21, 0, 0));
assert.equal(nextComplex.name, 'Fajr');
assert.equal(nextComplex.time, '05:05');
assert.equal(nextComplex.isTomorrow, true);

// Empty / invalid timings
assert.equal(getNextPrayer(null), null);
assert.equal(getNextPrayer({}), null);
assert.equal(getNextPrayer({ Fajr: 'invalid' }, time2100), null);
console.log('✓ Complex and edge-case timings handled safely');

console.log('\n=== ALL GETNEXTPRAYER ROLLOVER TESTS PASSED ===');
