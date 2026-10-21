import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from './i18n';

export interface AdhanReciter {
  id: string;
  name: string;
  arabicName: string;
  location: string;
  description: string;
  url?: string;
  isBundled?: boolean;
}

const RAW_ADHAN_RECITERS: AdhanReciter[] = [
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
  {
    id: 'ali-mala',
    name: 'Ali Ibn Ahmad Mala',
    arabicName: 'علي بن أحمد ملا',
    location: 'Makkah',
    description: 'Makkah-based adhan with a warm, measured delivery',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Ali_Ibn_Ahmad_Mala_HQ.mp3',
  },
  {
    id: 'ghazi',
    name: 'Ghazi Al-Saadoun',
    arabicName: 'غازي السعدون',
    location: 'Kuwait',
    description: 'Kuwaiti caller known for a clear, steady voice',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Ghazi_Al_Saadoun_(%D8%BA%D8%A7%D8%B2%D9%8A_%D8%A7%D9%84%D8%B3%D8%B9%D8%AF%D9%88%D9%86).mp3',
  },
  {
    id: 'albanna',
    name: 'Mahmoud Ali Al-Banna',
    arabicName: 'محمود علي البنا',
    location: 'Egypt',
    description: 'Classic Egyptian adhan with rich melodic tone',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mahmoud_Ali_Al_Banna_-_Cairo_(%D9%85%D8%AD%D9%85%D9%88%D8%AF_%D8%B9%D9%84%D9%8A_%D8%A7%D9%84%D8%A8%D9%86%D8%A7_-_%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9).mp3',
  },
  {
    id: 'hussary',
    name: 'Mahmoud Khalil Al-Hussary',
    arabicName: 'محمود خليل الحصري',
    location: 'Egypt',
    description: 'Revered reciter with a deeply soothing call',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mahmoud_Khalil_Al_Hussary_-_Cairo_(%D9%85%D8%AD%D9%85%D9%88%D8%AF_%D8%AE%D9%84%D9%8A%D9%84_%D8%A7%D9%84%D8%AD%D8%B5%D8%B1%D9%8A_-_%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9).mp3',
  },
  {
    id: 'kabbara',
    name: 'Mohammed Salahuddin Kabbara',
    arabicName: 'محمد صلاح الدين كبارة',
    location: 'Makkah',
    description: 'Full, resonant Makkah adhan with strong presence',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mohammed_Salahuddin_Kabbara_1_(%D9%85%D8%AD%D9%85%D8%AF_%D8%B5%D9%84%D8%A7%D8%AD_%D8%A7%D9%84%D8%AF%D9%8A%D9%86_%D9%83%D8%A8%D8%A7%D8%B1%D8%A9).mp3',
  },
  {
    id: 'maher',
    name: 'Muhammad Al-Saed Maher',
    arabicName: 'محمد السيد ماهر',
    location: 'Makkah',
    description: 'Contemporary Makkah adhan with a gentle, clear style',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Muhammad_Al_Saed_Maher_(%D9%85%D8%AD%D9%85%D8%AF_%D8%A7%D9%84%D8%B3%D9%8A%D8%AF_%D9%85%D8%A7%D9%87%D8%B1).mp3',
  },
];

function localizeAdhanReciter(reciter: AdhanReciter): AdhanReciter {
  return {
    ...reciter,
    get name() {
      return t(reciter.name);
    },
    get location() {
      return t(reciter.location);
    },
    get description() {
      return t(reciter.description);
    },
  };
}

export const ADHAN_RECITERS: AdhanReciter[] = RAW_ADHAN_RECITERS.map(localizeAdhanReciter);

let sound: AudioPlayer | null = null;
let statusSubscription: { remove: () => void } | null = null;
let currentPlayingReciterId: string | null = null;
let activeReciterId = 'alafasy';
let adhanPlayTail: Promise<void> = Promise.resolve();

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
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  } catch {
    // ignore
  }
}

/** Stop playback if running. */
export async function stopAdhan(): Promise<void> {
  try {
    if (statusSubscription) {
      try {
        statusSubscription.remove();
      } catch {}
      statusSubscription = null;
    }
    if (sound) {
      const playerToRelease = sound;
      sound = null;
      try {
        playerToRelease.pause();
      } catch {}
      try {
        playerToRelease.remove();
      } catch {}
      try {
        (playerToRelease as any).release?.();
      } catch {}
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
async function playAdhanInternal(reciterId?: string): Promise<void> {
  await configureAudio();
  await stopAdhan();

  let targetId = reciterId || activeReciterId;

  // If no reciterId was passed and in-memory is the default, attempt reading stored settings
  if (!reciterId && activeReciterId === 'alafasy') {
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

  const cleanup = () => {
    if (statusSubscription) {
      try {
        statusSubscription.remove();
      } catch {}
      statusSubscription = null;
    }
    if (sound) {
      const playerToRelease = sound;
      sound = null;
      try {
        playerToRelease.pause();
      } catch {}
      try {
        playerToRelease.remove();
      } catch {}
      try {
        (playerToRelease as any).release?.();
      } catch {}
    }
  };

  const onPlaybackStatusUpdate = (status: AudioStatus) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        currentPlayingReciterId = null;
        notifyListeners();
        cleanup();
      }
    } else if (status.error) {
      currentPlayingReciterId = null;
      notifyListeners();
      cleanup();
    }
  };

  try {
    // All reciters are remote adhan URLs now (the bundled "Classic App Chime"
    // was removed as a reciter option).
    let s: AudioPlayer | null = null;
    try {
      s = createAudioPlayer({ uri: reciter.url });
      sound = s;
      s.volume = 1.0;
      statusSubscription = s.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
      s.play();
      s = null;
    } catch {
      cleanup();
      if (s) {
        try {
          (s as any).remove?.();
        } catch {}
        try {
          (s as any).release?.();
        } catch {}
        s = null;
      }
      // Last-resort offline fallback: bundled chime so the call still sounds
      // when the network is unavailable (not selectable as a reciter).
      try {
        s = createAudioPlayer(require('../../assets/sounds/adhan_chime.wav'));
        sound = s;
        s.volume = 1.0;
        statusSubscription = s.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
        s.play();
        s = null;
      } catch {
        cleanup();
        if (s) {
          try {
            (s as any).remove?.();
          } catch {}
          try {
            (s as any).release?.();
          } catch {}
          s = null;
        }
        currentPlayingReciterId = null;
        notifyListeners();
        return;
      }
    }
  } catch {
    cleanup();
    currentPlayingReciterId = null;
    notifyListeners();
  }
}

export function playAdhan(reciterId?: string): Promise<void> {
  const task = adhanPlayTail.then(
    () => playAdhanInternal(reciterId),
    () => playAdhanInternal(reciterId),
  );
  adhanPlayTail = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}
