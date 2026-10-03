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
      // Also update playback if it changed (e.g., new track started)
      const current = getCurrentPlayback();
      if (current !== playback) {
        setPlayback(current);
      }
    });

    return () => {
      unsub();
    };
  }, [playback]);

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