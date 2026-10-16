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

  // Batch 3 Library Knowledge & Guide Screens (SubHeader)
  'hadith': {
    type: 'sub',
    eyebrowKey: 'Library',
    titleKey: 'Hadith Library',
    subtitleKey: 'Browse 17 canonical collections, books & authentic narrations',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'hadith-library': {
    type: 'sub',
    eyebrowKey: 'Library',
    titleKey: 'Hadith Library',
    subtitleKey: 'Browse 17 canonical collections, books & authentic narrations',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'duas': {
    type: 'sub',
    eyebrowKey: 'Supplications',
    titleKey: 'Duas & Adhkar',
    subtitleKey: 'Authentic supplications from the Quran and Sunnah',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'names': {
    type: 'sub',
    eyebrowKey: 'Asma ul-Husna',
    titleKey: '99 Names of Allah',
    subtitleKey: 'Divine attributes and meanings of Allah (SWT)',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'names-prophet': {
    type: 'sub',
    eyebrowKey: 'Asma un-Nabi',
    titleKey: '99 Names of the Prophet ﷺ',
    subtitleKey: 'Noble attributes and titles of Prophet Muhammad ﷺ',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'prayer-guide': {
    type: 'sub',
    eyebrowKey: 'Guides',
    titleKey: 'Prayer Guide (Fiqh)',
    subtitleKey: 'Wudu, Salah, praying in congregation, Janazah, Istikhara, Eid and Taraweeh — every narration verified with its collection, number and grade.',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'ramadan-guide': {
    type: 'sub',
    eyebrowKey: 'Guides',
    titleKey: 'Ramadan & Eid Guide',
    subtitleKey: 'Fasting, Laylatul Qadr, Itikaf, Zakat al-Fitr, Eid and Tashriq — every narration verified with its collection, number and grade.',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'shahada': {
    type: 'sub',
    eyebrowKey: 'Library · Knowledge',
    titleKey: 'The Shahada',
    subtitleKey: 'The declaration of faith and its foundational conditions in Islam',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'vocab': {
    type: 'sub',
    eyebrowKey: 'Learn',
    titleKey: 'Quran Vocabulary',
    subtitleKey: 'Most frequent words of the Quran',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },
  'vocab-trainer': {
    type: 'sub',
    eyebrowKey: 'Learn',
    titleKey: 'Quran Vocabulary',
    subtitleKey: 'Most frequent words of the Quran',
    backLabelKey: 'Library',
    showFade: true,
    borderBottom: true,
  },

  // Batch 4 Tools Utilities & Trackers Screens (SubHeader)
  'qibla': {
    type: 'sub',
    eyebrowKey: 'Direction of Prayer',
    titleKey: 'Qibla Compass',
    subtitleKey: 'True bearing towards the Kaaba calculated using great-circle geodetic geodesic formulas.',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'salah-tracker': {
    type: 'sub',
    eyebrowKey: 'Daily Obligations',
    titleKey: 'Salah Tracker',
    subtitleKey: 'Track your daily 5 prayers and build a consistent habit',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'tracker': {
    type: 'sub',
    eyebrowKey: 'Daily Obligations',
    titleKey: 'Salah Tracker',
    subtitleKey: 'Track your daily 5 prayers and build a consistent habit',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'prayer-reminders': {
    type: 'sub',
    eyebrowKey: 'Tools',
    titleKey: 'Prayer Reminders',
    subtitleKey: 'Manage daily prayer alarms, adhan voices & Quran reading habit',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'notifications': {
    type: 'sub',
    eyebrowKey: 'Tools',
    titleKey: 'Prayer Reminders',
    subtitleKey: 'Manage daily prayer alarms, adhan voices & Quran reading habit',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'location': {
    type: 'sub',
    eyebrowKey: 'Preferences',
    titleKey: 'Location',
    subtitleKey: 'Use GPS automatically or enter a city or coordinates',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'cities': {
    type: 'sub',
    eyebrowKey: 'Directory',
    titleKey: 'Cities',
    subtitleKey: 'Pick a city to set your location',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },

  // Batch 5 Calendar, Fasting, Zakat & Pilgrimage Screens (SubHeader)
  'calendar': {
    type: 'sub',
    eyebrowKey: 'Hijri Calendar',
    titleKey: 'Islamic Dates',
    subtitleKey: 'Gregorian to Hijri mapping, Islamic months & holy dates',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'islamic-calendar': {
    type: 'sub',
    eyebrowKey: 'Hijri Calendar',
    titleKey: 'Islamic Dates',
    subtitleKey: 'Gregorian to Hijri mapping, Islamic months & holy dates',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'fasting': {
    type: 'sub',
    eyebrowKey: 'Worship & Tracker',
    titleKey: 'Fasting',
    subtitleKey: 'Suhoor & iftar countdowns, sunnah fasts & qada logs',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'fasting-tracker': {
    type: 'sub',
    eyebrowKey: 'Worship & Tracker',
    titleKey: 'Fasting',
    subtitleKey: 'Suhoor & iftar countdowns, sunnah fasts & qada logs',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'zakat': {
    type: 'sub',
    eyebrowKey: 'Worship & Charity',
    titleKey: 'Zakat',
    subtitleKey: 'Wealth assessment, nisab thresholds & calculation',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'zakat-calculator': {
    type: 'sub',
    eyebrowKey: 'Worship & Charity',
    titleKey: 'Zakat',
    subtitleKey: 'Wealth assessment, nisab thresholds & calculation',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'umrah-guide': {
    type: 'sub',
    eyebrowKey: 'Hajj & Umrah',
    titleKey: 'Umrah Guide',
    subtitleKey: "Step-by-step rituals of the sacred pilgrimage: Ihram, Tawaf, Sa'i, and Halq.",
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'umrah-resources': {
    type: 'sub',
    eyebrowKey: 'Hajj & Umrah',
    titleKey: 'Umrah Resources',
    subtitleKey: 'Essential packing checklist, etiquette, common errors, tips & scholarly references.',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'hajj-journey': {
    type: 'sub',
    eyebrowKey: 'Sacred Pilgrimage',
    titleKey: 'Hajj Journey',
    subtitleKey: 'Day-by-day rites from Yawm al-Tarwiyah in Mina to the Farewell Tawaf at the Kaaba.',
    backLabelKey: 'Tools',
    showFade: true,
    borderBottom: true,
  },
  'downloads': {
    type: 'sub',
    eyebrowKey: 'Offline',
    titleKey: 'Downloads',
    subtitleKey: 'Manage offline audio surahs and cached Quran text',
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
