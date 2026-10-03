import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;

/**
 * Play the bundled adhan chime. Loads once, caches the Sound, replays on demand.
 * Replace assets/sounds/adhan_chime.wav with a real adhan MP3 to upgrade the sound.
 */
export async function playAdhan(): Promise<void> {
  try {
    if (sound) {
      await sound.replayAsync();
      return;
    }
    const { sound: s } = await Audio.Sound.createAsync(
      require('../../assets/sounds/adhan_chime.wav'),
      { shouldPlay: true, volume: 1.0 }
    );
    sound = s;
  } catch (e) {
    // audio unavailable; skip silently (notifications still fire)
  }
}

/** Stop playback if running. */
export async function stopAdhan(): Promise<void> {
  try {
    if (sound) {
      await sound.stopAsync();
    }
  } catch {
    // ignore
  }
}

/** Release the cached sound (e.g. on app background). */
export async function unloadAdhan(): Promise<void> {
  try {
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }
  } catch {
    // ignore
  }
}

/** Set the app's audio mode so playback works even in silent mode. */
export async function configureAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  } catch {
    // ignore
  }
}
