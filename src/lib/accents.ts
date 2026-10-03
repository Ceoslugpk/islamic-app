/**
 * Accent color themes — 10 options, each with dark (ink) and light (paper) variants.
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
];

export const DEFAULT_ACCENT: AccentKey = 'amber';