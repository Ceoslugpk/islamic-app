import { distanceKm } from './qibla.ts';

export interface MosqueItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
] as const;

type OverpassElement = {
  id?: string | number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

type Fetcher = typeof fetch;

export function buildOverpassMosqueQuery(latitude: number, longitude: number, radiusKm: number): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Invalid search latitude');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Invalid search longitude');
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
    throw new Error('Invalid search radius');
  }

  const latitudeDelta = radiusKm / 111;
  const cosineLatitude = Math.cos((latitude * Math.PI) / 180);
  const longitudeDelta = radiusKm / (111 * (Math.abs(cosineLatitude) > 0.05 ? Math.abs(cosineLatitude) : 1));
  const south = Math.max(-90, latitude - latitudeDelta);
  const north = Math.min(90, latitude + latitudeDelta);
  const west = Math.max(-180, longitude - longitudeDelta);
  const east = Math.min(180, longitude + longitudeDelta);
  const bounds = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;

  return `[out:json][timeout:20];(node["amenity"="place_of_worship"]["religion"="muslim"](${bounds});way["amenity"="place_of_worship"]["religion"="muslim"](${bounds}););out center 30;`;
}

export function normalizeMosqueElements(
  elements: OverpassElement[],
  latitude: number,
  longitude: number,
): MosqueItem[] {
  const items: MosqueItem[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    const mosqueLatitude = element.lat ?? element.center?.lat;
    const mosqueLongitude = element.lon ?? element.center?.lon;
    if (
      typeof mosqueLatitude !== 'number' || !Number.isFinite(mosqueLatitude) || mosqueLatitude < -90 || mosqueLatitude > 90 ||
      typeof mosqueLongitude !== 'number' || !Number.isFinite(mosqueLongitude) || mosqueLongitude < -180 || mosqueLongitude > 180
    ) continue;

    const coordinateKey = `${mosqueLatitude.toFixed(4)},${mosqueLongitude.toFixed(4)}`;
    if (seen.has(coordinateKey)) continue;
    seen.add(coordinateKey);

    const tags = element.tags || {};
    const addressParts = [
      tags['addr:street'],
      tags['addr:district'] || tags['addr:suburb'] || tags['addr:quarter'],
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      tags['addr:state'] || tags['addr:country'],
    ].filter((part): part is string => Boolean(part?.trim()));

    items.push({
      id: String(element.id ?? coordinateKey),
      name: tags.name?.trim() || 'Mosque',
      address: addressParts.join(', ') || tags['addr:full']?.trim() || '',
      latitude: mosqueLatitude,
      longitude: mosqueLongitude,
      distanceKm: distanceKm(latitude, longitude, mosqueLatitude, mosqueLongitude),
    });
  }

  return items.sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function fetchNearbyMosques(
  latitude: number,
  longitude: number,
  radiusKm: number,
  options: {
    signal?: AbortSignal;
    fetcher?: Fetcher;
    endpoints?: readonly string[];
    timeoutMs?: number;
  } = {},
): Promise<MosqueItem[]> {
  const query = buildOverpassMosqueQuery(latitude, longitude, radiusKm);
  const fetcher = options.fetcher ?? fetch;
  const endpoints = options.endpoints ?? OVERPASS_ENDPOINTS;
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    if (options.signal?.aborted) throw new Error('Mosque search cancelled');

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? 12000);

    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'IslamicAppMobile/1.0 (https://islamic.app)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Server returned status ${response.status}`);

      const payload = await response.json() as { elements?: unknown };
      if (!payload || !Array.isArray(payload.elements)) throw new Error('Invalid response structure');
      return normalizeMosqueElements(payload.elements as OverpassElement[], latitude, longitude)
        .filter((mosque) => mosque.distanceKm <= radiusKm);
    } catch (error) {
      if (options.signal?.aborted) throw new Error('Mosque search cancelled');
      lastError = timedOut ? new Error('Mosque search timed out') : error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  throw lastError ?? new Error('All Overpass servers failed');
}

export interface GeocodedAreaResult {
  latitude: number;
  longitude: number;
  label: string;
  rawDisplayName: string;
}

export async function geocodeAreaNominatim(
  query: string,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    fetcher?: Fetcher;
  } = {},
): Promise<GeocodedAreaResult | null> {
  const q = query.trim();
  if (!q) return null;
  if (options.signal?.aborted) {
    throw new Error('Area search cancelled');
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 8000);

  try {
    const res = await fetcher(url, {
      headers: {
        'User-Agent': 'IslamicAppMobile/1.0 (https://islamic.app)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Area lookup failed (${res.status})`);
    }

    const data = (await res.json()) as any;
    if (options.signal?.aborted) return null;
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const first = data[0];
    if (!first || typeof first !== 'object') {
      return null;
    }

    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return null;
    }

    const rawLabel = first.display_name || q;
    const labelParts = String(rawLabel).split(',').map((s: string) => s.trim()).filter(Boolean);
    const shortLabel = labelParts.slice(0, 3).join(', ') || rawLabel;

    return {
      latitude: lat,
      longitude: lon,
      label: shortLabel,
      rawDisplayName: rawLabel,
    };
  } catch (error) {
    if (options.signal?.aborted) throw new Error('Area search cancelled');
    if (timedOut) throw new Error('Area search timed out');
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}
