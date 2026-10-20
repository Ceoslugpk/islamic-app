import { StyleProp, ViewStyle } from 'react-native';
import { isRTL as isI18nRTL } from './i18n';

/**
 * RTL fix for horizontal ScrollViews / rows.
 *
 * React Native does NOT auto-flip the content direction of a `horizontal`
 * ScrollView in RTL: the row starts at the physical left and overflows off the
 * LEFT edge (off-screen) when the layout direction is RTL. Applying this style
 * to the contentContainerStyle reverses the row so it starts at the
 * direction-start (right in RTL) edge and scrolls correctly.
 *
 * Usage:
 *   <ScrollView horizontal contentContainerStyle={[styles.row, hScrollRTLStyle()]}>
 */
export function hScrollRTLStyle(): StyleProp<ViewStyle> | null {
  return isI18nRTL() ? { flexDirection: 'row-reverse' as const } : null;
}

/**
 * Dynamic layout direction check.
 * Evaluates dynamically from the current active i18n language rather than freezing at import.
 */
export function isRTL(): boolean {
  return isI18nRTL();
}

export { useIsRTL } from './i18n';

export { calculateTimelineRatio } from './timelineRatio';

/**
 * Arabic / Perso-Arabic / Sorani script Unicode ranges.
 * Covers Arabic, Arabic Supplement, Arabic Extended-A, and Arabic Presentation Forms.
 */
const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isArabicScript(text?: string): boolean {
  if (!text) return false;
  return ARABIC_SCRIPT_REGEX.test(text);
}

const KNOWN_RTL_LANG_CODES = new Set(['ar', 'ur', 'fa', 'he', 'ps', 'sd', 'ug', 'dv', 'ckb']);

/**
 * True when a language code or content uses an RTL script (affects translation text alignment).
 * Corrects Kurdish Sorani direction: Sorani Arabic-script translation renders RTL,
 * while Kurdish Latin-script content (e.g. Kurmanji / kmr / Latin text) remains LTR.
 */
export function isRtlScript(lang?: string, content?: string): boolean {
  if (!lang && !content) return false;
  const normalized = lang ? lang.toLowerCase().trim() : '';

  if (KNOWN_RTL_LANG_CODES.has(normalized)) return true;
  if (
    normalized.startsWith('ar-') || normalized.startsWith('ar_') ||
    normalized.startsWith('ur-') || normalized.startsWith('ur_') ||
    normalized.startsWith('fa-') || normalized.startsWith('fa_') ||
    normalized.startsWith('ps-') || normalized.startsWith('ps_') ||
    normalized.startsWith('sd-') || normalized.startsWith('sd_') ||
    normalized.startsWith('ug-') || normalized.startsWith('ug_') ||
    normalized.startsWith('dv-') || normalized.startsWith('dv_') ||
    normalized.startsWith('ckb-') || normalized.startsWith('ckb_') ||
    normalized === 'ku-arab'
  ) {
    return true;
  }

  // Kurdish handling: Sorani Arabic script is RTL, Latin script is LTR
  if (normalized === 'ku' || normalized.startsWith('ku-') || normalized.startsWith('ku_')) {
    if (normalized === 'ku-latn' || normalized === 'kmr') {
      return false;
    }
    if (content) {
      return isArabicScript(content);
    }
    // Default for Kurdish translations in this Quran app (ku.asan by Burhan Muhammad-Amin) is Sorani Arabic script
    return true;
  }

  if (content && isArabicScript(content)) {
    return true;
  }

  return false;
}
