/**
 * Authoritative layout constants and safe-area dependent geometry helpers
 * for unified tab chrome (AppHeader, FloatingNav, TabScreen).
 */

export const HEADER_ROW_HEIGHT = 32;
export const HEADER_FADE = 10;
export const NAV_HEIGHT = 54.5;
export const NAV_SIDE_MARGIN = 14;
export const NAV_RADIUS = 27;

export const CONTENT_GAP = 24;

/** Authoritative shared geometry contract (CONTENT_GAP = 24dp, bottom clearance = 32dp) */
export const SPACING_CONTRACT = {
  CONTENT_GAP: 24,
  BOTTOM_CLEARANCE: 32,
} as const;

export const SUBHEADER_HEIGHT = 54;
export const SHEET_HEADER_HEIGHT = 54;
export const DRAG_PILL_WIDTH = 36;
export const DRAG_PILL_HEIGHT = 5;
export const DRAG_PILL_RADIUS = 2.5;

/** Dynamic formulas based on safe-area insets */
export const HEADER_ROW_TOP = (safeTop: number): number => safeTop + 2;
export const HEADER_BOTTOM = (safeTop: number): number => safeTop + 34;
export const SUBHEADER_BOTTOM = (safeTop: number): number => safeTop + SUBHEADER_HEIGHT;
export const NAV_BOTTOM = (safeBottom: number): number => safeBottom + 14;
export const NAV_TOP = (safeBottom: number): number => NAV_BOTTOM(safeBottom) + NAV_HEIGHT;
export const SCRIM_HEIGHT = (safeBottom: number): number => safeBottom + 14 + NAV_HEIGHT + 24;
export const TAB_PAD_TOP = (_safeTop: number): number => 0;
export const TAB_PAD_BOTTOM = (safeBottom: number): number => NAV_HEIGHT + safeBottom + 14 + 32;

/** Auto-hide navigation configuration for reader screens */
export const READER_AUTOHIDE_NAV = {
  THRESHOLD_Y: 90,
  DELTA_Y: 2,
  RESET_Y: 10,
  DURATION: 180,
} as const;

/** CamelCase helper aliases */
export const getHeaderRowTop = HEADER_ROW_TOP;
export const getHeaderBottom = HEADER_BOTTOM;
export const getSubheaderBottom = SUBHEADER_BOTTOM;
export const getNavBottom = NAV_BOTTOM;
export const getNavTop = NAV_TOP;
export const getScrimHeight = SCRIM_HEIGHT;
export const getTabPadTop = TAB_PAD_TOP;
export const getTabPadBottom = TAB_PAD_BOTTOM;
