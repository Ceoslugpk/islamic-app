export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatProgress(currentSeconds: number, totalSeconds: number): string {
  const current = formatDuration(currentSeconds);
  
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return current;
  }

  return `${current} / ${formatDuration(totalSeconds)}`;
}
