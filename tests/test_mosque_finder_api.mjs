import assert from 'node:assert/strict';
import {
  buildOverpassMosqueQuery,
  fetchNearbyMosques,
  geocodeAreaNominatim,
  normalizeMosqueElements,
} from '../src/lib/mosqueFinderApi.ts';

const edgeQuery = buildOverpassMosqueQuery(89.99, 179.99, 20);
assert.match(edgeQuery, /89\.80982,179\.\d+,90\.00000,180\.00000/);
assert.throws(() => buildOverpassMosqueQuery(91, 0, 5), /latitude/i);
assert.throws(() => buildOverpassMosqueQuery(0, 0, 0), /radius/i);

const normalized = normalizeMosqueElements([
  { id: 2, lat: 0.02, lon: 0, tags: { name: 'Far Mosque' } },
  { id: 1, center: { lat: 0.001, lon: 0 }, tags: { name: 'Near Mosque', 'addr:street': 'Main Road' } },
  { id: 3, lat: 0.001, lon: 0, tags: { name: 'Duplicate Coordinates' } },
  { id: 4, lat: Number.NaN, lon: 0, tags: { name: 'Invalid' } },
], 0, 0);
assert.deepEqual(normalized.map((item) => item.name), ['Near Mosque', 'Far Mosque']);
assert.equal(normalized[0].address, 'Main Road');

const calls = [];
const results = await fetchNearbyMosques(0, 0, 5, {
  endpoints: ['https://unstable.example/interpreter', 'https://available.example/interpreter'],
  timeoutMs: 100,
  fetcher: async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.method, 'POST');
    assert.match(new URLSearchParams(init.body).get('data'), /religion/);
    if (url.includes('unstable')) return { ok: false, status: 502, json: async () => ({}) };
    return {
      ok: true,
      status: 200,
      json: async () => ({ elements: [
        { id: 10, lat: 0.001, lon: 0, tags: { name: 'Nearby' } },
        { id: 11, lat: 0.08, lon: 0, tags: { name: 'Outside Radius' } },
      ] }),
    };
  },
});
assert.equal(calls.length, 2, 'the API client should try the next mirror after an HTTP error');
assert.deepEqual(results.map((item) => item.name), ['Nearby']);

let timeoutFallbackCalls = 0;
const afterTimeout = await fetchNearbyMosques(0, 0, 5, {
  endpoints: ['https://slow.example/interpreter', 'https://available.example/interpreter'],
  timeoutMs: 5,
  fetcher: async (url, init) => {
    timeoutFallbackCalls += 1;
    if (url.includes('slow')) {
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    return { ok: true, status: 200, json: async () => ({ elements: [] }) };
  },
});
assert.deepEqual(afterTimeout, []);
assert.equal(timeoutFallbackCalls, 2, 'a timeout on one mirror should fall through to the next mirror');

const cancelled = new AbortController();
cancelled.abort();
let cancelledFetchCount = 0;
await assert.rejects(
  fetchNearbyMosques(0, 0, 5, {
    signal: cancelled.signal,
    fetcher: async () => { cancelledFetchCount += 1; return { ok: true, status: 200, json: async () => ({ elements: [] }) }; },
  }),
  /cancelled/i,
);
assert.equal(cancelledFetchCount, 0, 'a cancelled search must not issue a network request');

// Geocoder bounds and payload validation
const validGeocode = await geocodeAreaNominatim('London', {
  fetcher: async (url, init) => {
    assert.match(url, /nominatim\.openstreetmap\.org\/search\?q=London/);
    assert.equal(init.headers['User-Agent'], 'IslamicAppMobile/1.0 (https://islamic.app)');
    assert.equal(init.headers.Accept, 'application/json');
    return {
      ok: true,
      status: 200,
      json: async () => [{ lat: '51.5074', lon: '-0.1278', display_name: 'London, Greater London, England, United Kingdom' }],
    };
  },
});
assert.deepEqual(validGeocode, {
  latitude: 51.5074,
  longitude: -0.1278,
  label: 'London, Greater London, England',
  rawDisplayName: 'London, Greater London, England, United Kingdom',
});

// Boundary values: [-90, 90] and [-180, 180]
const boundaryMin = await geocodeAreaNominatim('South Pole Edge', {
  fetcher: async () => ({
    ok: true,
    status: 200,
    json: async () => [{ lat: '-90', lon: '-180', display_name: 'South Pole Edge' }],
  }),
});
assert.equal(boundaryMin?.latitude, -90);
assert.equal(boundaryMin?.longitude, -180);

const boundaryMax = await geocodeAreaNominatim('North Pole Edge', {
  fetcher: async () => ({
    ok: true,
    status: 200,
    json: async () => [{ lat: '90', lon: '180', display_name: 'North Pole Edge' }],
  }),
});
assert.equal(boundaryMax?.latitude, 90);
assert.equal(boundaryMax?.longitude, 180);

// Out-of-bounds latitude (< -90 or > 90)
const outLatHigh = await geocodeAreaNominatim('Out High Lat', {
  fetcher: async () => ({
    ok: true,
    status: 200,
    json: async () => [{ lat: '90.0001', lon: '0', display_name: 'Invalid' }],
  }),
});
assert.equal(outLatHigh, null);

const outLatLow = await geocodeAreaNominatim('Out Low Lat', {
  fetcher: async () => ({
    ok: true,
    status: 200,
    json: async () => [{ lat: '-90.0001', lon: '0', display_name: 'Invalid' }],
  }),
});
assert.equal(outLatLow, null);

// Out-of-bounds longitude (< -180 or > 180)
const outLonHigh = await geocodeAreaNominatim('Out High Lon', {
  fetcher: async () => ({
    ok: true,
    status: 200,
    json: async () => [{ lat: '0', lon: '180.0001', display_name: 'Invalid' }],
  }),
});
assert.equal(outLonHigh, null);

const outLonLow = await geocodeAreaNominatim('Out Low Lon', {
  fetcher: async () => ({
    ok: true,
    status: 200,
    json: async () => [{ lat: '0', lon: '-180.0001', display_name: 'Invalid' }],
  }),
});
assert.equal(outLonLow, null);

// Non-finite payloads (Infinity, -Infinity, NaN, strings)
for (const badCoord of ['Infinity', '-Infinity', 'NaN', 'undefined', 'not-a-number']) {
  const badLat = await geocodeAreaNominatim('Bad Lat', {
    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => [{ lat: badCoord, lon: '0', display_name: 'Invalid' }],
    }),
  });
  assert.equal(badLat, null, `non-finite latitude "${badCoord}" must reject to null`);

  const badLon = await geocodeAreaNominatim('Bad Lon', {
    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => [{ lat: '0', lon: badCoord, display_name: 'Invalid' }],
    }),
  });
  assert.equal(badLon, null, `non-finite longitude "${badCoord}" must reject to null`);
}

// Malformed array / empty array
assert.equal(await geocodeAreaNominatim('Empty', {
  fetcher: async () => ({ ok: true, status: 200, json: async () => [] }),
}), null);
assert.equal(await geocodeAreaNominatim('Null Item', {
  fetcher: async () => ({ ok: true, status: 200, json: async () => [null] }),
}), null);

// Preserved cancellation and timeout
const geocodeAbort = new AbortController();
geocodeAbort.abort();
await assert.rejects(
  geocodeAreaNominatim('Cancelled', {
    signal: geocodeAbort.signal,
    fetcher: async () => ({ ok: true, status: 200, json: async () => [] }),
  }),
  /cancelled/i,
);

await assert.rejects(
  geocodeAreaNominatim('Timeout', {
    timeoutMs: 5,
    fetcher: async (_url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  }),
  /timed out/i,
);

console.log('✓ Mosque search and Nominatim geocoder validate coordinates and bounds, normalize/rank results, and recover across API failures');
