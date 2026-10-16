/**
 * Centralized Header Configuration
 * Maps routes to their authoritative header definitions (AppHeader, SubHeader, ReaderHeader, SheetHeader).
 * Uses only existing localization keys and strings; never invents text.
 */

export type HeaderType = 'app' | 'sub' | 'reader' | 'sheet';

export interface HeaderConfig {
  type: HeaderType;
  titleKey: string;
  eyebrowKey?: string;
  subtitleKey?: string;
  backLabelKey?: string;
  showFade?: boolean;
  borderBottom?: boolean;
}

export const HEADER_CONFIG: Record<string, HeaderConfig> = {
  // Top-level AppHeader Hubs
  'home': {
    type: 'app',
    titleKey: 'ISLAMIC',
  },
  'quran-home': {
    type: 'app',
    titleKey: 'ISLAMIC',
  },
  'library': {
    type: 'app',
    titleKey: 'ISLAMIC',
  },
  'tools': {
    type: 'app',
    titleKey: 'ISLAMIC',
  },

  // Batch 1 Quran Screens (SubHeader)
  'quran': {
    type: 'sub',
    eyebrowKey: 'The Holy Quran',
    titleKey: 'Surahs',
    subtitleKey: 'All 114 Surahs with translations, audio & verse commentary',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'surahs': {
    type: 'sub',
    eyebrowKey: 'The Holy Quran',
    titleKey: 'Surahs',
    subtitleKey: 'All 114 Surahs with translations, audio & verse commentary',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'quran-audio': {
    type: 'sub',
    eyebrowKey: 'Audio Center',
    titleKey: 'Quran Audio',
    subtitleKey: 'Recitations, audio translations, playlists & player settings',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'audio': {
    type: 'sub',
    eyebrowKey: 'Audio Center',
    titleKey: 'Quran Audio',
    subtitleKey: 'Recitations, audio translations, playlists & player settings',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'tafsir': {
    type: 'sub',
    eyebrowKey: 'Exegesis & Commentary',
    titleKey: 'Tafsir',
    subtitleKey: 'Verse-by-verse scholarly exegesis',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'quran-tafsir': {
    type: 'sub',
    eyebrowKey: 'Exegesis & Commentary',
    titleKey: 'Tafsir',
    subtitleKey: 'Verse-by-verse scholarly exegesis',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'quran-topics': {
    type: 'sub',
    eyebrowKey: 'Thematic Quran',
    titleKey: 'Quran Topics',
    subtitleKey: 'Curated Quranic passages arranged by core themes of life, faith, and spirituality.',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'topics': {
    type: 'sub',
    eyebrowKey: 'Thematic Quran',
    titleKey: 'Quran Topics',
    subtitleKey: 'Curated Quranic passages arranged by core themes of life, faith, and spirituality.',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'translation-compare': {
    type: 'sub',
    eyebrowKey: 'Comparative Study',
    titleKey: 'Translation Compare',
    subtitleKey: 'Side-by-side comparative study of translations',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'compare': {
    type: 'sub',
    eyebrowKey: 'Comparative Study',
    titleKey: 'Translation Compare',
    subtitleKey: 'Side-by-side comparative study of translations',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'reading-plans': {
    type: 'sub',
    eyebrowKey: 'Khatmah',
    titleKey: 'Reading Plans',
    subtitleKey: 'Structured schedules to recite the Holy Quran at your own pace',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'plans': {
    type: 'sub',
    eyebrowKey: 'Khatmah',
    titleKey: 'Reading Plans',
    subtitleKey: 'Structured schedules to recite the Holy Quran at your own pace',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },

  // Batch 2 Quran Study & Memory Screens (SubHeader)
  'bookmarks': {
    type: 'sub',
    eyebrowKey: 'Saved Verses',
    titleKey: 'Bookmarks',
    subtitleKey: 'Access your saved verses and reading bookmarks',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'notes': {
    type: 'sub',
    eyebrowKey: 'Personal Study',
    titleKey: 'Notes & Reflections',
    subtitleKey: 'Record thoughts and reflections on verses as you read',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'hifz': {
    type: 'sub',
    eyebrowKey: 'Memorization',
    titleKey: 'Hifz Tracker',
    subtitleKey: 'Track memorization progress, revisions, and test recall',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'hifz-tracker': {
    type: 'sub',
    eyebrowKey: 'Memorization',
    titleKey: 'Hifz Tracker',
    subtitleKey: 'Track memorization progress, revisions, and test recall',
    backLabelKey: 'Quran',
    showFade: true,
    borderBottom: true,
  },
  'hifz-practice': {
    type: 'sub',
    eyebrowKey: 'Hide & Peek',
    titleKey: 'Hifz Practice',
    subtitleKey: 'Recite from memory & test recall',
    backLabelKey: 'Hifz',
    showFade: true,
    borderBottom: true,
  },
  'tajweed': {
    type: 'sub',
    eyebrowKey: 'Learn',
    titleKey: 'Tajweed Colors',
    subtitleKey: 'Full Quran · color-coded recitation rules',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'tajweed-colors': {
    type: 'sub',
    eyebrowKey: 'Learn',
    titleKey: 'Tajweed Colors',
    subtitleKey: 'Full Quran · color-coded recitation rules',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },

  // Reader Screen
  'reader': {
    type: 'reader',
    titleKey: 'The Holy Quran',
    backLabelKey: 'Quran',
  },
  'quran-reader': {
    type: 'reader',
    titleKey: 'The Holy Quran',
    backLabelKey: 'Quran',
  },

  // Sheet / Modal Screens
  'settings': {
    type: 'sheet',
    eyebrowKey: 'Preferences',
    titleKey: 'Settings',
  },
};

/**
 * Returns the canonical HeaderConfig for a given route name.
 */
export function getHeaderConfig(routeName: string): HeaderConfig | undefined {
  if (!routeName) return undefined;
  const normalized = routeName
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/screen$/, '');
  return HEADER_CONFIG[normalized];
}
