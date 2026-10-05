/**
 * Canonical Deep Link System for the Islamic App.
 *
 * Supports:
 * - Scheme independence: salah://, islamic://, and https://DOMAIN/...
 * - Both host-based (salah://tracker) and path-based (salah:///tracker) formats
 * - Case-insensitive parsing with query param stripping
 * - Cold-start, warm-start, background->foreground routing
 * - Graceful fallback to Home on invalid / unknown routes
 */

export type PrayerNameTarget = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type DeepLinkTarget =
  | { type: 'home' }
  | { type: 'prayer'; prayer?: PrayerNameTarget }
  | { type: 'quran'; surah: number; ayah?: number }
  | { type: 'quran-continue' }
  | { type: 'qibla' }
  | { type: 'tracker' }
  | { type: 'hadith'; collectionSlug?: string }
  | { type: 'live'; channel: 'makkah' }
  | { type: 'library' }
  | { type: 'tools' }
  | { type: 'settings' }
  | { type: 'mosque' }
  | { type: 'fasting' }
  | { type: 'zakat' }
  | { type: 'names' }
  | { type: 'tasbih' }
  | { type: 'duas'; id?: string }
  | { type: 'adhkar'; id?: string }
  | { type: 'calendar' };

function parseNumber(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const n = parseInt(str, 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Normalizes any incoming deep link URL or path into an array of clean path segments.
 * Handles custom schemes (salah://, islamic://) and universal https:// links.
 */
export function extractUrlSegments(url: string): string[] {
  if (!url || typeof url !== 'string') return [];
  const trimmed = url.trim();
  if (!trimmed) return [];

  let pathStr = '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      pathStr = parsed.pathname;
    } else {
      // In custom schemes (e.g. salah://tracker or salah://quran/2/255),
      // WHATWG URL parser places 'tracker' or 'quran' into .host and the rest into .pathname.
      pathStr = (parsed.host ? `${parsed.host}/` : '') + parsed.pathname;
    }
  } catch {
    // Non-standard URI string (e.g. salah:quran/2/255)
    pathStr = trimmed.replace(/^[a-zA-Z0-9+.-]+:\/*/, '');
  }

  // Strip query string and hash
  pathStr = pathStr.split('?')[0].split('#')[0];
  // Remove leading and trailing slashes
  pathStr = pathStr.replace(/^\/+|\/+$/g, '');

  if (!pathStr) return [];
  return pathStr
    .split('/')
    .map((s) => {
      try {
        return decodeURIComponent(s).trim();
      } catch {
        return s.trim();
      }
    })
    .filter(Boolean);
}

const VALID_PRAYERS: Set<string> = new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

/**
 * Parses any incoming URL into a canonical DeepLinkTarget.
 * Always returns a valid target (defaults to { type: 'home' } on invalid/unknown routes)
 * so navigation never gets stuck in a blank or undefined state.
 */
export function parseDeepLink(url: string): DeepLinkTarget | null {
  if (!url || typeof url !== 'string') return null;

  const segments = extractUrlSegments(url);
  if (segments.length === 0) {
    return { type: 'home' };
  }

  const first = segments[0].toLowerCase();

  switch (first) {
    case 'home':
    case 'today':
      return { type: 'home' };

    case 'prayer': {
      const p = segments[1]?.toLowerCase();
      if (p && VALID_PRAYERS.has(p)) {
        return { type: 'prayer', prayer: p as PrayerNameTarget };
      }
      return { type: 'prayer' };
    }

    case 'quran': {
      const second = segments[1]?.toLowerCase();
      if (!second || second === 'home') {
        return { type: 'quran', surah: 1 };
      }
      if (second === 'continue') {
        return { type: 'quran-continue' };
      }
      const surah = parseNumber(second);
      if (!surah || surah < 1 || surah > 114) {
        return { type: 'quran', surah: 1 };
      }
      const ayah = parseNumber(segments[2]);
      if (ayah !== undefined && (ayah < 1 || ayah > 286)) {
        return { type: 'quran', surah, ayah: undefined };
      }
      return { type: 'quran', surah, ayah };
    }

    case 'qibla':
      return { type: 'qibla' };

    case 'tracker':
    case 'salah':
      return { type: 'tracker' };

    case 'duas':
    case 'dua': {
      const id = segments[1]?.trim();
      return id ? { type: 'duas', id } : { type: 'duas' };
    }

    case 'adhkar':
    case 'dhikr': {
      const id = segments[1]?.trim();
      return id ? { type: 'adhkar', id } : { type: 'adhkar' };
    }

    case 'tasbih':
      return { type: 'tasbih' };

    case 'hadith': {
      const collectionSlug = segments[1]?.toLowerCase();
      return collectionSlug ? { type: 'hadith', collectionSlug } : { type: 'hadith' };
    }

    case 'live': {
      const channel = segments[1]?.toLowerCase();
      if (channel === 'makkah') {
        return { type: 'live', channel: 'makkah' };
      }
      return { type: 'home' };
    }

    case 'library':
      return { type: 'library' };

    case 'tools':
      return { type: 'tools' };

    case 'settings':
      return { type: 'settings' };

    case 'mosque':
      return { type: 'mosque' };

    case 'fasting':
      return { type: 'fasting' };

    case 'zakat':
      return { type: 'zakat' };

    case 'names':
      return { type: 'names' };

    case 'calendar':
      return { type: 'calendar' };

    default:
      // Unknown path -> graceful fallback to Home (never blank screen)
      return { type: 'home' };
  }
}

/**
 * Builds a canonical URI using the app scheme ('salah://').
 */
export function buildDeepLink(target: DeepLinkTarget): string {
  switch (target.type) {
    case 'home':
      return 'salah://home';
    case 'prayer':
      return target.prayer ? `salah://prayer/${target.prayer}` : 'salah://prayer';
    case 'quran':
      return target.ayah
        ? `salah://quran/${target.surah}/${target.ayah}`
        : `salah://quran/${target.surah}`;
    case 'quran-continue':
      return 'salah://quran/continue';
    case 'hadith':
      return target.collectionSlug
        ? `salah://hadith/${target.collectionSlug}`
        : 'salah://hadith';
    case 'live':
      return `salah://live/${target.channel}`;
    case 'qibla':
      return 'salah://qibla';
    case 'tracker':
      return 'salah://tracker';
    case 'library':
      return 'salah://library';
    case 'tools':
      return 'salah://tools';
    case 'settings':
      return 'salah://settings';
    case 'mosque':
      return 'salah://mosque';
    case 'fasting':
      return 'salah://fasting';
    case 'zakat':
      return 'salah://zakat';
    case 'names':
      return 'salah://names';
    case 'tasbih':
      return 'salah://tasbih';
    case 'duas':
      return target.id ? `salah://duas/${target.id}` : 'salah://duas';
    case 'adhkar':
      return target.id ? `salah://adhkar/${target.id}` : 'salah://adhkar';
    case 'calendar':
      return 'salah://calendar';
  }
}