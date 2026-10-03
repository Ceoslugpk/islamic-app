export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }

  const clampedSeconds = Math.min(Math.floor(seconds), 3599);
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatProgress(currentSeconds: number, totalSeconds: number): string {
  const current = formatDuration(currentSeconds);
  
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return current;
  }

  return `${current} / ${formatDuration(totalSeconds)}`;
}