import assert from 'node:assert/strict';
import {
  buildOverpassMosqueQuery,
  fetchNearbyMosques,
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

console.log('✓ Mosque search validates coordinates, normalizes/ranks results, filters by radius, and recovers across API failures');
