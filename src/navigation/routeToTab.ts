/**
 * Authoritative Route to Active Tab Resolver
 * Implements strict active-tab resolution across primary and secondary screens,
 * supporting dual-homed sub-screens and fallback rules.
 */

export type TabKey = 'home' | 'quran' | 'library' | 'tools';
export type ActiveTab = TabKey | null;

export interface RouteToTabOptions {
  parentTab?: TabKey | null;
}

export type RouteInput =
  | string
  | { screen: string; [key: string]: any }
  | null
  | undefined;

/** Set of screens strictly mapping to the Quran tab */
const QURAN_ROUTES = new Set([
  'quran',
  'quran-home',
  'reader',
  'quran-reader',
  'audio',
  'quran-audio',
  'tafsir',
  'quran-tafsir',
  'topics',
  'quran-topics',
  'compare',
  'translation',
  'translation-compare',
  'plans',
  'reading-plans',
  'hifz',
  'hifz-practice',
  'bookmarks',
  'quran-bookmarks',
  'notes',
  'quran-notes',
  'surah-list',
  'surahs',
  'surah',
]);

/** Set of screens strictly mapping to the Library tab */
const LIBRARY_ROUTES = new Set([
  'library',
  'library-hub',
  'hadith',
  'hadith-library',
  'duas',
  'adhkar',
  'duas-adhkar',
  'names',
  'names-prophet',
  '99-names',
  'shahada',
  'downloads',
  'prayer-guide',
  'ramadan',
  'ramadan-guide',
  'vocab',
  'vocab-trainer',
  'tajweed',
  'tajweed-rules',
]);

/** Set of screens strictly mapping to the Tools tab */
const TOOLS_ROUTES = new Set([
  'tools',
  'tools-hub',
  'salah',
  'salah-tracker',
  'tracker',
  'fasting',
  'qada',
  'women-qada',
  'zakat',
  'zakat-calculator',
  'cycle',
  'women-cycle',
  'qibla',
  'compass',
  'mosque',
  'mosque-finder',
  'location',
  'cities',
  'calendar',
  'hijri-calendar',
  'prayer-reminders',
  'notifications',
  'umrah-resources',
  'live',
  'makkah-live',
  'madinah-live',
  'hajj-live',
]);

/** Screens that have no active tab in FloatingNav (settings, legal, about, backup) */
const NO_ACTIVE_TAB_ROUTES = new Set([
  'settings',
  'legal',
  'privacy',
  'privacy-policy',
  'about',
  'backup',
  'backup-restore',
]);

/**
 * Dual-homed routes that can appear under Library or Tools.
 * Maps route to { defaultTab, secondaryTab }.
 */
const DUAL_HOMED_ROUTES: Record<string, { defaultTab: TabKey; secondaryTab: TabKey }> = {
  // Tasbih & Weekly Summary default to Tools, but preserve Library context
  'tasbih': { defaultTab: 'tools', secondaryTab: 'library' },
  'summary': { defaultTab: 'tools', secondaryTab: 'library' },
  'weekly': { defaultTab: 'tools', secondaryTab: 'library' },
  'weekly-summary': { defaultTab: 'tools', secondaryTab: 'library' },

  // Umrah Guide & Hajj Journey default to Library, but preserve Tools context
  'umrah': { defaultTab: 'library', secondaryTab: 'tools' },
  'umrah-guide': { defaultTab: 'library', secondaryTab: 'tools' },
  'hajj': { defaultTab: 'library', secondaryTab: 'tools' },
  'hajj-journey': { defaultTab: 'library', secondaryTab: 'tools' },

  // Women's Purity & Guidance default to Library, but preserve Tools context
  'purity': { defaultTab: 'library', secondaryTab: 'tools' },
  'women-purity': { defaultTab: 'library', secondaryTab: 'tools' },
  'worship': { defaultTab: 'library', secondaryTab: 'tools' },
  'guidance': { defaultTab: 'library', secondaryTab: 'tools' },
  'women-guidance': { defaultTab: 'library', secondaryTab: 'tools' },
};

function normalizeRouteName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/screen$/, '');
}

function extractScreenName(route: RouteInput): string | null {
  if (!route) return null;
  if (typeof route === 'string') return normalizeRouteName(route);
  if (typeof route === 'object' && typeof route.screen === 'string') {
    return normalizeRouteName(route.screen);
  }
  return null;
}

/** Check if a route is dual-homed between Library and Tools */
export function isDualHomedRoute(route: RouteInput): boolean {
  const name = extractScreenName(route);
  return name ? name in DUAL_HOMED_ROUTES : false;
}

/**
 * Resolves the active navigation tab for any given route/view.
 *
 * Rules:
 * 1. Quran reader/audio/tafsir/topics/compare/translation/plans/hifz/bookmarks/notes
 *    and Quran sub-screens -> 'quran'
 * 2. Hadith/Duas/Names/Shahada/Downloads/Prayer Guide/Ramadan/Umrah/Hajj/Purity/Worship/Vocab/Tajweed
 *    -> 'library' (unless parent context specifies 'tools' for dual-homed routes)
 * 3. Salah/Fasting/Qada/Zakat/Cycle/Tasbih/Weekly/Qibla/Mosque/Location/Calendar/Prayer Reminders/Umrah Resources/live screens
 *    -> 'tools' (unless parent context specifies 'library' for dual-homed routes)
 * 4. Settings/legal/About -> null (no active tab)
 * 5. Unknown -> parent tab if valid, otherwise 'home'
 *
 * @param route The target screen/view name or object
 * @param contextOrParentTab Optional parent tab or options object
 */
export function routeToTab(
  route: RouteInput,
  contextOrParentTab?: TabKey | null | RouteToTabOptions
): ActiveTab {
  const parentTab: TabKey | null =
    typeof contextOrParentTab === 'string'
      ? contextOrParentTab
      : contextOrParentTab && 'parentTab' in contextOrParentTab
      ? contextOrParentTab.parentTab ?? null
      : typeof route === 'object' && route && ('parentTab' in route || 'tab' in route)
      ? ((route as any).parentTab || (route as any).tab) ?? null
      : null;

  const screen = extractScreenName(route);

  if (!screen) {
    return parentTab ?? 'home';
  }

  // 1. Screens with no active tab (settings, legal, privacy, about, backup)
  if (NO_ACTIVE_TAB_ROUTES.has(screen)) {
    return null;
  }

  // 2. Quran Home under Quran parent tab resolves to 'quran'
  if (screen === 'home' && parentTab === 'quran') {
    return 'quran';
  }

  // 3. Explicit top-level Home
  if (screen === 'home') {
    return 'home';
  }

  // 4. Quran sub-screens and views
  if (QURAN_ROUTES.has(screen)) {
    return 'quran';
  }

  // 4. Dual-homed routes (Library vs Tools)
  if (screen in DUAL_HOMED_ROUTES) {
    const config = DUAL_HOMED_ROUTES[screen];
    if (parentTab === config.secondaryTab) {
      return config.secondaryTab;
    }
    if (parentTab === config.defaultTab) {
      return config.defaultTab;
    }
    return config.defaultTab;
  }

  // 5. Single-homed Library routes
  if (LIBRARY_ROUTES.has(screen)) {
    return 'library';
  }

  // 6. Single-homed Tools routes
  if (TOOLS_ROUTES.has(screen)) {
    return 'tools';
  }

  // 7. Unknown routes: parent tab then 'home'
  if (parentTab && (parentTab === 'home' || parentTab === 'quran' || parentTab === 'library' || parentTab === 'tools')) {
    return parentTab;
  }

  return 'home';
}

/** Alias for routeToTab */
export const resolveActiveTab = routeToTab;
export const getActiveTab = routeToTab;
