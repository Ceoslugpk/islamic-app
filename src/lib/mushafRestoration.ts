import type { MushafPageDetail } from './quran';

export interface MushafRestorationTarget {
  surah: number;
  ayah: number;
}

export interface ResolveRestorationTargetParams {
  surahNumber: number;
  initialAyah?: number;
  initialPage?: number;
  pageOnly?: boolean;
}

/**
 * Resolves the restoration target for Mushaf reading mode:
 * - If explicit page-only navigation is requested (pageOnly: true), target is null (page top).
 * - If an explicit ayah > 0 is provided (e.g. Continue Reading target), targets that exact ayah.
 * - Otherwise (normal Surah open), always targets ayah 1 of the requested Surah,
 *   even when initialPage was calculated and passed for that Surah.
 */
export function resolveMushafRestorationTarget(
  params: ResolveRestorationTargetParams
): MushafRestorationTarget | null {
  if (params.pageOnly) {
    return null;
  }

  const safeSurah =
    typeof params.surahNumber === 'number' && params.surahNumber >= 1 && params.surahNumber <= 114
      ? params.surahNumber
      : 1;

  if (typeof params.initialAyah === 'number' && params.initialAyah > 0) {
    return { surah: safeSurah, ayah: params.initialAyah };
  }

  // Normal Surah open: requested Surah always starts at ayah 1
  return { surah: safeSurah, ayah: 1 };
}

export interface MushafScrollTargetResult {
  targetOffset: number;
  targetKey: string | null;
  isSharedPageTarget: boolean;
  targetAyahFound: boolean;
  isLayoutReady: boolean;
}

export interface CalculateScrollTargetParams {
  target: MushafRestorationTarget | null;
  pageData: MushafPageDetail | null;
  measuredLayouts: Record<string | number, { y: number; height: number }>;
  headroom?: number;
}

/**
 * Computes absolute Y for an ayah row within a multi-surah Mushaf page group.
 * Returns null if any required dimension (group Y, banner height when applicable, local ayah Y)
 * has not yet completed its layout measurement.
 */
export function computeGroupAbsoluteAyahY(params: {
  groupY?: number;
  bannerHeight?: number;
  hasSurahStart: boolean;
  localAyahY?: number;
}): number | null {
  if (typeof params.groupY !== 'number') return null;
  if (params.hasSurahStart && typeof params.bannerHeight !== 'number') return null;
  if (typeof params.localAyahY !== 'number') return null;
  const bannerH = params.hasSurahStart ? (params.bannerHeight || 0) : 0;
  return params.groupY + bannerH + params.localAyahY;
}

/**
 * Calculates the exact scroll target offset for a Mushaf page:
 * - If target is null (explicit page navigation), lands at offset 0 (page top).
 * - If the target ayah is the first ayah of the page (ayahs[0]), lands at offset 0.
 * - If the target ayah is on a shared page after a previous Surah (e.g. Surah 113 on page 604 or Surah 11 on page 221),
 *   lands at the measured row offset of that first ayah (y - headroom), NOT offset 0.
 * - If the target row's layout is not yet measured, reports isLayoutReady: false.
 */
export function calculateMushafScrollTarget(
  params: CalculateScrollTargetParams
): MushafScrollTargetResult {
  if (!params.target) {
    return {
      targetOffset: 0,
      targetKey: null,
      isSharedPageTarget: false,
      targetAyahFound: false,
      isLayoutReady: true,
    };
  }

  const { surah, ayah } = params.target;
  const targetKey = `${surah}:${ayah}`;

  if (!params.pageData || !Array.isArray(params.pageData.ayahs) || params.pageData.ayahs.length === 0) {
    return {
      targetOffset: 0,
      targetKey,
      isSharedPageTarget: false,
      targetAyahFound: false,
      isLayoutReady: false,
    };
  }

  const foundIndex = params.pageData.ayahs.findIndex(
    (a) => a.surah.number === surah && a.numberInSurah === ayah
  );

  if (foundIndex === -1) {
    return {
      targetOffset: 0,
      targetKey,
      isSharedPageTarget: false,
      targetAyahFound: false,
      isLayoutReady: false,
    };
  }

  // If the target is the very first ayah of the whole page, top of page is correct
  if (foundIndex === 0) {
    return {
      targetOffset: 0,
      targetKey,
      isSharedPageTarget: false,
      targetAyahFound: true,
      isLayoutReady: true,
    };
  }

  // Shared page target: land at measured row
  const headroom = typeof params.headroom === 'number' ? params.headroom : 60;
  const measured = params.measuredLayouts[targetKey];
  const isLayoutReady = !!measured && typeof measured.y === 'number';
  const measuredY = measured ? measured.y : 0;
  const targetOffset = Math.max(0, measuredY - headroom);

  return {
    targetOffset,
    targetKey,
    isSharedPageTarget: true,
    targetAyahFound: true,
    isLayoutReady,
  };
}
