/**
 * Canonical icon map and sizing tokens - "Warm Editorial Islamic"
 * Enforces consistent Ionicons glyphs, sizing per role, and RTL directional flipping.
 */

import { I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isRTL } from './i18n';

export type IconGlyph = keyof typeof Ionicons.glyphMap;

export const iconSizes = {
  /** 11-12: micro badges and dot indicators */
  badge: 12,
  /** 14: chip and compact tag icons */
  small: 14,
  /** 16-18: standard inline icon in body text, list rows, and inputs */
  inline: 16,
  inlineLg: 18,
  /** 20: interactive action button icons */
  action: 20,
  /** 22: screen header back and action icons */
  header: 22,
  /** 26-28: featured card and toolbar hero icons */
  featured: 26,
  /** 48-64: empty states and large illustration placeholders */
  emptyState: 48,
  emptyStateLg: 64,
} as const;

/**
 * Returns directional back icon name respecting RTL layout.
 * In LTR: points left ('chevron-back'). In RTL: points right ('chevron-forward').
 */
export function getBackIcon(type: 'chevron' | 'arrow' = 'chevron'): IconGlyph {
  const rtl = isRTL();
  if (type === 'arrow') {
    return rtl ? 'arrow-forward' : 'arrow-back';
  }
  return rtl ? 'chevron-forward' : 'chevron-back';
}

/**
 * Returns directional forward / drill-down icon name respecting RTL layout.
 * In LTR: points right ('chevron-forward'). In RTL: points left ('chevron-back').
 */
export function getForwardIcon(type: 'chevron' | 'arrow' = 'chevron'): IconGlyph {
  const rtl = isRTL();
  if (type === 'arrow') {
    return rtl ? 'arrow-back' : 'arrow-forward';
  }
  return rtl ? 'chevron-back' : 'chevron-forward';
}

/**
 * Canonical icon mapping for standard actions and roles across the app.
 * Actions use outline variants; status badges use filled/semantic glyphs.
 */
export const icons = {
  // Navigation
  back: 'chevron-back' as IconGlyph,
  forward: 'chevron-forward' as IconGlyph,
  close: 'close' as IconGlyph,
  menu: 'menu-outline' as IconGlyph,

  // Common Actions (Outline)
  search: 'search' as IconGlyph,
  settings: 'settings-outline' as IconGlyph,
  refresh: 'refresh-outline' as IconGlyph,
  share: 'share-outline' as IconGlyph,
  bookmarkAdd: 'bookmark-outline' as IconGlyph,
  bookmarkSaved: 'bookmark' as IconGlyph,
  delete: 'trash-outline' as IconGlyph,
  edit: 'create-outline' as IconGlyph,
  copy: 'copy-outline' as IconGlyph,
  download: 'cloud-download-outline' as IconGlyph,
  downloaded: 'cloud-done-outline' as IconGlyph,
  check: 'checkmark' as IconGlyph,
  checkmarkCircle: 'checkmark-circle' as IconGlyph,
  add: 'add' as IconGlyph,

  // Media Controls
  play: 'play' as IconGlyph,
  pause: 'pause' as IconGlyph,
  playForward: 'play-forward' as IconGlyph,
  playBack: 'play-back' as IconGlyph,
  volumeHigh: 'volume-high-outline' as IconGlyph,
  volumeMute: 'volume-mute-outline' as IconGlyph,

  // System & Status
  info: 'information-circle-outline' as IconGlyph,
  warning: 'warning-outline' as IconGlyph,
  alert: 'alert-circle-outline' as IconGlyph,
  help: 'help-circle-outline' as IconGlyph,
  location: 'location-outline' as IconGlyph,
  time: 'time-outline' as IconGlyph,
  calendar: 'calendar-outline' as IconGlyph,
  compass: 'compass-outline' as IconGlyph,
  book: 'book-outline' as IconGlyph,
} as const;
