export type LiveStreamId = 'makkah' | 'madinah' | 'hajj';

export interface ActiveLiveStream {
  id: LiveStreamId;
  title: string;
  subtitle?: string;
  embedUrl?: string;
  watchUrl?: string;
  hlsUrl?: string;
  isPlaying: boolean;
}

type Listener = (stream: ActiveLiveStream | null) => void;

let currentStream: ActiveLiveStream | null = null;
const listeners = new Set<Listener>();

export function getActiveLiveStream(): ActiveLiveStream | null {
  return currentStream;
}

export function setActiveLiveStream(stream: ActiveLiveStream | null): void {
  currentStream = stream;
  listeners.forEach((fn) => {
    try {
      fn(currentStream);
    } catch {
      // safe broadcast
    }
  });
}

export function toggleLiveStreamPlayPause(): void {
  if (!currentStream) return;
  setActiveLiveStream({
    ...currentStream,
    isPlaying: !currentStream.isPlaying,
  });
}

export function subscribeLiveStream(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
