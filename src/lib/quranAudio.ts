import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { SURAH_AYAH_COUNTS } from './surahAyahCounts';
import {
  AudioSettings,
  loadAudioQueue,
  loadAudioSettings,
  PlaylistItem,
  saveAudioQueue,
  saveAudioSettings,
  saveRecentlyPlayed,
} from './db';
export type { PlaylistItem } from './db';
import {
  clearAudioPreloadCache,
  enqueuePreloadUrls,
  getAudioPreloadStats,
  hasPreloadedSound,
  pauseAudioPreloading,
  resumeAudioPreloading,
  stopAudioPreloading,
  takePreloadedSound,
} from './audioPreloader';
import { isSurahDownloaded, resolveAudioUri } from './surahDownloads';
export { resolveAudioUri };
import { fetchWithTimeout } from './quran';
import { isAppOnline } from './useConnectivity';
export {

  clearAudioPreloadCache,
  getAudioPreloadStats,
  hasPreloadedSound,
  pauseAudioPreloading,
  resumeAudioPreloading,
  stopAudioPreloading,
  takePreloadedSound,
};

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isLoaded: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
}

export interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
  country?: string;
}

const RECITERS_CACHE_KEY = 'reciters-cache';

/** Ayah counts for all 114 surahs to compute global ayah indices (1..6236). */
export { SURAH_AYAH_COUNTS } from './surahAyahCounts';

/** Aliases for deprecated or alternate edition identifiers. */
export const ALIAS_MAP: Record<string, string> = {
  'en.walk': 'en.everyayah-walk',
  'ur.khan': 'ur.everyayah-shamshad',
  'fa.hedayatfarfooladvand': 'fa.everyayah-hedayatfar',
  'ru.kuliev-audio-2': 'ru.kuliev-audio',
  'ar.alafasy-2': 'ar.alafasy',
  'ar.husary-2': 'ar.husary',
  'ar.mahermuaiqly-2': 'ar.mahermuaiqly',
  'ar.hudhaify-2': 'ar.hudhaify',
  'ar.husarymujawwad-2': 'ar.husarymujawwad',
  'ar.minshawi-2': 'ar.minshawi',
  'ar.muhammadayyoub-2': 'ar.muhammadayyoub',
  'ar.muhammadjibreel-2': 'ar.muhammadjibreel',
};

export interface EveryAyahConfig {
  subfolder: string;
  bitrate?: string;
}

/** Verified EveryAyah non-Arabic recitation/translation editions (3+3 surah+ayah pattern). */
export const EVERYAYAH_EDITIONS: Record<string, EveryAyahConfig> = {
  'en.everyayah-walk': {
    subfolder: 'English/Sahih_Intnl_Ibrahim_Walk_192kbps',
    bitrate: '192',
  },
  'fa.everyayah-kabiri': {
    subfolder: 'translations/Makarem_Kabiri_16Kbps',
    bitrate: '16',
  },
  'fa.everyayah-hedayatfar': {
    subfolder: 'translations/Fooladvand_Hedayatfar_40Kbps',
    bitrate: '40',
  },
  'az.everyayah-balayev': {
    subfolder: 'translations/azerbaijani/balayev',
    bitrate: '46',
  },
  'ur.everyayah-shamshad': {
    subfolder: 'translations/urdu_shamshad_ali_khan_46kbps',
    bitrate: '46',
  },
  'bs.everyayah-korkut': {
    subfolder: 'translations/besim_korkut_ajet_po_ajet',
    bitrate: '32',
  },
  'ur.everyayah-farhathashmi': {
    subfolder: 'translations/urdu_farhat_hashmi',
    bitrate: '32',
  },
};

/**
 * Mapping of user-selected translation language codes to verified non-Arabic audio editions.
 * Verified working endpoints from docs/quran-audio-languages.md.
 */
export const LANGUAGE_AUDIO_EDITIONS: Record<
  string,
  { identifier: string; name: string; langName: string }
> = {
  en: { identifier: 'en.everyayah-walk', name: 'Sahih International (Ibrahim Walk)', langName: 'English' },
  ur: { identifier: 'ur.everyayah-shamshad', name: 'Shamshad Ali Khan', langName: 'Urdu' },
  zh: { identifier: 'zh.chinese', name: 'Chinese Translation', langName: 'Chinese' },
  fr: { identifier: 'fr.leclerc', name: 'Youssouf Leclerc', langName: 'French' },
  ru: { identifier: 'ru.kuliev-audio', name: 'Elmir Kuliev', langName: 'Russian' },
  tr: { identifier: 'tr.vakfi-audio', name: 'Diyanet Vakfı', langName: 'Turkish' },
  fa: { identifier: 'fa.everyayah-hedayatfar', name: 'Fooladvand - Hedayatfar', langName: 'Persian' },
  az: { identifier: 'az.everyayah-balayev', name: 'Rasim Balayev', langName: 'Azerbaijani' },
  kk: { identifier: 'kk.khalifahaltai-audio', name: 'Khalifah Altai', langName: 'Kazakh' },
  uz: { identifier: 'uz.sodik-audio', name: 'Muhammad Sodik', langName: 'Uzbek' },
  bs: { identifier: 'bs.everyayah-korkut', name: 'Besim Korkut', langName: 'Bosnian' },
};

export function getAudioEditionForLanguage(
  langCode: string
): { identifier: string; name: string; langName: string } | null {
  return LANGUAGE_AUDIO_EDITIONS[langCode] || null;
}

/**
 * 13 verified non-Arabic audio editions (AlQuran Cloud CDN + EveryAyah).
 * Covers: English, Urdu, Chinese, French, Russian, Kazakh, Turkish, Uzbek, Persian, Azerbaijani, Bosnian.
 */
export const VERIFIED_NON_ARABIC_EDITIONS: Reciter[] = [
  // English (EveryAyah - Sahih International)
  {
    identifier: 'en.everyayah-walk',
    name: 'ابراہیم والک (انگریزی)',
    englishName: 'Sahih International (Ibrahim Walk)',
    language: 'en',
  },
  // Urdu (EveryAyah - Shamshad Ali Khan)
  {
    identifier: 'ur.everyayah-shamshad',
    name: 'شمشاد علی خان',
    englishName: 'Shamshad Ali Khan (Urdu)',
    language: 'ur',
  },
  // Urdu (EveryAyah - Farhat Hashmi word-for-word)
  {
    identifier: 'ur.everyayah-farhathashmi',
    name: 'ڈاکٹر فرحت ہاشمی',
    englishName: 'Dr. Farhat Hashmi (Urdu)',
    language: 'ur',
  },
  // Chinese (AlQuran Cloud CDN)
  {
    identifier: 'zh.chinese',
    name: '中文',
    englishName: 'Chinese Translation',
    language: 'zh',
  },
  // French (AlQuran Cloud CDN)
  {
    identifier: 'fr.leclerc',
    name: 'Youssouf Leclerc',
    englishName: 'Youssouf Leclerc (French)',
    language: 'fr',
  },
  // Russian (AlQuran Cloud CDN)
  {
    identifier: 'ru.kuliev-audio',
    name: 'Эльмир Кулиев',
    englishName: 'Elmir Kuliev (Russian)',
    language: 'ru',
  },
  // Turkish (AlQuran Cloud CDN)
  {
    identifier: 'tr.vakfi-audio',
    name: 'Diyanet Vakfı',
    englishName: 'Diyanet Vakfı (Turkish)',
    language: 'tr',
  },
  // Persian (EveryAyah - Makarem Kabiri)
  {
    identifier: 'fa.everyayah-kabiri',
    name: 'مکارم شیرازی (کبیری)',
    englishName: 'Makarem Shirazi - Kabiri (Persian)',
    language: 'fa',
  },
  // Persian (EveryAyah - Fooladvand Hedayatfar)
  {
    identifier: 'fa.everyayah-hedayatfar',
    name: 'فولادوند (هدایت‌فر)',
    englishName: 'Fooladvand - Hedayatfar (Persian)',
    language: 'fa',
  },
  // Azerbaijani (EveryAyah - Balayev)
  {
    identifier: 'az.everyayah-balayev',
    name: 'Rasim Balayev',
    englishName: 'Rasim Balayev (Azerbaijani)',
    language: 'az',
  },
  // Kazakh (AlQuran Cloud CDN)
  {
    identifier: 'kk.khalifahaltai-audio',
    name: 'Халифа Алтай',
    englishName: 'Khalifah Altai (Kazakh)',
    language: 'kk',
  },
  // Uzbek (AlQuran Cloud CDN)
  {
    identifier: 'uz.sodik-audio',
    name: 'Muhammad Sodik',
    englishName: 'Muhammad Sodik (Uzbek)',
    language: 'uz',
  },
  // Bosnian (EveryAyah - Besim Korkut)
  {
    identifier: 'bs.everyayah-korkut',
    name: 'Besim Korkut',
    englishName: 'Besim Korkut (Bosnian)',
    language: 'bs',
  },
];

/** Alias for VERIFIED_NON_ARABIC_EDITIONS representing dedicated non-Arabic audio translation reciters */
export const NON_ARABIC_AUDIO_EDITIONS: Reciter[] = VERIFIED_NON_ARABIC_EDITIONS;

export const AUDIO_TRANSLATION_EDITION_KEY = 'quran-audio-translation-edition';
export const AUDIO_TRANSLATION_LANG_KEY = 'quran-audio-translation-lang';
export const DEFAULT_AUDIO_TRANSLATION_EDITION_ID = 'en.everyayah-walk';

export function getAudioTranslationLangName(langCode: string): string {
  return LANGUAGE_AUDIO_EDITIONS[langCode]?.langName || langCode.toUpperCase();
}

let currentAudioTranslationEditionId = DEFAULT_AUDIO_TRANSLATION_EDITION_ID;
const audioTranslationListeners = new Set<(edition: Reciter) => void>();

// Initialize audio translation edition from storage on bootstrap
AsyncStorage.getItem(AUDIO_TRANSLATION_EDITION_KEY)
  .then((saved) => {
    if (saved) {
      const match = VERIFIED_NON_ARABIC_EDITIONS.find((e) => e.identifier === saved);
      if (match) {
        currentAudioTranslationEditionId = match.identifier;
        audioTranslationListeners.forEach((fn) => fn(match));
        return;
      }
      const matchLang = LANGUAGE_AUDIO_EDITIONS[saved];
      if (matchLang) {
        currentAudioTranslationEditionId = matchLang.identifier;
        const ed = getAudioTranslationEdition();
        audioTranslationListeners.forEach((fn) => fn(ed));
      }
    }
  })
  .catch(() => {});

export function getAudioTranslationEditionId(): string {
  return currentAudioTranslationEditionId;
}

export function getAudioTranslationLanguage(): string {
  return getAudioTranslationEdition().language;
}

export function getAudioTranslationEdition(): Reciter {
  const found = VERIFIED_NON_ARABIC_EDITIONS.find((e) => e.identifier === currentAudioTranslationEditionId);
  if (found) return found;
  return VERIFIED_NON_ARABIC_EDITIONS[0];
}

export async function setAudioTranslationEdition(identifierOrLangCode: string): Promise<void> {
  let targetId = identifierOrLangCode;
  const matchById = VERIFIED_NON_ARABIC_EDITIONS.find((e) => e.identifier === identifierOrLangCode);
  if (matchById) {
    targetId = matchById.identifier;
  } else if (LANGUAGE_AUDIO_EDITIONS[identifierOrLangCode]) {
    targetId = LANGUAGE_AUDIO_EDITIONS[identifierOrLangCode].identifier;
  } else {
    const matchByLang = VERIFIED_NON_ARABIC_EDITIONS.find((e) => e.language === identifierOrLangCode);
    if (matchByLang) {
      targetId = matchByLang.identifier;
    }
  }

  currentAudioTranslationEditionId = targetId;
  const ed = getAudioTranslationEdition();
  audioTranslationListeners.forEach((fn) => fn(ed));

  try {
    await AsyncStorage.setItem(AUDIO_TRANSLATION_EDITION_KEY, targetId);
    await AsyncStorage.setItem(AUDIO_TRANSLATION_LANG_KEY, ed.language);
  } catch {
    // ignore
  }
}

export const setAudioTranslationLanguage = setAudioTranslationEdition;

export function subscribeAudioTranslation(listener: (edition: Reciter) => void): () => void {
  audioTranslationListeners.add(listener);
  return () => {
    audioTranslationListeners.delete(listener);
  };
}

export function useAudioTranslation() {
  const [edition, setEdition] = useState<Reciter>(getAudioTranslationEdition());

  useEffect(() => {
    setEdition(getAudioTranslationEdition());
    return subscribeAudioTranslation((next) => {
      setEdition(next);
    });
  }, []);

  return {
    audioEdition: edition,
    audioLanguage: edition.language,
    audioLangName: getAudioTranslationLangName(edition.language),
    setAudioTranslation: setAudioTranslationEdition,
    setAudioLanguage: setAudioTranslationEdition,
  };
}

/** Offline fallback reciters (strictly Arabic recitations). Non-Arabic editions are maintained separately in VERIFIED_NON_ARABIC_EDITIONS. */
/** Country lookup map for Arabic reciters */
export const RECITER_COUNTRIES: Record<string, string> = {
  'ar.alafasy': 'Kuwait',
  'ar.abdulbasitmurattal': 'Egypt',
  'ar.abdullahbasfar': 'Saudi Arabia',
  'ar.abdurrahmaansudais': 'Saudi Arabia',
  'ar.abdulsamad': 'Egypt',
  'ar.shaatree': 'Saudi Arabia',
  'ar.ahmedajamy': 'Saudi Arabia',
  'ar.hanirifai': 'Saudi Arabia',
  'ar.husary': 'Egypt',
  'ar.husarymujawwad': 'Egypt',
  'ar.hudhaify': 'Saudi Arabia',
  'ar.ibrahimakhbar': 'Saudi Arabia',
  'ar.mahermuaiqly': 'Saudi Arabia',
  'ar.minshawi': 'Egypt',
  'ar.minshawimujawwad': 'Egypt',
  'ar.muhammadayyoub': 'Saudi Arabia',
  'ar.muhammadjibreel': 'Egypt',
  'ar.saoodshuraym': 'Saudi Arabia',
  'ar.aymanswoaid': 'Syria',
};

export function getReciterCountry(identifier: string): string | undefined {
  const resolved = ALIAS_MAP[identifier] || identifier;
  return RECITER_COUNTRIES[resolved];
}

/** Offline fallback reciters (strictly verified working Arabic recitations). */
export const DEFAULT_RECITERS: Reciter[] = [
  { identifier: 'ar.alafasy', name: 'مشاري العفاسي', englishName: 'Mishari Rashid al-Afasy', language: 'ar', country: 'Kuwait' },
  { identifier: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد', englishName: 'Abdul Basit (Murattal)', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.abdullahbasfar', name: 'عبد الله بصفر', englishName: 'Abdullah Basfar', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس', englishName: 'Abdurrahmaan As-Sudais', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.abdulsamad', name: 'عبد الباسط عبد الصمد', englishName: 'Abdul Samad', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.shaatree', name: 'أبو بكر الشاطري', englishName: 'Abu Bakr Ash-Shaatree', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.ahmedajamy', name: 'أحمد بن علي العجمي', englishName: 'Ahmed ibn Ali al-Ajamy', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.hanirifai', name: 'هاني الرفاعي', englishName: 'Hani ar-Rifai', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.husary', name: 'محمود خليل الحصري', englishName: 'Mahmoud Khalil Al-Husary', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.husarymujawwad', name: 'محمود خليل الحصري (مجود)', englishName: 'Mahmoud Khalil Al-Husary (Mujawwad)', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.hudhaify', name: 'علي الحذيفي', englishName: 'Ali Al-Hudhaify', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.ibrahimakhbar', name: 'إبراهيم الأخضر', englishName: 'Ibrahim Al-Akhdar', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.mahermuaiqly', name: 'ماهر المعيقلي', englishName: 'Maher Al Muaiqly', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.minshawi', name: 'محمد صديق المنشاوي', englishName: 'Mohamed Siddiq Al-Minshawi', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.minshawimujawwad', name: 'محمد صديق المنشاوي (مجود)', englishName: 'Mohamed Siddiq Al-Minshawi (Mujawwad)', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.muhammadayyoub', name: 'محمد أيوب', englishName: 'Muhammad Ayyoub', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.muhammadjibreel', name: 'محمد جبريل', englishName: 'Muhammad Jibreel', language: 'ar', country: 'Egypt' },
  { identifier: 'ar.saoodshuraym', name: 'سعود بن إبراهيم الشريم', englishName: 'Saood bin Ibraaheem Ash-Shuraym', language: 'ar', country: 'Saudi Arabia' },
  { identifier: 'ar.aymanswoaid', name: 'أيمن سويد', englishName: 'Ayman Sowaid', language: 'ar', country: 'Syria' },
];

/** Get list of verified non-Arabic translation audio editions (kept strictly separate from Arabic reciters). */
export function getTranslationAudioEditions(): Reciter[] {
  return VERIFIED_NON_ARABIC_EDITIONS;
}

/** Specific non-128kbps editions hosted on AlQuran Cloud CDN or EveryAyah. */
const KNOWN_BITRATES: Record<string, string> = {
  'ar.abdulbasitmurattal': '192',
  'ar.abdullahbasfar': '192',
  'ar.abdurrahmaansudais': '192',
  'ar.abdulsamad': '64',
  'ar.hanirifai': '192',
  'ar.aymanswoaid': '64',
  'ar.ibrahimakhbar': '32',
  'ar.minshawimujawwad': '64',
  'ar.saoodshuraym': '64',
  'ru.kuliev-audio-2': '320',
  'en.everyayah-walk': '192',
  'en.walk': '192',
  'fa.everyayah-kabiri': '16',
  'fa.everyayah-hedayatfar': '40',
  'fa.hedayatfarfooladvand': '40',
  'az.everyayah-balayev': '46',
  'ur.everyayah-shamshad': '46',
  'ur.khan': '46',
  'bs.everyayah-korkut': '32',
  'ur.everyayah-farhathashmi': '32',
};

/** Editions on AlQuran Cloud API that return 403 on CDN or are broken/duplicates and should be excluded. */
const BLOCKED_EDITIONS = new Set([
  // Non-Arabic editions with 403 or broken paths
  'en.walk',
  'fa.hedayatfarfooladvand',
  'ur.khan',
  'ru.kuliev-audio-2',
  'en.misharyrashidalafasyenglishtranslationsaheehibrahimwalk',
  'en.muhammadayyubenglishtranslationmuhsinkhanmikaalwaters',
  'en.sudaisandshuraymenglishtranslationpickthallaslamathar',
  'my.hashimtinmyint',

  // Duplicate -2 mirror editions (mapped in ALIAS_MAP)
  'ar.alafasy-2',
  'ar.husary-2',
  'ar.mahermuaiqly-2',
  'ar.hudhaify-2',
  'ar.husarymujawwad-2',
  'ar.minshawi-2',
  'ar.muhammadayyoub-2',
  'ar.muhammadjibreel-2',

  // Broken Arabic editions returning HTTP 403 on CDN
  'ar.parhizgar',
  'ar.abdulazizazzahrani',
  'ar.abdulbariaththubaity',
  'ar.abdulbarimohammed',
  'ar.abdulbasitmujawwad',
  'ar.abdulbasitmurattal-surah',
  'ar.abdulkareemalhazmi',
  'ar.abdullahalmatrood',
  'ar.abdullahawadaljuhani',
  'ar.abdullahbasfar-surah',
  'ar.abdullahkhayat',
  'ar.abdullahkhulaifi',
  'ar.abdulmohsenalharthy',
  'ar.abdulmunimabdulmubdi',
  'ar.abdulwadoodhaneef',
  'ar.abdurrasheedsufiabialhaarithanalkasaaee',
  'ar.abdurrasheedsufiaddoorianabiamr',
  'ar.abdurrasheedsufishubahanasim',
  'ar.abdurrasheedsufisoosi',
  'ar.abuabdullahmuniraltounsi',
  'ar.abubakraldhabi',
  'ar.adilkalbani',
  'ar.ahmadalhawashy',
  'ar.ahmadkhaderaltarabulsi',
  'ar.ahmadsulaiman',
  'ar.ahmedalajmi',
  'ar.ahmedalhammad',
  'ar.ahmedalmisbahi',
  'ar.ahmedamir',
  'ar.ahmedmohamedsalama',
  'ar.ahmedsaber',
  'ar.alafasy-surah',
  'ar.alashryomran',
  'ar.alfatehmuhammadzubair',
  'ar.alhusaynialazazi',
  'ar.alhusaynialazazichildren',
  'ar.aliabdurrahmanalhuthaify',
  'ar.aliabdurrahmanalhuthaifyqaloon',
  'ar.alihajjajsouissi',
  'ar.alzainmohamedahmed',
  'ar.aymanswed',
  'ar.azizalili',
  'ar.basselabdulrahmanraoui',
  'ar.benkirane',
  'ar.darwishfarajdarwishalattar',
  'ar.emadalmansary',
  'ar.ezzatsabri',
  'ar.faresabbad',
  'ar.fouadalkhamiri',
  'ar.hamadsinan',
  'ar.hamdyalsayedtolbasaad',
  'ar.haniarrifai',
  'ar.hasanhashem',
  'ar.hassansaleh',
  'ar.hatemfarid',
  'ar.ibrahimalakhdar',
  'ar.ibrahimaldossari',
  'ar.ibrahimaljormy',
  'ar.ilhantok',
  'ar.imadzuhairhafez',
  'ar.jamaanalosaimi',
  'ar.jamalshakerabdullah',
  'ar.jazzaalswaileh',
  'ar.kamel',
  'ar.khaledalqahtani',
  'ar.khaledbarakat',
  'ar.khalidabdulkafi',
  'ar.khalidaljalil',
  'ar.khalidalmohanna',
  'ar.khalifaaltunaiji',
  'ar.laayounelkouchi',
  'ar.lesaintcorantraduitenfrancais',
  'ar.mahershakhashiro',
  'ar.mahmoodalrifai',
  'ar.mahmoudalialbanna',
  'ar.mahmoudelsheimy',
  'ar.mahmoudsaaddarouich',
  'ar.mahmoudsayedeltayeb',
  'ar.misharyrashidalafasy',
  'ar.moeedhalharthi',
  'ar.mohamedabdelaziz',
  'ar.mohamedabdelhakimsaadalabdullah',
  'ar.mohamedaljaberyalheyani',
  'ar.mohamedalmohisni',
  'ar.mohamedelkantaoui',
  'ar.mohamedhassan',
  'ar.mohamedmaabad',
  'ar.mohamedosmankhan',
  'ar.mohamedshaabanabuqarn',
  'ar.mohamedtablawi',
  'ar.mohammadismaeelalmuqaddim',
  'ar.mohammadrachadalshareef',
  'ar.mohammedbinsalehabuzaid',
  'ar.muftahalsaltany',
  'ar.muhammadabdulkareem',
  'ar.muhammadalaalimaldokali',
  'ar.muhammadalluhaidan',
  'ar.muhammadalmehysni',
  'ar.muhammadalsubayyil',
  'ar.muhammadanwarshahat',
  'ar.muhammadayyub',
  'ar.muhammadsalehalimshah',
  'ar.muhammadsiddiqalminshawimujawwad',
  'ar.muhammadsulaimanpatel',
  'ar.musabilal',
  'ar.mustafaallahouni',
  'ar.mustafaismail',
  'ar.mustafaraadalazzawi',
  'ar.mustaphagharbi',
  'ar.nabilarrifai',
  'ar.nasseralqatami',
  'ar.neamahalhassan',
  'ar.obeikan',
  'ar.oimaoqataris',
  'ar.omaralkazabri',
  'ar.osamabinalialghanim',
  'ar.rachidbelalia',
  'ar.saberabdulhakam',
  'ar.sadaqatali',
  'ar.sahlyasin',
  'ar.saidalshaalan',
  'ar.salahalbudair',
  'ar.salahalhashem',
  'ar.salahbaothman',
  'ar.samirbelaachya',
  'ar.saudalshuraim',
  'ar.sayedramadan',
  'ar.shahriarparhizgar',
  'ar.sudaisshuraymnaeemsultan',
  'ar.tamerislam',
  'ar.tareqabdulganidaawob',
  'ar.tawfeeqassayegh',
  'ar.turkiebeidalmarri',
  'ar.waeldesouky',
  'ar.waelradwanqureshi',
  'ar.waleedidreesalmaneese',
  'ar.waleednaehi',
  'ar.waleedsamiraliabdulmajidsorour',
  'ar.walidalshatti',
  'ar.walidfathibashta',
  'ar.yahyahawwa',
  'ar.yassenaljazairi',
  'ar.yasseraldossari',
  'ar.yasseralmazroyee',
  'ar.yasserqureshi',
  'ar.yassersalama',
  'ar.yassersarhaneldeeb',
  'ar.yousufalshoaey',
  'ar.yousufbinnoahahmad',
]);

/** Convert 1-based (surah, ayah) to global Quranic ayah number (1..6236). */
export function getGlobalAyahNumber(surah: number, ayah: number): number {
  if (surah < 1 || surah > 114) return ayah;
  let offset = 0;
  for (let i = 0; i < surah - 1; i++) {
    offset += SURAH_AYAH_COUNTS[i];
  }
  return offset + ayah;
}

/** Editions hosted on CDN with full single-surah MP3s. */
const EDITIONS_WITH_SURAH_AUDIO = new Set([
  'ar.alafasy',
  'ar.abdulbasitmurattal',
  'ar.abdullahbasfar',
]);

/** Check if an edition is verse-by-verse recitation / translation (all non-Arabic editions or Arabic editions without full surah MP3). */
export function isVerseByVerseEdition(identifier: string): boolean {
  const resolved = ALIAS_MAP[identifier] || identifier;
  if (EVERYAYAH_EDITIONS[resolved]) return true;
  if (!EDITIONS_WITH_SURAH_AUDIO.has(resolved)) return true;
  return (
    resolved === 'zh.chinese' ||
    resolved === 'fr.leclerc' ||
    resolved === 'ru.kuliev-audio' ||
    resolved === 'kk.khalifahaltai-audio' ||
    resolved === 'tr.vakfi-audio' ||
    resolved === 'uz.sodik-audio'
  );
}

const ARABIC_RECITERS_CACHE_KEY = 'arabic-reciters-cache-v4';

/**
 * Fetch reciters from AlQuran Cloud audio editions endpoint (strictly Arabic recitations).
 * Default reciter ar.alafasy is placed at index 0.
 * Non-Arabic editions are maintained separately and never mixed into this list.
 * Results are cached in AsyncStorage under 'arabic-reciters-cache-v4'.
 */
export async function fetchReciters(): Promise<Reciter[]> {
  let cachedReciters: Reciter[] | null = null;
  try {
    const rawCache = await AsyncStorage.getItem(ARABIC_RECITERS_CACHE_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedReciters = parsed
          .filter((r: any) => r && r.language === 'ar' && !BLOCKED_EDITIONS.has(r.identifier))
          .map((r: any) => ({
            ...r,
            country: r.country || RECITER_COUNTRIES[r.identifier] || getReciterCountry(r.identifier),
          }));
      }
    }
  } catch {
    // Cache read failed
  }

  if (cachedReciters && cachedReciters.length > 0 && !isAppOnline()) {
    return cachedReciters;
  }

  try {
    const res = await fetchWithTimeout('https://api.alquran.cloud/v1/edition/format/audio', {}, 4000);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data)) {
      throw new Error('Invalid API response');
    }

    const recitersFromApi: Reciter[] = json.data
      .filter((item: any) => !BLOCKED_EDITIONS.has(String(item.identifier ?? '')))
      .map((item: any) => {
        const identifier = String(item.identifier ?? '');
        return {
          identifier,
          name: String(item.name ?? ''),
          englishName: String(item.englishName ?? ''),
          language: String(item.language ?? ''),
          country: RECITER_COUNTRIES[identifier] || getReciterCountry(identifier),
        };
      });

    // Strictly Arabic reciters only (language === 'ar')
    const arabicReciters = recitersFromApi.filter((r) => r.language === 'ar');
    // Ensure default reciter ar.alafasy is at index 0
    const alafasyIdx = arabicReciters.findIndex((r) => r.identifier === 'ar.alafasy');
    if (alafasyIdx > 0) {
      const [alafasy] = arabicReciters.splice(alafasyIdx, 1);
      arabicReciters.unshift(alafasy);
    }

    try {
      await AsyncStorage.setItem(ARABIC_RECITERS_CACHE_KEY, JSON.stringify(arabicReciters));
    } catch {
      // Non-fatal write failure
    }

    return arabicReciters.length > 0 ? arabicReciters : DEFAULT_RECITERS;
  } catch (err) {
    if (cachedReciters && cachedReciters.length > 0) {
      return cachedReciters;
    }
    return DEFAULT_RECITERS;
  }
}

/**
 * Get single ayah playback URL.
 * Handles EveryAyah editions (surah 3-digit + ayah 3-digit) and AlQuran Cloud CDN (global ayah number).
 */
export function getAyahAudioUrl(identifier: string, surah: number, ayah: number): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  const everyAyah = EVERYAYAH_EDITIONS[resolved];
  if (everyAyah) {
    const s = String(surah).padStart(3, '0');
    const a = String(ayah).padStart(3, '0');
    return `https://everyayah.com/data/${everyAyah.subfolder}/${s}${a}.mp3`;
  }

  const bitrate = KNOWN_BITRATES[resolved] || '128';
  const globalAyah = getGlobalAyahNumber(surah, ayah);
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${resolved}/${globalAyah}.mp3`;
}

/**
 * Full-surah playback URL pattern from AlQuran Cloud CDN.
 * For verse-by-verse / EveryAyah editions without a full surah MP3, returns the first ayah URL.
 */
export function getSurahBitrate(identifier: string): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  const known = KNOWN_BITRATES[resolved];
  return known && known !== '192' && known !== '320' ? known : '128';
}

export function getSurahAudioUrl(identifier: string, surah: number): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  if (isVerseByVerseEdition(resolved)) {
    return getAyahAudioUrl(resolved, surah, 1);
  }
  const bitrate = getSurahBitrate(resolved);
  return `https://cdn.islamic.network/quran/audio-surah/${bitrate}/${resolved}/${surah}.mp3`;
}

// Audio singleton management
export type PlaybackSegmentType = 'arabic' | 'translation';

export interface CurrentPlayback {
  identifier: string;
  reciterName: string;
  title: string;
  url: string;
  isPlaying: boolean;
  type?: 'ayah' | 'surah';
  surah?: number;
  ayah?: number;
  segmentType?: PlaybackSegmentType;
  translationLang?: string;
  arabicReciter?: string;
  arabicReciterName?: string;
  isSurahMode?: boolean;
}

let translationAudioEnabled = true;

// Initialize translationAudioEnabled from persistent settings
AsyncStorage.getItem('islamic-settings')
  .then((raw) => {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.translationAudioEnabled === 'boolean') {
        translationAudioEnabled = parsed.translationAudioEnabled;
      }
    }
  })
  .catch(() => {});

export function isAudioTranslationEnabled(): boolean {
  return translationAudioEnabled;
}

export function setAudioTranslationEnabled(enabled: boolean): void {
  translationAudioEnabled = enabled;
}

export const isTranslationAudioEnabled = isAudioTranslationEnabled;
export const setTranslationAudioEnabledState = setAudioTranslationEnabled;

export async function configureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});
}

// Audio mode is configured lazily when playback starts (e.g. in playAudioUrl)
// to prevent native module access during initial bundle evaluation on Android.

export function getActiveArabicReciter(preferredId?: string): string {
  if (preferredId && preferredId.startsWith('ar.')) {
    return preferredId;
  }
  const settings = safeLoadSettings();
  if (settings.reciter && settings.reciter.startsWith('ar.')) {
    return settings.reciter;
  }
  return 'ar.alafasy';
}

let currentSound: AudioPlayer | null = null;
let currentSoundSubscription: { remove: () => void } | null = null;
let currentPlaybackUrl: string | null = null;
let currentPlaybackRate = 1.0;

type SoundCreatedListener = (sound: AudioPlayer) => void;
const soundCreatedListeners = new Set<SoundCreatedListener>();

export function addSoundCreatedListener(listener: SoundCreatedListener): () => void {
  soundCreatedListeners.add(listener);
  if (currentSound) {
    try {
      listener(currentSound);
    } catch {}
  }
  return () => {
    soundCreatedListeners.delete(listener);
  };
}

function notifySoundCreated(sound: AudioPlayer): void {
  soundCreatedListeners.forEach((listener) => {
    try {
      listener(sound);
    } catch {}
  });
}

export function getCurrentAudioPlayer(): AudioPlayer | null {
  return currentSound;
}

export async function setRate(rate: number): Promise<void> {
  const safeRate = Math.max(0.25, Math.min(2.0, rate));
  currentPlaybackRate = safeRate;
  if (currentSound) {
    try {
      currentSound.setPlaybackRate(safeRate);
    } catch {}
  }
}

export function getRate(): number {
  return currentPlaybackRate;
}

export const setPlaybackRate = setRate;
export const getPlaybackRate = getRate;

// ---------------------------------------------------------------------------
// Sleep Timer Singleton (persists across modal minimize/close)
// ---------------------------------------------------------------------------
let sleepTimerId: ReturnType<typeof setInterval> | null = null;
let sleepEndTime: number | null = null;
let sleepInitialMinutes: number | null = null;
const sleepListeners = new Set<(remainingSeconds: number | null, initialMinutes: number | null) => void>();

function notifySleepListeners(): void {
  const remaining = getSleepTimerRemaining();
  for (const listener of sleepListeners) {
    try {
      listener(remaining, sleepInitialMinutes);
    } catch {}
  }
}

export function startSleepTimer(minutes: number): void {
  cancelSleepTimer();
  if (minutes <= 0) return;

  sleepInitialMinutes = minutes;
  sleepEndTime = Date.now() + minutes * 60_000;
  notifySleepListeners();

  sleepTimerId = setInterval(() => {
    const left = getSleepTimerRemaining();
    notifySleepListeners();
    if (left !== null && left <= 0) {
      cancelSleepTimer();
      stop(true).catch(() => {});
    }
  }, 1000);
}

export function cancelSleepTimer(): void {
  if (sleepTimerId) {
    clearInterval(sleepTimerId);
    sleepTimerId = null;
  }
  sleepEndTime = null;
  sleepInitialMinutes = null;
  notifySleepListeners();
}

export function getSleepTimerRemaining(): number | null {
  if (!sleepEndTime) return null;
  const left = Math.round((sleepEndTime - Date.now()) / 1000);
  return Math.max(0, left);
}

export function getSleepTimerInitialMinutes(): number | null {
  return sleepInitialMinutes;
}

export function addSleepTimerListener(
  listener: (remainingSeconds: number | null, initialMinutes: number | null) => void
): () => void {
  sleepListeners.add(listener);
  listener(getSleepTimerRemaining(), sleepInitialMinutes);
  return () => {
    sleepListeners.delete(listener);
  };
}

function cleanupCurrentSound(): void {
  if (currentSoundSubscription) {
    try {
      currentSoundSubscription.remove();
    } catch {}
    currentSoundSubscription = null;
  }
  if (currentSound) {
    try {
      currentSound.clearLockScreenControls();
    } catch {}
    try {
      currentSound.pause();
      currentSound.remove();
    } catch {}
    currentSound = null;
  }
  currentPlaybackUrl = null;
}
let currentPlayback: CurrentPlayback | null = null;
const listeners = new Set<(isPlaying: boolean) => void>();
const statusListeners = new Set<(status: PlaybackStatus) => void>();
const queueListeners = new Set<(queue: PlaylistItem[], currentIndex: number) => void>();

let currentStatus: PlaybackStatus = {
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  isLoaded: false,
  isBuffering: false,
  didJustFinish: false,
};

// Queue state
let currentQueue: PlaylistItem[] = [];
let currentQueueIndex = -1;
let isQueueLoaded = false;
let isInternalQueuePlay = false;

function buildSurahQueue(surahNumber: number): PlaylistItem[] {
  const count = SURAH_AYAH_COUNTS[surahNumber - 1] || 7;
  const items: PlaylistItem[] = [];
  for (let a = 1; a <= count; a++) {
    items.push({
      surah: surahNumber,
      ayah: a,
      title: `Surah ${surahNumber}:${a}`,
    });
  }
  return items;
}

function safeLoadQueue(): PlaylistItem[] {
  try {
    return loadAudioQueue();
  } catch {
    return [];
  }
}

export function safeLoadSettings(): AudioSettings {
  try {
    return loadAudioSettings();
  } catch {
    return {
      reciter: 'ar.alafasy',
      autoplayNext: true,
      repeatMode: 'none',
    };
  }
}

export function updateAudioSettings(newSettings: Partial<AudioSettings>): AudioSettings {
  const current = safeLoadSettings();
  const merged = { ...current, ...newSettings };
  try {
    saveAudioSettings(merged);
  } catch {}
  return merged;
}

export function getAudioQueue(): PlaylistItem[] {
  if (!isQueueLoaded) {
    currentQueue = safeLoadQueue();
    isQueueLoaded = true;
  }
  return currentQueue;
}

export function getQueueIndex(): number {
  return currentQueueIndex;
}

export function setAudioQueue(queue: PlaylistItem[], startIndex = -1): void {
  currentQueue = [...queue];
  currentQueueIndex = startIndex;
  isQueueLoaded = true;
  try {
    saveAudioQueue(currentQueue);
  } catch {}
  notifyQueueListeners();
}

export function addToAudioQueue(item: PlaylistItem): void {
  getAudioQueue();
  currentQueue = [...currentQueue, item];
  try {
    saveAudioQueue(currentQueue);
  } catch {}
  notifyQueueListeners();
}

export function removeQueueItem(index: number): void {
  getAudioQueue();
  if (index < 0 || index >= currentQueue.length) return;
  currentQueue = currentQueue.filter((_, i) => i !== index);
  if (currentQueueIndex === index) {
    currentQueueIndex = -1;
  } else if (currentQueueIndex > index) {
    currentQueueIndex -= 1;
  }
  try {
    saveAudioQueue(currentQueue);
  } catch {}
  notifyQueueListeners();
}

export function clearAudioQueue(): void {
  currentQueue = [];
  currentQueueIndex = -1;
  isQueueLoaded = true;
  try {
    saveAudioQueue([]);
  } catch {}
  notifyQueueListeners();
}

export function addQueueListener(
  listener: (queue: PlaylistItem[], index: number) => void
): () => void {
  queueListeners.add(listener);
  listener(getAudioQueue(), currentQueueIndex);
  return () => {
    queueListeners.delete(listener);
  };
}

function notifyQueueListeners(): void {
  queueListeners.forEach((listener) => {
    try {
      listener(currentQueue, currentQueueIndex);
    } catch {
      // ignore
    }
  });
}

export interface PrimeUpcomingAyahsParams {
  surah: number;
  ayah?: number;
  segmentType?: PlaybackSegmentType;
  arabicReciter?: string;
  translationEnabled?: boolean;
  transEditionId?: string;
  isSurahMode?: boolean;
}

/**
 * Preload upcoming audio chunks (next 3-5 ayahs, Arabic + translation segment if enabled).
 * Feeds URLs into the audio preloader queue with a concurrency limit of 2 and LRU cap of 6.
 */
export function primeUpcomingAyahs(params: PrimeUpcomingAyahsParams): void {
  const surah = params.surah || 1;
  const ayah = params.ayah || 1;
  const segmentType = params.segmentType || 'arabic';
  const arabicReciter = params.arabicReciter || getActiveArabicReciter();
  const transEnabled = params.translationEnabled ?? translationAudioEnabled;

  const transAudio = params.transEditionId
    ? { identifier: params.transEditionId }
    : getAudioTranslationEdition();

  const upcomingUrls: string[] = [];

  // If full-surah audio file (single MP3 progressive streaming, translation disabled)
  if (!transEnabled && !params.isSurahMode && !isVerseByVerseEdition(arabicReciter) && params.ayah === undefined) {
    if (surah < 114) {
      upcomingUrls.push(getSurahAudioUrl(arabicReciter, surah + 1));
    }
    // Also prime first ayah of current surah in case fallback is triggered
    upcomingUrls.push(getAyahAudioUrl(arabicReciter, surah, 1));
    enqueuePreloadUrls(upcomingUrls);
    return;
  }

  // Verse-by-verse chunk sequencing
  // 1. If currently playing Arabic segment and translation is enabled:
  // Next immediate chunk is the Translation segment of the current ayah!
  if (transEnabled && transAudio && segmentType === 'arabic') {
    upcomingUrls.push(getAyahAudioUrl(transAudio.identifier, surah, ayah));
  }

  // 2. Prefetch subsequent ayahs (Arabic + Translation)
  let curS = surah;
  let curA = ayah;

  for (let i = 0; i < 4; i++) {
    const maxA = SURAH_AYAH_COUNTS[curS - 1] || 7;
    if (curA < maxA) {
      curA += 1;
    } else if (curS < 114) {
      curS += 1;
      curA = 1;
    } else {
      break;
    }

    // Add Arabic recitation for next ayah
    upcomingUrls.push(getAyahAudioUrl(arabicReciter, curS, curA));

    // Add Translation audio if enabled
    if (transEnabled && transAudio) {
      upcomingUrls.push(getAyahAudioUrl(transAudio.identifier, curS, curA));
    }

    if (upcomingUrls.length >= 6) {
      break;
    }
  }

  // Also if in a queue, prime the next queue item's URL
  if (currentQueue.length > 0 && currentQueueIndex >= 0 && currentQueueIndex + 1 < currentQueue.length) {
    const nextItem = currentQueue[currentQueueIndex + 1];
    if (nextItem.ayah !== undefined && nextItem.ayah !== null) {
      upcomingUrls.push(getAyahAudioUrl(arabicReciter, nextItem.surah, nextItem.ayah));
    } else {
      upcomingUrls.push(getSurahAudioUrl(arabicReciter, nextItem.surah));
    }
  }

  enqueuePreloadUrls(upcomingUrls.slice(0, 6));
}

const KNOWN_RECITER_NAMES: Record<string, string> = {
  'ar.alafasy': 'Mishari Rashid al-Afasy',
  'ar.abdulbasitmurattal': 'Abdul Basit (Murattal)',
  'ar.abdullahbasfar': 'Abdullah Basfar',
  'ar.abdurrahmaansudais': 'Abdurrahmaan As-Sudais',
  'ar.abdulsamad': 'Abdul Samad',
  'ar.hanirifai': 'Hani ar-Rifai',
  'ar.aymanswoaid': 'Ayman Sowaid',
  'ar.hudhaify': 'Ali Al-Hudhaify',
  'ar.husary': 'Mahmoud Khalil Al-Husary',
  'ar.minshawi': 'Mohamed Siddiq Al-Minshawi',
  'en.everyayah-walk': 'Sahih International (Ibrahim Walk)',
  'en.walk': 'Sahih International (Ibrahim Walk)',
  'ur.everyayah-shamshad': 'Shamshad Ali Khan (Urdu)',
  'ur.khan': 'Shamshad Ali Khan (Urdu)',
  'ur.everyayah-farhathashmi': 'Dr. Farhat Hashmi (Urdu)',
  'zh.chinese': 'Chinese Translation',
  'fr.leclerc': 'Youssouf Leclerc (French)',
  'ru.kuliev-audio': 'Elmir Kuliev (Russian)',
  'kk.khalifahaltai-audio': 'Khalifah Altai (Kazakh)',
  'tr.vakfi-audio': 'Diyanet Vakfı (Turkish)',
  'uz.sodik-audio': 'Muhammad Sodik (Uzbek)',
  'fa.everyayah-kabiri': 'Makarem Shirazi - Kabiri (Persian)',
  'fa.everyayah-hedayatfar': 'Fooladvand - Hedayatfar (Persian)',
  'fa.hedayatfarfooladvand': 'Fooladvand - Hedayatfar (Persian)',
  'az.everyayah-balayev': 'Rasim Balayev (Azerbaijani)',
  'bs.everyayah-korkut': 'Besim Korkut (Bosnian)',
};

export function resolveReciterName(identifier: string): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  if (KNOWN_RECITER_NAMES[resolved]) return KNOWN_RECITER_NAMES[resolved];
  const found = VERIFIED_NON_ARABIC_EDITIONS.find((e) => e.identifier === resolved);
  if (found) return found.englishName;
  const clean = resolved.replace(/^(ar|en|ru|zh|fr|kk|tr|uz|fa|az|bs)\./, '').replace(/[-_]/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function resolveAyahFromGlobal(globalAyah: number): { surah: number; ayah: number } {
  let remaining = globalAyah;
  for (let i = 0; i < SURAH_AYAH_COUNTS.length; i++) {
    const count = SURAH_AYAH_COUNTS[i];
    if (remaining <= count) {
      return { surah: i + 1, ayah: remaining };
    }
    remaining -= count;
  }
  return { surah: 1, ayah: 1 };
}

/** Get currently active playback metadata or null if nothing played this session. */
export function getCurrentPlayback(): CurrentPlayback | null {
  return currentPlayback;
}

/** Explicitly update or override current playback state. */
export function setCurrentPlayback(item: CurrentPlayback | null): void {
  currentPlayback = item;
  notifyListeners(item?.isPlaying ?? false);
}

/** Clear the session playback item completely. */
export function clearPlayback(): void {
  currentPlayback = null;
  notifyListeners(false);
}

/** Register a callback for audio playback state changes. Returns an unsubscribe function. */
export function addPlaybackListener(listener: (isPlaying: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Register a callback for rich audio playback status updates. Returns an unsubscribe function. */
export function addPlaybackStatusListener(listener: (status: PlaybackStatus) => void): () => void {
  statusListeners.add(listener);
  // Immediately call with current status
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

/** Get the current full playback status. */
export function getPlaybackStatus(): PlaybackStatus {
  return currentStatus;
}

/** Seek to a specific position in milliseconds. */
export async function seekTo(positionMillis: number): Promise<void> {
  try {
    if (currentSound) {
      // expo-audio seekTo expects seconds, convert from positionMillis
      const seconds = Math.max(0, positionMillis / 1000);
      await currentSound.seekTo(seconds);
    }
  } catch {
    // ignore
  }
}

function notifyListeners(isPlaying: boolean): void {
  listeners.forEach((listener) => {
    try {
      listener(isPlaying);
    } catch {
      // ignore
    }
  });
}

function notifyStatusListeners(status: PlaybackStatus): void {
  currentStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // ignore
    }
  });
  // Also notify legacy boolean listeners for backward compatibility
  notifyListeners(status.isPlaying);
}

function handlePlaybackStatusUpdate(status: AudioStatus): void {
  if (status.error) {
    if (
      currentPlaybackUrl &&
      !currentPlaybackUrl.startsWith('file://') &&
      !currentPlaybackUrl.startsWith('blob:') &&
      !currentPlaybackUrl.includes('/128/')
    ) {
      const fallbackUrl = currentPlaybackUrl.replace(/\/(192|64|48|40|32|320)\//, '/128/');
      if (fallbackUrl !== currentPlaybackUrl) {
        currentPlaybackUrl = fallbackUrl;
        cleanupCurrentSound();
        try {
          const fallbackPlayer = createAudioPlayer({ uri: fallbackUrl }, { updateInterval: 250 });
          fallbackPlayer.volume = 1.0;
          if (currentPlaybackRate !== 1.0) {
            try {
              fallbackPlayer.setPlaybackRate(currentPlaybackRate);
            } catch {}
          }
          currentSoundSubscription = fallbackPlayer.addListener('playbackStatusUpdate', handlePlaybackStatusUpdate);
          fallbackPlayer.play();
          currentSound = fallbackPlayer;
          notifySoundCreated(fallbackPlayer);
          if (currentPlayback) currentPlayback.isPlaying = true;
          notifyStatusListeners({
            ...currentStatus,
            isPlaying: true,
            isLoaded: true,
            isBuffering: true,
          });
          return;
        } catch {
          // fall through to error handling
        }
      }
    }

    if (currentPlayback) currentPlayback.isPlaying = false;
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
    return;
  }

  const positionMillis = Math.round((status.currentTime ?? 0) * 1000);
  const durationMillis = Math.round((status.duration ?? 0) * 1000);
  const isBuffering = status.isBuffering ?? !status.isLoaded;
  const isPlaying = status.playing;
  // An active audio player session is considered loaded while ready, buffering, or playing
  const isLoaded = status.isLoaded || isBuffering || isPlaying || (currentPlayback?.isPlaying ?? false);

  const newStatus: PlaybackStatus = {
    isPlaying,
    positionMillis: positionMillis > 0 ? positionMillis : currentStatus.positionMillis,
    durationMillis: durationMillis > 0 ? durationMillis : currentStatus.durationMillis,
    isLoaded,
    isBuffering,
    didJustFinish: status.didJustFinish ?? false,
  };

  if (status.didJustFinish) {
    // Short non-Quran clips (99 Names) always stop at their end — never chain into
    // translation segments, autoplay queues, or the Quran ayah sequence.
    if (currentPlayback?.identifier === 'names99') {
      if (currentPlayback) currentPlayback.isPlaying = false;
      notifyStatusListeners(newStatus);
      return;
    }

    // If translation audio is enabled, and we just finished an Arabic segment of an Ayah:
    if (
      translationAudioEnabled &&
      currentPlayback?.segmentType === 'arabic' &&
      currentPlayback.surah &&
      currentPlayback.ayah
    ) {
      const curSurah = currentPlayback.surah;
      const curAyah = currentPlayback.ayah;
      const isSurahMode = currentPlayback.isSurahMode ?? false;
      const arabicReciter = currentPlayback.arabicReciter || currentPlayback.identifier;
      const arabicReciterName = currentPlayback.arabicReciterName || currentPlayback.reciterName;

      const transAudio = getAudioTranslationEdition();

      if (transAudio) {
        // Play Translation Segment
        playTranslationSegment(curSurah, curAyah, transAudio, isSurahMode, arabicReciter, arabicReciterName).catch(
          () => {
            advanceAfterAyah(curSurah, curAyah, isSurahMode, arabicReciter, arabicReciterName).catch(() => {});
          }
        );
        return;
      } else {
        // No translation audio edition for this language -> continue to next ayah
        advanceAfterAyah(curSurah, curAyah, isSurahMode, arabicReciter, arabicReciterName).catch(() => {});
        return;
      }
    }

    // If we just finished a Translation segment, or translationAudioEnabled is false:
    const settings = safeLoadSettings();
    if (settings.repeatMode === 'one') {
      if (translationAudioEnabled && currentPlayback?.surah && currentPlayback?.ayah) {
        // Repeat the whole ayah pair (start back with Arabic segment of the same ayah)
        const curSurah = currentPlayback.surah;
        const curAyah = currentPlayback.ayah;
        const isSurahMode = currentPlayback.isSurahMode ?? false;
        const arabicReciter = currentPlayback.arabicReciter || 'ar.alafasy';
        const arabicReciterName = currentPlayback.arabicReciterName || resolveReciterName(arabicReciter);
        playAyah(arabicReciter, undefined, undefined, arabicReciterName, curSurah, curAyah, isSurahMode).catch(() => {});
        return;
      } else if (currentPlayback?.url) {
        playAudioUrl(currentPlayback.url).catch(() => {});
        return;
      }
    } else if (settings.repeatMode === 'all' || settings.autoplayNext) {
      playNext()
        .then((advanced) => {
          if (!advanced) {
            if (currentPlayback) currentPlayback.isPlaying = false;
            notifyStatusListeners(newStatus);
          }
        })
        .catch(() => {
          if (currentPlayback) currentPlayback.isPlaying = false;
          notifyStatusListeners(newStatus);
        });
      return;
    }

    if (currentPlayback) currentPlayback.isPlaying = false;
    notifyStatusListeners(newStatus);
  } else {
    if (currentPlayback) currentPlayback.isPlaying = status.playing;
    notifyStatusListeners(newStatus);
  }
}

async function playTranslationSegment(
  surah: number,
  ayah: number,
  transAudio: { identifier: string; name: string; langName?: string; englishName?: string; language?: string },
  isSurahMode: boolean,
  arabicReciter: string,
  arabicReciterName: string
): Promise<void> {
  const transUrl = getAyahAudioUrl(transAudio.identifier, surah, ayah);
  const langDisplay = transAudio.langName || (transAudio.language ? getAudioTranslationLangName(transAudio.language) : '') || 'Translation';
  const resolvedTitle = `Translation (${langDisplay}) · Surah ${surah}:${ayah}`;

  currentPlayback = {
    identifier: transAudio.identifier,
    reciterName: transAudio.name,
    title: resolvedTitle,
    url: transUrl,
    isPlaying: true,
    type: 'ayah',
    surah,
    ayah,
    segmentType: 'translation',
    arabicReciter,
    arabicReciterName,
    translationLang: langDisplay,
    isSurahMode,
  };

  notifyStatusListeners({
    ...currentStatus,
    isPlaying: true,
    isBuffering: true,
    positionMillis: 0,
    durationMillis: 0,
  });

  primeUpcomingAyahs({
    surah,
    ayah,
    segmentType: 'translation',
    arabicReciter,
    translationEnabled: true,
    transEditionId: transAudio.identifier,
    isSurahMode,
  });

  try {
    await playAudioUrl(transUrl);
  } catch (err) {
    // If translation playback fails, skip to next ayah without breaking recitation flow
    await advanceAfterAyah(surah, ayah, isSurahMode, arabicReciter, arabicReciterName);
  }
}

async function advanceAfterAyah(
  surah: number,
  ayah: number,
  isSurahMode: boolean,
  arabicReciter: string,
  arabicReciterName: string
): Promise<void> {
  const settings = safeLoadSettings();
  if (settings.repeatMode === 'one') {
    isInternalQueuePlay = true;
    try {
      await playAyah(arabicReciter, undefined, undefined, arabicReciterName, surah, ayah, isSurahMode);
    } finally {
      isInternalQueuePlay = false;
    }
    return;
  }
  if (settings.repeatMode === 'all' || settings.autoplayNext) {
    const advanced = await playNext();
    if (!advanced && currentPlayback) {
      currentPlayback.isPlaying = false;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: false,
        didJustFinish: true,
      });
    }
  } else if (currentPlayback) {
    currentPlayback.isPlaying = false;
    notifyStatusListeners({
      ...currentStatus,
      isPlaying: false,
      didJustFinish: true,
    });
  }
}

/**
 * Immediately switch the current playback between Arabic recitation and the selected translation audio.
 * Stops current audio and plays the same ayah/surah in the target language segment.
 */
export async function switchToLanguageSegment(target: PlaybackSegmentType): Promise<boolean> {
  if (!currentPlayback) return false;
  if (currentPlayback.segmentType === target && currentStatus.isPlaying) {
    return true;
  }

  const surah = currentPlayback.surah || 1;
  const ayah = currentPlayback.ayah || 1;
  const isSurahMode = currentPlayback.isSurahMode ?? (currentPlayback.type === 'surah');
  const arabicReciter = currentPlayback.arabicReciter || getActiveArabicReciter(currentPlayback.identifier);
  const arabicReciterName = currentPlayback.arabicReciterName || resolveReciterName(arabicReciter);

  if (target === 'translation') {
    const transAudio = getAudioTranslationEdition();
    if (!transAudio) {
      return false;
    }
    await playTranslationSegment(surah, ayah, transAudio, isSurahMode, arabicReciter, arabicReciterName);
    return true;
  } else {
    // target === 'arabic'
    isInternalQueuePlay = true;
    try {
      if (currentPlayback.type === 'surah' && !isSurahMode) {
        await playSurah(arabicReciter, undefined, undefined, arabicReciterName, surah);
      } else {
        await playAyah(arabicReciter, undefined, undefined, arabicReciterName, surah, ayah, isSurahMode);
      }
    } finally {
      isInternalQueuePlay = false;
    }
    return true;
  }
}

async function playAudioUrl(url: string): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});

  if (currentSound && currentPlaybackUrl === url) {
    try {
      await currentSound.seekTo(0);
      currentSound.play();
      if (currentPlayback) currentPlayback.isPlaying = true;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: true,
      });
      return;
    } catch {
      cleanupCurrentSound();
    }
  }

  cleanupCurrentSound();

  // Attempt instant buffer-free playback from preloaded sound cache
  const preloaded = await takePreloadedSound(url);
  if (preloaded) {
    try {
      currentSound = preloaded;
      currentPlaybackUrl = url;
      if (currentPlaybackRate !== 1.0) {
        try {
          preloaded.setPlaybackRate(currentPlaybackRate);
        } catch {}
      }
      currentSoundSubscription = preloaded.addListener('playbackStatusUpdate', handlePlaybackStatusUpdate);
      preloaded.play();
      notifySoundCreated(preloaded);
      if (currentPlayback) currentPlayback.isPlaying = true;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: true,
        isLoaded: true,
        isBuffering: false,
      });
      return;
    } catch {
      cleanupCurrentSound();
    }
  }

  // Notify buffering state while loading
  notifyStatusListeners({
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
    isLoaded: false,
    isBuffering: true,
    didJustFinish: false,
  });

  // Resolve local offline audio URI if surah mode is active and downloaded
  const targetUri =
    currentPlayback?.type === 'surah' && currentPlayback.surah && currentPlayback.identifier
      ? resolveAudioUri(
          currentPlayback.identifier,
          currentPlayback.surah,
          getSurahBitrate(currentPlayback.identifier),
          url
        )
      : url;

  try {
    const player = createAudioPlayer({ uri: targetUri }, { updateInterval: 250 });
    player.volume = 1.0;
    if (currentPlaybackRate !== 1.0) {
      try {
        player.setPlaybackRate(currentPlaybackRate);
      } catch {}
    }
    currentSoundSubscription = player.addListener('playbackStatusUpdate', handlePlaybackStatusUpdate);
    player.play();
    currentSound = player;
    currentPlaybackUrl = targetUri;
    notifySoundCreated(player);
    if (currentPlayback) currentPlayback.isPlaying = true;
    // Notify immediately with isLoaded=true so the now-playing notification can
    // start without waiting for the first playbackStatusUpdate (expo-audio fires
    // that only after actual playback; buffering events report isLoaded=false and
    // App.tsx gates the notification start on isLoaded — preloaded path above
    // already does this, fresh streamed path must too).
    notifyStatusListeners({
      ...currentStatus,
      isPlaying: true,
      isLoaded: true,
      isBuffering: false,
    });
  } catch (err) {
    // If the provided url fails (e.g. bitrate mismatch), attempt 128kbps fallback
    if (
      !targetUri.startsWith('file://') &&
      !targetUri.startsWith('blob:') &&
      !targetUri.includes('/128/')
    ) {
      const fallbackUrl = targetUri.replace(/\/(192|64|48|40|32|320)\//, '/128/');
      if (fallbackUrl !== targetUri) {
        try {
          cleanupCurrentSound();
          const fallbackPlayer = createAudioPlayer({ uri: fallbackUrl }, { updateInterval: 250 });
          fallbackPlayer.volume = 1.0;
          if (currentPlaybackRate !== 1.0) {
            try {
              fallbackPlayer.setPlaybackRate(currentPlaybackRate);
            } catch {}
          }
          currentSoundSubscription = fallbackPlayer.addListener('playbackStatusUpdate', handlePlaybackStatusUpdate);
          fallbackPlayer.play();
          currentSound = fallbackPlayer;
          currentPlaybackUrl = fallbackUrl;
          notifySoundCreated(fallbackPlayer);
          if (currentPlayback) currentPlayback.isPlaying = true;
          notifyStatusListeners({
            ...currentStatus,
            isPlaying: true,
            isLoaded: true,
            isBuffering: true,
          });
          return;
        } catch {
          // ignore fallback error and propagate original
        }
      }
    }

    if (currentPlayback) currentPlayback.isPlaying = false;
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
    throw err;
  }
}

/** Play a specific Ayah using expo-audio AudioPlayer singleton. */
export async function playAyah(
  identifier: string,
  url?: string,
  title?: string,
  reciterName?: string,
  surah?: number,
  ayah?: number,
  isSurahMode = false
): Promise<void> {
  const resolvedId = ALIAS_MAP[identifier] || identifier;
  let resolvedSurah = surah;
  let resolvedAyah = ayah;

  if (!resolvedSurah || !resolvedAyah) {
    if (url) {
      const match = url.match(/\/audio\/\d+\/[^\/]+\/(\d+)\.mp3/);
      if (match) {
        const globalAyah = parseInt(match[1], 10);
        const res = resolveAyahFromGlobal(globalAyah);
        resolvedSurah = res.surah;
        resolvedAyah = res.ayah;
      } else {
        const everyAyahMatch = url.match(/\/(\d{3})(\d{3})\.mp3$/);
        if (everyAyahMatch) {
          resolvedSurah = parseInt(everyAyahMatch[1], 10);
          resolvedAyah = parseInt(everyAyahMatch[2], 10);
        } else {
          resolvedSurah = 1;
          resolvedAyah = 1;
        }
      }
    } else {
      resolvedSurah = 1;
      resolvedAyah = 1;
    }
  }

  // If translationAudioEnabled is ON, Arabic recitation is always the primary audio segment
  if (translationAudioEnabled) {
    const arabicReciter = getActiveArabicReciter(resolvedId);
    const resolvedReciter =
      reciterName && resolvedId.startsWith('ar.') ? reciterName : resolveReciterName(arabicReciter);
    const playbackUrl =
      url && resolvedId.startsWith('ar.')
        ? url
        : getAyahAudioUrl(arabicReciter, resolvedSurah, resolvedAyah);

    const transAudio = getAudioTranslationEdition();
    const resolvedTitle = title || `Arabic · Surah ${resolvedSurah}:${resolvedAyah}`;

    currentPlayback = {
      identifier: arabicReciter,
      reciterName: resolvedReciter,
      title: resolvedTitle,
      url: playbackUrl,
      isPlaying: true,
      type: 'ayah',
      surah: resolvedSurah,
      ayah: resolvedAyah,
      segmentType: 'arabic',
      arabicReciter,
      arabicReciterName: resolvedReciter,
      translationLang: transAudio ? getAudioTranslationLangName(transAudio.language) : undefined,
      isSurahMode,
    };

    // Queue synchronization:
    // If not invoked from within an existing queue sequence, build the strict scope queue:
    // - Surah mode: all ayahs of this surah
    // - Single ayah: exactly this one ayah
    if (!isInternalQueuePlay) {
      if (isSurahMode) {
        const sQueue = buildSurahQueue(resolvedSurah);
        const sIdx = Math.max(0, Math.min(sQueue.length - 1, (resolvedAyah || 1) - 1));
        setAudioQueue(sQueue, sIdx);
      } else {
        setAudioQueue(
          [
            {
              surah: resolvedSurah,
              ayah: resolvedAyah,
              title: resolvedTitle,
            },
          ],
          0
        );
      }
    } else {
      const queue = getAudioQueue();
      const matchIdx = queue.findIndex(
        (item) => item.surah === resolvedSurah && item.ayah === resolvedAyah
      );
      if (matchIdx >= 0) {
        currentQueueIndex = matchIdx;
        notifyQueueListeners();
      }
    }

    // Save to recently played
    try {
      saveRecentlyPlayed({
        type: 'ayah',
        identifier: arabicReciter,
        reciterName: resolvedReciter,
        surah: resolvedSurah,
        ayah: resolvedAyah,
        title: `Surah ${resolvedSurah}:${resolvedAyah}`,
      });
    } catch {}

    primeUpcomingAyahs({
      surah: resolvedSurah,
      ayah: resolvedAyah,
      segmentType: 'arabic',
      arabicReciter,
      translationEnabled: true,
      transEditionId: transAudio?.identifier,
      isSurahMode,
    });

    await playAudioUrl(playbackUrl);
    return;
  }

  // translationAudioEnabled is OFF: standard single-audio flow
  const resolvedReciter = reciterName || resolveReciterName(resolvedId);
  const playbackUrl = url || getAyahAudioUrl(resolvedId, resolvedSurah, resolvedAyah);
  const resolvedTitle = title || `Surah ${resolvedSurah}:${resolvedAyah}`;

  currentPlayback = {
    identifier: resolvedId,
    reciterName: resolvedReciter,
    title: resolvedTitle,
    url: playbackUrl,
    isPlaying: true,
    type: 'ayah',
    surah: resolvedSurah,
    ayah: resolvedAyah,
    segmentType: 'arabic',
    arabicReciter: resolvedId,
    arabicReciterName: resolvedReciter,
    isSurahMode,
  };

  if (!isInternalQueuePlay) {
    if (isSurahMode) {
      const sQueue = buildSurahQueue(resolvedSurah);
      const sIdx = Math.max(0, Math.min(sQueue.length - 1, (resolvedAyah || 1) - 1));
      setAudioQueue(sQueue, sIdx);
    } else {
      setAudioQueue(
        [
          {
            surah: resolvedSurah,
            ayah: resolvedAyah,
            title: resolvedTitle,
          },
        ],
        0
      );
    }
  } else {
    const queue = getAudioQueue();
    const matchIdx = queue.findIndex(
      (item) => item.surah === resolvedSurah && item.ayah === resolvedAyah
    );
    if (matchIdx >= 0) {
      currentQueueIndex = matchIdx;
      notifyQueueListeners();
    }
  }

  try {
    saveRecentlyPlayed({
      type: 'ayah',
      identifier: resolvedId,
      reciterName: resolvedReciter,
      surah: resolvedSurah,
      ayah: resolvedAyah,
      title: resolvedTitle,
    });
  } catch {}

  primeUpcomingAyahs({
    surah: resolvedSurah,
    ayah: resolvedAyah,
    segmentType: 'arabic',
    arabicReciter: resolvedId,
    translationEnabled: false,
    isSurahMode,
  });

  await playAudioUrl(playbackUrl);
}

/** Play a full Surah using expo-audio AudioPlayer singleton. */
export async function playSurah(
  identifier: string,
  url?: string,
  title?: string,
  reciterName?: string,
  surah?: number
): Promise<void> {
  const resolvedId = ALIAS_MAP[identifier] || identifier;
  const targetSurah = surah || 1;
  const bitrate = getSurahBitrate(resolvedId);
  const downloaded = isSurahDownloaded(resolvedId, targetSurah, bitrate);

  // Non-Arabic / verse-by-verse editions, or when translationAudioEnabled is ON:
  // Play Ayah 1 with isSurahMode=true so autoplayNext sequentially advances verse-by-verse (Arabic then Translation).
  // If the complete surah is downloaded offline, play the downloaded full surah audio directly!
  if (!downloaded && (translationAudioEnabled || isVerseByVerseEdition(resolvedId))) {
    const arabicReciter = getActiveArabicReciter(resolvedId);
    const resolvedReciter = reciterName || resolveReciterName(arabicReciter);
    await playAyah(arabicReciter, undefined, undefined, resolvedReciter, targetSurah, 1, true);
    return;
  }

  const rawPlaybackUrl = url || getSurahAudioUrl(resolvedId, targetSurah);
  const playbackUrl = resolveAudioUri(resolvedId, targetSurah, bitrate, rawPlaybackUrl);
  const resolvedReciter = reciterName || resolveReciterName(resolvedId);
  const resolvedTitle = title || `Surah ${targetSurah}`;

  currentPlayback = {
    identifier: resolvedId,
    reciterName: resolvedReciter,
    title: resolvedTitle,
    url: playbackUrl,
    isPlaying: true,
    type: 'surah',
    surah: targetSurah,
    segmentType: 'arabic',
    arabicReciter: resolvedId,
    arabicReciterName: resolvedReciter,
    isSurahMode: false,
  };

  if (!isInternalQueuePlay) {
    setAudioQueue(
      [
        {
          surah: targetSurah,
          title: resolvedTitle,
        },
      ],
      0
    );
  } else {
    const queue = getAudioQueue();
    const matchIdx = queue.findIndex(
      (item) => item.surah === targetSurah && (item.ayah === undefined || item.ayah === null)
    );
    if (matchIdx >= 0) {
      currentQueueIndex = matchIdx;
      notifyQueueListeners();
    }
  }

  try {
    saveRecentlyPlayed({
      type: 'surah',
      identifier: resolvedId,
      reciterName: resolvedReciter,
      surah: targetSurah,
      title: resolvedTitle,
    });
  } catch {}

  primeUpcomingAyahs({
    surah: targetSurah,
    arabicReciter: resolvedId,
    translationEnabled: false,
    isSurahMode: false,
  });

  try {
    await playAudioUrl(playbackUrl);
  } catch (err) {
    // If full-surah audio fails, fallback to verse-by-verse starting at ayah 1
    const fallbackAyahUrl = getAyahAudioUrl(resolvedId, targetSurah, 1);
    await playAyah(resolvedId, fallbackAyahUrl, resolvedTitle, resolvedReciter, targetSurah, 1, true);
  }
}

/**
 * Play a short non-Quran clip (e.g. a 99 Names recitation) through the global audio
 * singleton so the mini player picks it up. The clip stops cleanly when it ends and is
 * cleared from the session if the URL fails to load (offline).
 */
export async function playNameAudio(url: string, title: string, reciterName = 'Asma ul-Husna'): Promise<void> {
  await stopAudioPreloading();
  currentPlayback = {
    identifier: 'names99',
    reciterName,
    title,
    url,
    isPlaying: true,
    type: 'ayah',
  };

  notifyStatusListeners({
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
    isLoaded: false,
    isBuffering: true,
    didJustFinish: false,
  });

  try {
    await playAudioUrl(url);
  } catch (err) {
    if (currentPlayback?.url === url) {
      currentPlayback = null;
      notifyStatusListeners({
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        isLoaded: false,
        isBuffering: false,
        didJustFinish: false,
      });
    }
    throw err;
  }
}

/** Play a specific item from the audio queue by index. */
export async function playQueueItem(index: number): Promise<void> {
  const queue = getAudioQueue();
  if (index < 0 || index >= queue.length) return;
  currentQueueIndex = index;
  notifyQueueListeners();

  const item = queue[index];
  const settings = safeLoadSettings();
  const reciter = settings.reciter || currentPlayback?.identifier || 'ar.alafasy';
  const reciterName = resolveReciterName(reciter);

  isInternalQueuePlay = true;
  try {
    if (item.ayah !== undefined && item.ayah !== null) {
      await playAyah(reciter, undefined, item.title, reciterName, item.surah, item.ayah, false);
    } else {
      await playSurah(reciter, undefined, item.title, reciterName, item.surah);
    }
  } finally {
    isInternalQueuePlay = false;
  }
}

/** Advance to next track (in queue, or next ayah/surah in Quran). */
export async function playNext(): Promise<boolean> {
  const queue = getAudioQueue();
  const settings = safeLoadSettings();

  // If translation audio is enabled and current segment is Arabic:
  // Next jumps to the Translation segment of the same Ayah!
  if (
    translationAudioEnabled &&
    currentPlayback?.segmentType === 'arabic' &&
    currentPlayback.surah &&
    currentPlayback.ayah
  ) {
    const transAudio = getAudioTranslationEdition();
    if (transAudio) {
      const curSurah = currentPlayback.surah;
      const curAyah = currentPlayback.ayah;
      const isSurahMode = currentPlayback.isSurahMode ?? false;
      const arabicReciter = currentPlayback.arabicReciter || currentPlayback.identifier;
      const arabicReciterName = currentPlayback.arabicReciterName || currentPlayback.reciterName;
      await playTranslationSegment(curSurah, curAyah, transAudio, isSurahMode, arabicReciter, arabicReciterName);
      return true;
    }
  }

  // 1. Advance in queue if active
  if (queue.length > 0 && currentQueueIndex >= 0) {
    if (currentQueueIndex + 1 < queue.length) {
      await playQueueItem(currentQueueIndex + 1);
      return true;
    }
    // End of queue reached
    if (settings.repeatMode === 'all') {
      await playQueueItem(0);
      return true;
    }
    return false;
  }

  // 2. If queue exists but not started, start at item 0
  if (queue.length > 0 && currentQueueIndex === -1 && (settings.repeatMode === 'all' || settings.autoplayNext)) {
    await playQueueItem(0);
    return true;
  }

  // 3. Fallback: Sequential Quran advancement (strictly scoped to surah mode)
  if (!currentPlayback) return false;
  const arabicReciter = currentPlayback.arabicReciter || getActiveArabicReciter(currentPlayback.identifier);
  const reciterName = currentPlayback.arabicReciterName || resolveReciterName(arabicReciter);
  const isSurahMode = currentPlayback.isSurahMode ?? false;

  // Single-ayah play NEVER advances out of scope to other ayahs or surahs
  if (!isSurahMode) {
    return false;
  }

  if (currentPlayback.surah && currentPlayback.ayah) {
    const surah = currentPlayback.surah;
    const ayah = currentPlayback.ayah;
    const maxAyahs = SURAH_AYAH_COUNTS[surah - 1] || 7;

    if (ayah < maxAyahs) {
      const nextAyah = ayah + 1;
      isInternalQueuePlay = true;
      try {
        await playAyah(arabicReciter, undefined, undefined, reciterName, surah, nextAyah, true);
      } finally {
        isInternalQueuePlay = false;
      }
      return true;
    } else if (settings.repeatMode === 'all') {
      isInternalQueuePlay = true;
      try {
        await playAyah(arabicReciter, undefined, undefined, reciterName, surah, 1, true);
      } finally {
        isInternalQueuePlay = false;
      }
      return true;
    }
    return false;
  }

  return false;
}

/** Go to previous track (or rewind to 0 if >3s into track). */
export async function playPrevious(): Promise<boolean> {
  // If playing and more than 3 seconds in, restart track
  if (currentStatus.positionMillis > 3000) {
    await seekTo(0);
    return true;
  }

  // If translation audio is enabled and current segment is Translation:
  // Going Previous returns to the Arabic segment of the SAME Ayah!
  if (
    translationAudioEnabled &&
    currentPlayback?.segmentType === 'translation' &&
    currentPlayback.surah &&
    currentPlayback.ayah
  ) {
    const curSurah = currentPlayback.surah;
    const curAyah = currentPlayback.ayah;
    const isSurahMode = currentPlayback.isSurahMode ?? false;
    const arabicReciter = currentPlayback.arabicReciter || 'ar.alafasy';
    const arabicReciterName = currentPlayback.arabicReciterName || resolveReciterName(arabicReciter);
    isInternalQueuePlay = true;
    try {
      await playAyah(arabicReciter, undefined, undefined, arabicReciterName, curSurah, curAyah, isSurahMode);
    } finally {
      isInternalQueuePlay = false;
    }
    return true;
  }

  const queue = getAudioQueue();

  // In queue
  if (queue.length > 0 && currentQueueIndex > 0) {
    await playQueueItem(currentQueueIndex - 1);
    return true;
  }

  // Sequential previous in Quran (strictly scoped within current surah)
  if (currentPlayback && (currentPlayback.isSurahMode ?? false)) {
    const arabicReciter = currentPlayback.arabicReciter || getActiveArabicReciter(currentPlayback.identifier);
    const reciterName = currentPlayback.arabicReciterName || resolveReciterName(arabicReciter);

    if (currentPlayback.surah && currentPlayback.ayah && currentPlayback.ayah > 1) {
      const surah = currentPlayback.surah;
      const prevAyah = currentPlayback.ayah - 1;
      isInternalQueuePlay = true;
      try {
        await playAyah(arabicReciter, undefined, undefined, reciterName, surah, prevAyah, true);
      } finally {
        isInternalQueuePlay = false;
      }
      return true;
    }
  }

  await seekTo(0);
  return true;
}

export const nextItem = playNext;
export const previousItem = playPrevious;

export function canPlayNext(): boolean {
  if (translationAudioEnabled && currentPlayback?.segmentType === 'arabic') {
    if (getAudioTranslationEdition()) return true;
  }
  const queue = getAudioQueue();
  const settings = safeLoadSettings();
  if (queue.length > 0) {
    if (currentQueueIndex + 1 < queue.length) return true;
    if (settings.repeatMode === 'all') return true;
    return false;
  }
  if (!currentPlayback) return false;
  if (!currentPlayback.isSurahMode) return false;
  if (settings.repeatMode === 'all') return true;
  if (currentPlayback.surah && currentPlayback.ayah) {
    const maxAyahs = SURAH_AYAH_COUNTS[currentPlayback.surah - 1] || 7;
    return currentPlayback.ayah < maxAyahs;
  }
  return false;
}

export function canPlayPrevious(): boolean {
  if (currentStatus.positionMillis > 3000) return true;
  if (translationAudioEnabled && currentPlayback?.segmentType === 'translation') return true;
  if (getAudioQueue().length > 0 && currentQueueIndex > 0) return true;
  if (!currentPlayback) return false;
  if (currentPlayback.isSurahMode && currentPlayback.surah && currentPlayback.ayah) {
    return currentPlayback.ayah > 1;
  }
  return false;
}

/** Pause currently playing sound. */
export async function pause(): Promise<void> {
  pauseAudioPreloading();
  try {
    if (currentSound) {
      currentSound.pause();
      if (currentPlayback) currentPlayback.isPlaying = false;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: false,
      });
    }
  } catch {
    // ignore
  }
}

/** Resume playback or replay current URL. */
export async function resume(): Promise<void> {
  resumeAudioPreloading();
  try {
    if (currentSound) {
      currentSound.play();
      if (currentPlayback) currentPlayback.isPlaying = true;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: true,
      });
    } else if (currentPlayback?.url) {
      await playAudioUrl(currentPlayback.url);
    }
  } catch {
    // ignore
  }
}

/** Get currently playing audio URL or null if stopped. */
export function getCurrentPlaybackUrl(): string | null {
  return currentPlaybackUrl;
}

/** Stop playback and release the sound. */
export async function stop(clearSession = false): Promise<void> {
  await stopAudioPreloading();
  try {
    cleanupCurrentSound();
  } catch {
    currentSound = null;
    currentPlaybackUrl = null;
  } finally {
    if (currentPlayback) {
      currentPlayback.isPlaying = false;
      if (clearSession) {
        currentPlayback = null;
      }
    }
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
  }
}

/** Unload current sound if cached. */
export async function unload(): Promise<void> {
  await stopAudioPreloading();
  try {
    cleanupCurrentSound();
  } catch {
    currentSound = null;
    currentPlaybackUrl = null;
  } finally {
    if (currentPlayback) {
      currentPlayback.isPlaying = false;
    }
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
  }
}

/** Convenient helper to play a specific surah and ayah. */
export async function playSurahAyah(surah: number, ayah: number, reciter?: string): Promise<void> {
  const activeReciter = reciter || getActiveArabicReciter();
  const reciterName = resolveReciterName(activeReciter);
  await playAyah(activeReciter, undefined, undefined, reciterName, surah, ayah, true);
}

