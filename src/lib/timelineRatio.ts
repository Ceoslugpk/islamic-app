/**
 * Computes normalized progress ratio [0..1] from a touch coordinate along a horizontal track,
 * accounting for layout direction. In RTL, 0 is at the right edge and 1 is at the left edge.
 */
export function calculateTimelineRatio(
  locationX: number,
  totalWidth: number,
  isRtlLayout: boolean = false
): number {
  if (totalWidth <= 0) return 0;
  const rawRatio = Math.max(0, Math.min(1, locationX / totalWidth));
  return isRtlLayout ? 1 - rawRatio : rawRatio;
}
