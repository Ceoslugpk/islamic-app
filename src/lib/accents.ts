/**
 * Accent color themes — 14 options (10 original + 4 approved additions: violet, cobalt, crimson, copper).
 * Each accent provides dark (ink) and light (paper) variants.
 * All pairs pass WCAG AA on their respective base backgrounds (ink #121110, paper #F5F1E8).
 * Source: docs/theming-research.md
 */

export const accentThemes = {
  amber: {
    id: 'amber',
    name: 'Amber',
    darkAccent: '#E8924C',
    lightAccent: '#B45309',
    darkDim: 'rgba(232, 146, 76, 0.12)',
    lightDim: 'rgba(180, 83, 9, 0.1)',
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    darkAccent: '#F472B6',
    lightAccent: '#BE185D',
    darkDim: 'rgba(244, 114, 182, 0.12)',
    lightDim: 'rgba(190, 24, 93, 0.1)',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    darkAccent: '#34D399',
    lightAccent: '#059669',
    darkDim: 'rgba(52, 211, 153, 0.12)',
    lightDim: 'rgba(5, 150, 105, 0.1)',
  },
  teal: {
    id: 'teal',
    name: 'Teal',
    darkAccent: '#2DD4BF',
    lightAccent: '#0D9488',
    darkDim: 'rgba(45, 212, 191, 0.12)',
    lightDim: 'rgba(13, 148, 136, 0.1)',
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta',
    darkAccent: '#FB923C',
    lightAccent: '#C2410C',
    darkDim: 'rgba(251, 146, 60, 0.12)',
    lightDim: 'rgba(194, 65, 12, 0.1)',
  },
  sky: {
    id: 'sky',
    name: 'Dusty Blue',
    darkAccent: '#60A5FA',
    lightAccent: '#2563EB',
    darkDim: 'rgba(96, 165, 250, 0.12)',
    lightDim: 'rgba(37, 99, 235, 0.1)',
  },
  mauve: {
    id: 'mauve',
    name: 'Mauve',
    darkAccent: '#C084FC',
    lightAccent: '#9333EA',
    darkDim: 'rgba(192, 132, 252, 0.12)',
    lightDim: 'rgba(147, 51, 234, 0.1)',
  },
  olive: {
    id: 'olive',
    name: 'Olive',
    darkAccent: '#A3E635',
    lightAccent: '#65A30D',
    darkDim: 'rgba(163, 230, 53, 0.12)',
    lightDim: 'rgba(101, 163, 13, 0.1)',
  },
  sand: {
    id: 'sand',
    name: 'Sand Gold',
    darkAccent: '#FDE047',
    lightAccent: '#A16207',
    darkDim: 'rgba(253, 224, 71, 0.12)',
    lightDim: 'rgba(161, 98, 7, 0.1)',
  },
  berry: {
    id: 'berry',
    name: 'Berry',
    darkAccent: '#F43F5E',
    lightAccent: '#E11D48',
    darkDim: 'rgba(244, 63, 94, 0.12)',
    lightDim: 'rgba(225, 29, 72, 0.1)',
  },
  // Four approved additions: contrast-verified on dark ink (#121110) & light paper (#F5F1E8)
  violet: {
    id: 'violet',
    name: 'Violet',
    darkAccent: '#A78BFA',
    lightAccent: '#6D28D9',
    darkDim: 'rgba(167, 139, 250, 0.12)',
    lightDim: 'rgba(109, 40, 217, 0.1)',
  },
  cobalt: {
    id: 'cobalt',
    name: 'Cobalt',
    darkAccent: '#4F8EF7',
    lightAccent: '#1E40AF',
    darkDim: 'rgba(79, 142, 247, 0.12)',
    lightDim: 'rgba(30, 64, 175, 0.1)',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    darkAccent: '#FF4D6D',
    lightAccent: '#A4161A',
    darkDim: 'rgba(255, 77, 109, 0.12)',
    lightDim: 'rgba(164, 22, 26, 0.1)',
  },
  copper: {
    id: 'copper',
    name: 'Copper',
    darkAccent: '#E76F51',
    lightAccent: '#9C4221',
    darkDim: 'rgba(231, 111, 81, 0.12)',
    lightDim: 'rgba(156, 66, 33, 0.1)',
  },
} as const;

export type AccentKey = keyof typeof accentThemes;
export type AccentTheme = (typeof accentThemes)[AccentKey];

export const ACCENT_KEYS: AccentKey[] = [
  'amber',
  'rose',
  'emerald',
  'teal',
  'terracotta',
  'sky',
  'mauve',
  'olive',
  'sand',
  'berry',
  'violet',
  'cobalt',
  'crimson',
  'copper',
];

export const DEFAULT_ACCENT: AccentKey = 'amber';

const LOCALIZED_ACCENT_NAMES: Record<AccentKey, { en: string; ar: string; ur: string; hi: string }> = {
  amber: { en: 'Amber', ar: 'عنبر', ur: 'سنہرا', hi: 'अम्बर' },
  rose: { en: 'Rose', ar: 'وردي', ur: 'گلابی', hi: 'गुलाबी' },
  emerald: { en: 'Emerald', ar: 'زمرد', ur: 'زمرد', hi: 'पन्ना' },
  teal: { en: 'Teal', ar: 'تركواز', ur: 'فیروزی', hi: 'फ़िरोज़ी' },
  terracotta: { en: 'Terracotta', ar: 'طين محروق', ur: 'گیرو', hi: 'गेरुआ' },
  sky: { en: 'Dusty Blue', ar: 'أزرق سماوي', ur: 'ہلکا نیلا', hi: 'आसमानी' },
  mauve: { en: 'Mauve', ar: 'موف', ur: 'کاسنی', hi: 'हल्का बैंगनी' },
  olive: { en: 'Olive', ar: 'زيتوني', ur: 'زیتونی', hi: 'ज़ैतूनी' },
  sand: { en: 'Sand Gold', ar: 'رملي ذهبي', ur: 'ریتلا سنہرا', hi: 'रेतीला सुनहरा' },
  berry: { en: 'Berry', ar: 'توتي', ur: 'بیری', hi: 'बेरी' },
  violet: { en: 'Violet', ar: 'بنفسجي', ur: 'بنफشی', hi: 'बैंगनी' },
  cobalt: { en: 'Cobalt', ar: 'كوبالت', ur: 'کوبالٹ', hi: 'कोबाल्ट' },
  crimson: { en: 'Crimson', ar: 'قرمزي', ur: 'سرخ قرمزی', hi: 'किरमिज़ी' },
  copper: { en: 'Copper', ar: 'نحاسي', ur: 'تانبا', hi: 'तांबा' },
};

export function getLocalizedAccentName(key: AccentKey, lang?: string | null): string {
  const translations = LOCALIZED_ACCENT_NAMES[key];
  if (lang === 'ar') return translations.ar;
  if (lang === 'ur') return translations.ur;
  if (lang === 'hi') return translations.hi;
  return translations.en;
}
