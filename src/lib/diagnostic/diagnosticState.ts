import { useState, useEffect, useCallback } from 'react';
import {
  I18nManager,
  Platform,
  Share,
  Clipboard,
  LayoutChangeEvent,
  StyleSheet,
  Dimensions,
  Appearance,
  StyleProp,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import i18n, { isRTL as isI18nRTL, isRtlLanguage, getBootLanguage } from '../i18n';
import {
  getDiagnosticShareTitle,
  getDiagnosticShareDialogTitle,
} from './diagnosticI18n';
import {
  DIAGNOSTIC_BUILD_ID,
  DIAGNOSTIC_VERSION,
  DIAGNOSTIC_VERSION_CODE,
  isDiagnosticModeEnabled,
} from './diagnosticConfig';
import { useDiagScreen, useDiagParent, getGlobalActiveScreen, setDiagErrorRecorder } from './diagnosticScreenContext';
import { KNOWN_SCREENS } from './diagnosticScreens';

export type DiagnosticTargetId =
  | 'quran-landing-surah-card'
  | 'downloads-empty-cta-card'
  | 'prayer-reminders-selection-controls'
  | 'mosque-finder-search-controls';

export type MeasurementStatus = 'measured' | 'pending' | 'measurementUnavailable';
export type OverflowStatus = 'no_overflow' | 'overflow' | 'unavailable';
export type ClippingStatus = 'not_clipped' | 'clipped' | 'unavailable';

export interface NamedLayoutRect {
  name: string;
  testID: string;
  parentIdentity: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  frameWidth: number | null;
  frameHeight: number | null;
  cardWidth?: number | null;
  cardHeight?: number | null;
  ancestorCard?: string | null;
  isAvailable: boolean;
  frameUnavailable?: boolean;
  measurementUnavailable?: boolean;
  unavailabilityReason?: string;
  staleAfterUnmount?: boolean;
  staleReason?: string;
  edgeOverflow?: {
    overflowsLeft: boolean;
    overflowsTop: boolean;
    overflowsRight: boolean;
    overflowsBottom: boolean;
    hasOverflow: boolean;
  } | null;
  allocationOverflow?: {
    overflowsLeft: boolean;
    overflowsTop: boolean;
    overflowsRight: boolean;
    overflowsBottom: boolean;
    hasOverflow: boolean;
  } | null;
}

export interface TargetLayoutRecord {
  staleAfterUnmount?: boolean;
  staleReason?: string;
  screenId: string;
  componentId: DiagnosticTargetId;
  targetTestId: string;
  parentTestId: string;
  status: MeasurementStatus;
  measurementUnavailable: boolean;
  nativeComputedStyleUnavailable: boolean;
  targetX: number | null;
  targetY: number | null;
  parentX: number | null;
  parentY: number | null;
  targetWidth: number | null;
  targetHeight: number | null;
  textContainerWidth: number | null; // Compatibility alias for targetWidth
  textContainerHeight: number | null; // Compatibility alias for targetHeight
  parentWidth: number | null;
  parentHeight: number | null;
  resolvedContainerLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  parentLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  resolvedStyleTextAlign: string;
  resolvedStyleWritingDirection: string;
  resolvedAlignment: string; // Compatibility alias
  resolvedWritingDirection: string; // Compatibility alias
  actualStyle: {
    textAlign: string;
    writingDirection: string;
  };
  overflowStatus: OverflowStatus;
  clippingStatus: ClippingStatus;
  isWidthOverflowing: boolean | null;
  isHeightOverflowing: boolean | null;
  edgeOverflow?: {
    overflowsLeft: boolean;
    overflowsTop: boolean;
    overflowsRight: boolean;
    overflowsBottom: boolean;
    hasOverflow: boolean;
  } | null;
  overflowDetails: {
    widthOverflow: boolean | null;
    heightOverflow: boolean | null;
    left?: boolean;
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
  };
  rectangles: Record<string, NamedLayoutRect>;
  nativeIsRTL: boolean;
  measuredAt?: string;
  unavailabilityReason?: string;
}

export interface DiagnosticMeasurementReportItem {
  screenId: string;
  componentId: string;
  targetTestId: string;
  parentTestId: string;
  status: MeasurementStatus;
  measurementUnavailable: boolean;
  nativeComputedStyleUnavailable: boolean;
  dimensions: {
    targetX?: number | null;
    targetY?: number | null;
    targetWidth: number | null;
    targetHeight: number | null;
    textContainerWidth: number | null;
    textContainerHeight: number | null;
    parentX?: number | null;
    parentY?: number | null;
    parentWidth: number | null;
    parentHeight: number | null;
  };
  resolvedContainerLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  parentLayout: {
    x?: number | null;
    y?: number | null;
    width: number | null;
    height: number | null;
  };
  resolvedStyleTextAlign: string;
  resolvedStyleWritingDirection: string;
  alignment: {
    textAlign: string;
    writingDirection: string;
  };
  overflow: {
    status: OverflowStatus;
    clippingStatus: ClippingStatus;
    isWidthOverflowing: boolean | null;
    isHeightOverflowing: boolean | null;
    edgeOverflow?: {
      overflowsLeft: boolean;
      overflowsTop: boolean;
      overflowsRight: boolean;
      overflowsBottom: boolean;
      hasOverflow: boolean;
    } | null;
  };
  rectangles: Record<string, NamedLayoutRect>;
  nativeIsRTL: boolean;
}

/**
 * Probe-derived defect classes. `defects.countsByClass` and `defects.totalDefects`
 * count ONLY these, so the established probe-defect accounting is unchanged.
 */
export type DefectClass =
  | 'textTruncated'
  | 'lineBoxTooTight'
  | 'textClipped'
  | 'lineOverlap'
  | 'textRectOverlap'
  | 'subTouchTarget'
  | 'offScreen'
  | 'outsideParent'
  | 'siblingOverlap'
  | 'rtlTextAlignMismatch'
  | 'rtlWritingDirectionSuspicious'
  | 'fixedHeightTextRisk';

/** App-state defect classes; reported in the `appState` section with their own counts. */
export type AppStateDefectClass = 'languageDirectionMismatch' | 'stuckDisabledControl';

export interface DefectItem {
  flag: boolean | null;
  reason?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface ProbeDefects {
  textTruncated: DefectItem;
  lineBoxTooTight: DefectItem;
  textClipped: DefectItem;
  lineOverlap: DefectItem;
  textRectOverlap: DefectItem;
  subTouchTarget: DefectItem;
  offScreen: DefectItem;
  outsideParent: DefectItem;
  siblingOverlap: DefectItem;
  rtlTextAlignMismatch: DefectItem;
  rtlWritingDirectionSuspicious: DefectItem;
  fixedHeightTextRisk: DefectItem;
}

export interface DiagnosticDefectReportItem {
  probeId: string;
  defectClass: DefectClass;
  screen: string;
  parentIdentity?: string;
  reason?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface DiagnosticTextLineMetric {
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  ascender: number | null;
  descender: number | null;
}

export type InteractionEffect = 'navigated' | 'stateChanged' | 'noObservableEffect' | 'error';

export interface DiagnosticInteractionRecord {
  id: string;
  screen: string;
  language: string;
  theme: 'light' | 'dark';
  timestamp: string;
  handlerPresent: boolean;
  disabled: boolean;
  effect: InteractionEffect;
  targetScreen?: string;
  errorName?: string;
}

export interface DiagnosticLanguageMatrixItem {
  probeId: string;
  screen: string;
  captures: Record<
    string,
    {
      width: number | null;
      height: number | null;
      textAlign?: string;
      writingDirection?: string;
      timestamp?: string;
    }
  >;
  languageGeometryMismatch: boolean;
  needsRevisit?: boolean;
  reason?: string;
}

export interface DiagnosticThemeMatrixItem {
  probeId: string;
  screen: string;
  light?: { width: number | null; height: number | null; timestamp?: string };
  dark?: { width: number | null; height: number | null; timestamp?: string };
  themeGeometryMismatch: boolean;
  needsRevisit?: boolean;
  reason?: string;
}

export interface DiagnosticNetworkRecord {
  host: string;
  path: string;
  method: string;
  status: number;
  statusText?: string;
  ok: boolean;
  durationMs: number;
  errorClassName?: string;
  retryCount: number | null;
  timeout: boolean;
  offline: boolean;
  cachedFallback: boolean;
  timestamp: string;
}

export interface DiagnosticNetworkSummary {
  total: number;
  ok: number;
  failed: number;
  transportFailures: number;
  statusClassBreakdown: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
    'network/0': number;
  };
  humanReadableStatus?: string;
  timeouts: number;
  offlineFallbacks: number;
  slowestCall: { host: string; path: string; method: string; durationMs: number } | null;
}

export interface DiagnosticControlRecord {
  id: string;
  screen: string;
  kind: string;
  disabled: boolean;
  disabledSince: number | null;
  pressCount: number;
  lastPressedAt: string | null;
  firstSeen: string;
  lastSeen: string;
}

/** A control id is composed as `<screen>::<kind>::<readable-name>`, e.g. `Settings::row::font-size`. */
export interface DiagnosticControlPressOptions {
  onPress?: (e?: any) => void;
  disabled?: boolean;
  testID?: string;
  targetScreen?: string;
}

export interface DiagnosticControlProbeResult {
  onPress?: (e?: any) => void;
  testID?: string;
  controlId: string;
}

export interface DiagnosticActionableErrorGroup {
  errorClass: string;
  screen: string;
  controlId: string | null;
  source: string;
  occurrences: number;
  lastSeen: string;
}

export interface DiagnosticErrorRecord {
  timestamp: string;
  errorName: string;
  messageClass: string;
  screen: string;
  language: string;
  theme: 'light' | 'dark';
  controlId?: string;
  source?: 'render' | 'press' | 'async' | 'global';
  treeStillRenders?: boolean;
  occurrences?: number;
}

export interface DiagnosticControlCoverage {
  totalInstrumented: number;
  totalPressed: number;
  unpressedCount: number;
  coveragePercent: number;
  byScreen: Record<string, {
    instrumented: string[];
    pressed: string[];
    unpressed: string[];
  }>;
  unpressedScreensWithInstrumentedControls: string[];
  unpressedControlIds: string[];
}

export interface DiagnosticCoverage {
  screensVisited: string[];
  screensUnvisited: string[];
  visitedCount: number;
  unvisitedCount: number;
  coveragePercent: number;
  interactiveControls?: DiagnosticControlCoverage;
  unpressedScreensWithInstrumentedControls?: string[];
}

export interface DiagnosticLanguageSwitchAttempt {
  id: string;
  fromLanguage: string;
  toLanguage: string;
  requestedAt: string;
  reloadRequested: boolean;
  status: 'pending' | 'resolved' | 'rejected' | 'noRestartObserved';
  elapsedMs: number;
  completedAt?: string;
  errorClass?: string;
  reason?: string;
}

/** Handle returned by beginLanguageSwitch(); all methods are no-ops when the gate is off. */
export interface DiagnosticLanguageSwitchHandle {
  id: string;
  markReloadRequested(): void;
  markResolved(): void;
  markRejected(err?: any): void;
  markNoRestart(): void;
}

export interface DiagnosticConsistencyVerdict {
  persistedLanguage: string;
  resolvedLanguage: string;
  i18nManagerIsRTL: boolean;
  appDirection: 'rtl' | 'ltr';
  agrees: boolean;
  verdict: 'consistent' | 'languageDirectionMismatch';
  reason?: string;
  lastChecked: string;
}

export interface DiagnosticAppStateDefect {
  defectClass: AppStateDefectClass;
  screen: string;
  controlId?: string;
  reason: string;
}

export interface DiagnosticAppState {
  consistency: DiagnosticConsistencyVerdict;
  languageSwitchAttempts: {
    total: number;
    pendingCount: number;
    items: DiagnosticLanguageSwitchAttempt[];
  };
  controls: {
    totalInstrumented: number;
    pressedCount: number;
    totalDisabled: number;
    stuckDisabledCount: number;
    stuckControlIds: string[];
  };
  defects: DiagnosticAppStateDefect[];
  defectsByClass: Record<AppStateDefectClass, number>;
}

export interface AutoProbeRecord {
  id: string;
  kind: string;
  screen: string;
  language: string;
  theme: 'light' | 'dark';
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
  measuredAt: string | null;
  staleAfterUnmount: boolean;
  staleReason?: string;
  measurementUnavailable: boolean;
  unavailabilityReason?: string;
  overflow: {
    status: OverflowStatus;
    reason?: string;
    hasOverflow: boolean;
    overflowsLeft?: boolean;
    overflowsTop?: boolean;
    overflowsRight?: boolean;
    overflowsBottom?: boolean;
  } | null;
  overflowStatus: 'unknown' | 'no_overflow' | 'overflow';
  reason?: string;
  isText?: boolean;
  isInteractive?: boolean;
  resolvedFontSize?: number | null;
  resolvedLineHeight?: number | 'auto' | null;
  explicitLineHeight?: number | null;
  fontFamily?: string | null;
  textScript?: string | null;
  textCategory?: 'ui' | 'title' | 'numeral' | null;
  numberOfLines?: number;
  reportedLineCount?: number;
  reportedTotalLineHeight?: number;
  textLines?: DiagnosticTextLineMetric[];
  horizontalScrollableAncestor?: boolean;
  measuredContainerHeight?: number | null;
  containerFixedStyleHeight?: number;
  resolvedStyleTextAlign?: string;
  resolvedStyleWritingDirection?: string;
  parentIdentity?: string | null;
  hasScrollableAncestor?: boolean;
  scrollable?: boolean;
  defects: ProbeDefects;
}

export type DiagnosticProbeReportItem = AutoProbeRecord;

export interface DiagnosticReport {
  timestamp: string;
  buildId: string;
  version: string;
  versionCode: number;
  locale: string;
  theme: 'light' | 'dark';
  directionHelperResult: 'rtl' | 'ltr';
  i18nManagerIsRTL: boolean;
  probeCount: number;
  probes: DiagnosticProbeReportItem[];
  probesTruncated?: boolean;
  totalProbes?: number;
  includedProbes?: number;
  probesKept?: 'all' | 'newest' | 'defect-probes+newest' | 'oldest';
  defects: {
    countsByClass: Record<DefectClass, number>;
    totalDefects: number;
    items: DiagnosticDefectReportItem[];
    defectsTruncated?: boolean;
    includedDefects?: number;
    kept?: 'all' | 'newest' | 'newest-per-class' | 'defect-probes+newest' | 'oldest';
    defectClassesDropped?: DefectClass[];
  };
  interactions: {
    total: number;
    countsByEffect: Record<InteractionEffect, number>;
    items: DiagnosticInteractionRecord[];
    itemsTruncated?: boolean;
  };
  languageMatrix: {
    mismatchCount: number;
    items: DiagnosticLanguageMatrixItem[];
    itemsTruncated?: boolean;
  };
  themeMatrix: {
    mismatchCount: number;
    items: DiagnosticThemeMatrixItem[];
    itemsTruncated?: boolean;
  };
  network: {
    summary: DiagnosticNetworkSummary;
    items: DiagnosticNetworkRecord[];
    itemsTruncated?: boolean;
  };
  errors: {
    total: number;
    items: DiagnosticErrorRecord[];
    itemsTruncated?: boolean;
    /** Grouped, de-duplicated view: error class + screen + control id + how many times. */
    groups: DiagnosticActionableErrorGroup[];
  };
  /** App-state domain: language-switch attempts, language/direction verdict, stuck controls. */
  appState: DiagnosticAppState;
  coverage: DiagnosticCoverage;
  /** Plain-language statement of what this session's captured evidence can support. */
  coverageVerdict: string;
  summary: {
    probeCount: number;
    totalDefects: number;
    interactionCount: number;
    networkRequestCount: number;
    errorCount: number;
    visitedScreensCount: number;
    instrumentedControls: number;
    pressedControls: number;
    stuckDisabledControls: number;
    appStateDefects: number;
  };
  screensVisited: string[];
  screensUnvisited: string[];
  measurements: DiagnosticMeasurementReportItem[];
  truncation?: {
    wasTruncated: boolean;
    trimmed: string[];
    reasons?: string[];
    finalSizeBytes?: number;
    maxBytes?: number;
  };
}

export type ExportStatus =
  | 'success'
  | 'fileReady'
  | 'userActionRequired'
  | 'cancelledOrUnknown'
  | 'cancelled'
  | 'failed'
  | 'unavailable'
  | 'shareInvoked'; // compatibility alias

export type ShareStatus = 'unknown' | 'completed' | 'cancelled' | 'unavailable';

export interface ExportReportOptions {
  summaryOnly?: boolean;
}

export interface ExportReportResult {
  success: boolean;
  status: ExportStatus;
  shareStatus: ShareStatus;
  fileReady: boolean;
  shareInvoked?: boolean;
  error?: string;
  filePath?: string;
  fileSizeBytes?: number;
  clipboardCopied?: boolean;
  message?: string;
}

const DEFAULT_TARGETS: Record<
  DiagnosticTargetId,
  {
    screenId: string;
    targetTestId: string;
    parentTestId: string;
  }
> = {
  'quran-landing-surah-card': {
    screenId: 'QuranLanding',
    targetTestId: 'quran-landing-surah-card-text',
    parentTestId: 'surah-row-1',
  },
  'downloads-empty-cta-card': {
    screenId: 'Downloads',
    targetTestId: 'downloads-empty-cta-text',
    parentTestId: 'downloads-empty-cta-card',
  },
  'prayer-reminders-selection-controls': {
    screenId: 'PrayerReminders',
    targetTestId: 'prayer-reminders-selection-controls',
    parentTestId: 'prayer-reminders-selection-card',
  },
  'mosque-finder-search-controls': {
    screenId: 'MosqueFinder',
    targetTestId: 'mosque-finder-search-controls',
    parentTestId: 'mosque-finder-search-card',
  },
};

const DEFAULT_NAMED_RECTS: Record<
  DiagnosticTargetId,
  { name: string; testID: string; parentIdentity: string; ancestorCard?: string }[]
> = {
  'quran-landing-surah-card': [
    { name: 'parent', testID: 'surah-row-1', parentIdentity: 'detail-screen-root' },
    { name: 'target', testID: 'quran-landing-surah-card-text', parentIdentity: 'surah-row-1' },
  ],
  'downloads-empty-cta-card': [
    { name: 'parent', testID: 'downloads-empty-cta-card', parentIdentity: 'downloads-list-viewport' },
    { name: 'button', testID: 'downloads-empty-cta-btn', parentIdentity: 'downloads-empty-cta-card', ancestorCard: 'downloads-empty-cta-card' },
    { name: 'gradient', testID: 'downloads-empty-cta-gradient', parentIdentity: 'downloads-empty-cta-btn', ancestorCard: 'downloads-empty-cta-card' },
    { name: 'label', testID: 'downloads-empty-cta-btn-label', parentIdentity: 'downloads-empty-cta-gradient', ancestorCard: 'downloads-empty-cta-card' },
    { name: 'listViewport', testID: 'downloads-list-viewport', parentIdentity: 'detail-screen-root' },
  ],
  'prayer-reminders-selection-controls': [
    { name: 'parent', testID: 'prayer-reminders-selection-card', parentIdentity: 'detail-screen-root' },
    { name: 'chipSelected', testID: 'prayer-reminders-chip-0', parentIdentity: 'prayer-reminders-selection-controls', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'chipUnselected', testID: 'prayer-reminders-chip-5', parentIdentity: 'prayer-reminders-selection-controls', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'gradient', testID: 'prayer-reminders-chip-gradient', parentIdentity: 'prayer-reminders-chip-0', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'label', testID: 'prayer-reminders-chip-label', parentIdentity: 'prayer-reminders-chip-gradient', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'unselectedGradient', testID: 'prayer-reminders-chip-unselected-gradient', parentIdentity: 'prayer-reminders-chip-5', ancestorCard: 'prayer-reminders-selection-card' },
    { name: 'unselectedLabel', testID: 'prayer-reminders-chip-unselected-label', parentIdentity: 'prayer-reminders-chip-5', ancestorCard: 'prayer-reminders-selection-card' },
  ],
  'mosque-finder-search-controls': [
    { name: 'parent', testID: 'mosque-finder-search-card', parentIdentity: 'detail-screen-root' },
    { name: 'searchField', testID: 'mosque-finder-search-field', parentIdentity: 'mosque-finder-search-controls', ancestorCard: 'mosque-finder-search-card' },
    { name: 'textInput', testID: 'mosque-finder-search-input', parentIdentity: 'mosque-finder-search-field', ancestorCard: 'mosque-finder-search-card' },
    { name: 'button', testID: 'mosque-finder-find-btn', parentIdentity: 'mosque-finder-search-controls', ancestorCard: 'mosque-finder-search-card' },
    { name: 'buttonGradient', testID: 'mosque-finder-find-btn-gradient', parentIdentity: 'mosque-finder-find-btn', ancestorCard: 'mosque-finder-search-card' },
    { name: 'buttonLabel', testID: 'mosque-finder-find-btn-label', parentIdentity: 'mosque-finder-find-btn-gradient', ancestorCard: 'mosque-finder-search-card' },
    { name: 'radiusSelected', testID: 'mosque-finder-radius-chip-selected', parentIdentity: 'mosque-finder-radius-pills', ancestorCard: 'mosque-finder-search-card' },
    { name: 'radiusUnselected', testID: 'mosque-finder-radius-chip-unselected', parentIdentity: 'mosque-finder-radius-pills', ancestorCard: 'mosque-finder-search-card' },
    { name: 'listViewport', testID: 'mosque-finder-list-viewport', parentIdentity: 'detail-screen-root' },
    { name: 'resultRow', testID: 'mosque-finder-result-row-0', parentIdentity: 'mosque-finder-list-viewport' },
  ],
};

function createInitialStore(): Record<DiagnosticTargetId, TargetLayoutRecord> {
  const store = {} as Record<DiagnosticTargetId, TargetLayoutRecord>;
  (Object.keys(DEFAULT_TARGETS) as DiagnosticTargetId[]).forEach((id) => {
    const rects: Record<string, NamedLayoutRect> = {};
    (DEFAULT_NAMED_RECTS[id] || []).forEach((spec) => {
      rects[spec.name] = {
        name: spec.name,
        testID: spec.testID,
        parentIdentity: spec.parentIdentity,
        x: null,
        y: null,
        width: null,
        height: null,
        frameWidth: null,
        frameHeight: null,
        cardWidth: null,
        cardHeight: null,
        ancestorCard: spec.ancestorCard || null,
        isAvailable: false,
        frameUnavailable: true,
        measurementUnavailable: true,
        unavailabilityReason: 'Pending layout measurement',
        edgeOverflow: null,
        allocationOverflow: null,
      };
    });

    store[id] = {
      screenId: DEFAULT_TARGETS[id].screenId,
      componentId: id,
      targetTestId: DEFAULT_TARGETS[id].targetTestId,
      parentTestId: DEFAULT_TARGETS[id].parentTestId,
      status: 'pending',
      measurementUnavailable: true,
      nativeComputedStyleUnavailable: true,
      targetX: null,
      targetY: null,
      parentX: null,
      parentY: null,
      targetWidth: null,
      targetHeight: null,
      textContainerWidth: null,
      textContainerHeight: null,
      parentWidth: null,
      parentHeight: null,
      resolvedContainerLayout: { x: null, y: null, width: null, height: null },
      parentLayout: { x: null, y: null, width: null, height: null },
      resolvedStyleTextAlign: 'unavailable',
      resolvedStyleWritingDirection: 'unavailable',
      resolvedAlignment: 'unavailable',
      resolvedWritingDirection: 'unavailable',
      actualStyle: {
        textAlign: 'unavailable',
        writingDirection: 'unavailable',
      },
      overflowStatus: 'unavailable',
      clippingStatus: 'unavailable',
      isWidthOverflowing: null,
      isHeightOverflowing: null,
      edgeOverflow: null,
      overflowDetails: {
        widthOverflow: null,
        heightOverflow: null,
        left: false,
        top: false,
        right: false,
        bottom: false,
      },
      rectangles: rects,
      nativeIsRTL: Boolean(I18nManager.isRTL),
    };
  });
  return store;
}

let measurementsStore: Record<DiagnosticTargetId, TargetLayoutRecord> = createInitialStore();
let probeStore: Record<string, AutoProbeRecord> = {};
let probeLRUOrder: string[] = [];

export const MAX_AUTO_PROBES = 400;
/**
 * Text layout can arrive before its matching onLayout event. Keep only a bounded
 * number of those orphaned metric sets until a layout record appears; an element
 * that never lays out must not grow this store without limit.
 */
export const MAX_PENDING_TEXT_LAYOUTS = MAX_AUTO_PROBES;
export const MAX_INTERACTION_ENTRIES = 200;
export const MAX_NETWORK_ENTRIES = 200;
export const MAX_ERROR_ENTRIES = 50;

let interactionLedger: DiagnosticInteractionRecord[] = [];
let networkLedger: DiagnosticNetworkRecord[] = [];
let errorLedger: DiagnosticErrorRecord[] = [];

const probeLanguageHistory = new Map<
  string,
  Map<string, { width: number | null; height: number | null; x: number | null; y: number | null; textAlign?: string; writingDirection?: string; timestamp: string }>
>();

const probeThemeHistory = new Map<
  string,
  Map<'light' | 'dark', { width: number | null; height: number | null; x: number | null; y: number | null; timestamp: string }>
>();

let activeThemeMode: 'light' | 'dark' = 'light';
let activeLanguageMode: string | null = null;
const pendingTextLayouts = new Map<string, DiagnosticTextLineMetric[]>();
let pendingTextLayoutOrder: string[] = [];

export function setDiagnosticActiveTheme(theme: 'light' | 'dark'): void {
  activeThemeMode = theme;
}

export function setDiagnosticActiveLanguage(lang: string | null): void {
  activeLanguageMode = lang;
}

export function getActiveTheme(): 'light' | 'dark' {
  if (activeThemeMode) return activeThemeMode;
  try {
    return Appearance?.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function getActiveLanguage(): string {
  if (activeLanguageMode) return activeLanguageMode;
  return i18n?.language || 'en';
}

const monotonicCounters: Record<string, number> = {};
const ancestorKindCounters: Record<string, number> = {};
let probeMutationSeq = 0;
const globalPendingTimers = new Set<any>();

export function getProbeMutationSeq(): number {
  return probeMutationSeq;
}

export function incrementProbeMutationSeq(): void {
  probeMutationSeq++;
}

export function getNextMonotonicProbeId(kind: string = 'probe'): string {
  monotonicCounters[kind] = (monotonicCounters[kind] || 0) + 1;
  return `auto-${kind}-${monotonicCounters[kind]}`;
}

export function getNextAncestorProbeIndex(ancestorId: string, kind: string = 'probe'): number {
  const key = `${ancestorId}::${kind}`;
  ancestorKindCounters[key] = (ancestorKindCounters[key] || 0) + 1;
  return ancestorKindCounters[key];
}

export function getNextProbeInstanceSeq(): number {
  monotonicCounters.__instance = (monotonicCounters.__instance || 0) + 1;
  return monotonicCounters.__instance;
}

export function resetMonotonicCounters(): void {
  for (const k of Object.keys(monotonicCounters)) {
    delete monotonicCounters[k];
  }
  for (const k of Object.keys(ancestorKindCounters)) {
    delete ancestorKindCounters[k];
  }
}

export function clearGlobalPendingTimers(): void {
  globalPendingTimers.forEach((t) => clearTimeout(t));
  globalPendingTimers.clear();
}

export function resetDiagnosticProbes(): void {
  clearGlobalPendingTimers();
  probeMutationSeq = 0;
  probeStore = {};
  probeLRUOrder = [];
  pendingTextLayouts.clear();
  pendingTextLayoutOrder = [];
  interactionLedger = [];
  networkLedger = [];
  errorLedger = [];
  controlRegistry.clear();
  languageSwitchAttempts = [];
  switchAttemptSeq = 0;
  lastConsistencyVerdict = null;
  probeLanguageHistory.clear();
  probeThemeHistory.clear();
  activeLanguageMode = null;
  activeThemeMode = 'light';
  resetMonotonicCounters();
  notifyListeners();
}

export function getAutoProbes(): AutoProbeRecord[] {
  return Object.values(probeStore);
}

export function getAutoProbe(id: string): AutoProbeRecord | undefined {
  return probeStore[id];
}

export function getInteractionLedger(): DiagnosticInteractionRecord[] {
  return [...interactionLedger];
}

export function getNetworkLedger(): DiagnosticNetworkRecord[] {
  return [...networkLedger];
}

export function getErrorLedger(): DiagnosticErrorRecord[] {
  return [...errorLedger];
}

// ---------------------------------------------------------------------------
// U1/U4: screen-level interactive control registry, app-state and stuck controls
// ---------------------------------------------------------------------------

export const MAX_CONTROL_RECORDS = 250;
/** A control disabled longer than this, with nothing in flight to explain it, is a defect. */
export const STUCK_DISABLED_THRESHOLD_MS = 4000;
export const MAX_LANGUAGE_SWITCH_ATTEMPTS = 25;

const controlRegistry = new Map<string, DiagnosticControlRecord>();
let languageSwitchAttempts: DiagnosticLanguageSwitchAttempt[] = [];
let switchAttemptSeq = 0;
let lastConsistencyVerdict: DiagnosticConsistencyVerdict | null = null;

export function getControlRegistry(): DiagnosticControlRecord[] {
  return [...controlRegistry.values()];
}

/**
 * Records an interactive control and its current disabled state after the owning
 * control has committed. A no-op when the gate is off.
 */
export function recordControlState(
  controlId: string,
  kind: string,
  screen: string,
  disabled: boolean
): void {
  if (!isDiagnosticModeEnabled() || !controlId) return;
  const nowMs = Date.now();
  const iso = new Date(nowMs).toISOString();
  const nextDisabled = Boolean(disabled);
  const existing = controlRegistry.get(controlId);
  if (!existing) {
    if (controlRegistry.size >= MAX_CONTROL_RECORDS) {
      // Evict the least recently seen control that was never pressed.
      let victim: DiagnosticControlRecord | null = null;
      for (const rec of controlRegistry.values()) {
        if (rec.pressCount > 0) continue;
        if (!victim || rec.lastSeen < victim.lastSeen) victim = rec;
      }
      if (victim) controlRegistry.delete(victim.id);
    }
    controlRegistry.set(controlId, {
      id: controlId,
      screen: screen || 'App',
      kind,
      disabled: nextDisabled,
      disabledSince: nextDisabled ? nowMs : null,
      pressCount: 0,
      lastPressedAt: null,
      firstSeen: iso,
      lastSeen: iso,
    });
    return;
  }
  existing.lastSeen = iso;
  if (screen) existing.screen = screen;
  if (existing.disabled !== nextDisabled) {
    existing.disabled = nextDisabled;
    existing.disabledSince = nextDisabled ? nowMs : null;
  }
}

export function recordControlPress(controlId: string): void {
  if (!isDiagnosticModeEnabled()) return;
  const rec = controlRegistry.get(controlId);
  if (!rec) return;
  rec.pressCount += 1;
  rec.lastPressedAt = new Date().toISOString();
}

/**
 * Controls left disabled past STUCK_DISABLED_THRESHOLD_MS with no in-flight operation
 * to explain it. This is the reported case: the language rows and the Appearance
 * `Segmented` are gated on `isSwitchingLanguage`, so a flag that is never cleared
 * leaves them dead for the whole session with no error shown anywhere.
 */
export function evaluateStuckControls(nowMs: number = Date.now()): DiagnosticControlRecord[] {
  if (!isDiagnosticModeEnabled()) return [];
  // ponytail: one global exemption for a fresh switch; per-screen if a second lock appears.
  const hasFreshPendingSwitch = languageSwitchAttempts.some(
    (a) => a.status === 'pending' && nowMs - Date.parse(a.requestedAt) <= STUCK_DISABLED_THRESHOLD_MS
  );
  if (hasFreshPendingSwitch) return [];
  return getControlRegistry().filter(
    (c) => c.disabled && c.disabledSince !== null && nowMs - c.disabledSince >= STUCK_DISABLED_THRESHOLD_MS
  );
}

const NOOP_SWITCH_HANDLE: DiagnosticLanguageSwitchHandle = {
  id: '',
  markReloadRequested() {},
  markResolved() {},
  markRejected() {},
  markNoRestart() {},
};

export function beginLanguageSwitch(
  fromLanguage: string,
  toLanguage: string,
  options?: { reloadRequested?: boolean }
): DiagnosticLanguageSwitchHandle {
  if (!isDiagnosticModeEnabled()) return NOOP_SWITCH_HANDLE;

  const requestedAtMs = Date.now();
  if (languageSwitchAttempts.length >= MAX_LANGUAGE_SWITCH_ATTEMPTS) {
    languageSwitchAttempts.shift();
  }
  const attempt: DiagnosticLanguageSwitchAttempt = {
    id: `switch-${++switchAttemptSeq}`,
    fromLanguage,
    toLanguage,
    requestedAt: new Date(requestedAtMs).toISOString(),
    reloadRequested: Boolean(options?.reloadRequested),
    status: 'pending',
    elapsedMs: 0,
  };
  languageSwitchAttempts.push(attempt);

  const finish = (
    status: DiagnosticLanguageSwitchAttempt['status'],
    errorClass?: string
  ): void => {
    // First outcome wins: a later fail-safe must not rewrite a recorded rejection.
    if (attempt.status !== 'pending') return;
    const nowMs = Date.now();
    attempt.status = status;
    attempt.elapsedMs = Math.max(0, nowMs - requestedAtMs);
    attempt.completedAt = new Date(nowMs).toISOString();
    if (errorClass) attempt.errorClass = errorClass;
    notifyListeners();
  };

  return {
    id: attempt.id,
    markReloadRequested() {
      attempt.reloadRequested = true;
    },
    markResolved() {
      finish('resolved');
    },
    markRejected(err?: any) {
      finish('rejected', sanitizeErrorMessageClass(err).errorName);
    },
    markNoRestart() {
      finish('noRestartObserved');
    },
  };
}

export function getLanguageSwitchAttempts(): DiagnosticLanguageSwitchAttempt[] {
  return languageSwitchAttempts.map((a) => ({ ...a }));
}

/**
 * Language/direction consistency verdict. A half-switched app (language says one
 * direction, the native layout says the other) is exactly how taps end up on the
 * wrong targets, so disagreement is recorded as a `languageDirectionMismatch` defect.
 */
/**
 * Direction the resolved language implies. Uses the app's own i18n helper; the fallback
 * (same RTL script set) is reachable only in a harness that stubs i18n without it, so a
 * partial environment can never crash the report builder.
 */
function rtlExpectationFor(language: string): boolean {
  try {
    if (typeof isRtlLanguage === 'function') return Boolean(isRtlLanguage(language));
  } catch {
    /* fall through to the local classification */
  }
  return /^(ur|ar|ps|ckb|fa|ug|he|sd|dv)\b/i.test(String(language || '').trim().toLowerCase());
}

export function evaluateConsistency(nowMs: number = Date.now()): DiagnosticConsistencyVerdict {
  let persistedLanguage = '';
  try {
    persistedLanguage = getBootLanguage() || '';
  } catch {
    persistedLanguage = '';
  }
  const resolvedLanguage = getActiveLanguage();
  const i18nManagerIsRTL = Boolean(I18nManager.isRTL);
  const expectedRtl = rtlExpectationFor(resolvedLanguage);
  let appIsRtl = expectedRtl;
  try {
    appIsRtl = isI18nRTL();
  } catch {
    appIsRtl = expectedRtl;
  }

  const reasons: string[] = [];
  if (i18nManagerIsRTL !== expectedRtl) {
    reasons.push(
      `native I18nManager.isRTL=${i18nManagerIsRTL} but language "${resolvedLanguage}" expects ${expectedRtl ? 'rtl' : 'ltr'}`
    );
  }
  if (appIsRtl !== expectedRtl) {
    reasons.push(`app direction helper reports ${appIsRtl ? 'rtl' : 'ltr'} for language "${resolvedLanguage}"`);
  }
  if (persistedLanguage && persistedLanguage !== resolvedLanguage) {
    reasons.push(`persisted language "${persistedLanguage}" differs from resolved "${resolvedLanguage}"`);
  }

  const agrees = reasons.length === 0;
  return {
    persistedLanguage,
    resolvedLanguage,
    i18nManagerIsRTL,
    appDirection: appIsRtl ? 'rtl' : 'ltr',
    agrees,
    verdict: agrees ? 'consistent' : 'languageDirectionMismatch',
    reason: agrees ? undefined : reasons.join('; '),
    lastChecked: new Date(nowMs).toISOString(),
  };
}

/** Records the current verdict (boot, and after every language switch). Gate-gated. */
export function recordConsistencyCheck(nowMs: number = Date.now()): DiagnosticConsistencyVerdict | null {
  const verdict = evaluateConsistency(nowMs);
  if (!isDiagnosticModeEnabled()) return null;
  lastConsistencyVerdict = verdict;
  notifyListeners();
  return verdict;
}

export function getLastConsistencyVerdict(): DiagnosticConsistencyVerdict | null {
  return lastConsistencyVerdict ? { ...lastConsistencyVerdict } : null;
}

export function buildDiagnosticAppState(nowMs: number = Date.now()): DiagnosticAppState {
  const consistency = lastConsistencyVerdict || evaluateConsistency(nowMs);

  const items: DiagnosticLanguageSwitchAttempt[] = languageSwitchAttempts.map((a) => {
    const copy: DiagnosticLanguageSwitchAttempt = { ...a };
    const age = nowMs - Date.parse(copy.requestedAt);
    // A switch that is still pending long after it was requested never restarted the
    // app: saying "pending" forever would hide exactly the bug the user reported.
    if (copy.status === 'pending' && age > STUCK_DISABLED_THRESHOLD_MS) {
      copy.status = 'noRestartObserved';
      copy.elapsedMs = age;
      copy.reason = `still pending after ${age} ms: no restart observed and the switch never completed`;
    }
    return copy;
  });

  const controls = getControlRegistry();
  const stuck = evaluateStuckControls(nowMs);

  const defects: DiagnosticAppStateDefect[] = [];
  if (consistency.verdict === 'languageDirectionMismatch') {
    defects.push({
      defectClass: 'languageDirectionMismatch',
      screen: getGlobalActiveScreen() || 'App',
      reason: consistency.reason || 'language and layout direction disagree',
    });
  }
  for (const rec of stuck) {
    defects.push({
      defectClass: 'stuckDisabledControl',
      screen: rec.screen,
      controlId: rec.id,
      reason: `disabled for ${nowMs - (rec.disabledSince || nowMs)} ms with no in-flight operation to explain it`,
    });
  }

  const defectsByClass: Record<AppStateDefectClass, number> = {
    languageDirectionMismatch: 0,
    stuckDisabledControl: 0,
  };
  for (const defect of defects) defectsByClass[defect.defectClass]++;

  return {
    consistency,
    languageSwitchAttempts: {
      total: items.length,
      pendingCount: items.filter((a) => a.status === 'pending').length,
      items,
    },
    controls: {
      totalInstrumented: controls.length,
      pressedCount: controls.filter((c) => c.pressCount > 0).length,
      totalDisabled: controls.filter((c) => c.disabled).length,
      stuckDisabledCount: stuck.length,
      stuckControlIds: stuck.map((c) => c.id).sort(),
    },
    defects,
    defectsByClass,
  };
}

/** Instrumented vs actually pressed, per screen. A report cannot look complete while
 *  a whole screen's controls were never wired or never touched. */
export function buildInteractiveControlCoverage(): DiagnosticControlCoverage {
  const byScreen: Record<string, { instrumented: string[]; pressed: string[]; unpressed: string[] }> = {};
  const records = getControlRegistry();
  let pressedCount = 0;
  for (const rec of records) {
    if (!byScreen[rec.screen]) byScreen[rec.screen] = { instrumented: [], pressed: [], unpressed: [] };
    byScreen[rec.screen].instrumented.push(rec.id);
    if (rec.pressCount > 0) {
      byScreen[rec.screen].pressed.push(rec.id);
      pressedCount++;
    } else {
      byScreen[rec.screen].unpressed.push(rec.id);
    }
  }
  for (const screen of Object.keys(byScreen)) {
    byScreen[screen].instrumented.sort();
    byScreen[screen].pressed.sort();
    byScreen[screen].unpressed.sort();
  }
  const unpressedScreens = Object.keys(byScreen).filter((s) => byScreen[s].pressed.length === 0).sort();
  return {
    totalInstrumented: records.length,
    totalPressed: pressedCount,
    unpressedCount: records.length - pressedCount,
    coveragePercent: records.length > 0 ? Math.round((pressedCount / records.length) * 100) : 0,
    byScreen,
    unpressedScreensWithInstrumentedControls: unpressedScreens,
    unpressedControlIds: records.filter((r) => r.pressCount === 0).map((r) => r.id).sort(),
  };
}

export function recordInteraction(record: DiagnosticInteractionRecord): void {
  if (!isDiagnosticModeEnabled()) return;
  if (interactionLedger.length >= MAX_INTERACTION_ENTRIES) {
    interactionLedger.shift();
  }
  interactionLedger.push(record);
  notifyListeners();
}

export function sanitizeNetworkUrl(input: any): { host: string; path: string } {
  try {
    const rawUrl = typeof input === 'string' ? input : input?.url || '';
    if (!rawUrl) return { host: 'unknown', path: '/' };

    const match = rawUrl.match(/^https?:\/\/([^/?#]+)([^?#]*)/i);
    if (match) {
      // Strip any userinfo (credentials) so a URL like https://user:pass@host/x
      // can never leak a secret into the report.
      const host = match[1].toLowerCase().replace(/^[^@]*@/, '').replace(/[^a-z0-9.\-:]/g, '');
      const path = match[2] || '/';
      return { host, path };
    }
    const relMatch = rawUrl.match(/^([^?#]*)/);
    return { host: 'internal', path: relMatch ? relMatch[1] : '/' };
  } catch {
    return { host: 'unknown', path: '/' };
  }
}

export function recordDiagnosticNetworkEvent(event: DiagnosticNetworkRecord): void {
  if (!isDiagnosticModeEnabled()) return;
  if (networkLedger.length >= MAX_NETWORK_ENTRIES) {
    networkLedger.shift();
  }
  networkLedger.push(event);
  notifyListeners();
}

export function recordDiagnosticNetworkFallback(details: {
  host: string;
  path: string;
  method?: string;
  status?: number;
}): void {
  if (!isDiagnosticModeEnabled()) return;
  recordDiagnosticNetworkEvent({
    host: details.host,
    path: details.path,
    method: (details.method || 'GET').toUpperCase(),
    status: details.status ?? 200,
    ok: true,
    durationMs: 0,
    retryCount: null,
    timeout: false,
    offline: false,
    cachedFallback: true,
    timestamp: new Date().toISOString(),
  });
}

let originalGlobalFetch: typeof fetch | null = null;
let isFetchInterceptionInstalled = false;

export function installDiagnosticNetworkInterceptor(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (isFetchInterceptionInstalled) return;
  if (typeof globalThis.fetch !== 'function') return;

  originalGlobalFetch = globalThis.fetch;
  isFetchInterceptionInstalled = true;

  globalThis.fetch = async function diagnosticWrappedFetch(
    input: any,
    init?: any
  ): Promise<Response> {
    if (!isDiagnosticModeEnabled()) {
      return originalGlobalFetch!(input, init);
    }

    const { host, path } = sanitizeNetworkUrl(input);
    const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await originalGlobalFetch!(input, init);
      const durationMs = Date.now() - startTime;
      recordDiagnosticNetworkEvent({
        host,
        path,
        method,
        status: response.status,
        statusText: response.ok ? 'OK' : `HTTP ${response.status}`,
        ok: response.ok,
        durationMs,
        retryCount: null,
        timeout: false,
        offline: false,
        cachedFallback: false,
        timestamp,
      });
      return response;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorClassName = err?.name || 'Error';
      const isTimeout = errorClassName === 'AbortError' || /timeout/i.test(err?.message || '');
      const isOffline = /network|offline|failed to fetch/i.test(err?.message || '');

      recordDiagnosticNetworkEvent({
        host,
        path,
        method,
        status: 0,
        statusText: 'Transport Failure',
        ok: false,
        durationMs,
        errorClassName,
        retryCount: null,
        timeout: isTimeout,
        offline: isOffline,
        cachedFallback: false,
        timestamp,
      });
      throw err;
    }
  };
}

export function restoreDiagnosticNetworkInterceptor(): void {
  if (isFetchInterceptionInstalled && originalGlobalFetch) {
    globalThis.fetch = originalGlobalFetch;
    originalGlobalFetch = null;
    isFetchInterceptionInstalled = false;
  }
}

export function sanitizeErrorMessageClass(err: any): { errorName: string; messageClass: string } {
  const errorName = err?.name || (typeof err === 'string' ? 'Error' : 'UnknownError');
  const raw = (typeof err === 'string' ? err : err?.message || String(err || '')).toLowerCase();

  // messageClass is a coarse CATEGORY, never free text. Earlier revisions kept a
  // truncated copy of the raw message, which could retain an e-mail address or
  // arbitrary user content. Classification only - no message text is stored.
  let klass = 'unknown';
  if (/network request failed|failed to fetch|networkerror|offline/.test(raw)) klass = 'network';
  else if (/timed? ?out|timeout/.test(raw)) klass = 'timeout';
  else if (/abort|cancel/.test(raw)) klass = 'aborted';
  else if (/json|parse|unexpected ?(tok|char)|syntaxerror/.test(raw)) klass = 'parse';
  else if (/unauthor|forbidden|401|403/.test(raw)) klass = 'auth';
  else if (/rate limit|too many|429/.test(raw)) klass = 'rate_limited';
  else if (/not found|404/.test(raw)) klass = 'not_found';
  else if (/permission|denied/.test(raw)) klass = 'permission';
  else if (/sqlite|database|storage/.test(raw)) klass = 'storage';
  else if (/invalid|validation|required/.test(raw)) klass = 'validation';

  return { errorName, messageClass: `${errorName}: ${klass}` };
}

export interface DiagnosticErrorContext {
  screen?: string;
  controlId?: string;
  source?: 'render' | 'press' | 'async' | 'global';
  treeStillRenders?: boolean;
}

/** Repeat recordings of the same failure inside this window are one entry with a count. */
const ERROR_DEDUPE_WINDOW_MS = 1000;

export function recordDiagnosticRuntimeError(
  err: any,
  context?: string | DiagnosticErrorContext
): DiagnosticErrorRecord | null {
  if (!isDiagnosticModeEnabled()) return null;

  const ctx: DiagnosticErrorContext = typeof context === 'string' ? { screen: context } : (context || {});
  const { errorName, messageClass } = sanitizeErrorMessageClass(err);
  const screen = ctx.screen || getGlobalActiveScreen() || 'App';
  const language = getActiveLanguage();
  const theme = getActiveTheme();
  const source = ctx.source || 'global';
  const timestamp = new Date().toISOString();
  const nowMs = Date.now();

  // Several hosts report the same failure through more than one hook (global JS error
  // handler, promise-rejection hook). Collapse them into one entry with an honest count
  // instead of inflating the ledger with duplicates.
  for (let i = errorLedger.length - 1; i >= 0; i--) {
    const prev = errorLedger[i];
    if (nowMs - Date.parse(prev.timestamp) > ERROR_DEDUPE_WINDOW_MS) break;
    if (
      prev.errorName === errorName &&
      prev.messageClass === messageClass &&
      prev.screen === screen &&
      (prev.controlId || null) === (ctx.controlId || null) &&
      (prev.source || 'global') === source
    ) {
      prev.occurrences = (prev.occurrences || 1) + 1;
      prev.timestamp = timestamp;
      if (ctx.treeStillRenders !== undefined) prev.treeStillRenders = ctx.treeStillRenders;
      notifyListeners();
      return prev;
    }
  }

  const record: DiagnosticErrorRecord = {
    timestamp,
    errorName,
    messageClass,
    screen,
    language,
    theme,
    source,
    occurrences: 1,
    ...(ctx.controlId ? { controlId: ctx.controlId } : {}),
    ...(ctx.treeStillRenders !== undefined ? { treeStillRenders: ctx.treeStillRenders } : {}),
  };

  if (errorLedger.length >= MAX_ERROR_ENTRIES) {
    errorLedger.shift();
  }
  errorLedger.push(record);
  notifyListeners();
  return record;
}

/**
 * Groups the error ledger into what the user could act on: error class, screen,
 * the control that triggered it (if any), and how many times it happened.
 */
export function groupActionableErrors(): DiagnosticActionableErrorGroup[] {
  const groups = new Map<string, DiagnosticActionableErrorGroup>();
  for (const entry of errorLedger) {
    const key = [entry.errorName, entry.messageClass, entry.screen, entry.controlId || '', entry.source || 'global'].join('|');
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += entry.occurrences || 1;
      existing.lastSeen = entry.timestamp;
      continue;
    }
    groups.set(key, {
      errorClass: entry.messageClass,
      screen: entry.screen,
      controlId: entry.controlId || null,
      source: entry.source || 'global',
      occurrences: entry.occurrences || 1,
      lastSeen: entry.timestamp,
    });
  }
  return [...groups.values()].sort((a, b) => b.occurrences - a.occurrences);
}

let originalErrorHandler: any = null;
let isErrorInterceptionInstalled = false;

export function installDiagnosticErrorInterceptor(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (isErrorInterceptionInstalled) return;

  const globalObj = globalThis as any;
  if (globalObj.ErrorUtils && typeof globalObj.ErrorUtils.getGlobalHandler === 'function') {
    originalErrorHandler = globalObj.ErrorUtils.getGlobalHandler();
    isErrorInterceptionInstalled = true;
    globalObj.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      if (isDiagnosticModeEnabled()) {
        recordDiagnosticRuntimeError(error);
      }
      if (typeof originalErrorHandler === 'function') {
        originalErrorHandler(error, isFatal);
      }
    });
  }
}

let unhandledRejectionListener: ((event: any) => void) | null = null;
let unhandledRejectionProcessHandler: ((reason: any) => void) | null = null;
let isRejectionInterceptionInstalled = false;

/**
 * Unhandled promise rejections. Three hooks, because the host differs:
 *  - `globalThis.addEventListener('unhandledrejection')`  (web / JS runtimes that expose EventTarget)
 *  - `globalThis.onunhandledrejection`                   (React Native's promise rejection tracking consults this)
 *  - `process.on('unhandledRejection')`                  (Node-hosted off-device runs: test rigs, desktop shells)
 * Only coarse classes are recorded (never the rejection text), and only under the gate.
 */
export function installDiagnosticUnhandledRejectionInterceptor(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (isRejectionInterceptionInstalled) return;
  const globalObj = globalThis as any;

  unhandledRejectionListener = (event: any) => {
    if (!isDiagnosticModeEnabled()) return;
    const reason = event && typeof event === 'object' && 'reason' in event ? event.reason : event;
    recordDiagnosticRuntimeError(reason, { screen: getGlobalActiveScreen(), source: 'async' });
  };

  if (typeof globalObj.addEventListener === 'function') {
    globalObj.addEventListener('unhandledrejection', unhandledRejectionListener);
  }
  if (typeof globalObj.onunhandledrejection === 'undefined' || globalObj.onunhandledrejection === null) {
    globalObj.onunhandledrejection = unhandledRejectionListener;
  }
  if (typeof process !== 'undefined' && typeof (process as any).on === 'function') {
    unhandledRejectionProcessHandler = (reason: any) => {
      if (!isDiagnosticModeEnabled()) return;
      recordDiagnosticRuntimeError(reason, { screen: getGlobalActiveScreen(), source: 'async' });
    };
    (process as any).on('unhandledRejection', unhandledRejectionProcessHandler);
  }

  isRejectionInterceptionInstalled = true;
}

export function restoreDiagnosticUnhandledRejectionInterceptor(): void {
  const globalObj = globalThis as any;
  if (unhandledRejectionListener && typeof globalObj.removeEventListener === 'function') {
    globalObj.removeEventListener('unhandledrejection', unhandledRejectionListener);
  }
  if (unhandledRejectionListener && globalObj.onunhandledrejection === unhandledRejectionListener) {
    globalObj.onunhandledrejection = null;
  }
  if (unhandledRejectionProcessHandler && typeof process !== 'undefined' && typeof (process as any).removeListener === 'function') {
    (process as any).removeListener('unhandledRejection', unhandledRejectionProcessHandler);
  }
  unhandledRejectionListener = null;
  unhandledRejectionProcessHandler = null;
  isRejectionInterceptionInstalled = false;
}

export function isUnhandledRejectionInterceptorInstalled(): boolean {
  return isRejectionInterceptionInstalled;
}

export function restoreDiagnosticErrorInterceptor(): void {
  const globalObj = globalThis as any;
  if (isErrorInterceptionInstalled && globalObj.ErrorUtils && originalErrorHandler) {
    globalObj.ErrorUtils.setGlobalHandler(originalErrorHandler);
    originalErrorHandler = null;
    isErrorInterceptionInstalled = false;
  }
}

export function isErrorInterceptorInstalled(): boolean {
  return isErrorInterceptionInstalled;
}

/** Records a runtime error thrown by an error boundary that caught a render failure. */
export function recordRenderError(err: any, screenName: string, treeStillRenders: boolean): void {
  recordDiagnosticRuntimeError(err, {
    screen: screenName,
    source: 'render',
    treeStillRenders,
  });
}

let appStateObserverInstalled = false;

/**
 * Boot-time diagnostic observer, installed ONCE under the two-factor gate:
 *  - global JS error handler (ErrorUtils) and unhandled promise rejections -> error ledger
 *  - network ledger interceptor
 *  - error-boundary recorder registration
 *  - boot language/direction consistency verdict
 * Gate off: this function returns on its first line - zero listeners, zero timers.
 */
export function installDiagnosticAppStateObserver(): void {
  if (!isDiagnosticModeEnabled()) return;
  if (appStateObserverInstalled) return;
  appStateObserverInstalled = true;
  setDiagErrorRecorder((err: any, options?: any) =>
    recordDiagnosticRuntimeError(err, options || {})
  );
  installDiagnosticErrorInterceptor();
  installDiagnosticUnhandledRejectionInterceptor();
  installDiagnosticNetworkInterceptor();
  recordConsistencyCheck();
}

export function isDiagnosticAppStateObserverInstalled(): boolean {
  return appStateObserverInstalled;
}

/** Small native-layout tolerances: do not turn rounding noise into defects. */
export const TEXT_LINE_METRIC_TOLERANCE_DP = 1;
export const TEXT_RECT_OVERLAP_TOLERANCE_DP = 2;

/**
 * Minimum explicit line-height ratios used by the typography system.  These are
 * deliberately repeated here as diagnostic policy so a report remains useful
 * even when a node is a custom Text wrapper rather than AppText.
 */
export const TEXT_LINE_HEIGHT_MULTIPLIERS = {
  latin: { ui: 1.5, title: 1.3, numeral: 1.2 },
  arabic: 1.8,
  urdu: 2.2,
  otherCjkLike: 1.6,
} as const;

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function textLineMetrics(
  probe: Partial<AutoProbeRecord>,
  options?: { textLines?: Partial<DiagnosticTextLineMetric>[]; lines?: Partial<DiagnosticTextLineMetric>[] },
): Partial<DiagnosticTextLineMetric>[] | undefined {
  return options?.textLines ?? options?.lines ?? probe.textLines;
}

function resolvedTextScript(probe: Partial<AutoProbeRecord>): string {
  if (probe.textScript) return probe.textScript;
  const family = probe.fontFamily || '';
  if (/NastaliqUrdu/i.test(family)) return 'urdu';
  if (/NaskhArabic|Amiri/i.test(family)) return 'arabic';
  return 'latin';
}

function minimumLineHeight(
  fontSize: number,
  script: string,
  category: 'ui' | 'title' | 'numeral' | null | undefined,
): number {
  const multiplier = script === 'latin'
    ? TEXT_LINE_HEIGHT_MULTIPLIERS.latin[category || 'ui']
    : (script === 'arabic'
      ? TEXT_LINE_HEIGHT_MULTIPLIERS.arabic
      : (script === 'urdu' ? TEXT_LINE_HEIGHT_MULTIPLIERS.urdu : TEXT_LINE_HEIGHT_MULTIPLIERS.otherCjkLike));
  return Math.ceil(fontSize * multiplier);
}

function isAncestorOrDescendant(
  probe: Partial<AutoProbeRecord>,
  sibling: Partial<AutoProbeRecord>,
  siblings: Partial<AutoProbeRecord>[],
): boolean {
  const byId = new Map<string, Partial<AutoProbeRecord>>();
  for (const item of [probe, ...siblings]) {
    if (item.id) byId.set(item.id, item);
  }

  const reachesAncestor = (start: Partial<AutoProbeRecord>, ancestorId?: string): boolean => {
    if (!ancestorId) return false;
    let parentId = start.parentIdentity || undefined;
    for (let i = 0; i < 64 && parentId; i++) {
      if (parentId === ancestorId) return true;
      parentId = byId.get(parentId)?.parentIdentity || undefined;
    }
    return false;
  };

  return reachesAncestor(sibling, probe.id) || reachesAncestor(probe, sibling.id);
}

function sharesTextCoordinateFrame(
  probe: Partial<AutoProbeRecord>,
  sibling: Partial<AutoProbeRecord>,
): boolean {
  // onLayout x/y are parent-relative. Frame dimensions alone do not prove that
  // two nodes share a coordinate system, so skip unattributed pairs rather than
  // reintroducing the false positives this defect class is meant to avoid.
  return Boolean(
    probe.parentIdentity &&
    sibling.parentIdentity &&
    probe.parentIdentity === sibling.parentIdentity
  );
}

function rectangleIntersection(
  a: Partial<AutoProbeRecord>,
  b: Partial<AutoProbeRecord>,
): { x: number; y: number } | null {
  if (![a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height].every(finiteNumber)) return null;
  const x = Math.max(0, Math.min(a.x! + a.width!, b.x! + b.width!) - Math.max(a.x!, b.x!));
  const y = Math.max(0, Math.min(a.y! + a.height!, b.y! + b.height!) - Math.max(a.y!, b.y!));
  return { x, y };
}

export function deriveProbeDefects(
  probe: Partial<AutoProbeRecord>,
  options?: {
    isText?: boolean;
    isInteractive?: boolean;
    numberOfLines?: number;
    reportedLineCount?: number;
    reportedTotalLineHeight?: number;
    containerFixedStyleHeight?: number;
    resolvedFontSize?: number | null;
    resolvedLineHeight?: number | 'auto' | null;
    explicitLineHeight?: number | null;
    fontFamily?: string | null;
    textScript?: string | null;
    textCategory?: 'ui' | 'title' | 'numeral' | null;
    textLines?: Partial<DiagnosticTextLineMetric>[];
    lines?: Partial<DiagnosticTextLineMetric>[];
    measuredContainerHeight?: number | null;
    resolvedStyleTextAlign?: string;
    resolvedStyleWritingDirection?: string;
    windowDimensions?: { width: number; height: number };
    bottomSafeInset?: number;
    siblings?: Partial<AutoProbeRecord>[];
    hasScrollableAncestor?: boolean;
    scrollable?: boolean;
    horizontalScrollableAncestor?: boolean;
  }
): ProbeDefects {
  const isText = options?.isText ?? probe.isText ?? false;
  const isInteractive = options?.isInteractive ?? probe.isInteractive ?? false;
  const x = probe.x ?? null;
  const y = probe.y ?? null;
  const width = probe.width ?? null;
  const height = probe.height ?? null;
  const frameWidth = probe.frameWidth ?? null;
  const frameHeight = probe.frameHeight ?? null;
  const resolvedFontSize = options?.resolvedFontSize ?? probe.resolvedFontSize ?? null;
  const resolvedLineHeight = options?.resolvedLineHeight ?? probe.resolvedLineHeight ?? null;
  const explicitLineHeight = options?.explicitLineHeight ?? probe.explicitLineHeight ?? null;
  const fontFamily = options?.fontFamily ?? probe.fontFamily ?? null;
  const textScript = options?.textScript ?? probe.textScript ?? resolvedTextScript({ ...probe, fontFamily });
  const textCategory = options?.textCategory ?? probe.textCategory ?? 'ui';
  const lines = textLineMetrics(probe, options);
  const measuredContainerHeight = options?.measuredContainerHeight ?? probe.measuredContainerHeight ?? height;

  // 1. textTruncated:
  let textTruncated: DefectItem;
  if (!isText) {
    textTruncated = { flag: null, reason: 'Not a text element' };
  } else {
    const numLines = options?.numberOfLines ?? probe.numberOfLines;
    const reportedLines = options?.reportedLineCount ?? probe.reportedLineCount;
    const reportedHeight = options?.reportedTotalLineHeight ?? probe.reportedTotalLineHeight;

    if (numLines != null && reportedLines != null) {
      if (reportedLines > numLines) {
        textTruncated = { flag: true, reason: `Text exceeded ${numLines} line limit (${reportedLines} lines)` };
      } else if (reportedHeight != null && height != null && height < reportedHeight - 1) {
        textTruncated = { flag: true, reason: `Measured height (${height}) is less than reported line layout height (${reportedHeight})` };
      } else {
        // Fits limit honestly: reportedLines <= numLines and height is not clipped
        textTruncated = { flag: false };
      }
    } else if (reportedHeight != null && height != null && height < reportedHeight - 1) {
      textTruncated = { flag: true, reason: `Measured height (${height}) is less than reported line layout height (${reportedHeight})` };
    } else if (reportedLines != null) {
      textTruncated = { flag: false };
    } else {
      textTruncated = { flag: null, reason: 'Text line layout metrics unavailable' };
    }
  }

  // 1b. lineBoxTooTight: judge the line box that is actually RENDERED, not the one the
  // caller asked for. A component may request a tight lineHeight that the shared text
  // primitive then raises to the script floor (AppText does exactly this for Arabic and
  // Urdu text), so flagging the request reports the floor working correctly as a defect.
  // On device that mistake produced 25 false positives out of 25.
  let lineBoxTooTight: DefectItem;
  if (!isText) {
    lineBoxTooTight = { flag: null, reason: 'Not a text element' };
  } else if (!finiteNumber(resolvedFontSize) || resolvedFontSize <= 0) {
    lineBoxTooTight = { flag: null, reason: 'fontSize unavailable' };
  } else {
    const renderedLineHeight = finiteNumber(resolvedLineHeight) ? resolvedLineHeight : explicitLineHeight;
    if (!finiteNumber(renderedLineHeight)) {
      lineBoxTooTight = { flag: null, reason: 'No resolved or explicit lineHeight to judge' };
    } else {
      const minimum = minimumLineHeight(resolvedFontSize, textScript, textCategory);
      const ratio = renderedLineHeight / resolvedFontSize;
      const details = {
        fontSize: resolvedFontSize,
        explicitLineHeight,
        minimumLineHeight: minimum,
        ratio: Math.round(ratio * 100) / 100,
        script: textScript,
        fontFamily: fontFamily || 'unknown',
        resolvedLineHeight: finiteNumber(resolvedLineHeight) ? resolvedLineHeight : (resolvedLineHeight || 'auto'),
      };
      lineBoxTooTight = renderedLineHeight < minimum
        ? {
            flag: true,
            reason: `Rendered lineHeight=${renderedLineHeight}dp is ${ratio.toFixed(2)}x fontSize=${resolvedFontSize}; minimum=${minimum}dp for ${textScript}`,
            details,
          }
        : { flag: false, details };
    }
  }

  // 1c. textClipped: line boxes are cut by the measured Text container.
  let textClipped: DefectItem;
  const lineHeights = lines?.map((line) => line.height);
  const lineSum = lineHeights && lineHeights.every(finiteNumber)
    ? lineHeights.reduce((sum, lineHeight) => sum + lineHeight, 0)
    : (finiteNumber(probe.reportedTotalLineHeight) ? probe.reportedTotalLineHeight : null);
  if (!isText) {
    textClipped = { flag: null, reason: 'Not a text element' };
  } else if (!finiteNumber(lineSum) || !finiteNumber(measuredContainerHeight)) {
    textClipped = { flag: null, reason: 'Text line boxes or measured container height unavailable' };
  } else {
    const excess = lineSum - measuredContainerHeight;
    const details = {
      lineSum,
      measuredContainerHeight,
      excessPx: Math.round(excess * 100) / 100,
      lineCount: lines?.length ?? probe.reportedLineCount ?? 0,
    };
    textClipped = excess > TEXT_LINE_METRIC_TOLERANCE_DP
      ? { flag: true, reason: `Line boxes sum=${lineSum}dp exceeds measured container height=${measuredContainerHeight}dp by ${excess.toFixed(1)}dp`, details }
      : { flag: false, details };
  }

  // 1d. lineOverlap: compare consecutive native line boxes, not whole Text
  // rectangles. This is the literal line-on-line overlap reported by the user.
  let lineOverlap: DefectItem;
  if (!isText) {
    lineOverlap = { flag: null, reason: 'Not a text element' };
  } else if (!lines || lines.length < 2 || lines.some((line) => !finiteNumber(line.y) || !finiteNumber(line.height))) {
    lineOverlap = { flag: null, reason: 'At least two complete line boxes unavailable' };
  } else {
    lineOverlap = { flag: false };
    for (let i = 0; i < lines.length - 1; i++) {
      const previous = lines[i];
      const next = lines[i + 1];
      const previousBottom = previous.y! + previous.height!;
      const overlap = previousBottom - next.y!;
      if (overlap > TEXT_LINE_METRIC_TOLERANCE_DP) {
        lineOverlap = {
          flag: true,
          reason: `Line ${i} bottom=${previousBottom.toFixed(1)}dp overlaps line ${i + 1} y=${next.y!.toFixed(1)}dp by ${overlap.toFixed(1)}dp`,
          details: {
            previousLine: i,
            nextLine: i + 1,
            previousBottom,
            nextY: next.y!,
            overlapPx: Math.round(overlap * 100) / 100,
          },
        };
        break;
      }
    }
  }

  // 2. subTouchTarget:
  let subTouchTarget: DefectItem;
  if (!isInteractive) {
    subTouchTarget = { flag: null, reason: 'Non-interactive element' };
  } else if (width == null || height == null) {
    subTouchTarget = { flag: null, reason: 'Geometry unavailable' };
  } else if (width < 44 || height < 44) {
    subTouchTarget = { flag: true, reason: `Interactive touch target ${width}x${height}dp is under 44x44dp minimum` };
  } else {
    subTouchTarget = { flag: false };
  }

  // 3. offScreen:
  let offScreen: DefectItem;
  if (x == null || y == null || width == null || height == null) {
    offScreen = { flag: null, reason: 'Geometry unavailable' };
  } else {
    const EPSILON = 2.0;
    let winWidth = 360;
    try {
      const win = Dimensions?.get('window');
      if (win && win.width > 0) {
        winWidth = win.width;
      }
    } catch {}
    if (options?.windowDimensions) {
      winWidth = options.windowDimensions.width;
    }

    const hasScrollableAncestor = Boolean(
      options?.hasScrollableAncestor ??
      probe.hasScrollableAncestor ??
      options?.scrollable ??
      probe.scrollable ??
      probe.kind === 'ScreenTab'
    );

    // Rule 1: Never report vertical overflow (scrolling is normal on mobile).
    // Rule 2: Tolerate ~2px epsilon on boundaries.
    // Rule 3: Elements inside a scrollable ancestor are expected to scroll; do not flag horizontal overflow for scroll containers.
    // Rule 4: Genuine horizontal overflow with no scrollable ancestor:
    const genuineHorizontalOverflow = !hasScrollableAncestor && (x < -EPSILON || (x + width) > winWidth + EPSILON);

    // Rule 5: Text clipped by its own container frame:
    const textClippedByContainer = isText && frameWidth != null && frameWidth > 0 && (width > frameWidth + EPSILON) && !hasScrollableAncestor;

    if (genuineHorizontalOverflow) {
      offScreen = {
        flag: true,
        reason: `Element horizontal bounds [${x}, ${(x + width).toFixed(1)}] extend outside viewport width (${winWidth}) without a scrollable container`,
      };
    } else if (textClippedByContainer) {
      offScreen = {
        flag: true,
        reason: `Text width (${width}) exceeds container frame width (${frameWidth})`,
      };
    } else {
      offScreen = { flag: false };
    }
  }

  // 4. outsideParent:
  let outsideParent: DefectItem;
  if (frameWidth == null || frameHeight == null) {
    outsideParent = { flag: null, reason: 'No known parent frame' };
  } else if (x == null || y == null || width == null || height == null) {
    outsideParent = { flag: null, reason: 'Geometry unavailable' };
  } else if (x < 0 || y < 0 || (x + width) > frameWidth || (y + height) > frameHeight) {
    outsideParent = {
      flag: true,
      reason: `Child rect (${x}, ${y}, ${width}, ${height}) exceeds parent frame (${frameWidth}x${frameHeight})`,
    };
  } else {
    outsideParent = { flag: false };
  }

  // 5. siblingOverlap:
  let siblingOverlap: DefectItem;
  const siblings = options?.siblings || [];
  if (x == null || y == null || width == null || height == null || siblings.length === 0) {
    siblingOverlap = { flag: null, reason: 'No siblings observed in parent frame' };
  } else {
    let foundOverlap = false;
    let overlapDetails = '';
    for (const sib of siblings) {
      if (!sib || sib.id === probe.id || sib.x == null || sib.y == null || sib.width == null || sib.height == null) {
        continue;
      }
      const xOverlap = Math.max(0, Math.min(x + width, sib.x + sib.width) - Math.max(x, sib.x));
      const yOverlap = Math.max(0, Math.min(y + height, sib.y + sib.height) - Math.max(y, sib.y));
      if (xOverlap > 1 && yOverlap > 1) {
        foundOverlap = true;
        overlapDetails = `Intersects sibling '${sib.id || sib.kind}' by ${xOverlap.toFixed(1)}x${yOverlap.toFixed(1)}dp`;
        break;
      }
    }
    if (foundOverlap) {
      siblingOverlap = { flag: true, reason: overlapDetails };
    } else {
      siblingOverlap = { flag: false };
    }
  }

  // 5b. textRectOverlap: use only text siblings in the same coordinate frame.
  // Ancestor/descendant pairs and scrollable content are expected geometry,
  // not sibling collisions. The existing generic scroll marker is treated as
  // a conservative superset of horizontal strips when direction is unknown.
  let textRectOverlap: DefectItem;
  const horizontalScrollableAncestor = Boolean(
    options?.horizontalScrollableAncestor ??
    probe.horizontalScrollableAncestor ??
    options?.hasScrollableAncestor ??
    probe.hasScrollableAncestor ??
    options?.scrollable ??
    probe.scrollable
  );
  if (!isText) {
    textRectOverlap = { flag: null, reason: 'Not a text element' };
  } else if (horizontalScrollableAncestor || !finiteNumber(x) || !finiteNumber(y) || !finiteNumber(width) || !finiteNumber(height)) {
    textRectOverlap = horizontalScrollableAncestor
      ? { flag: false, reason: 'Text is inside a horizontal scrolling strip' }
      : { flag: null, reason: 'Geometry unavailable' };
  } else {
    textRectOverlap = { flag: false };
    for (const sibling of siblings) {
      if (
        !sibling ||
        sibling.id === probe.id ||
        sibling.isText !== true ||
        sibling.horizontalScrollableAncestor ||
        sibling.hasScrollableAncestor ||
        sibling.scrollable
      ) continue;
      if (isAncestorOrDescendant(probe, sibling, siblings) || !sharesTextCoordinateFrame(probe, sibling)) continue;
      const intersection = rectangleIntersection(probe, sibling);
      if (!intersection || intersection.x <= TEXT_RECT_OVERLAP_TOLERANCE_DP || intersection.y <= TEXT_RECT_OVERLAP_TOLERANCE_DP) continue;
      textRectOverlap = {
        flag: true,
        reason: `Text rect intersects '${sibling.id || sibling.kind || 'text'}' by ${intersection.x.toFixed(1)}x${intersection.y.toFixed(1)}dp`,
        details: {
          otherProbeId: sibling.id || sibling.kind || 'text',
          overlapWidth: Math.round(intersection.x * 100) / 100,
          overlapHeight: Math.round(intersection.y * 100) / 100,
          tolerancePx: TEXT_RECT_OVERLAP_TOLERANCE_DP,
          x: x!,
          y: y!,
          width: width!,
          height: height!,
          otherX: sibling.x ?? null,
          otherY: sibling.y ?? null,
          otherWidth: sibling.width ?? null,
          otherHeight: sibling.height ?? null,
        },
      };
      break;
    }
  }

  // 6. rtlTextAlignMismatch and rtlWritingDirectionSuspicious:
  let rtlTextAlignMismatch: DefectItem;
  let rtlWritingDirectionSuspicious: DefectItem;
  if (!isText) {
    rtlTextAlignMismatch = { flag: null, reason: 'Not a text element' };
    rtlWritingDirectionSuspicious = { flag: null, reason: 'Not a text element' };
  } else {
    const isRtl = isI18nRTL();
    const align = (options?.resolvedStyleTextAlign ?? probe.resolvedStyleTextAlign)?.toLowerCase();
    const dir = (options?.resolvedStyleWritingDirection ?? probe.resolvedStyleWritingDirection)?.toLowerCase();
    // Script-awareness is what keeps these two rules useful. This app deliberately gives
    // LATIN and numeric content right alignment with LTR writing direction inside an RTL
    // locale, and RTL-script content right alignment inside an LTR locale. Firing on those
    // correct combinations produced 58 of 92 defects on device - all of them Latin - which
    // buried the one genuine RTL-script anomaly. Flag only an anomaly for the script the
    // text is actually in.
    const isRtlScript = textScript === 'arabic' || textScript === 'urdu';

    if (!align && !dir) {
      rtlTextAlignMismatch = { flag: null, reason: 'Alignment and writing direction unresolved' };
      rtlWritingDirectionSuspicious = { flag: null, reason: 'Alignment and writing direction unresolved' };
    } else if (align === 'center') {
      // Center must NEVER be flagged as an RTL mismatch (centring is direction-neutral)
      rtlTextAlignMismatch = { flag: false };
      rtlWritingDirectionSuspicious = { flag: false };
    } else if (isRtl) {
      if (align === 'left' && isRtlScript) {
        // Hard defect: RTL-script text left-aligned in an RTL locale
        rtlTextAlignMismatch = {
          flag: true,
          reason: `RTL-script text (script='${textScript}') is left-aligned in an RTL locale (textAlign='${align}', writingDirection='${dir || 'unset'}')`,
        };
        rtlWritingDirectionSuspicious = { flag: false };
      } else if (dir === 'ltr' && isRtlScript) {
        // Hard defect: RTL-script text carrying an explicit LTR writing direction
        rtlTextAlignMismatch = { flag: false };
        rtlWritingDirectionSuspicious = {
          flag: true,
          reason: `RTL-script text (script='${textScript}') carries LTR writing direction in an RTL locale (textAlign='${align || 'unset'}', writingDirection='${dir}')`,
        };
      } else {
        // Latin/numeric content in an RTL locale: right alignment with LTR direction is
        // the intended treatment, not a defect.
        rtlTextAlignMismatch = { flag: false };
        rtlWritingDirectionSuspicious = { flag: false };
      }
    } else {
      // LTR locale: mirror the reasoning - Latin content right-aligned or RTL-directed is
      // the anomaly; RTL-script content right-aligned is correct.
      if (align === 'right' && !isRtlScript) {
        rtlTextAlignMismatch = {
          flag: true,
          reason: `Latin text is right-aligned in an LTR locale (textAlign='${align}', writingDirection='${dir || 'unset'}')`,
        };
        rtlWritingDirectionSuspicious = { flag: false };
      } else if (dir === 'rtl' && !isRtlScript) {
        rtlTextAlignMismatch = { flag: false };
        rtlWritingDirectionSuspicious = {
          flag: true,
          reason: `Latin text carries RTL writing direction in an LTR locale (textAlign='${align || 'unset'}')`,
        };
      } else {
        rtlTextAlignMismatch = { flag: false };
        rtlWritingDirectionSuspicious = { flag: false };
      }
    }
  }

  // 7. fixedHeightTextRisk:
  let fixedHeightTextRisk: DefectItem;
  const fixedHeight = options?.containerFixedStyleHeight ?? probe.containerFixedStyleHeight;
  const numLines = options?.numberOfLines ?? probe.numberOfLines;
  if (!isText) {
    fixedHeightTextRisk = { flag: null, reason: 'Not a text element' };
  } else if (fixedHeight != null && numLines != null) {
    if (height != null && Math.abs(height - fixedHeight) <= 1) {
      fixedHeightTextRisk = {
        flag: true,
        reason: `Container fixed height style (${fixedHeight}dp) equals container height with numberOfLines=${numLines}`,
      };
    } else {
      fixedHeightTextRisk = { flag: false };
    }
  } else {
    fixedHeightTextRisk = { flag: null, reason: 'No fixed height style with numberOfLines' };
  }

  return {
    textTruncated,
    lineBoxTooTight,
    textClipped,
    lineOverlap,
    textRectOverlap,
    subTouchTarget,
    offScreen,
    outsideParent,
    siblingOverlap,
    rtlTextAlignMismatch,
    rtlWritingDirectionSuspicious,
    fixedHeightTextRisk,
  };
}

const listeners = new Set<() => void>();
let isCoalesceScheduled = false;
let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
let notifyDirty = false;
const COALESCE_INTERVAL_MS = 250;

let notifiesRequestedCount = 0;
let notifiesDeliveredCount = 0;

export interface DiagnosticNotificationStats {
  requested: number;
  delivered: number;
  coalesced: number;
}

export function getDiagnosticNotificationStats(): DiagnosticNotificationStats {
  const coalesced = Math.max(0, notifiesRequestedCount - notifiesDeliveredCount);
  return {
    requested: notifiesRequestedCount,
    delivered: notifiesDeliveredCount,
    coalesced,
  };
}

export function resetDiagnosticNotificationStats(): void {
  notifiesRequestedCount = 0;
  notifiesDeliveredCount = 0;
  notifyDirty = false;
  if (coalesceTimer !== null) {
    clearTimeout(coalesceTimer);
    coalesceTimer = null;
    isCoalesceScheduled = false;
  }
}

export function getDiagnosticListenerCount(): number {
  return listeners.size;
}

export function flushDiagnosticNotifications(): void {
  if (coalesceTimer !== null) {
    clearTimeout(coalesceTimer);
    coalesceTimer = null;
    isCoalesceScheduled = false;
  }
  if (!notifyDirty) {
    return;
  }
  notifyDirty = false;
  if (listeners.size === 0) {
    return;
  }
  notifiesDeliveredCount++;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

function notifyListeners(): void {
  notifiesRequestedCount++;
  notifyDirty = true;

  // Closed app pays nothing: zero timers when zero listeners registered
  if (listeners.size === 0) {
    return;
  }

  // Single pending timer: coalesces multiple layout/interaction records into one flush
  if (!isCoalesceScheduled) {
    isCoalesceScheduled = true;
    coalesceTimer = setTimeout(() => {
      isCoalesceScheduled = false;
      coalesceTimer = null;
      flushDiagnosticNotifications();
    }, COALESCE_INTERVAL_MS);
  }
}

export function addDiagnosticListener(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // When last listener unregisters, clear any pending timer so no idle work occurs
    if (listeners.size === 0 && coalesceTimer !== null) {
      clearTimeout(coalesceTimer);
      coalesceTimer = null;
      isCoalesceScheduled = false;
      notifyDirty = false;
    }
  };
}

export function resetDiagnosticMeasurements(): void {
  if (coalesceTimer !== null) {
    clearTimeout(coalesceTimer);
    coalesceTimer = null;
    isCoalesceScheduled = false;
  }
  notifyDirty = false;
  notifiesRequestedCount = 0;
  notifiesDeliveredCount = 0;

  measurementsStore = createInitialStore();
  probeStore = {};
  probeLRUOrder = [];
  pendingTextLayouts.clear();
  pendingTextLayoutOrder = [];
  interactionLedger = [];
  networkLedger = [];
  errorLedger = [];
  controlRegistry.clear();
  languageSwitchAttempts = [];
  switchAttemptSeq = 0;
  lastConsistencyVerdict = null;
  probeLanguageHistory.clear();
  probeThemeHistory.clear();
  activeLanguageMode = null;
  activeThemeMode = 'light';
  resetMonotonicCounters();
  notifyListeners();
}

export function getTargetMeasurements(): TargetLayoutRecord[] {
  return Object.values(measurementsStore);
}

export function getTargetMeasurement(targetId: DiagnosticTargetId): TargetLayoutRecord | undefined {
  return measurementsStore[targetId];
}

function resetRecordToUnavailable(record: TargetLayoutRecord, reason: string): void {
  record.status = 'measurementUnavailable';
  record.measurementUnavailable = true;
  record.unavailabilityReason = reason;
  record.targetX = null;
  record.targetY = null;
  record.parentX = null;
  record.parentY = null;
  record.targetWidth = null;
  record.targetHeight = null;
  record.textContainerWidth = null;
  record.textContainerHeight = null;
  record.parentWidth = null;
  record.parentHeight = null;
  record.resolvedContainerLayout = { x: null, y: null, width: null, height: null };
  record.parentLayout = { x: null, y: null, width: null, height: null };
  record.edgeOverflow = null;
  record.overflowStatus = 'unavailable';
  record.clippingStatus = 'unavailable';
  record.isWidthOverflowing = null;
  record.isHeightOverflowing = null;
  record.overflowDetails = {
    widthOverflow: null,
    heightOverflow: null,
    left: false,
    top: false,
    right: false,
    bottom: false,
  };
  record.nativeIsRTL = Boolean(I18nManager.isRTL);

  if (record.rectangles) {
    for (const name of Object.keys(record.rectangles)) {
      const rect = record.rectangles[name];
      rect.isAvailable = false;
      rect.x = null;
      rect.y = null;
      rect.width = null;
      rect.height = null;
      rect.frameWidth = null;
      rect.frameHeight = null;
      rect.cardWidth = null;
      rect.cardHeight = null;
      rect.edgeOverflow = null;
      rect.allocationOverflow = null;
      rect.frameUnavailable = true;
      rect.measurementUnavailable = true;
      rect.unavailabilityReason = reason;
    }
  }
}

function updateOverflowAndStatus(record: TargetLayoutRecord): void {
  const hasParent = record.parentWidth != null && record.parentHeight != null && record.parentWidth > 0 && record.parentHeight > 0;
  const hasTarget = record.targetWidth != null && record.targetHeight != null && record.targetWidth > 0 && record.targetHeight > 0;

  if (hasParent && hasTarget) {
    const x = record.targetX ?? 0;
    const y = record.targetY ?? 0;
    const targetW = record.targetWidth!;
    const targetH = record.targetHeight!;
    const parentW = record.parentWidth!;
    const parentH = record.parentHeight!;

    const overflowsLeft = x < 0;
    const overflowsTop = y < 0;
    const overflowsRight = (x + targetW) > parentW;
    const overflowsBottom = (y + targetH) > parentH;
    const anyOverflow = overflowsLeft || overflowsTop || overflowsRight || overflowsBottom;

    record.edgeOverflow = {
      overflowsLeft,
      overflowsTop,
      overflowsRight,
      overflowsBottom,
      hasOverflow: anyOverflow,
    };
    record.isWidthOverflowing = overflowsLeft || overflowsRight;
    record.isHeightOverflowing = overflowsTop || overflowsBottom;
    record.overflowDetails = {
      widthOverflow: record.isWidthOverflowing,
      heightOverflow: record.isHeightOverflowing,
      left: overflowsLeft,
      top: overflowsTop,
      right: overflowsRight,
      bottom: overflowsBottom,
    };
    record.overflowStatus = anyOverflow ? 'overflow' : 'no_overflow';
    record.clippingStatus = anyOverflow ? 'clipped' : 'not_clipped';
    record.status = 'measured';
    record.measurementUnavailable = false;
    record.measuredAt = new Date().toISOString();

    // Re-evaluate ancestor card allocation overflow ONLY when explicitly named
    if (record.rectangles) {
      for (const name of Object.keys(record.rectangles)) {
        const rect = record.rectangles[name];
        if (rect.ancestorCard && rect.ancestorCard === record.parentTestId) {
          rect.cardWidth = parentW;
          rect.cardHeight = parentH;
          if (rect.isAvailable && rect.width != null && rect.height != null) {
            const rx = rect.x ?? 0;
            const ry = rect.y ?? 0;
            const aLeft = rx < 0;
            const aTop = ry < 0;
            const aRight = (rx + rect.width) > parentW;
            const aBottom = (ry + rect.height) > parentH;
            rect.allocationOverflow = {
              overflowsLeft: aLeft,
              overflowsTop: aTop,
              overflowsRight: aRight,
              overflowsBottom: aBottom,
              hasOverflow: aLeft || aTop || aRight || aBottom || rect.width > parentW || rect.height > parentH,
            };
          }
        }
      }
    }
  } else {
    // When either parent or target cannot be measured, do not report false or stale values
    record.targetX = null;
    record.targetY = null;
    record.edgeOverflow = null;
    record.isWidthOverflowing = null;
    record.isHeightOverflowing = null;
    record.overflowDetails = {
      widthOverflow: null,
      heightOverflow: null,
      left: false,
      top: false,
      right: false,
      bottom: false,
    };
    record.overflowStatus = 'unavailable';
    record.clippingStatus = 'unavailable';
    record.measurementUnavailable = true;
  }
}

function normalizeTextLineMetrics(lines: Partial<DiagnosticTextLineMetric>[]): DiagnosticTextLineMetric[] {
  const normalize = (value: unknown): number | null => {
    if (!finiteNumber(value)) return null;
    return Math.round(value * 10) / 10;
  };

  return lines.map((line) => ({
    x: normalize(line.x),
    y: normalize(line.y),
    width: normalize(line.width),
    height: normalize(line.height),
    ascender: normalize(line.ascender),
    descender: normalize(line.descender),
  }));
}

function stashPendingTextLayout(id: string, lines: DiagnosticTextLineMetric[]): void {
  // Refreshing an id makes it newest without allowing duplicate order entries.
  const existingIndex = pendingTextLayoutOrder.indexOf(id);
  if (existingIndex >= 0) {
    pendingTextLayoutOrder.splice(existingIndex, 1);
  } else if (pendingTextLayouts.size >= MAX_PENDING_TEXT_LAYOUTS) {
    const oldestId = pendingTextLayoutOrder.shift();
    if (oldestId) pendingTextLayouts.delete(oldestId);
  }

  pendingTextLayouts.set(id, lines);
  pendingTextLayoutOrder.push(id);
}

function takePendingTextLayout(id: string): DiagnosticTextLineMetric[] | undefined {
  const lines = pendingTextLayouts.get(id);
  if (!lines) return undefined;
  pendingTextLayouts.delete(id);
  const index = pendingTextLayoutOrder.indexOf(id);
  if (index >= 0) pendingTextLayoutOrder.splice(index, 1);
  return lines;
}

function liveProbeSiblings(probe: Partial<AutoProbeRecord>): Partial<AutoProbeRecord>[] {
  return Object.values(probeStore).filter((other) =>
    other.id !== probe.id &&
    !other.staleAfterUnmount &&
    other.screen === probe.screen &&
    other.frameWidth === probe.frameWidth &&
    other.frameHeight === probe.frameHeight
  );
}

function deriveStoredProbeDefects(probe: AutoProbeRecord, forceText = false): ProbeDefects {
  return deriveProbeDefects(probe, {
    isText: forceText || Boolean(probe.isText),
    numberOfLines: probe.numberOfLines,
    reportedLineCount: probe.reportedLineCount,
    reportedTotalLineHeight: probe.reportedTotalLineHeight,
    resolvedFontSize: probe.resolvedFontSize,
    resolvedLineHeight: probe.resolvedLineHeight,
    explicitLineHeight: probe.explicitLineHeight,
    fontFamily: probe.fontFamily,
    textScript: probe.textScript,
    textCategory: probe.textCategory,
    textLines: probe.textLines,
    measuredContainerHeight: probe.measuredContainerHeight,
    containerFixedStyleHeight: probe.containerFixedStyleHeight,
    resolvedStyleTextAlign: probe.resolvedStyleTextAlign,
    resolvedStyleWritingDirection: probe.resolvedStyleWritingDirection,
    hasScrollableAncestor: probe.hasScrollableAncestor,
    scrollable: probe.scrollable,
    horizontalScrollableAncestor: probe.horizontalScrollableAncestor,
    siblings: liveProbeSiblings(probe),
  });
}

function applyProbeTextLayout(probe: AutoProbeRecord, textLines: DiagnosticTextLineMetric[]): void {
  const reportedLineCount = textLines.length;
  const reportedTotalLineHeight = textLines.reduce(
    (sum, line) => sum + (finiteNumber(line.height) ? line.height : 0),
    0,
  );

  probe.reportedLineCount = reportedLineCount;
  probe.reportedTotalLineHeight = reportedTotalLineHeight;
  probe.textLines = textLines;
  // This is intentionally applied after onLayout has created the probe. The
  // container height is then the real layout height, not an unavailable guess.
  probe.measuredContainerHeight = probe.height;
  probe.defects = deriveStoredProbeDefects(probe, true);
}

export function recordParentLayout(
  targetId: DiagnosticTargetId,
  layout: { x?: number; y?: number; width: number; height: number }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  if (layout && typeof layout.width === 'number' && typeof layout.height === 'number' && layout.width > 0 && layout.height > 0) {
    record.parentX = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
    record.parentY = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
    record.parentWidth = Math.round(layout.width * 10) / 10;
    record.parentHeight = Math.round(layout.height * 10) / 10;
    record.parentLayout = {
      x: record.parentX,
      y: record.parentY,
      width: record.parentWidth,
      height: record.parentHeight,
    };
    record.nativeIsRTL = Boolean(I18nManager.isRTL);

    if (record.rectangles && record.rectangles.parent) {
      record.rectangles.parent.isAvailable = true;
      record.rectangles.parent.x = record.parentX;
      record.rectangles.parent.y = record.parentY;
      record.rectangles.parent.width = record.parentWidth;
      record.rectangles.parent.height = record.parentHeight;
      record.rectangles.parent.unavailabilityReason = undefined;
    }

    updateOverflowAndStatus(record);
  } else {
    resetRecordToUnavailable(record, 'Parent dimensions reported <= 0');
  }
  notifyListeners();
}

export function recordTargetLayout(
  targetId: DiagnosticTargetId,
  layout: { x?: number; y?: number; width: number; height: number },
  actualStyle?: {
    textAlign?: string;
    writingDirection?: string;
    [key: string]: any;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  record.nativeIsRTL = Boolean(I18nManager.isRTL);
  // React Native onLayout delivers geometry only; native computed styles are not accessible at JS runtime.
  record.nativeComputedStyleUnavailable = true;

  if (actualStyle?.textAlign) {
    record.resolvedStyleTextAlign = String(actualStyle.textAlign);
    record.actualStyle.textAlign = String(actualStyle.textAlign);
    record.resolvedAlignment = String(actualStyle.textAlign);
  } else {
    record.resolvedStyleTextAlign = 'unspecified';
    record.actualStyle.textAlign = 'unspecified';
    record.resolvedAlignment = 'unspecified';
  }

  if (actualStyle?.writingDirection) {
    record.resolvedStyleWritingDirection = String(actualStyle.writingDirection);
    record.actualStyle.writingDirection = String(actualStyle.writingDirection);
    record.resolvedWritingDirection = String(actualStyle.writingDirection);
  } else {
    record.resolvedStyleWritingDirection = 'unspecified';
    record.actualStyle.writingDirection = 'unspecified';
    record.resolvedWritingDirection = 'unspecified';
  }

  if (layout && typeof layout.width === 'number' && typeof layout.height === 'number' && layout.width > 0 && layout.height > 0) {
    record.targetX = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
    record.targetY = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
    record.targetWidth = Math.round(layout.width * 10) / 10;
    record.targetHeight = Math.round(layout.height * 10) / 10;
    record.textContainerWidth = record.targetWidth;
    record.textContainerHeight = record.targetHeight;
    record.resolvedContainerLayout = {
      x: record.targetX,
      y: record.targetY,
      width: record.targetWidth,
      height: record.targetHeight,
    };
    updateOverflowAndStatus(record);
  } else {
    resetRecordToUnavailable(record, 'Target dimensions reported <= 0');
  }
  incrementProbeMutationSeq();
  notifyListeners();
}

/**
 * Backward compatibility alias for recordTargetLayout.
 */
export const recordTextLayout = recordTargetLayout;

export function recordNamedLayout(
  targetId: DiagnosticTargetId,
  name: string,
  layout: { x?: number; y?: number; width: number; height: number } | null | undefined,
  meta?: {
    testID?: string;
    parentIdentity?: string;
    frameWidth?: number | null;
    frameHeight?: number | null;
    cardWidth?: number | null;
    cardHeight?: number | null;
    ancestorCard?: string | null;
    unavailabilityReason?: string;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;
  incrementProbeMutationSeq();

  const record = measurementsStore[targetId];
  if (!record) return;

  if (!record.rectangles) {
    record.rectangles = {};
  }

  const existing: NamedLayoutRect = record.rectangles[name] || {
    name,
    testID: meta?.testID || name,
    parentIdentity: meta?.parentIdentity || record.parentTestId,
    x: null,
    y: null,
    width: null,
    height: null,
    frameWidth: null,
    frameHeight: null,
    cardWidth: null,
    cardHeight: null,
    ancestorCard: meta?.ancestorCard || null,
    isAvailable: false,
    frameUnavailable: true,
    measurementUnavailable: true,
    unavailabilityReason: 'Pending layout measurement',
    edgeOverflow: null,
    allocationOverflow: null,
  };

  if (meta?.testID) existing.testID = meta.testID;
  if (meta?.parentIdentity) existing.parentIdentity = meta.parentIdentity;
  existing.ancestorCard = meta?.ancestorCard !== undefined ? meta.ancestorCard : null;
  const storedGrad = record.rectangles?.gradient;
  // Bug 2: Prayer chip label rect reported frameWidth/frameHeight equal to its own size (24.3x19)
  // due to React Native synthetic event recycling in screen handlers.
  // Authoritative label frame must come from the stored gradient rect, never from the label's own event.
  const isLabelOwnEventRecycled =
    name === 'label' &&
    storedGrad?.isAvailable &&
    storedGrad.width != null &&
    storedGrad.height != null &&
    layout != null &&
    meta?.frameWidth != null &&
    meta?.frameHeight != null &&
    meta.frameWidth === Math.round(layout.width * 10) / 10 &&
    meta.frameHeight === Math.round(layout.height * 10) / 10 &&
    (meta.frameWidth !== storedGrad.width || meta.frameHeight !== storedGrad.height);

  if (isLabelOwnEventRecycled && storedGrad) {
    existing.frameWidth = storedGrad.width;
    existing.frameHeight = storedGrad.height;
  } else {
    existing.frameWidth = meta?.frameWidth != null ? Math.round(meta.frameWidth * 10) / 10 : null;
    existing.frameHeight = meta?.frameHeight != null ? Math.round(meta.frameHeight * 10) / 10 : null;
  }
  existing.cardWidth = meta?.cardWidth != null ? Math.round(meta.cardWidth * 10) / 10 : null;
  existing.cardHeight = meta?.cardHeight != null ? Math.round(meta.cardHeight * 10) / 10 : null;

  if (
    layout &&
    typeof layout.width === 'number' &&
    typeof layout.height === 'number' &&
    layout.width > 0 &&
    layout.height > 0
  ) {
    existing.isAvailable = true;
    existing.x = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
    existing.y = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
    existing.width = Math.round(layout.width * 10) / 10;
    existing.height = Math.round(layout.height * 10) / 10;

    // Evaluate edge overflow against the record's OWN frame:
    // If frame is unknown, set frameUnavailable/measurementUnavailable and do NOT emit hasOverflow: false.
    if (
      existing.frameWidth != null &&
      existing.frameHeight != null &&
      existing.frameWidth > 0 &&
      existing.frameHeight > 0
    ) {
      const fw = existing.frameWidth;
      const fh = existing.frameHeight;
      const rx = existing.x ?? 0;
      const ry = existing.y ?? 0;
      const rw = existing.width;
      const rh = existing.height;

      const overflowsLeft = rx < 0;
      const overflowsTop = ry < 0;
      const overflowsRight = (rx + rw) > fw;
      const overflowsBottom = (ry + rh) > fh;
      const hasOverflow = overflowsLeft || overflowsTop || overflowsRight || overflowsBottom;

      existing.edgeOverflow = {
        overflowsLeft,
        overflowsTop,
        overflowsRight,
        overflowsBottom,
        hasOverflow,
      };
      existing.frameUnavailable = false;
      existing.measurementUnavailable = false;
      existing.unavailabilityReason = undefined;
    } else {
      existing.frameUnavailable = true;
      existing.measurementUnavailable = true;
      existing.edgeOverflow = null;
      existing.unavailabilityReason = meta?.unavailabilityReason || 'Frame dimensions unavailable';
    }

    // Evaluate allocationOverflow against ancestor card ONLY when explicitly named
    if (
      existing.ancestorCard &&
      existing.cardWidth != null &&
      existing.cardHeight != null &&
      existing.cardWidth > 0 &&
      existing.cardHeight > 0
    ) {
      const cw = existing.cardWidth;
      const ch = existing.cardHeight;
      const rx = existing.x ?? 0;
      const ry = existing.y ?? 0;
      const rw = existing.width;
      const rh = existing.height;

      const aLeft = rx < 0;
      const aTop = ry < 0;
      const aRight = (rx + rw) > cw;
      const aBottom = (ry + rh) > ch;
      const hasAllocOverflow = aLeft || aTop || aRight || aBottom || rw > cw || rh > ch;

      existing.allocationOverflow = {
        overflowsLeft: aLeft,
        overflowsTop: aTop,
        overflowsRight: aRight,
        overflowsBottom: aBottom,
        hasOverflow: hasAllocOverflow,
      };
    } else {
      existing.allocationOverflow = null;
    }
  } else {
    // Clear stale values on invalid events or unmount
    existing.isAvailable = false;
    existing.x = null;
    existing.y = null;
    existing.width = null;
    existing.height = null;
    existing.frameWidth = null;
    existing.frameHeight = null;
    existing.cardWidth = null;
    existing.cardHeight = null;
    existing.edgeOverflow = null;
    existing.allocationOverflow = null;
    existing.frameUnavailable = true;
    existing.measurementUnavailable = true;
    existing.unavailabilityReason = meta?.unavailabilityReason || 'Dimensions <= 0 or invalid event';
  }

  record.rectangles[name] = existing;

  // When gradient rect is recorded/updated, propagate its dimensions to child label if present
  if (name === 'gradient' && existing.isAvailable && record.rectangles?.label?.isAvailable) {
    const lbl = record.rectangles.label;
    if (existing.width != null && existing.height != null && existing.width > 0 && existing.height > 0) {
      lbl.frameWidth = existing.width;
      lbl.frameHeight = existing.height;
      if (lbl.width != null && lbl.height != null) {
        const rx = lbl.x ?? 0;
        const ry = lbl.y ?? 0;
        const overflowsLeft = rx < 0;
        const overflowsTop = ry < 0;
        const overflowsRight = (rx + lbl.width) > existing.width;
        const overflowsBottom = (ry + lbl.height) > existing.height;
        lbl.edgeOverflow = {
          overflowsLeft,
          overflowsTop,
          overflowsRight,
          overflowsBottom,
          hasOverflow: overflowsLeft || overflowsTop || overflowsRight || overflowsBottom,
        };
        lbl.frameUnavailable = false;
        lbl.measurementUnavailable = false;
        lbl.unavailabilityReason = undefined;
      }
    }
  }

  notifyListeners();
}

export function recordNamedLayoutUnavailable(
  targetId: DiagnosticTargetId,
  name: string,
  reason: string,
  meta?: {
    testID?: string;
    parentIdentity?: string;
    ancestorCard?: string | null;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  if (!record.rectangles) {
    record.rectangles = {};
  }

  record.rectangles[name] = {
    name,
    testID: meta?.testID || name,
    parentIdentity: meta?.parentIdentity || record.parentTestId,
    x: null,
    y: null,
    width: null,
    height: null,
    frameWidth: null,
    frameHeight: null,
    cardWidth: null,
    cardHeight: null,
    ancestorCard: meta?.ancestorCard || null,
    isAvailable: false,
    frameUnavailable: true,
    measurementUnavailable: true,
    unavailabilityReason: reason,
    edgeOverflow: null,
    allocationOverflow: null,
  };
  notifyListeners();
}

export function recordMeasurementUnavailable(
  targetId: DiagnosticTargetId,
  reason: string = 'Native measurement could not be obtained'
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  resetRecordToUnavailable(record, reason);
  notifyListeners();
}

/**
 * Invalidate a diagnostic target on unmount or screen transition.
 * Wipes out all stale values and marks measurementUnavailable.
 */
/**
 * Keeps the last measured snapshot after a screen unmounts, flagged as stale.
 * Practical need: the diagnostics panel is opened from Settings, so by the time
 * the user exports a report the measured screen has already unmounted. Clearing
 * the values (invalidateDiagnosticTarget) would destroy the only device evidence.
 * Values are preserved but explicitly labelled, never presented as current.
 */
export function markDiagnosticTargetStale(
  targetId: DiagnosticTargetId,
  reason: string = 'Target unmounted'
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  record.staleAfterUnmount = true;
  record.staleReason = reason;

  Object.values(record.rectangles ?? {}).forEach((rect) => {
    if (!rect) return;
    rect.staleAfterUnmount = true;
    rect.staleReason = reason;
  });

  notifyListeners();
}

export function invalidateDiagnosticTarget(
  targetId: DiagnosticTargetId,
  reason: string = 'Target unmounted or invalidated'
): void {
  if (!isDiagnosticModeEnabled()) return;

  const record = measurementsStore[targetId];
  if (!record) return;

  resetRecordToUnavailable(record, reason);
  notifyListeners();
}

/**
 * Production diagnostic hook.
 * Gated by the two-factor diagnostic build identity + env flag.
 * Zero timers, zero global listeners, zero polling.
 * When diagnostics are disabled, returns empty props and undefined onLayout callbacks.
 */
export function useDiagnosticTarget(
  targetId: DiagnosticTargetId,
  options?: {
    actualStyle?: any;
    targetTestId?: string;
    parentTestId?: string;
  }
) {
  if (!isDiagnosticModeEnabled()) {
    return {
      isDiagnostic: false,
      parentProps: {},
      targetProps: {},
      recordNamed: () => {},
      recordNamedUnavailable: () => {},
      getNamedRectProps: () => ({}),
      invalidateTarget: () => {},
      markTargetStale: () => {},
    };
  }

  const flattenedStyle = options?.actualStyle ? StyleSheet.flatten(options.actualStyle) : undefined;
  const targetTestID = options?.targetTestId || DEFAULT_TARGETS[targetId].targetTestId;
  const parentTestID = options?.parentTestId || DEFAULT_TARGETS[targetId].parentTestId;

  const recordNamed = (
    name: string,
    e: LayoutChangeEvent,
    meta?: {
      testID?: string;
      parentIdentity?: string;
      frameWidth?: number | null;
      frameHeight?: number | null;
      cardWidth?: number | null;
      cardHeight?: number | null;
      ancestorCard?: string | null;
      unavailabilityReason?: string;
    }
  ) => {
    const layout = e?.nativeEvent?.layout;
    if (
      !layout ||
      typeof layout.width !== 'number' ||
      typeof layout.height !== 'number' ||
      layout.width <= 0 ||
      layout.height <= 0
    ) {
      recordNamedLayout(targetId, name, null, {
        testID: meta?.testID || name,
        parentIdentity: meta?.parentIdentity || parentTestID,
        ancestorCard: meta?.ancestorCard,
        unavailabilityReason: 'Empty or invalid layout event on named rectangle',
      });
      return;
    }
    recordNamedLayout(targetId, name, layout, {
      testID: meta?.testID || name,
      parentIdentity: meta?.parentIdentity || parentTestID,
      frameWidth: meta?.frameWidth,
      frameHeight: meta?.frameHeight,
      cardWidth: meta?.cardWidth,
      cardHeight: meta?.cardHeight,
      ancestorCard: meta?.ancestorCard,
    });
  };

  const recordNamedUnavailable = (
    name: string,
    reason: string,
    meta?: { testID?: string; parentIdentity?: string; ancestorCard?: string | null }
  ) => {
    recordNamedLayoutUnavailable(targetId, name, reason, {
      testID: meta?.testID || name,
      parentIdentity: meta?.parentIdentity || parentTestID,
      ancestorCard: meta?.ancestorCard,
    });
  };

  const getNamedRectProps = (
    name: string,
    meta?: {
      testID?: string;
      parentIdentity?: string;
      frameWidth?: number | null;
      frameHeight?: number | null;
      cardWidth?: number | null;
      cardHeight?: number | null;
      ancestorCard?: string | null;
    }
  ) => ({
    testID: meta?.testID || name,
    onLayout: (e: LayoutChangeEvent) => recordNamed(name, e, meta),
  });

  const invalidateTarget = (reason?: string) => {
    invalidateDiagnosticTarget(targetId, reason || 'Target unmounted or invalidated');
  };

  return {
    isDiagnostic: true,
    parentProps: {
      testID: parentTestID,
      onLayout: (e: LayoutChangeEvent) => {
        const layout = e?.nativeEvent?.layout;
        if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number' || layout.width <= 0 || layout.height <= 0) {
          recordMeasurementUnavailable(targetId, 'Empty or invalid layout event on parent');
          return;
        }
        recordParentLayout(targetId, layout);
      },
    },
    targetProps: {
      testID: targetTestID,
      onLayout: (e: LayoutChangeEvent) => {
        const layout = e?.nativeEvent?.layout;
        if (!layout || typeof layout.width !== 'number' || typeof layout.height !== 'number' || layout.width <= 0 || layout.height <= 0) {
          recordMeasurementUnavailable(targetId, 'Empty or invalid layout event on target');
          return;
        }
        recordTargetLayout(targetId, layout, flattenedStyle);
      },
    },
    recordNamed,
    recordNamedUnavailable,
    getNamedRectProps,
    invalidateTarget,
    markTargetStale: (reason?: string) => markDiagnosticTargetStale(targetId, reason),
  };
}

export function recordProbeLayout(
  id: string,
  kind: string,
  screen: string,
  layout: { x?: number; y?: number; width: number; height: number } | null | undefined,
  meta?: {
    frameWidth?: number | null;
    frameHeight?: number | null;
    isText?: boolean;
    isInteractive?: boolean;
    numberOfLines?: number;
    reportedLineCount?: number;
    reportedTotalLineHeight?: number;
    containerFixedStyleHeight?: number;
    resolvedFontSize?: number | null;
    resolvedLineHeight?: number | 'auto' | null;
    explicitLineHeight?: number | null;
    fontFamily?: string | null;
    textScript?: string | null;
    textCategory?: 'ui' | 'title' | 'numeral' | null;
    horizontalScrollableAncestor?: boolean;
    resolvedStyleTextAlign?: string;
    resolvedStyleWritingDirection?: string;
    parentIdentity?: string | null;
    hasScrollableAncestor?: boolean;
    scrollable?: boolean;
  }
): void {
  if (!isDiagnosticModeEnabled()) return;
  incrementProbeMutationSeq();

  if (
    !layout ||
    typeof layout.width !== 'number' ||
    typeof layout.height !== 'number' ||
    layout.width <= 0 ||
    layout.height <= 0
  ) {
    return;
  }

  // Ensure network and error interceptors are active in diagnostic builds
  if (typeof globalThis.fetch === 'function' && !isFetchInterceptionInstalled) {
    installDiagnosticNetworkInterceptor();
  }
  if (!isErrorInterceptionInstalled) {
    installDiagnosticErrorInterceptor();
  }

  const existing = probeStore[id];
  const x = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
  const y = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
  const width = Math.round(layout.width * 10) / 10;
  const height = Math.round(layout.height * 10) / 10;
  const measuredAt = new Date().toISOString();
  const activeLanguage = getActiveLanguage();
  const activeTheme = getActiveTheme();

  const fw = meta?.frameWidth != null ? Math.round(meta.frameWidth * 10) / 10 : existing?.frameWidth ?? null;
  const fh = meta?.frameHeight != null ? Math.round(meta.frameHeight * 10) / 10 : existing?.frameHeight ?? null;
  const parentIdentity = meta?.parentIdentity ?? existing?.parentIdentity ?? null;
  const hasScrollableAncestor = meta?.hasScrollableAncestor ?? existing?.hasScrollableAncestor ?? false;
  const scrollable = meta?.scrollable ?? existing?.scrollable ?? false;

  let overflow: AutoProbeRecord['overflow'] = null;
  let overflowStatus: 'unknown' | 'no_overflow' | 'overflow' = 'unknown';
  let reason: string | undefined = undefined;

  if (fw != null && fh != null && fw > 0 && fh > 0) {
    const overflowsLeft = x < 0;
    const overflowsTop = y < 0;
    const overflowsRight = (x + width) > fw;
    const overflowsBottom = (y + height) > fh;
    const hasOverflow = overflowsLeft || overflowsTop || overflowsRight || overflowsBottom;

    overflow = {
      status: hasOverflow ? 'overflow' : 'no_overflow',
      hasOverflow,
      overflowsLeft,
      overflowsTop,
      overflowsRight,
      overflowsBottom,
      reason: hasOverflow ? 'Exceeds frame dimensions' : 'Within frame bounds',
    };
    overflowStatus = hasOverflow ? 'overflow' : 'no_overflow';
  } else {
    overflow = null;
    overflowStatus = 'unknown';
    reason = 'No known parent frame for auto-probe (status: unknown)';
  }

  // Find existing siblings in the same frame
  const siblings: Partial<AutoProbeRecord>[] = [];
  if (fw != null && fh != null) {
    Object.values(probeStore).forEach((other) => {
      if (
        other.id !== id &&
        !other.staleAfterUnmount &&
        other.screen === screen &&
        other.frameWidth === fw &&
        other.frameHeight === fh
      ) {
        siblings.push(other);
      }
    });
  }

  const isText = meta?.isText ?? existing?.isText ?? false;
  const isInteractive = meta?.isInteractive ?? existing?.isInteractive ?? false;
  const numberOfLines = meta?.numberOfLines ?? existing?.numberOfLines;
  const reportedLineCount = meta?.reportedLineCount ?? existing?.reportedLineCount;
  const reportedTotalLineHeight = meta?.reportedTotalLineHeight ?? existing?.reportedTotalLineHeight;
  const containerFixedStyleHeight = meta?.containerFixedStyleHeight ?? existing?.containerFixedStyleHeight;
  const resolvedFontSize = meta?.resolvedFontSize ?? existing?.resolvedFontSize;
  const resolvedLineHeight = meta?.resolvedLineHeight ?? existing?.resolvedLineHeight;
  const explicitLineHeight = meta?.explicitLineHeight ?? existing?.explicitLineHeight;
  const fontFamily = meta?.fontFamily ?? existing?.fontFamily;
  const textScript = meta?.textScript ?? existing?.textScript;
  const textCategory = meta?.textCategory ?? existing?.textCategory;
  const horizontalScrollableAncestor = meta?.horizontalScrollableAncestor ?? existing?.horizontalScrollableAncestor ?? false;
  const resolvedStyleTextAlign = meta?.resolvedStyleTextAlign ?? existing?.resolvedStyleTextAlign;
  const resolvedStyleWritingDirection = meta?.resolvedStyleWritingDirection ?? existing?.resolvedStyleWritingDirection;

  const probeDraft: Partial<AutoProbeRecord> = {
    id,
    kind,
    screen,
    x,
    y,
    width,
    height,
    frameWidth: fw,
    frameHeight: fh,
    isText,
    isInteractive,
    numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    containerFixedStyleHeight,
    resolvedFontSize,
    resolvedLineHeight,
    explicitLineHeight,
    fontFamily,
    textScript,
    textCategory,
    textLines: existing?.textLines,
    measuredContainerHeight: height,
    horizontalScrollableAncestor,
    resolvedStyleTextAlign,
    resolvedStyleWritingDirection,
    parentIdentity,
    hasScrollableAncestor,
    scrollable,
  };

  const defects = deriveProbeDefects(probeDraft, {
    isText,
    isInteractive,
    numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    containerFixedStyleHeight,
    resolvedFontSize,
    resolvedLineHeight,
    explicitLineHeight,
    fontFamily,
    textScript,
    textCategory,
    textLines: existing?.textLines,
    measuredContainerHeight: height,
    horizontalScrollableAncestor,
    resolvedStyleTextAlign,
    resolvedStyleWritingDirection,
    siblings,
    hasScrollableAncestor,
    scrollable,
  });

  // LRU store eviction at MAX_AUTO_PROBES (400)
  if (!probeStore[id]) {
    if (probeLRUOrder.length >= MAX_AUTO_PROBES) {
      const oldestId = probeLRUOrder.shift();
      if (oldestId) {
        delete probeStore[oldestId];
        // Keep the matrices bounded too: an evicted probe must not linger there.
        probeLanguageHistory.delete(oldestId);
        probeThemeHistory.delete(oldestId);
      }
    }
    probeLRUOrder.push(id);
  } else {
    const idx = probeLRUOrder.indexOf(id);
    if (idx >= 0) {
      probeLRUOrder.splice(idx, 1);
    }
    probeLRUOrder.push(id);
  }

  probeStore[id] = {
    id,
    kind,
    screen,
    language: activeLanguage,
    theme: activeTheme,
    x,
    y,
    width,
    height,
    frameWidth: fw,
    frameHeight: fh,
    measuredAt,
    staleAfterUnmount: false,
    staleReason: undefined,
    measurementUnavailable: false,
    unavailabilityReason: undefined,
    overflow,
    overflowStatus,
    reason,
    isText,
    isInteractive,
    numberOfLines,
    reportedLineCount,
    reportedTotalLineHeight,
    resolvedFontSize,
    resolvedLineHeight,
    explicitLineHeight,
    fontFamily,
    textScript,
    textCategory,
    textLines: existing?.textLines,
    measuredContainerHeight: height,
    horizontalScrollableAncestor,
    containerFixedStyleHeight,
    resolvedStyleTextAlign,
    resolvedStyleWritingDirection,
    parentIdentity,
    hasScrollableAncestor,
    scrollable,
    defects,
  };

  const deferredTextLines = takePendingTextLayout(id);
  if (deferredTextLines) {
    applyProbeTextLayout(probeStore[id], deferredTextLines);
  }

  // Record history for Language and Theme matrices
  let langMap = probeLanguageHistory.get(id);
  if (!langMap) {
    langMap = new Map();
    probeLanguageHistory.set(id, langMap);
  }
  langMap.set(activeLanguage, {
    width,
    height,
    x,
    y,
    textAlign: resolvedStyleTextAlign,
    writingDirection: resolvedStyleWritingDirection,
    timestamp: measuredAt,
  });

  let themeMap = probeThemeHistory.get(id);
  if (!themeMap) {
    themeMap = new Map();
    probeThemeHistory.set(id, themeMap);
  }
  themeMap.set(activeTheme, {
    width,
    height,
    x,
    y,
    timestamp: measuredAt,
  });

  notifyListeners();
}

export function recordProbeTextLayout(
  id: string,
  lines: Partial<DiagnosticTextLineMetric>[]
): void {
  if (!isDiagnosticModeEnabled()) return;
  incrementProbeMutationSeq();
  const textLines = normalizeTextLineMetrics(lines);
  const probe = probeStore[id];
  if (!probe) {
    stashPendingTextLayout(id, textLines);
    return;
  }

  applyProbeTextLayout(probe, textLines);

  notifyListeners();
}

export function markProbeStale(id: string, reason: string = 'Element unmounted'): void {
  if (!isDiagnosticModeEnabled()) return;
  incrementProbeMutationSeq();
  const probe = probeStore[id];
  if (!probe) return;
  probe.staleAfterUnmount = true;
  probe.staleReason = reason;
  notifyListeners();
}

/**
 * Shared press execution for every instrumented control (shared primitives via
 * useAutoProbe and screen-level controls via usePressProbe / wrapControlPress).
 * Records the interaction, records press-handler failures into the error ledger with
 * the control id, and re-throws so the caller's behaviour is unchanged.
 */
interface ProbedPressSpec {
  id: string;
  kind: string;
  screen: string;
  disabled?: boolean;
  targetScreen?: string;
  handlerPresent?: boolean;
}

interface ProbedPressSnapshot {
  preScreen: string;
  mutationSeq: number;
  probeCount: number;
  errorCount: number;
}

function snapshotBeforePress(screen: string): ProbedPressSnapshot {
  return {
    preScreen: screen && screen !== 'App' ? screen : getGlobalActiveScreen() || 'App',
    mutationSeq: getProbeMutationSeq(),
    probeCount: Object.keys(probeStore).length,
    errorCount: errorLedger.length,
  };
}

function classifySyncEffect(
  record: DiagnosticInteractionRecord,
  snapshot: ProbedPressSnapshot,
  targetScreen?: string
): void {
  const currentGlobal = getGlobalActiveScreen();
  const syncTarget = targetScreen || (currentGlobal !== snapshot.preScreen ? currentGlobal : undefined);
  if (syncTarget && syncTarget !== snapshot.preScreen) {
    record.effect = 'navigated';
    record.targetScreen = syncTarget;
  } else if (getProbeMutationSeq() !== snapshot.mutationSeq || Object.keys(probeStore).length !== snapshot.probeCount) {
    record.effect = 'stateChanged';
  }
}

/** The delayed re-check that upgrades a press to navigated/stateChanged/error once its effects land. */
function scheduleEffectRecheck(record: DiagnosticInteractionRecord, snapshot: ProbedPressSnapshot, spec: ProbedPressSpec): void {
  const timerId = setTimeout(() => {
    globalPendingTimers.delete(timerId);
    const postScreen = getGlobalActiveScreen();
    const postTarget = spec.targetScreen || (postScreen !== snapshot.preScreen ? postScreen : undefined);
    const probeAfter = probeStore[spec.id];
    const isProbeStale = probeAfter?.staleAfterUnmount === true;

    if (postTarget && postTarget !== snapshot.preScreen) {
      record.effect = 'navigated';
      record.targetScreen = postTarget;
    } else if (errorLedger.length > snapshot.errorCount) {
      record.effect = 'error';
    } else if (
      getProbeMutationSeq() !== snapshot.mutationSeq ||
      Object.keys(probeStore).length !== snapshot.probeCount ||
      isProbeStale
    ) {
      record.effect = 'stateChanged';
    } else if (!record.effect || record.effect === 'noObservableEffect') {
      record.effect = 'noObservableEffect';
    }
    notifyListeners();
  }, 250);
  globalPendingTimers.add(timerId);
}

function newInteractionRecord(spec: ProbedPressSpec, snapshot: ProbedPressSnapshot): DiagnosticInteractionRecord {
  return {
    id: spec.id,
    screen: snapshot.preScreen,
    language: getActiveLanguage(),
    theme: getActiveTheme(),
    timestamp: new Date().toISOString(),
    handlerPresent: spec.handlerPresent !== false,
    disabled: Boolean(spec.disabled),
    effect: 'noObservableEffect',
    ...(spec.targetScreen ? { targetScreen: spec.targetScreen } : {}),
  };
}

/**
 * Shared press execution for instrumented controls. Records the interaction, records
 * press-handler failures into the error ledger with the control id, and re-throws so the
 * caller's behaviour is unchanged.
 */
function executeProbedPress(spec: ProbedPressSpec & { onPress: (e?: any) => void }): void {
  const snapshot = snapshotBeforePress(spec.screen);
  const record = newInteractionRecord(spec, snapshot);

  if (spec.disabled) {
    recordInteraction(record);
    return;
  }

  try {
    spec.onPress();
  } catch (err: any) {
    record.effect = 'error';
    record.errorName = err?.name || 'Error';
    recordInteraction(record);
    // Discoverable next to the interaction record: same control id, screen, language, theme.
    recordDiagnosticRuntimeError(err, { screen: snapshot.preScreen, controlId: spec.id, source: 'press' });
    throw err;
  }

  classifySyncEffect(record, snapshot, spec.targetScreen);
  recordInteraction(record);
  scheduleEffectRecheck(record, snapshot, spec);
}

/**
 * Records a press on a control whose handler is invoked by the caller itself (used where
 * the handler must be the element's own onPress reference). Never calls the handler, never
 * throws, and is a no-op when the gate is off.
 */
export function noteControlPress(
  controlId: string,
  kind: string,
  screen: string,
  options?: { disabled?: boolean; targetScreen?: string }
): void {
  if (!isDiagnosticModeEnabled() || !controlId) return;
  const spec: ProbedPressSpec = {
    id: controlId,
    kind,
    screen,
    disabled: options?.disabled,
    targetScreen: options?.targetScreen,
  };
  recordControlState(controlId, kind, screen, Boolean(options?.disabled));
  if (!options?.disabled) recordControlPress(controlId);
  const snapshot = snapshotBeforePress(screen);
  const record = newInteractionRecord(spec, snapshot);
  if (options?.disabled) {
    recordInteraction(record);
    return;
  }
  classifySyncEffect(record, snapshot, spec.targetScreen);
  recordInteraction(record);
  scheduleEffectRecheck(record, snapshot, spec);
}

/**
 * Screen-level press probe for controls built inline (modals, mapped rows, segmented
 * options) where a hook cannot be called per item. When the gate is OFF the handler
 * reference passed in is returned UNCHANGED - no wrapper, no registry write, no timer.
 */
export function wrapControlPress(
  controlId: string,
  kind: string,
  screen: string,
  onPress?: (e?: any) => void,
  options?: { disabled?: boolean; targetScreen?: string }
): ((e?: any) => void) | undefined {
  if (!isDiagnosticModeEnabled() || !onPress) return onPress;
  return (e?: any) => {
    if (!isDiagnosticModeEnabled() || !controlId) {
      onPress(e);
      return;
    }
    if (!options?.disabled) recordControlPress(controlId);
    executeProbedPress({
      id: controlId,
      kind,
      screen,
      onPress,
      disabled: options?.disabled,
      targetScreen: options?.targetScreen,
    });
  };
}

/**
 * Screen-level press probe. Gated exactly like useAutoProbe:
 * - gate OFF: returns the caller's own onPress (identical reference) and testID, and
 *   writes nothing to any registry - zero listeners, zero timers, zero props changed.
 * - gate ON: registers the control (id = `<screen>::<kind>::<name>`, e.g.
 *   `Settings::row::font-size`), tracks its disabled state for stuck-control detection,
 *   records the press and re-throws handler errors into the error ledger.
 */
export function usePressProbe(
  id: string,
  kind: string,
  options?: DiagnosticControlPressOptions
): DiagnosticControlProbeResult {
  const isEnabled = isDiagnosticModeEnabled();
  const contextScreen = useDiagScreen();
  const screen = contextScreen || getGlobalActiveScreen() || 'App';
  const controlId = isEnabled && id ? `${screen}::${kind}::${id}` : '';
  const disabled = Boolean(options?.disabled);

  useEffect(() => {
    if (!isEnabled || !controlId) return;
    recordControlState(controlId, kind, screen, disabled);
  }, [isEnabled, controlId, kind, screen, disabled]);

  const wrappedOnPress = useCallback(
    (e?: any) => {
      if (!options?.onPress) return;
      if (!options?.disabled) recordControlPress(controlId);
      executeProbedPress({
        id: controlId,
        kind,
        screen,
        onPress: options.onPress,
        disabled: options.disabled,
        targetScreen: options.targetScreen,
      });
    },
    [controlId, kind, screen, options]
  );

  if (!isEnabled) {
    // Hard gate: the caller's exact props, no wrapper of any kind.
    return { onPress: options?.onPress, testID: options?.testID, controlId: '' };
  }

  return {
    onPress: options?.onPress ? wrappedOnPress : undefined,
    testID: options?.testID,
    controlId,
  };
}

export interface AutoProbeOptions {
  isInteractive?: boolean;
  isText?: boolean;
  numberOfLines?: number;
  style?: StyleProp<any>;
  textAlign?: string;
  writingDirection?: string;
  onPress?: (e?: any) => void;
  disabled?: boolean;
  containerFixedStyleHeight?: number;
  resolvedFontSize?: number | null;
  resolvedLineHeight?: number | 'auto' | null;
  explicitLineHeight?: number | null;
  fontFamily?: string | null;
  textScript?: string | null;
  textCategory?: 'ui' | 'title' | 'numeral' | null;
  testID?: string;
  targetScreen?: string;
  parentIdentity?: string;
  scrollable?: boolean;
  hasScrollableAncestor?: boolean;
  horizontalScrollableAncestor?: boolean;
}

/**
 * Production auto-probe hook for shared primitives.
 * Gated by two-factor diagnostic gate:
 * - When gate is OFF: returns {} (or { onPress } if provided; zero onLayout, zero listeners, zero timers).
 * - When gate is ON: returns { onLayout, onTextLayout, onPress }, registers stable/monotonic id,
 *   tags with active screen, language, theme, and records interaction effects.
 */
export function useAutoProbe(
  id?: string,
  kind?: string,
  options?: AutoProbeOptions
): {
  onLayout?: (e: LayoutChangeEvent) => void;
  onTextLayout?: (e: NativeSyntheticEvent<TextLayoutEventData>) => void;
  onPress?: (e?: any) => void;
} {
  const isEnabled = isDiagnosticModeEnabled();
  const screen = useDiagScreen();
  const contextParent = useDiagParent();
  const effectiveKind = kind || 'probe';
  const effectiveParent = options?.parentIdentity || contextParent || undefined;

  const callerId = (options?.testID && options.testID.trim().length > 0)
    ? options.testID.trim()
    : (id && id.trim().length > 0)
    ? id.trim()
    : undefined;

  const [generatedBaseId] = useState(() => {
    if (!isEnabled) return '';
    if (callerId) return callerId;
    if (effectiveParent) {
      const idx = getNextAncestorProbeIndex(effectiveParent, effectiveKind);
      return `${effectiveParent}__${effectiveKind}-${idx}`;
    }
    return getNextMonotonicProbeId(effectiveKind);
  });

  const baseId = callerId || generatedBaseId;

  const [instanceSeq] = useState(() => (isEnabled ? getNextProbeInstanceSeq() : 0));
  const stableId = isEnabled
    ? `${screen || 'unknown'}::${effectiveKind}::${baseId}#${instanceSeq}`
    : '';

  useEffect(() => {
    if (!isEnabled || !stableId) return;
    return () => {
      markProbeStale(stableId, `${effectiveKind} unmounted`);
    };
  }, [isEnabled, stableId, effectiveKind]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    if (!isEnabled || !stableId) return;
    const layout = e?.nativeEvent?.layout;
    if (layout) {
      let fixedStyleHeight: number | undefined = options?.containerFixedStyleHeight;
      if (fixedStyleHeight === undefined && options?.style) {
        const flat = StyleSheet.flatten(options.style);
        if (typeof flat?.height === 'number') {
          fixedStyleHeight = flat.height;
        }
      }

      recordProbeLayout(stableId, effectiveKind, screen, layout, {
        isText: options?.isText,
        isInteractive: options?.isInteractive,
        numberOfLines: options?.numberOfLines,
        containerFixedStyleHeight: fixedStyleHeight,
        resolvedFontSize: options?.resolvedFontSize,
        resolvedLineHeight: options?.resolvedLineHeight,
        explicitLineHeight: options?.explicitLineHeight,
        fontFamily: options?.fontFamily,
        textScript: options?.textScript,
        textCategory: options?.textCategory,
        horizontalScrollableAncestor: options?.horizontalScrollableAncestor,
        resolvedStyleTextAlign: options?.textAlign,
        resolvedStyleWritingDirection: options?.writingDirection,
        parentIdentity: effectiveParent,
        hasScrollableAncestor: options?.hasScrollableAncestor || options?.scrollable || effectiveKind === 'ScreenTab',
        scrollable: options?.scrollable,
      });
    }
  }, [isEnabled, stableId, effectiveKind, screen, effectiveParent, options]);

  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (!isEnabled || !stableId) return;
    const lines = e?.nativeEvent?.lines;
    if (Array.isArray(lines)) {
      recordProbeTextLayout(stableId, lines);
    }
  }, [isEnabled, stableId]);

  const wrappedOnPress = useCallback((e?: any) => {
    if (!isEnabled) {
      options?.onPress?.(e);
      return;
    }
    // One shared press path for shared primitives and screen-level controls, so a
    // handler failure lands in the error ledger with the probe id for both.
    executeProbedPress({
      id: stableId,
      kind: effectiveKind,
      screen,
      onPress: (ev?: any) => options?.onPress?.(ev ?? e),
      disabled: Boolean(options?.disabled) || !options?.onPress,
      targetScreen: options?.targetScreen,
      handlerPresent: typeof options?.onPress === 'function',
    });
  }, [isEnabled, stableId, effectiveKind, screen, options]);

  // Strict hard gate check: return immediately if gate is off
  if (!isEnabled) {
    return options?.onPress ? { onPress: options.onPress } : {};
  }

  return {
    onLayout,
    onTextLayout: options?.isText ? onTextLayout : undefined,
    onPress: options?.onPress ? wrappedOnPress : undefined,
  };
}

/**
 * Builds an anonymized JSON report:
 * STRICT PRIVACY GUARANTEE:
 * - Zero Quran text
 * - Zero user content / user data
 * - Zero settings values
 * - Zero secrets/tokens / credentials
 * - Exported payload is strictly limited to structural layout geometry (dimensions, relative offsets x/y, overflow flags) and developer component/test IDs.
 */
export function buildDiagnosticReport(): DiagnosticReport {
  const activeLocale = getActiveLanguage();
  const activeTheme = getActiveTheme();
  const directionHelper = isI18nRTL() ? 'rtl' : 'ltr';
  const nativeIsRTL = Boolean(I18nManager.isRTL);

  const measurements: DiagnosticMeasurementReportItem[] = getTargetMeasurements().map((item) => ({
    screenId: item.screenId,
    componentId: item.componentId,
    targetTestId: item.targetTestId,
    parentTestId: item.parentTestId,
    status: item.status,
    measurementUnavailable: item.measurementUnavailable,
    staleAfterUnmount: item.staleAfterUnmount ?? false,
    staleReason: item.staleReason,
    nativeComputedStyleUnavailable: true,
    dimensions: {
      targetX: item.targetX,
      targetY: item.targetY,
      targetWidth: item.targetWidth,
      targetHeight: item.targetHeight,
      textContainerWidth: item.textContainerWidth,
      textContainerHeight: item.textContainerHeight,
      parentX: item.parentX,
      parentY: item.parentY,
      parentWidth: item.parentWidth,
      parentHeight: item.parentHeight,
    },
    resolvedContainerLayout: {
      x: item.targetX,
      y: item.targetY,
      width: item.targetWidth,
      height: item.targetHeight,
    },
    parentLayout: {
      x: item.parentX,
      y: item.parentY,
      width: item.parentWidth,
      height: item.parentHeight,
    },
    resolvedStyleTextAlign: item.resolvedStyleTextAlign,
    resolvedStyleWritingDirection: item.resolvedStyleWritingDirection,
    alignment: {
      textAlign: item.resolvedStyleTextAlign,
      writingDirection: item.resolvedStyleWritingDirection,
    },
    overflow: {
      status: item.overflowStatus,
      clippingStatus: item.clippingStatus,
      isWidthOverflowing: item.isWidthOverflowing,
      isHeightOverflowing: item.isHeightOverflowing,
      edgeOverflow: item.edgeOverflow,
    },
    rectangles: item.rectangles || {},
    nativeIsRTL: item.nativeIsRTL,
  }));

  // Diagnostics must not measure themselves: the panel renders the same shared
  // primitives, so excluding its own probe ids keeps the report about the app.
  const isDiagnosticSelfProbe = (p: { id: string; kind?: string; screen?: string }) => {
    if (p.screen === 'Diagnostics') return true;
    if ((p.kind || '').startsWith('diag')) return true;
    // ids are composed as screen::kind::base#instance in current builds, and were
    // plain base ids in earlier ones - check every segment for the diag- prefix.
    return p.id.split(/::|#/).some((seg) => seg.startsWith('diag-'));
  };
  const rawProbes = getAutoProbes().filter((p) => !isDiagnosticSelfProbe(p));
  // A screen can unmount after a probe records geometry. Preserve that stale
  // snapshot in `probes`, but never let it (or a stale sibling) participate in
  // the current defect verdict. Repair only sibling-dependent positives at
  // export time so a sibling that became stale after the last layout event is
  // removed without turning later-mounted siblings into retroactive defects.
  const reportProbeDefects = new Map<string, ProbeDefects>();
  rawProbes.forEach((probe) => {
    if (!probe.staleAfterUnmount) {
      const hasStaleSibling = rawProbes.some((sibling) =>
        sibling.staleAfterUnmount &&
        sibling.id !== probe.id &&
        sibling.screen === probe.screen &&
        sibling.frameWidth === probe.frameWidth &&
        sibling.frameHeight === probe.frameHeight
      );
      if (
        hasStaleSibling &&
        (probe.defects.siblingOverlap.flag === true || probe.defects.textRectOverlap.flag === true)
      ) {
        // Preserve the established record-time semantics for ordinary probes:
        // only repair the two classes that can be caused by a sibling's dead
        // rectangle, and only when the stored result was a positive defect.
        // This avoids turning later-mounted siblings into retroactive defects.
        const liveDefects = deriveStoredProbeDefects(probe);
        reportProbeDefects.set(probe.id, {
          ...probe.defects,
          siblingOverlap: probe.defects.siblingOverlap.flag === true
            ? liveDefects.siblingOverlap
            : probe.defects.siblingOverlap,
          textRectOverlap: probe.defects.textRectOverlap.flag === true
            ? liveDefects.textRectOverlap
            : probe.defects.textRectOverlap,
        });
      } else {
        reportProbeDefects.set(probe.id, probe.defects);
      }
    }
  });
  const probes: DiagnosticProbeReportItem[] = rawProbes.map((p) => ({
    ...p,
    defects: reportProbeDefects.get(p.id) || p.defects,
  }));

  // Derive defect counts and items
  const defectCounts: Record<DefectClass, number> = {
    textTruncated: 0,
    lineBoxTooTight: 0,
    textClipped: 0,
    lineOverlap: 0,
    textRectOverlap: 0,
    subTouchTarget: 0,
    offScreen: 0,
    outsideParent: 0,
    siblingOverlap: 0,
    rtlTextAlignMismatch: 0,
    rtlWritingDirectionSuspicious: 0,
    fixedHeightTextRisk: 0,
  };
  const defectItems: DiagnosticDefectReportItem[] = [];

  for (const p of rawProbes) {
    const currentDefects = reportProbeDefects.get(p.id);
    if (currentDefects) {
      (Object.keys(defectCounts) as DefectClass[]).forEach((cls) => {
        const item = currentDefects[cls];
        if (item && item.flag === true) {
          defectCounts[cls]++;
          defectItems.push({
            probeId: p.id,
            defectClass: cls,
            screen: p.screen,
            parentIdentity: p.parentIdentity || undefined,
            reason: item.reason,
            details: item.details,
          });
        }
      });
    }
  }
  const totalDefects = Object.values(defectCounts).reduce((a, b) => a + b, 0);

  // Interaction breakdown
  const interactionCounts: Record<InteractionEffect, number> = {
    navigated: 0,
    stateChanged: 0,
    noObservableEffect: 0,
    error: 0,
  };
  interactionLedger.forEach((it) => {
    if (interactionCounts[it.effect] !== undefined) {
      interactionCounts[it.effect]++;
    }
  });

  // Language matrix
  const languageMatrixItems: DiagnosticLanguageMatrixItem[] = [];
  let languageMismatchCount = 0;
  probeLanguageHistory.forEach((capturesMap, probeId) => {
    const probe = probeStore[probeId];
    const screen = probe?.screen || 'unknown';
    const captures = Object.fromEntries(capturesMap.entries());
    let mismatch = false;

    if (capturesMap.size >= 2) {
      let minW = Infinity;
      let maxW = -Infinity;
      let minH = Infinity;
      let maxH = -Infinity;
      capturesMap.forEach((cap) => {
        if (cap.width != null && cap.width > 0) {
          minW = Math.min(minW, cap.width);
          maxW = Math.max(maxW, cap.width);
        }
        if (cap.height != null && cap.height > 0) {
          minH = Math.min(minH, cap.height);
          maxH = Math.max(maxH, cap.height);
        }
      });
      if (minW < Infinity && maxW > -Infinity && minW > 0) {
        if ((maxW - minW) / minW > 0.20) mismatch = true;
      }
      if (minH < Infinity && maxH > -Infinity && minH > 0) {
        if ((maxH - minH) / minH > 0.20) mismatch = true;
      }
      if (mismatch) languageMismatchCount++;
      languageMatrixItems.push({
        probeId,
        screen,
        captures,
        languageGeometryMismatch: mismatch,
        needsRevisit: false,
      });
    } else {
      languageMatrixItems.push({
        probeId,
        screen,
        captures,
        languageGeometryMismatch: false,
        needsRevisit: true,
        reason: 'Only 1 language captured; switch language to record comparison',
      });
    }
  });

  // Theme matrix
  const themeMatrixItems: DiagnosticThemeMatrixItem[] = [];
  let themeMismatchCount = 0;
  probeThemeHistory.forEach((themeMap, probeId) => {
    const probe = probeStore[probeId];
    const screen = probe?.screen || 'unknown';
    const light = themeMap.get('light');
    const dark = themeMap.get('dark');

    if (light && dark) {
      let mismatch = false;
      if (light.width != null && dark.width != null && Math.min(light.width, dark.width) > 0) {
        const minW = Math.min(light.width, dark.width);
        if (Math.abs(light.width - dark.width) / minW > 0.20) mismatch = true;
      }
      if (light.height != null && dark.height != null && Math.min(light.height, dark.height) > 0) {
        const minH = Math.min(light.height, dark.height);
        if (Math.abs(light.height - dark.height) / minH > 0.20) mismatch = true;
      }
      if (mismatch) themeMismatchCount++;
      themeMatrixItems.push({
        probeId,
        screen,
        light,
        dark,
        themeGeometryMismatch: mismatch,
        needsRevisit: false,
      });
    } else {
      themeMatrixItems.push({
        probeId,
        screen,
        light,
        dark,
        themeGeometryMismatch: false,
        needsRevisit: true,
        reason: 'Only 1 theme captured; toggle theme to record comparison',
      });
    }
  });

  // Network summary
  const transportFailuresCount = networkLedger.filter((n) => n.status === 0).length;
  const failedCount = networkLedger.filter((n) => !n.ok).length;
  const netSummary: DiagnosticNetworkSummary = {
    total: networkLedger.length,
    ok: networkLedger.filter((n) => n.ok).length,
    failed: failedCount,
    transportFailures: transportFailuresCount,
    statusClassBreakdown: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
      'network/0': 0,
    },
    humanReadableStatus: transportFailuresCount > 0
      ? `${transportFailuresCount} transport failure(s)`
      : (failedCount > 0
        ? `${failedCount} HTTP failure(s)`
        : 'All network calls successful'),
    timeouts: networkLedger.filter((n) => n.timeout).length,
    offlineFallbacks: networkLedger.filter((n) => n.cachedFallback).length,
    slowestCall: null,
  };
  let maxDuration = -1;
  networkLedger.forEach((n) => {
    if (n.status >= 200 && n.status < 300) netSummary.statusClassBreakdown['2xx']++;
    else if (n.status >= 300 && n.status < 400) netSummary.statusClassBreakdown['3xx']++;
    else if (n.status >= 400 && n.status < 500) netSummary.statusClassBreakdown['4xx']++;
    else if (n.status >= 500 && n.status < 600) netSummary.statusClassBreakdown['5xx']++;
    else netSummary.statusClassBreakdown['network/0']++;

    if (n.durationMs > maxDuration) {
      maxDuration = n.durationMs;
      netSummary.slowestCall = {
        host: n.host,
        path: n.path,
        method: n.method,
        durationMs: n.durationMs,
      };
    }
  });

  // Screen coverage
  const visitedScreens = Array.from(new Set(rawProbes.map((p) => p.screen))).filter(Boolean).sort();
  const unvisitedScreens = KNOWN_SCREENS.filter((s) => !visitedScreens.includes(s)).sort();

  // U3: instrumented vs actually pressed controls, so a report cannot look complete
  // while a whole screen's controls were never wired or never touched.
  const appState = buildDiagnosticAppState();
  const interactiveControls = buildInteractiveControlCoverage();

  const coverage: DiagnosticCoverage = {
    screensVisited: visitedScreens,
    screensUnvisited: unvisitedScreens,
    visitedCount: visitedScreens.length,
    unvisitedCount: unvisitedScreens.length,
    coveragePercent: KNOWN_SCREENS.length > 0 ? Math.round((visitedScreens.length / KNOWN_SCREENS.length) * 100) : 0,
    interactiveControls,
    unpressedScreensWithInstrumentedControls: interactiveControls.unpressedScreensWithInstrumentedControls,
  };

  const capturedLanguages = new Set<string>();
  probeLanguageHistory.forEach((captures) => {
    captures.forEach((_capture, language) => capturedLanguages.add(language));
  });
  const capturedThemes = new Set<'light' | 'dark'>();
  probeThemeHistory.forEach((captures) => {
    captures.forEach((_capture, theme) => capturedThemes.add(theme));
  });
  const staleProbeCount = rawProbes.filter((probe) => probe.staleAfterUnmount).length;
  const coverageVerdictParts = [
    `Visited ${visitedScreens.length} of ${KNOWN_SCREENS.length} known screens.`,
    unvisitedScreens.length > 0
      ? `Screens not visited: ${unvisitedScreens.join(', ')}.`
      : 'All known screens were visited.',
    interactiveControls.totalInstrumented > 0
      ? `Pressed ${interactiveControls.totalPressed} of ${interactiveControls.totalInstrumented} instrumented controls; unpressed controls remain untested.`
      : 'No instrumented controls were captured, so control behavior was not tested.',
    capturedLanguages.size === 0
      ? 'No language geometry was captured, so language comparison is unavailable.'
      : capturedLanguages.size === 1
      ? '1 language captured; language geometry cannot be compared across languages.'
      : `${capturedLanguages.size} languages captured; language geometry comparisons are available for those captures.`,
    capturedThemes.size === 0
      ? 'No theme geometry was captured, so theme comparison is unavailable.'
      : capturedThemes.size === 1
      ? '1 theme captured; theme geometry cannot be compared across themes.'
      : `${capturedThemes.size} themes captured; theme geometry comparisons are available for those captures.`,
    staleProbeCount > 0
      ? `${staleProbeCount} probe snapshot(s) were stale after unmount; those snapshots are retained for diagnosis but excluded from defect counts.`
      : 'No probe snapshots were marked stale after unmount.',
    'This session supports conclusions only for captured probes and recorded interactions, not for unvisited screens or untested states.',
  ];
  const coverageVerdict = coverageVerdictParts.join(' ');

  return {
    timestamp: new Date().toISOString(),
    buildId: DIAGNOSTIC_BUILD_ID,
    version: DIAGNOSTIC_VERSION,
    versionCode: DIAGNOSTIC_VERSION_CODE,
    locale: activeLocale,
    theme: activeTheme,
    directionHelperResult: directionHelper,
    i18nManagerIsRTL: nativeIsRTL,
    probeCount: probes.length,
    probes,
    probesTruncated: false,
    totalProbes: probes.length,
    includedProbes: probes.length,
    probesKept: 'all',
    defects: {
      countsByClass: defectCounts,
      totalDefects,
      items: defectItems,
      defectsTruncated: false,
      includedDefects: defectItems.length,
      kept: 'all',
    },
    interactions: {
      total: interactionLedger.length,
      countsByEffect: interactionCounts,
      items: [...interactionLedger],
    },
    languageMatrix: {
      mismatchCount: languageMismatchCount,
      items: languageMatrixItems,
    },
    themeMatrix: {
      mismatchCount: themeMismatchCount,
      items: themeMatrixItems,
    },
    network: {
      summary: netSummary,
      items: [...networkLedger],
    },
    errors: {
      total: errorLedger.length,
      items: [...errorLedger],
      groups: groupActionableErrors(),
    },
    appState,
    coverage,
    coverageVerdict,
    summary: {
      probeCount: probes.length,
      totalDefects,
      interactionCount: interactionLedger.length,
      networkRequestCount: networkLedger.length,
      errorCount: errorLedger.length,
      visitedScreensCount: visitedScreens.length,
      instrumentedControls: interactiveControls.totalInstrumented,
      pressedControls: interactiveControls.totalPressed,
      stuckDisabledControls: appState.controls.stuckDisabledCount,
      appStateDefects: appState.defects.length,
    },
    screensVisited: visitedScreens,
    screensUnvisited: unvisitedScreens,
    measurements,
  };
}

export const MAX_REPORT_PAYLOAD_BYTES = 1572864; // 1.5 MB target cap

export function getUtf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
  if (globalObj && globalObj.Buffer) {
    return globalObj.Buffer.byteLength(str, 'utf8');
  }
  try {
    return encodeURIComponent(str).replace(/%[A-F\d]{2}/gi, 'U').length;
  } catch {
    return str.length;
  }
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface DiagnosticSummaryReport {
  type: 'summary';
  timestamp: string;
  buildId: string;
  version: string;
  versionCode: number;
  locale: string;
  theme: string;
  directionHelperResult: string;
  i18nManagerIsRTL: boolean;
  coverage: DiagnosticCoverage;
  coverageVerdict: string;
  appState: DiagnosticAppState;
  counts: {
    probes: number;
    totalDefects: number;
    instrumentedControls: number;
    pressedControls: number;
    stuckDisabledControls: number;
    appStateDefects: number;
    defectsByClass: Record<DefectClass, number>;
    interactions: number;
    networkRequests: number;
    errors: number;
    visitedScreens: number;
    unvisitedScreens: number;
  };
  defects: DiagnosticDefectReportItem[];
  notificationStats: {
    requested: number;
    delivered: number;
    coalesced: number;
  };
}

export function buildDiagnosticSummary(): DiagnosticSummaryReport {
  const report = buildDiagnosticReport();
  // Ensure EVERY defect item survives into the summary fallback, with per-item fields trimmed cleanly
  const trimmedDefects: DiagnosticDefectReportItem[] = (report.defects.items || []).map((d) => ({
    probeId: d.probeId,
    defectClass: d.defectClass,
    screen: d.screen,
    ...(d.reason ? { reason: d.reason.trim() } : {}),
    ...(d.details ? { details: d.details } : {}),
  }));

  return {
    type: 'summary',
    timestamp: report.timestamp,
    buildId: report.buildId,
    version: report.version,
    versionCode: report.versionCode,
    locale: report.locale,
    theme: report.theme,
    directionHelperResult: report.directionHelperResult,
    i18nManagerIsRTL: report.i18nManagerIsRTL,
    coverage: report.coverage,
    coverageVerdict: report.coverageVerdict,
    appState: report.appState,
    counts: {
      probes: report.probeCount,
      totalDefects: report.defects.totalDefects,
      instrumentedControls: report.appState.controls.totalInstrumented,
      pressedControls: report.appState.controls.pressedCount,
      stuckDisabledControls: report.appState.controls.stuckDisabledCount,
      appStateDefects: report.appState.defects.length,
      defectsByClass: report.defects.countsByClass,
      interactions: report.interactions.total,
      networkRequests: report.network.summary.total,
      errors: report.errors.total,
      visitedScreens: report.coverage.visitedCount,
      unvisitedScreens: report.coverage.unvisitedCount,
    },
    defects: trimmedDefects,
    notificationStats: getDiagnosticNotificationStats(),
  };
}

function droppedDefectClasses(
  keptItems: DiagnosticDefectReportItem[],
  allItems: DiagnosticDefectReportItem[]
): DefectClass[] {
  const keptClasses = new Set(keptItems.map((i) => i.defectClass));
  return [...new Set(allItems.map((i) => i.defectClass))].filter((c) => !keptClasses.has(c));
}

export function trimMeasurementRectangles(
  measurements: DiagnosticMeasurementReportItem[]
): DiagnosticMeasurementReportItem[] {
  return measurements.map((m) => {
    if (!m.rectangles) return m;
    const trimmedRects: Record<string, NamedLayoutRect> = {};
    for (const [key, rect] of Object.entries(m.rectangles)) {
      // Drop duplicated nested parent rectangle where flat fields already carry the data
      if (
        key === 'parent' &&
        rect.x === m.parentLayout?.x &&
        rect.y === m.parentLayout?.y &&
        rect.width === m.parentLayout?.width &&
        rect.height === m.parentLayout?.height
      ) {
        continue;
      }
      trimmedRects[key] = rect;
    }
    return {
      ...m,
      rectangles: trimmedRects,
    };
  });
}

export function serializeReportBounded(
  report: DiagnosticReport,
  maxBytes: number = MAX_REPORT_PAYLOAD_BYTES
): string {
  // Always trim duplicated parent layout rectangles from legacy measurements first
  const trimmedMeasurements = trimMeasurementRectangles(report.measurements || []);

  const totalProbesCount = report.probes?.length || 0;
  const totalDefectsCount = report.defects?.totalDefects ?? (report.defects?.items?.length || 0);

  // Initial candidate: KEEP ALL defects, ALL probes, and full item detail
  let currentReport: DiagnosticReport = {
    ...report,
    measurements: trimmedMeasurements,
    probes: [...(report.probes || [])],
    probesTruncated: false,
    totalProbes: totalProbesCount,
    includedProbes: totalProbesCount,
    probesKept: 'all',
    defects: {
      ...report.defects,
      items: [...(report.defects?.items || [])],
      defectsTruncated: false,
      totalDefects: totalDefectsCount,
      includedDefects: report.defects?.items?.length || 0,
      kept: 'all',
    },
    interactions: {
      ...report.interactions,
      items: [...(report.interactions?.items || [])],
    },
    network: {
      ...report.network,
      items: [...(report.network?.items || [])],
    },
    errors: {
      ...report.errors,
      items: [...(report.errors?.items || [])],
    },
    languageMatrix: {
      ...report.languageMatrix,
      items: [...(report.languageMatrix?.items || [])],
    },
    themeMatrix: {
      ...report.themeMatrix,
      items: [...(report.themeMatrix?.items || [])],
    },
    truncation: {
      wasTruncated: false,
      trimmed: [],
    },
  };

  // Step 1: Pretty formatted full report (preferred for human inspection)
  let json = JSON.stringify(currentReport, null, 2);
  let size = getUtf8ByteLength(json);
  if (size <= maxBytes) {
    return json;
  }

  // If over cap, progressively trim in a bounded loop, re-measuring after each step
  const trimmedLedger: string[] = [];

  // Step 2: Switch to compact JSON (no indentation)
  json = JSON.stringify(currentReport);
  size = getUtf8ByteLength(json);
  if (size <= maxBytes) {
    return json;
  }
  trimmedLedger.push('compact_formatting');

  // Step 3: Trim auxiliary event items (network, interactions, errors, matrices) while preserving summaries
  trimmedLedger.push('auxiliary_ledgers_trimmed_to_25');
  currentReport = {
    ...currentReport,
    interactions: {
      ...currentReport.interactions,
      items: currentReport.interactions.items.slice(0, 25),
      itemsTruncated: currentReport.interactions.items.length > 25,
    },
    network: {
      ...currentReport.network,
      items: currentReport.network.items.slice(0, 25),
      itemsTruncated: currentReport.network.items.length > 25,
    },
    errors: {
      ...currentReport.errors,
      items: currentReport.errors.items.slice(0, 25),
      itemsTruncated: currentReport.errors.items.length > 25,
    },
    languageMatrix: {
      ...currentReport.languageMatrix,
      items: currentReport.languageMatrix.items.slice(0, 25),
      itemsTruncated: currentReport.languageMatrix.items.length > 25,
    },
    themeMatrix: {
      ...currentReport.themeMatrix,
      items: currentReport.themeMatrix.items.slice(0, 25),
      itemsTruncated: currentReport.themeMatrix.items.length > 25,
    },
    measurements: currentReport.measurements.slice(0, 25),
    truncation: {
      wasTruncated: true,
      trimmed: [...trimmedLedger],
    },
  };

  json = JSON.stringify(currentReport);
  size = getUtf8ByteLength(json);
  if (size <= maxBytes) {
    return json;
  }

  // Step 4: Empty auxiliary ledgers to 0 items (keep summaries)
  trimmedLedger.push('auxiliary_ledgers_emptied');
  currentReport = {
    ...currentReport,
    interactions: {
      ...currentReport.interactions,
      items: [],
      itemsTruncated: true,
    },
    network: {
      ...currentReport.network,
      items: [],
      itemsTruncated: true,
    },
    errors: {
      ...currentReport.errors,
      items: [],
      itemsTruncated: true,
    },
    languageMatrix: {
      ...currentReport.languageMatrix,
      items: [],
      itemsTruncated: true,
    },
    themeMatrix: {
      ...currentReport.themeMatrix,
      items: [],
      itemsTruncated: true,
    },
    measurements: [],
    truncation: {
      wasTruncated: true,
      trimmed: [...trimmedLedger],
    },
  };

  json = JSON.stringify(currentReport);
  size = getUtf8ByteLength(json);
  if (size <= maxBytes) {
    return json;
  }

  // Step 5: Trim normal probes (keep defect probes first, and keep the NEWEST normal probes)
  const allProbes = report.probes || [];
  const defectProbes = allProbes.filter(
    (p) => p.defects && Object.values(p.defects).some((d) => d?.flag === true)
  );
  const normalProbes = allProbes.filter(
    (p) => !p.defects || !Object.values(p.defects).some((d) => d?.flag === true)
  );

  const normalProbeLimits = [250, 150, 50, 0];
  for (const limit of normalProbeLimits) {
    // Normal probes: keep the NEWEST by slicing the tail
    const newestNormal = limit > 0 ? normalProbes.slice(-limit) : [];
    const combinedProbes = [...defectProbes, ...newestNormal];

    currentReport = {
      ...currentReport,
      probes: combinedProbes,
      probesTruncated: combinedProbes.length < totalProbesCount,
      totalProbes: totalProbesCount,
      includedProbes: combinedProbes.length,
      probesKept: 'defect-probes+newest',
      truncation: {
        wasTruncated: true,
        trimmed: [...trimmedLedger, `normal_probes_capped_${limit}`],
      },
    };

    json = JSON.stringify(currentReport);
    size = getUtf8ByteLength(json);
    if (size <= maxBytes) {
      trimmedLedger.push(`normal_probes_capped_${limit}`);
      return json;
    }
  }
  trimmedLedger.push('normal_probes_dropped');

  // Step 6: If still over cap (e.g. adversarial probes or oversized probe IDs/fields),
  // progressively reduce defect probes keeping NEWEST, and sanitize oversized probe string fields
  let remainingProbes = [...currentReport.probes];
  const defectProbeLimits = [50, 25, 10, 5, 0];
  for (const pLimit of defectProbeLimits) {
    // Keep newest defect probes
    const sliced = remainingProbes.slice(-pLimit);
    // Sanitize any excessively long probe string fields (> 128 chars, e.g. crafted 100 KB test probes)
    const sanitized = sliced.map((p) => {
      const pId = typeof p.id === 'string' && p.id.length > 128 ? p.id.slice(0, 128) + '...' : p.id;
      return {
        ...p,
        id: pId,
      };
    });

    currentReport = {
      ...currentReport,
      probes: sanitized,
      probesTruncated: sanitized.length < totalProbesCount,
      totalProbes: totalProbesCount,
      includedProbes: sanitized.length,
      probesKept: 'defect-probes+newest',
      truncation: {
        wasTruncated: true,
        trimmed: [...trimmedLedger, `probes_capped_${pLimit}`],
      },
    };

    json = JSON.stringify(currentReport);
    size = getUtf8ByteLength(json);
    if (size <= maxBytes) {
      trimmedLedger.push(`probes_capped_${pLimit}`);
      return json;
    }
  }
  trimmedLedger.push('probes_heavily_trimmed');

  // Step 7: Defect items trimming (ONLY IF ABSOLUTELY NECESSARY to satisfy maxBytes)
  // Ensure every defect class survives if possible, keeping NEWEST items,
  // and EXPLICITLY disclose truncation.
  const allDefectItems = report.defects?.items || [];
  let curDefectItems = [...allDefectItems];

  let iterations = 0;
  while (size > maxBytes && iterations < 20) {
    iterations++;
    const targetCount = Math.max(1, Math.floor(curDefectItems.length * 0.5));

    // Preserve at least 1 item of each defect class present in the store
    const classesSeen = new Set<DefectClass>();
    const representativeItems: DiagnosticDefectReportItem[] = [];
    const otherItems: DiagnosticDefectReportItem[] = [];

    // Traverse from newest to oldest
    for (let i = curDefectItems.length - 1; i >= 0; i--) {
      const item = curDefectItems[i];
      if (!classesSeen.has(item.defectClass)) {
        classesSeen.add(item.defectClass);
        representativeItems.push(item);
      } else {
        otherItems.push(item);
      }
    }

    const remainingBudget = Math.max(0, targetCount - representativeItems.length);
    const chosenOthers = otherItems.slice(0, remainingBudget);
    // Rebuild in the ORIGINAL (oldest -> newest) order. Concatenating the
    // newest-first representatives with the newest-first others scrambles the
    // ordering, so the next iteration's reverse traversal starts at the OLDEST
    // item and "newest per class" silently degrades into an arbitrary pick.
    const chosenSet = new Set([...representativeItems, ...chosenOthers]);
    curDefectItems = curDefectItems.filter((item) => chosenSet.has(item));

    // Sanitize oversized strings (> 128 chars)
    curDefectItems = curDefectItems.map((d) => ({
      ...d,
      reason: d.reason && d.reason.length > 128 ? d.reason.slice(0, 125) + '...' : d.reason,
    }));

    currentReport = {
      ...currentReport,
      defects: {
        ...currentReport.defects,
        items: curDefectItems,
        defectsTruncated: curDefectItems.length < totalDefectsCount,
        totalDefects: totalDefectsCount,
        includedDefects: curDefectItems.length,
        kept: 'newest-per-class',
        // Classes lost by trimming must be disclosed, never silently dropped.
        defectClassesDropped: droppedDefectClasses(curDefectItems, allDefectItems),
      },
      truncation: {
        wasTruncated: true,
        trimmed: [...trimmedLedger, `defects_capped_${curDefectItems.length}`],
        finalSizeBytes: size,
        maxBytes,
      },
    };

    json = JSON.stringify(currentReport);
    size = getUtf8ByteLength(json);
    if (size <= maxBytes) {
      return json;
    }

    if (curDefectItems.length <= 1) {
      break;
    }
  }

  // Final hard guarantee: if STILL over maxBytes, aggressively slice to fit strictly under maxBytes
  if (size > maxBytes) {
    currentReport = {
      ...currentReport,
      defects: {
        ...currentReport.defects,
        items: currentReport.defects.items.slice(-1).map((d) => ({
          probeId: String(d.probeId).slice(0, 32),
          defectClass: d.defectClass,
          screen: String(d.screen).slice(0, 32),
          reason: d.reason ? d.reason.slice(0, 32) : undefined,
        })),
        defectsTruncated: true,
        totalDefects: totalDefectsCount,
        includedDefects: Math.min(1, currentReport.defects.items.length),
        kept: 'newest-per-class',
        defectClassesDropped: droppedDefectClasses(
          currentReport.defects.items.slice(-1),
          allDefectItems
        ),
      },
      probes: [],
      probesTruncated: true,
      totalProbes: totalProbesCount,
      includedProbes: 0,
      probesKept: 'defect-probes+newest',
      truncation: {
        wasTruncated: true,
        trimmed: [...trimmedLedger, 'emergency_hard_trim'],
        finalSizeBytes: size,
        maxBytes,
      },
    };
    json = JSON.stringify(currentReport);
  }

  return json;
}

export function getEstimatedReportSizeBytes(): number {
  try {
    const report = buildDiagnosticReport();
    const str = serializeReportBounded(report);
    return getUtf8ByteLength(str);
  } catch {
    return 1024;
  }
}

export function getEstimatedSummarySizeBytes(): number {
  try {
    const summary = buildDiagnosticSummary();
    const str = JSON.stringify(summary, null, 2);
    return getUtf8ByteLength(str);
  } catch {
    return 512;
  }
}

/**
 * Truthful export handling with 3 reliable paths:
 * Path 1: Sharing.shareAsync with file written to documentDirectory (persistent)
 * Path 2: If sharing unavailable or fails, copy to clipboard AND confirm file location
 * Path 3: Surface written path in panel with copyable string
 */
export async function exportDiagnosticReport(options?: ExportReportOptions): Promise<ExportReportResult> {
  try {
    const isSummary = Boolean(options?.summaryOnly);
    const jsonString = isSummary
      ? JSON.stringify(buildDiagnosticSummary(), null, 2)
      : serializeReportBounded(buildDiagnosticReport());

    const safeBuildId = (DIAGNOSTIC_BUILD_ID || 'BUILD').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeVersion = (DIAGNOSTIC_VERSION || '1.1.92').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const prefix = isSummary ? 'rtl-diagnostic-summary' : 'rtl-diagnostic-report';
    const fileName = `${prefix}-${safeBuildId}-v${safeVersion}-${timestamp}.json`;

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return {
          success: true,
          status: 'fileReady',
          shareStatus: 'unavailable',
          fileReady: true,
          filePath: fileName,
          fileSizeBytes: blob.size,
          shareInvoked: false,
        };
      }
      return {
        success: false,
        status: 'unavailable',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'Web document environment is unavailable.',
      };
    }

    // Path 1 primary destination: documentDirectory (persistent, not cache)
    const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!dir) {
      if (Clipboard && typeof (Clipboard as any).setString === 'function') {
        try {
          Clipboard.setString(jsonString);
        } catch {}
      }
      return {
        success: false,
        status: 'unavailable',
        shareStatus: 'unavailable',
        fileReady: false,
        clipboardCopied: true,
        error: 'No writable directory found on device.',
      };
    }

    const baseDir = dir.endsWith('/') ? dir : `${dir}/`;
    const filePath = `${baseDir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8',
    });

    // Verify written file exists on disk and is non-empty
    const fileInfo = await FileSystem.getInfoAsync(filePath).catch(() => null);
    if (!fileInfo || !fileInfo.exists || (fileInfo.size !== undefined && fileInfo.size <= 0)) {
      return {
        success: false,
        status: 'failed',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'Report file could not be verified on disk.',
        filePath,
      };
    }

    const fileSizeBytes =
      fileInfo.size !== undefined && fileInfo.size > 0
        ? fileInfo.size
        : getUtf8ByteLength(jsonString);

    // Path 1: Sharing.shareAsync
    const sharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (sharingAvailable) {
      try {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: getDiagnosticShareDialogTitle(),
        });
        // Android expo-sharing cannot confirm chooser completion; report truthful userActionRequired/unknown
        return {
          success: false,
          status: 'userActionRequired',
          shareStatus: 'unknown',
          fileReady: true,
          shareInvoked: true,
          filePath,
          fileSizeBytes,
        };
      } catch (shareErr) {
        // Path 2 fallback when share throws: copy to clipboard AND report truthful status
        if (Clipboard && typeof (Clipboard as any).setString === 'function') {
          try {
            Clipboard.setString(jsonString);
          } catch {}
        }
        return {
          success: false,
          status: 'failed',
          shareStatus: 'unavailable',
          fileReady: true,
          shareInvoked: false,
          clipboardCopied: true,
          error: shareErr instanceof Error ? shareErr.message : String(shareErr),
          filePath,
          fileSizeBytes,
        };
      }
    }

    // Native fallback to React Native Share if expo-sharing is unavailable
    if (Share && typeof Share.share === 'function') {
      try {
        const shareResult = await Share.share({
          title: getDiagnosticShareTitle(),
          message: jsonString,
        });

        if (shareResult.action === Share.dismissedAction) {
          return {
            success: false,
            status: 'cancelledOrUnknown',
            shareStatus: 'cancelled',
            fileReady: true,
            shareInvoked: true,
            error: 'Share dialog dismissed.',
            filePath,
            fileSizeBytes,
          };
        } else if (shareResult.action === Share.sharedAction) {
          return {
            success: false,
            status: 'userActionRequired',
            shareStatus: 'unknown',
            fileReady: true,
            shareInvoked: true,
            filePath,
            fileSizeBytes,
          };
        }
      } catch (rnShareErr) {
        if (Clipboard && typeof (Clipboard as any).setString === 'function') {
          try {
            Clipboard.setString(jsonString);
          } catch {}
        }
        return {
          success: false,
          status: 'failed',
          shareStatus: 'unavailable',
          fileReady: true,
          shareInvoked: false,
          clipboardCopied: true,
          error: rnShareErr instanceof Error ? rnShareErr.message : String(rnShareErr),
          filePath,
          fileSizeBytes,
        };
      }
    }

    // Path 2: When sharing is unavailable on device, copy to clipboard AND confirm file ready
    if (Clipboard && typeof (Clipboard as any).setString === 'function') {
      try {
        Clipboard.setString(jsonString);
      } catch {}
    }

    return {
      success: true,
      status: 'fileReady',
      shareStatus: 'unavailable',
      fileReady: true,
      shareInvoked: false,
      clipboardCopied: true,
      filePath,
      fileSizeBytes,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: 'failed',
      shareStatus: 'unavailable',
      fileReady: false,
      error: errorMessage,
    };
  }
}

export async function exportDiagnosticSummary(): Promise<ExportReportResult> {
  return exportDiagnosticReport({ summaryOnly: true });
}
