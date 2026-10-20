import { useState, useEffect, useCallback } from 'react';
import { I18nManager, Platform, Share, LayoutChangeEvent, StyleSheet } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import i18n, { isRTL as isI18nRTL } from '../i18n';
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
import { useDiagScreen } from './diagnosticScreenContext';
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

export interface AutoProbeRecord {
  id: string;
  kind: string;
  screen: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  frameWidth?: number | null;
  frameHeight?: number | null;
  measuredAt: string | null;
  staleAfterUnmount: boolean;
  staleReason?: string;
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
}

export interface DiagnosticProbeReportItem {
  id: string;
  kind: string;
  screen: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  measuredAt: string | null;
  staleAfterUnmount: boolean;
  staleReason?: string;
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
}

export interface DiagnosticReport {
  timestamp: string;
  buildId: string;
  version: string;
  versionCode: number;
  locale: string;
  directionHelperResult: 'rtl' | 'ltr';
  i18nManagerIsRTL: boolean;
  probeCount: number;
  probes: DiagnosticProbeReportItem[];
  screensVisited: string[];
  screensUnvisited: string[];
  measurements: DiagnosticMeasurementReportItem[];
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

export interface ExportReportResult {
  success: boolean;
  status: ExportStatus;
  shareStatus: ShareStatus;
  fileReady: boolean;
  shareInvoked?: boolean;
  error?: string;
  filePath?: string;
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
const monotonicCounters: Record<string, number> = {};

export function getNextMonotonicProbeId(kind: string = 'probe'): string {
  monotonicCounters[kind] = (monotonicCounters[kind] || 0) + 1;
  return `auto-${kind}-${monotonicCounters[kind]}`;
}

export function resetMonotonicCounters(): void {
  for (const k of Object.keys(monotonicCounters)) {
    delete monotonicCounters[k];
  }
}

export function resetDiagnosticProbes(): void {
  probeStore = {};
  resetMonotonicCounters();
  notifyListeners();
}

export function getAutoProbes(): AutoProbeRecord[] {
  return Object.values(probeStore);
}

export function getAutoProbe(id: string): AutoProbeRecord | undefined {
  return probeStore[id];
}

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function addDiagnosticListener(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetDiagnosticMeasurements(): void {
  measurementsStore = createInitialStore();
  probeStore = {};
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
  }
): void {
  if (!isDiagnosticModeEnabled()) return;

  if (
    !layout ||
    typeof layout.width !== 'number' ||
    typeof layout.height !== 'number' ||
    layout.width <= 0 ||
    layout.height <= 0
  ) {
    return;
  }

  const existing = probeStore[id];
  const x = typeof layout.x === 'number' ? Math.round(layout.x * 10) / 10 : 0;
  const y = typeof layout.y === 'number' ? Math.round(layout.y * 10) / 10 : 0;
  const width = Math.round(layout.width * 10) / 10;
  const height = Math.round(layout.height * 10) / 10;
  const measuredAt = new Date().toISOString();

  const fw = meta?.frameWidth != null ? Math.round(meta.frameWidth * 10) / 10 : existing?.frameWidth ?? null;
  const fh = meta?.frameHeight != null ? Math.round(meta.frameHeight * 10) / 10 : existing?.frameHeight ?? null;

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

  probeStore[id] = {
    id,
    kind,
    screen,
    x,
    y,
    width,
    height,
    frameWidth: fw,
    frameHeight: fh,
    measuredAt,
    staleAfterUnmount: false,
    staleReason: undefined,
    overflow,
    overflowStatus,
    reason,
  };

  notifyListeners();
}

export function markProbeStale(id: string, reason: string = 'Element unmounted'): void {
  if (!isDiagnosticModeEnabled()) return;
  const probe = probeStore[id];
  if (!probe) return;
  probe.staleAfterUnmount = true;
  probe.staleReason = reason;
  notifyListeners();
}

/**
 * Production auto-probe hook for shared primitives.
 * Gated by two-factor diagnostic gate:
 * - When gate is OFF: returns {} (no onLayout, no registration, no listeners).
 * - When gate is ON: returns { onLayout }, registers stable/monotonic id, tags with active screen,
 *   and retains last-measured snapshot on unmount without wiping values.
 */
export function useAutoProbe(
  id?: string,
  kind?: string
): { onLayout?: (e: LayoutChangeEvent) => void } {
  const isEnabled = isDiagnosticModeEnabled();
  const screen = useDiagScreen();
  const effectiveKind = kind || 'probe';
  const [monotonicFallback] = useState(() =>
    isEnabled && (!id || id.trim().length === 0)
      ? getNextMonotonicProbeId(effectiveKind)
      : ''
  );

  const stableId = isEnabled
    ? ((id && id.trim().length > 0) ? id : monotonicFallback)
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
      recordProbeLayout(stableId, effectiveKind, screen, layout);
    }
  }, [isEnabled, stableId, effectiveKind, screen]);

  if (!isEnabled) {
    return {};
  }

  return { onLayout };
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
  const activeLocale = i18n.language || 'en';
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

  const rawProbes = getAutoProbes();
  const probes: DiagnosticProbeReportItem[] = rawProbes.map((p) => ({
    id: p.id,
    kind: p.kind,
    screen: p.screen,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    measuredAt: p.measuredAt,
    staleAfterUnmount: p.staleAfterUnmount,
    staleReason: p.staleReason,
    overflow: p.overflow,
    overflowStatus: p.overflowStatus,
    reason: p.reason,
  }));

  const visitedScreens = Array.from(new Set(rawProbes.map((p) => p.screen))).filter(Boolean).sort();
  const unvisitedScreens = KNOWN_SCREENS.filter((s) => !visitedScreens.includes(s)).sort();

  return {
    timestamp: new Date().toISOString(),
    buildId: DIAGNOSTIC_BUILD_ID,
    version: DIAGNOSTIC_VERSION,
    versionCode: DIAGNOSTIC_VERSION_CODE,
    locale: activeLocale,
    directionHelperResult: directionHelper,
    i18nManagerIsRTL: nativeIsRTL,
    probeCount: probes.length,
    probes,
    screensVisited: visitedScreens,
    screensUnvisited: unvisitedScreens,
    measurements,
  };
}

/**
 * Truthful export handling:
 * - Generates anonymized file successfully on disk first.
 * - Confirmed success is strictly reserved for confirmed filesystem writes / copy operations.
 * - On Android expo-sharing, chooser completion cannot be confirmed by the OS.
 *   Therefore, it is NEVER reported as success or "report ready" implying share completed.
 *   It explicitly returns shareStatus: 'unknown' and status: 'userActionRequired' with fileReady: true.
 * - Always keeps export actionable for retry with zero private content.
 */
export async function exportDiagnosticReport(): Promise<ExportReportResult> {
  try {
    const report = buildDiagnosticReport();
    const jsonString = JSON.stringify(report, null, 2);
    const fileName = `rtl-diagnostic-report-${Date.now()}.json`;

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

    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) {
      return {
        success: false,
        status: 'unavailable',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'No writable directory found on device.',
      };
    }

    const filePath = `${dir}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8',
    });

    // Verify written file exists on disk
    const fileInfo = await FileSystem.getInfoAsync(filePath).catch(() => null);
    if (!fileInfo || !fileInfo.exists) {
      return {
        success: false,
        status: 'failed',
        shareStatus: 'unavailable',
        fileReady: false,
        error: 'Report file could not be verified on disk.',
      };
    }

    // File generation is confirmed on disk
    const sharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (sharingAvailable) {
      try {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: getDiagnosticShareDialogTitle(),
        });
        // Android expo-sharing resolves with null for both share completion and chooser dismissal.
        // It cannot confirm completion. Report truthful shareStatus: 'unknown' and status: 'userActionRequired'.
        return {
          success: false,
          status: 'userActionRequired',
          shareStatus: 'unknown',
          fileReady: true,
          shareInvoked: true,
          filePath,
        };
      } catch (shareErr) {
        return {
          success: false,
          status: 'failed',
          shareStatus: 'unavailable',
          fileReady: true,
          shareInvoked: false,
          error: shareErr instanceof Error ? shareErr.message : String(shareErr),
          filePath,
        };
      }
    }

    // Native fallback to React Native Share
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
          };
        } else if (shareResult.action === Share.sharedAction) {
          // On Android, sharedAction is returned even upon dismissal, so report shareStatus: 'unknown' truthfully.
          return {
            success: false,
            status: 'userActionRequired',
            shareStatus: 'unknown',
            fileReady: true,
            shareInvoked: true,
            filePath,
          };
        }
      } catch (rnShareErr) {
        return {
          success: false,
          status: 'failed',
          shareStatus: 'unavailable',
          fileReady: true,
          shareInvoked: false,
          error: rnShareErr instanceof Error ? rnShareErr.message : String(rnShareErr),
          filePath,
        };
      }
    }

    // No sharing module available, but file was written successfully
    return {
      success: true,
      status: 'fileReady',
      shareStatus: 'unavailable',
      fileReady: true,
      shareInvoked: false,
      filePath,
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
