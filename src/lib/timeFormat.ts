/** Format an "HH:MM" 24h string to 12h or keep 24h. */
export function formatTime(hm: string, format: '12h' | '24h'): string {
  if (!hm || !hm.includes(':')) return hm || '--:--';
  if (format === '24h') return hm;

  const [h, m] = hm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Format remaining milliseconds as "Xh Ym", "Xm", or "Now" (< 1 min). */
export function formatCountdown(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  if (totalMin < 1) return 'Now';
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
