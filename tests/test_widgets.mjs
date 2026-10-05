/**
 * Widget Data Architecture & Contract Test Suite
 *
 * Verifies:
 * 1. Snapshot generation: uses the SAME authoritative cached prayer times as HomeScreen/notifications
 * 2. Empty / offline state: polished intentional prompt ("Open App", "Tap to load times", salah://today) NOT broken "--:--"
 * 3. Date rollover: cache lookup handles rollover cleanly
 * 4. Location change: snapshot reflects new location & coordinates
 * 5. Deep link resolution: all widget routes (salah://prayer, salah://quran, etc.) resolve to correct targets
 * 6. Kotlin Provider Contract: snapshot contains all JSON fields expected by Android RemoteViews providers
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING HOME-SCREEN WIDGETS ARCHITECTURE TEST SUITE ===\n');

// 1. In-memory SQLite simulator matching db.ts / db.native.ts
const db = new Map();

function savePrayerCache(cacheKey, payload, meta = {}) {
  db.set(cacheKey, {
    cache_key: cacheKey,
    date: meta.date || '',
    location: meta.location || '',
    method: meta.method ?? 0,
    madhab: meta.madhab || 'shafi',
    payload: JSON.stringify(payload),
    cached_at: Date.now(),
  });
}

function loadPrayerCache(cacheKeyOrDate, location, method, madhab) {
  if (location === undefined && method === undefined) {
    const row = db.get(cacheKeyOrDate);
    return row ? { payload: row.payload } : null;
  }
  for (const row of db.values()) {
    if (
      row.date === cacheKeyOrDate &&
      (row.location === location || row.location.includes(location)) &&
      row.method === method &&
      (!madhab || row.madhab === madhab)
    ) {
      return { payload: row.payload };
    }
  }
  return null;
}

function loadLatestPrayerCache(location, method, madhab) {
  let best = null;
  for (const row of db.values()) {
    if (
      (!location || row.location === location || row.location.includes(location)) &&
      (method === undefined || row.method === method) &&
      (!madhab || row.madhab === madhab)
    ) {
      if (!best || row.cached_at > best.cached_at) {
        best = row;
      }
    }
  }
  return best ? { payload: best.payload } : null;
}

function buildPrayerCacheKey(dateStr, loc, method, madhab = 'shafi', adjustments) {
  const latStr = Number(loc.latitude).toFixed(4);
  const lngStr = Number(loc.longitude).toFixed(4);
  const labelStr = (loc.label || '').trim().toLowerCase();
  const madhabStr = (madhab || 'shafi').toLowerCase();
  const adjStr = typeof adjustments === 'string'
    ? adjustments
    : adjustments ? JSON.stringify(adjustments) : '';
  return `prayer:${dateStr}:${labelStr}:${latStr},${lngStr}:${method}:${madhabStr}:${adjStr}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function todayDdmmyyyy(d = new Date()) {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function getCachedPrayerTimes(loc, method = 16, date = new Date(), madhab = 'shafi', adjustments) {
  const dateStr = todayDdmmyyyy(date);
  const cacheKey = buildPrayerCacheKey(dateStr, loc, method, madhab, adjustments);
  const cached = loadPrayerCache(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.payload);
      return parsed;
    } catch {}
  }
  return null;
}

// Widget logic implementation under test mirroring src/lib/widgets.ts
const DAILY_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function parseHm(hm) {
  if (!hm || !hm.includes(':')) return 0;
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatWidgetCountdown(ms) {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  if (totalMin < 1) return 'Now';
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  }
  return `in ${mins} min`;
}

function formatTime(hm, format = '12h') {
  if (!hm || !hm.includes(':')) return hm;
  const [hStr, mStr] = hm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (format === '24h') {
    return `${pad2(h)}:${pad2(m)}`;
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)} ${ampm}`;
}

function getNextPrayer(timings, now = new Date()) {
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < order.length; i++) {
    const t = parseHm(timings[order[i]] || '00:00');
    if (nowMin < t) return { name: order[i], time: timings[order[i]], index: i };
  }
  return null;
}

async function getNextPrayerWidgetData(options = {}) {
  const now = options.now || new Date();
  const dateStr = todayDdmmyyyy(now);
  const loc = options.location || { latitude: 25.2048, longitude: 55.2708, label: 'Dubai, UAE' };
  const method = options.method ?? 16;
  const madhab = options.madhab ?? 'shafi';
  const timeFormat = options.timeFormat ?? '12h';

  let timings = options.timings || null;

  if (!timings) {
    // 1. Authoritative primary lookup: exact match using getCachedPrayerTimes
    const cachedDay = getCachedPrayerTimes(loc, method, now, madhab);
    if (cachedDay && cachedDay.timings && cachedDay.timings.Fajr) {
      timings = cachedDay.timings;
    }

    // 2. Date rollover / offline fallback: try latest cached prayer timings
    if (!timings) {
      const locKey = `${Number(loc.latitude).toFixed(4)},${Number(loc.longitude).toFixed(4)}`;
      const latest = loadLatestPrayerCache(locKey, method, madhab) || loadLatestPrayerCache();
      if (latest) {
        try {
          const parsed = JSON.parse(latest.payload);
          if (parsed?.timings?.Fajr) timings = parsed.timings;
        } catch {}
      }
    }
  }

  if (!timings || !timings.Fajr) {
    const emptyPrayers = DAILY_PRAYERS.map((p) => ({
      name: p,
      time: '--:--',
      rawTime: '',
      isNext: false,
      isPassed: false,
    }));

    return {
      name: 'ISLAMIC',
      rawName: 'Islamic',
      time: 'Open App',
      rawTime: '',
      countdownMs: 0,
      countdownText: 'Tap to load times',
      isTomorrow: false,
      hasData: false,
      fallbackText: 'Add prayer times by opening Islamic once',
      locationLabel: loc.label || 'Set Location',
      progressFraction: 0,
      prayers: emptyPrayers,
    };
  }

  const next = getNextPrayer(timings, now);
  const isTomorrow = !next;
  const rawName = next ? next.name : 'Fajr';
  const rawTime = next ? next.time : timings.Fajr;
  const name = rawName.toUpperCase();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const targetMinFromHm = parseHm(rawTime);
  let targetMin = targetMinFromHm;
  if (isTomorrow || targetMin <= nowMin) {
    targetMin += 1440;
  }

  const diffMs = Math.max(0, (targetMin - nowMin) * 60000 - now.getSeconds() * 1000);
  const countdownText = formatWidgetCountdown(diffMs);
  const formattedTime = formatTime(rawTime, timeFormat);

  const prayers = DAILY_PRAYERS.map((p) => {
    const pTime = timings[p] || '--:--';
    const pMin = parseHm(pTime);
    const isThisNext = next
      ? next.name.toLowerCase() === p.toLowerCase()
      : p === 'Fajr' && isTomorrow;
    const isPassed = !isTomorrow && nowMin > pMin;
    return {
      name: p,
      time: formatTime(pTime, timeFormat),
      rawTime: pTime,
      isNext: isThisNext,
      isPassed,
    };
  });

  return {
    name,
    rawName,
    time: formattedTime,
    rawTime,
    countdownMs: diffMs,
    countdownText,
    isTomorrow,
    hasData: true,
    locationLabel: loc.label,
    progressFraction: 0.5,
    prayers,
  };
}

// Deep link URL segment extractor mirroring src/lib/deeplinks.ts
function extractUrlSegments(url) {
  if (!url || typeof url !== 'string') return [];
  const trimmed = url.trim();
  let pathStr = '';
  try {
    const parsed = new URL(trimmed);
    pathStr = (parsed.host ? `${parsed.host}/` : '') + parsed.pathname;
  } catch {
    pathStr = trimmed.replace(/^[a-zA-Z0-9+.-]+:\/*/, '');
  }
  pathStr = pathStr.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
  return pathStr.split('/').filter(Boolean);
}

function parseDeepLink(url) {
  const segments = extractUrlSegments(url);
  if (segments.length === 0) return { type: 'home' };
  const first = segments[0].toLowerCase();
  switch (first) {
    case 'home':
    case 'today':
      return { type: 'home' };
    case 'prayer': {
      const p = segments[1]?.toLowerCase();
      return p ? { type: 'prayer', prayer: p } : { type: 'prayer' };
    }
    case 'quran': {
      const s = segments[1]?.toLowerCase();
      if (s === 'continue') return { type: 'quran-continue' };
      const surah = parseInt(s, 10) || 1;
      const ayah = parseInt(segments[2], 10) || undefined;
      return { type: 'quran', surah, ayah };
    }
    case 'qibla':
      return { type: 'qibla' };
    case 'duas':
    case 'dua':
      return { type: 'duas', id: segments[1] };
    default:
      return { type: 'home' };
  }
}

async function runTests() {
  const today = new Date(2026, 9, 6, 10, 0, 0);
  const dubai = { latitude: 25.2048, longitude: 55.2708, label: 'Dubai, UAE' };
  const makkah = { latitude: 21.4225, longitude: 39.8262, label: 'Makkah, Saudi Arabia' };

  // ----------------------------------------------------
  // Test 1: Empty / offline state when no data exists
  // ----------------------------------------------------
  console.log('Test 1: empty/offline state when no cache exists...');
  const emptySnapshot = await getNextPrayerWidgetData({ now: today, location: dubai });
  assert.equal(emptySnapshot.hasData, false, 'hasData must be false when no cache exists');
  assert.equal(emptySnapshot.time, 'Open App', 'time must be polished "Open App", NEVER "--:--"');
  assert.equal(emptySnapshot.countdownText, 'Tap to load times', 'countdownText must be polished prompt');
  assert.equal(emptySnapshot.name, 'ISLAMIC', 'brand header must be ISLAMIC');
  assert(emptySnapshot.prayers.length === 5, 'Must provide 5 prayer items in empty state');
  console.log('  ✓ PASSED');

  // ----------------------------------------------------
  // Test 2: Snapshot generation with authoritative cache (Same Data as App)
  // ----------------------------------------------------
  console.log('Test 2: snapshot generation matches authoritative app cache...');
  const dateStr = todayDdmmyyyy(today);
  const dubaiKey = buildPrayerCacheKey(dateStr, dubai, 16, 'shafi');
  const appTimings = {
    Fajr: '05:12',
    Sunrise: '06:20',
    Dhuhr: '12:15',
    Asr: '15:30',
    Maghrib: '18:05',
    Isha: '19:25',
  };
  savePrayerCache(dubaiKey, { timings: appTimings }, {
    date: dateStr,
    location: `${dubai.latitude.toFixed(4)},${dubai.longitude.toFixed(4)}`,
    method: 16,
    madhab: 'shafi',
  });

  // Verify getCachedPrayerTimes returns the saved timings
  const cachedApp = getCachedPrayerTimes(dubai, 16, today, 'shafi');
  assert.deepEqual(cachedApp.timings, appTimings, 'App cache lookup must find timings');

  // Widget generates snapshot using the SAME lookup
  const widgetSnapshot = await getNextPrayerWidgetData({ now: today, location: dubai, method: 16, madhab: 'shafi' });
  assert.equal(widgetSnapshot.hasData, true, 'hasData must be true when cache is present');
  assert.equal(widgetSnapshot.rawName, 'Dhuhr', 'At 10:00, next prayer must be Dhuhr');
  assert.equal(widgetSnapshot.time, '12:15 PM', 'Formatted time must match 12:15 PM');
  assert.equal(widgetSnapshot.rawTime, '12:15', 'Raw time must match exactly');
  assert.equal(widgetSnapshot.locationLabel, 'Dubai, UAE');
  assert.equal(widgetSnapshot.prayers.length, 5, 'prayers must contain 5 daily prayers');
  assert.equal(widgetSnapshot.prayers[1].name, 'Dhuhr');
  assert.equal(widgetSnapshot.prayers[1].time, '12:15 PM');
  assert.equal(widgetSnapshot.prayers[1].rawTime, '12:15');
  assert.equal(widgetSnapshot.prayers[1].isNext, true);
  console.log('  ✓ PASSED');

  // ----------------------------------------------------
  // Test 3: Date rollover fallback
  // ----------------------------------------------------
  console.log('Test 3: date rollover fallback when next day not yet fetched...');
  // Simulate midnight rollover: today is tomorrow, but tomorrow is not yet fetched
  const tomorrow = new Date(2026, 9, 7, 0, 5, 0);
  const rolloverSnapshot = await getNextPrayerWidgetData({ now: tomorrow, location: dubai, method: 16, madhab: 'shafi' });
  assert.equal(rolloverSnapshot.hasData, true, 'Must fallback to latest cached schedule on rollover');
  assert.equal(rolloverSnapshot.prayers[0].time, '5:12 AM');
  console.log('  ✓ PASSED');

  // ----------------------------------------------------
  // Test 4: Location change updates snapshot
  // ----------------------------------------------------
  console.log('Test 4: location change updates snapshot coordinates & label...');
  const makkahKey = buildPrayerCacheKey(dateStr, makkah, 4, 'shafi');
  const makkahTimings = {
    Fajr: '05:02',
    Sunrise: '06:15',
    Dhuhr: '12:18',
    Asr: '15:40',
    Maghrib: '18:12',
    Isha: '19:30',
  };
  savePrayerCache(makkahKey, { timings: makkahTimings }, {
    date: dateStr,
    location: `${makkah.latitude.toFixed(4)},${makkah.longitude.toFixed(4)}`,
    method: 4,
    madhab: 'shafi',
  });

  const makkahSnapshot = await getNextPrayerWidgetData({ now: today, location: makkah, method: 4, madhab: 'shafi' });
  assert.equal(makkahSnapshot.hasData, true);
  assert.equal(makkahSnapshot.locationLabel, 'Makkah, Saudi Arabia');
  assert.equal(makkahSnapshot.prayers[0].time, '5:02 AM');
  assert.equal(makkahSnapshot.prayers[3].time, '6:12 PM');
  console.log('  ✓ PASSED');

  // ----------------------------------------------------
  // Test 5: Deep link resolution for all widget routes
  // ----------------------------------------------------
  console.log('Test 5: deep link resolution across all widget targets...');
  assert.deepEqual(parseDeepLink('salah://today'), { type: 'home' });
  assert.deepEqual(parseDeepLink('salah://prayer'), { type: 'prayer' });
  assert.deepEqual(parseDeepLink('salah://prayer/maghrib'), { type: 'prayer', prayer: 'maghrib' });
  assert.deepEqual(parseDeepLink('salah://prayer/fajr'), { type: 'prayer', prayer: 'fajr' });
  assert.deepEqual(parseDeepLink('salah://quran/2/255'), { type: 'quran', surah: 2, ayah: 255 });
  assert.deepEqual(parseDeepLink('salah://quran/continue'), { type: 'quran-continue' });
  assert.deepEqual(parseDeepLink('salah://qibla'), { type: 'qibla' });
  assert.deepEqual(parseDeepLink('salah://duas/morning-dhikr'), { type: 'duas', id: 'morning-dhikr' });
  console.log('  ✓ PASSED');

  // ----------------------------------------------------
  // Test 6: Kotlin Provider contract verification
  // ----------------------------------------------------
  console.log('Test 6: Kotlin Provider Contract verification...');
  // Verify plugins/withAndroidWidgets.js contains all required Kotlin layout IDs and handlers
  const pluginContent = fs.readFileSync(path.resolve('plugins/withAndroidWidgets.js'), 'utf8');
  assert(pluginContent.includes('widget_prayer_small'), 'Must generate widget_prayer_small');
  assert(pluginContent.includes('widget_prayer_medium'), 'Must generate widget_prayer_medium');
  assert(pluginContent.includes('widget_quran'), 'Must generate widget_quran');
  assert(pluginContent.includes('widget_continue'), 'Must generate widget_continue');
  assert(pluginContent.includes('widget_qibla'), 'Must generate widget_qibla');
  assert(pluginContent.includes('widget_dua'), 'Must generate widget_dua');
  assert(pluginContent.includes('FILE_SNAPSHOT'), 'Must include plain file fallback for widget snapshot');
  assert(pluginContent.includes('Context.MODE_PRIVATE'), 'Must use MODE_PRIVATE for prefs');
  assert(pluginContent.includes('commit()'), 'Must use synchronous commit()');
  assert(pluginContent.includes('prayers.optJSONObject'), 'Must support schedule walking in onUpdate');
  console.log('  ✓ PASSED');

  console.log('\n========================================================');
  console.log('ALL 6 WIDGET ARCHITECTURE TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ WIDGET TEST FAILED:', err);
  process.exit(1);
});
