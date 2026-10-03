export type DeepLinkTarget =
  | { type: 'home' }
  | { type: 'quran'; surah: number; ayah?: number }
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
  | { type: 'duas' }
  | { type: 'calendar' };

function parseNumber(str: string | undefined): number | undefined {
  if (!str) return undefined;
  const n = parseInt(str, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function parseDeepLink(url: string): DeepLinkTarget | null {
  try {
    const parsed = new URL(url);
    
    if (parsed.protocol !== 'salah:') {
      return null;
    }

    const pathname = parsed.pathname.replace(/^\/+/, '');
    
    if (!pathname || pathname === 'home') {
      return { type: 'home' };
    }

    const parts = pathname.split('/');
    const first = parts[0].toLowerCase();

    switch (first) {
      case 'quran': {
        const surah = parseNumber(parts[1]);
        if (!surah || surah < 1 || surah > 114) return null;
        const ayah = parseNumber(parts[2]);
        if (ayah !== undefined && (ayah < 1 || ayah > 286)) return { type: 'quran', surah, ayah: undefined };
        return { type: 'quran', surah, ayah };
      }

      case 'hadith': {
        const collectionSlug = parts[1]?.toLowerCase();
        if (collectionSlug) {
          return { type: 'hadith', collectionSlug };
        }
        return { type: 'hadith' };
      }

      case 'live': {
        const channel = parts[1]?.toLowerCase();
        if (channel === 'makkah') {
          return { type: 'live', channel: 'makkah' };
        }
        return null;
      }

      case 'qibla':
        return { type: 'qibla' };

      case 'tracker':
        return { type: 'tracker' };

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

      case 'tasbih':
        return { type: 'tasbih' };

      case 'duas':
        return { type: 'duas' };

      case 'calendar':
        return { type: 'calendar' };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function buildDeepLink(target: DeepLinkTarget): string {
  switch (target.type) {
    case 'home':
      return 'salah://home';
    case 'quran':
      return target.ayah ? `salah://quran/${target.surah}/${target.ayah}` : `salah://quran/${target.surah}`;
    case 'hadith':
      return target.collectionSlug ? `salah://hadith/${target.collectionSlug}` : 'salah://hadith';
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
      return 'salah://duas';
    case 'calendar':
      return 'salah://calendar';
  }
}