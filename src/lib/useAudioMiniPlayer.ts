import { useEffect, useState } from 'react';
import { getCurrentPlayback, addPlaybackStatusListener, getPlaybackStatus, pause, resume, stop, seekTo, CurrentPlayback, PlaybackStatus } from './quranAudio';

export interface UseAudioMiniPlayerReturn {
  playback: CurrentPlayback | null;
  status: PlaybackStatus;
  visible: boolean;
  onPlayPause: () => void;
  onStop: () => Promise<void>;
  onSeek: (positionMillis: number) => void;
}

export function useAudioMiniPlayer(): UseAudioMiniPlayerReturn {
  const [playback, setPlayback] = useState<CurrentPlayback | null>(getCurrentPlayback());
  const [status, setStatus] = useState<PlaybackStatus>(getPlaybackStatus());

  useEffect(() => {
    setPlayback(getCurrentPlayback());
    setStatus(getPlaybackStatus());

    const unsub = addPlaybackStatusListener((newStatus) => {
      setStatus(newStatus);
      const current = getCurrentPlayback();
      setPlayback(current ? { ...current } : null);
    });

    return () => {
      unsub();
    };
    // Subscribe once on mount only. `playback`/`status` are intentionally NOT
    // deps — including them would re-run this effect on every update and
    // cause an infinite setState loop (the object identity changes each time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = playback !== null;

  const onPlayPause = () => {
    if (status.isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const onStop = async () => {
    await stop(true);
  };

  const onSeek = (positionMillis: number) => {
    seekTo(positionMillis);
  };

  return {
    playback,
    status,
    visible,
    onPlayPause,
    onStop,
    onSeek,
  };
}