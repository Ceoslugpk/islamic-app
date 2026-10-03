import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdhanReciter {
  id: string;
  name: string;
  arabicName: string;
  location: string;
  description: string;
  url?: string;
  isBundled?: boolean;
}

export const ADHAN_RECITERS: AdhanReciter[] = [
  {
    id: 'default',
    name: 'Classic App Chime',
    arabicName: 'نغمة الأذان',
    location: 'Bundled Asset',
    description: 'Crisp melodic chime, works 100% offline',
    isBundled: true,
  },
  {
    id: 'alafasy',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري راشد العفاسي',
    location: 'Kuwait',
    description: 'Clear, resonant and world-renowned recitation',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mishary_Al_Afasy_-_HQ_(%D9%85%D8%B4%D8%A7%D8%B1%D9%8A_%D8%A7%D9%84%D8%B9%D9%81%D8%A7%D8%B3%D9%8A).mp3',
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit Abdus Samad',
    arabicName: 'عبد الباسط عبد الصمد',
    location: 'Egypt',
    description: 'Historic, emotive Egyptian Golden Age maqam',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Abdulbasit_Abdusamad_1_-_Egypt_(%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF_-_%D9%85%D8%B5%D8%B1).mp3',
  },
  {
    id: 'makkah',
    name: 'Masjid Al-Haram (Makkah)',
    arabicName: 'أذان الحرم المكي',
    location: 'Makkah, Saudi Arabia',
    description: 'Majestic Kaaba prayer call by Sheikh Nayf Fedah',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Nayf_Fedah_-_Al_Haram_Al_Maki_(%D9%86%D8%A7%D9%8A%D9%81_%D9%81%D8%AF%D8%A7%D8%AD_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3',
  },
  {
    id: 'madinah',
    name: 'Masjid An-Nabawi (Madinah)',
    arabicName: 'أذان المسجد النبوي',
    location: 'Madinah, Saudi Arabia',
    description: 'Serene and heartfelt Prophet’s Mosque adhan',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Adhan_Al_Haram_Al_Madani_-_Al_Madinah_1_(%D8%A3%D8%B0%D8%A7%D9%86_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D8%AF%D9%86%D9%8A_-_%D8%A7%D9%84%D9%85%D8%AF%D9%8A%D9%86%D8%A9_%D8%A7%D9%84%D9%85%D9%86%D9%88%D8%B1%D8%A9).mp3',
  },
  {
    id: 'alaqsa',
    name: 'Al-Aqsa Mosque (Jerusalem)',
    arabicName: 'أذان المسجد الأقصى',
    location: 'Al-Quds / Jerusalem',
    description: 'Reverent adhan by Sheikh Nurdin Hamza Al-Maghriby',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/NurDin_Hamza_Al_Maghriby_-_Al_Aqsa_Jerusalem_(%D9%86%D9%88%D8%B1_%D8%A7%D9%84%D8%AF%D9%8A%D9%86_%D8%AD%D9%85%D8%B2%D8%A9_%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8%D9%8A_-_%D8%A7%D9%84%D9%85%D8%B3%D8%AC%D8%AF_%D8%A7%D9%84%D8%A3%D9%82%D8%B5%D9%89_%D8%A7%D9%84%D9%82%D8%AF%D8%B3).mp3',
  },
];

let sound: Audio.Sound | null = null;
let currentPlayingReciterId: string | null = null;
let activeReciterId = 'default';

type AdhanStatusListener = (playingReciterId: string | null) => void;
const statusListeners = new Set<AdhanStatusListener>();

function notifyListeners() {
  for (const listener of statusListeners) {
    try {
      listener(currentPlayingReciterId);
    } catch {
      // ignore
    }
  }
}

export function addAdhanPlaybackListener(listener: AdhanStatusListener): () => void {
  statusListeners.add(listener);
  listener(currentPlayingReciterId);
  return () => {
    statusListeners.delete(listener);
  };
}

export function getAdhanReciter(id?: string): AdhanReciter {
  const targetId = id || activeReciterId;
  const found = ADHAN_RECITERS.find((r) => r.id === targetId);
  return found || ADHAN_RECITERS[0];
}

export function setActiveAdhanReciterId(id: string): void {
  activeReciterId = id;
}

export function getActiveAdhanReciterId(): string {
  return activeReciterId;
}

export function isAdhanPlaying(): boolean {
  return currentPlayingReciterId !== null;
}

export function getCurrentlyPlayingReciterId(): string | null {
  return currentPlayingReciterId;
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

/** Stop playback if running. */
export async function stopAdhan(): Promise<void> {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
  } catch {
    // ignore
  } finally {
    currentPlayingReciterId = null;
    notifyListeners();
  }
}

/** Release the cached sound (e.g. on app background). */
export async function unloadAdhan(): Promise<void> {
  await stopAdhan();
}

/**
 * Play the adhan for the requested (or currently active) reciter.
 * If reciter is 'default' or offline, plays the bundled chime.
 * If remote audio fails for any reason, falls back gracefully to bundled chime.
 */
export async function playAdhan(reciterId?: string): Promise<void> {
  await configureAudio();
  await stopAdhan();

  let targetId = reciterId || activeReciterId;

  // If no reciterId was passed and in-memory is default, attempt reading stored settings
  if (!reciterId && activeReciterId === 'default') {
    try {
      const raw = await AsyncStorage.getItem('islamic-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.adhanReciterId) {
          targetId = parsed.adhanReciterId;
          activeReciterId = parsed.adhanReciterId;
        }
      }
    } catch {
      // ignore
    }
  }

  const reciter = getAdhanReciter(targetId);
  currentPlayingReciterId = reciter.id;
  notifyListeners();

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        currentPlayingReciterId = null;
        notifyListeners();
        if (sound) {
          sound.unloadAsync().catch(() => {});
          sound = null;
        }
      }
    } else if (status.error) {
      currentPlayingReciterId = null;
      notifyListeners();
    }
  };

  try {
    if (reciter.id === 'default' || !reciter.url) {
      // Bundled chime
      const { sound: s } = await Audio.Sound.createAsync(
        require('../../assets/sounds/adhan_chime.wav'),
        { shouldPlay: true, volume: 1.0 },
        onPlaybackStatusUpdate
      );
      sound = s;
    } else {
      // Remote verified MP3 URL with offline fallback
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: reciter.url },
          { shouldPlay: true, volume: 1.0 },
          onPlaybackStatusUpdate
        );
        sound = s;
      } catch (remoteError) {
        // Fallback to bundled chime if remote network fails
        const { sound: s } = await Audio.Sound.createAsync(
          require('../../assets/sounds/adhan_chime.wav'),
          { shouldPlay: true, volume: 1.0 },
          onPlaybackStatusUpdate
        );
        sound = s;
      }
    }
  } catch (e) {
    currentPlayingReciterId = null;
    notifyListeners();
  }
}
