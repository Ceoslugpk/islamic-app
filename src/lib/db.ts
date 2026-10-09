/**
 * Database facade - WEB implementation (localStorage).
 * Metro resolves this file (db.web.ts pattern) for web, db.native.ts for native.
 * No expo-sqlite import here, so the web bundle never pulls the WASM.
 */
import { webKV } from './webStorage';

export interface PrayerCacheMeta {
  date?: string;
  location?: string;
  method?: number;
  madhab?: string;
}

export function savePrayerCache(
  cacheKeyOrDate: string,
  payloadOrLocation: any,
  metaOrMethod?: any,
  maybePayload?: any,
  maybeMadhab?: string
): boolean {
  try {
    let cacheKey: string;
    let payload: object;
    let date = '';
    let location = '';
    let method = 0;
    let madhab = 'shafi';

    if (typeof payloadOrLocation === 'object' && payloadOrLocation !== null && !Array.isArray(payloadOrLocation)) {
      cacheKey = cacheKeyOrDate;
      payload = payloadOrLocation;
      if (metaOrMethod && typeof metaOrMethod === 'object') {
        date = metaOrMethod.date || '';
        location = metaOrMethod.location || '';
        method = metaOrMethod.method ?? 0;
        madhab = metaOrMethod.madhab || 'shafi';
      }
    } else {
      date = cacheKeyOrDate;
      location = String(payloadOrLocation || '');
      method = Number(metaOrMethod || 0);
      payload = maybePayload || {};
      madhab = maybeMadhab || 'shafi';
      cacheKey = `prayer:${date}:${location}:${method}:${madhab}`;
    }

    const storageKey = cacheKey.startsWith('prayer:') ? cacheKey : `prayer:${cacheKey}`;
    webKV.set(
      storageKey,
      JSON.stringify({
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
        date,
        location,
        method,
        madhab,
        cached_at: Date.now(),
      })
    );
    return true;
  } catch (err) {
    console.warn('[db.web] savePrayerCache failed:', err);
    return false;
  }
}

export function loadPrayerCache(
  cacheKeyOrDate: string,
  location?: string,
  method?: number,
  madhab?: string
): { payload: string } | null {
  if (location === undefined && method === undefined) {
    const storageKey = cacheKeyOrDate.startsWith('prayer:') ? cacheKeyOrDate : `prayer:${cacheKeyOrDate}`;
    const raw = webKV.get(storageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return { payload: typeof parsed.payload === 'string' ? parsed.payload : JSON.stringify(parsed.payload) };
    } catch {
      return null;
    }
  }

  const rows = webKV.getAll('prayer:');
  let best: { payload: string; cached_at: number } | null = null;
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      const locMatch =
        parsed.location === location ||
        (parsed.location && parsed.location.includes(location));
      const methodMatch = Number(parsed.method) === Number(method);
      const dateMatch = parsed.date === cacheKeyOrDate;
      const madhabMatch = !madhab || parsed.madhab === madhab;

      if (dateMatch && locMatch && methodMatch && madhabMatch) {
        if (!best || parsed.cached_at > best.cached_at) {
          best = parsed;
        }
      }
    } catch {}
  }
  return best
    ? { payload: typeof best.payload === 'string' ? best.payload : JSON.stringify(best.payload) }
    : null;
}

export function loadLatestPrayerCache(
  location?: string,
  method?: number,
  madhab?: string
): { payload: string } | null {
  const rows = webKV.getAll('prayer:');
  let best: { payload: string; cached_at: number } | null = null;
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      const locMatch =
        !location ||
        parsed.location === location ||
        (parsed.location && parsed.location.includes(location));
      const methodMatch = method === undefined || Number(parsed.method) === Number(method);
      const madhabMatch = !madhab || parsed.madhab === madhab;
      if (locMatch && methodMatch && madhabMatch) {
        if (!best || parsed.cached_at > best.cached_at) {
          best = parsed;
        }
      }
    } catch {}
  }
  return best
    ? { payload: typeof best.payload === 'string' ? best.payload : JSON.stringify(best.payload) }
    : null;
}

export function markSalahCompleted(date: string, prayer: string, completed: boolean) {
  webKV.set(`salah:${date}:${prayer}`, JSON.stringify({ completed, completed_at: completed ? Date.now() : null }));
}

export function getSalahEntries(date: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const rows = webKV.getAll('salah:');
  for (const { key, value } of rows) {
    if (!key.startsWith(`salah:${date}:`)) continue;
    try {
      const parsed = JSON.parse(value);
      out[key.split(':')[2]] = parsed.completed === true;
    } catch { /* ignore */ }
  }
  return out;
}

export function getSalahHistory(days: number): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const rows = webKV.getAll('salah:');
  for (const { key, value } of rows) {
    const parts = key.split(':');
    if (parts.length < 3) continue;
    const [, date, prayer] = parts;
    if (date < from) continue;
    try {
      const parsed = JSON.parse(value);
      if (!out[date]) out[date] = {};
      out[date][prayer] = parsed.completed === true;
    } catch { /* ignore */ }
  }
  return out;
}

export const QURAN_CACHE_BUDGET_BYTES = 5 * 1024 * 1024; // 5 MB for web localStorage

export const PROTECTED_QURAN_CACHE_KEYS = new Set<string>([
  'bookmarks',
  'notes',
  'playlists',
  'audio-queue',
  'audio-settings',
  'last-read',
  'recent-audio',
  'quran-audio-downloads',
  'surah-list',
]);

export const DISPOSABLE_KEY_PREFIXES = [
  'surah:',
  'ayah:',
  'mosque:',
  'tafsir:',
  'tafsir-',
  'tajweed:',
  'hadith:',
];

export function isDisposableQuranCacheKey(
  key: string,
  protectedKeys?: Set<string> | string[]
): boolean {
  if (protectedKeys) {
    if (protectedKeys instanceof Set && protectedKeys.has(key)) return false;
    if (Array.isArray(protectedKeys) && protectedKeys.includes(key)) return false;
  }
  if (PROTECTED_QURAN_CACHE_KEYS.has(key)) return false;
  if (key.startsWith('prayer-') || key.startsWith('prayer:')) return false;
  if (key.startsWith('surah-last-ayah:')) return false;

  if (protectedKeys !== undefined) {
    return true;
  }

  return DISPOSABLE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function selectKeysToEvict(
  rows: { key: string; size?: number; payload?: string; cached_at?: number }[],
  budgetBytes: number,
  protectedKeys?: Set<string> | string[]
): string[] {
  const getRowSize = (r: { size?: number; payload?: string }): number => {
    if (typeof r.size === 'number') return r.size;
    if (typeof r.payload === 'string') return r.payload.length;
    return 0;
  };

  let totalBytes = rows.reduce((acc, r) => acc + getRowSize(r), 0);
  if (totalBytes <= budgetBytes) {
    return [];
  }

  const sorted = [...rows].sort((a, b) => (a.cached_at ?? 0) - (b.cached_at ?? 0));

  const evicted: string[] = [];
  for (const row of sorted) {
    if (totalBytes <= budgetBytes) {
      break;
    }
    if (!isDisposableQuranCacheKey(row.key, protectedKeys)) {
      continue;
    }
    evicted.push(row.key);
    totalBytes -= getRowSize(row);
  }

  return evicted;
}

export function enforceQuranCacheBudget(budgetBytes: number = QURAN_CACHE_BUDGET_BYTES): void {
  try {
    const rows = webKV.getAll('quran:');
    const items = rows.map((r) => ({
      key: r.key.replace(/^quran:/, ''),
      size: r.value.length,
      cached_at: 0,
    }));
    const toEvict = selectKeysToEvict(items, budgetBytes);
    for (const k of toEvict) {
      webKV.delete(`quran:${k}`);
    }
  } catch (err) {
    console.warn('[db.web] enforceQuranCacheBudget failed:', err);
  }
}

export function saveQuranCache(key: string, payload: object): boolean {
  try {
    webKV.set(`quran:${key}`, JSON.stringify(payload));
    enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES);
    return true;
  } catch (err) {
    console.warn('[db.web] saveQuranCache initial write failed, attempting eviction:', err);
    try {
      enforceQuranCacheBudget(QURAN_CACHE_BUDGET_BYTES);
      webKV.set(`quran:${key}`, JSON.stringify(payload));
      return true;
    } catch (retryErr) {
      console.warn('[db.web] saveQuranCache retry failed:', retryErr);
      return false;
    }
  }
}

export function loadQuranCache<T>(key: string): T | null {
  const raw = webKV.get(`quran:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function isQuranCacheKeyPresent(key: string): boolean {
  return webKV.get(`quran:${key}`) !== null;
}

export function getCachedQuranKeys(): Set<string> {
  const set = new Set<string>();
  const rows = webKV.getAll('quran:');
  for (const { key } of rows) {
    set.add(key.replace(/^quran:/, ''));
  }
  return set;
}

export function saveQuranAudioDownloads(payload: object) {
  saveQuranCache('quran-audio-downloads', payload);
}

export function loadQuranAudioDownloads<T = Record<string, any>>(): T | null {
  return loadQuranCache<T>('quran-audio-downloads');
}


/** Compute current streak (consecutive days with all 5 prayers completed). */
export function computeStreak(history: Record<string, Record<string, boolean>>): number {
  const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const dates = Object.keys(history).sort().reverse();
  let streak = 0;
  for (const date of dates) {
    const day = history[date];
    const complete = PRAYERS.every((p) => day[p]);
    if (complete) streak += 1;
    else break;
  }
  return streak;
}

export type HifzStatus = 'not-started' | 'revising' | 'memorized';

export interface LastReadPosition {
  surah: number;
  ayah: number;
  surahName?: string;
  updatedAt: number;
}

export interface RecentlyPlayedItem {
  id: string;
  type: 'surah' | 'ayah';
  identifier: string;
  reciterName: string;
  surah: number;
  ayah?: number;
  title: string;
  timestamp: number;
}

export interface PlaylistItem {
  surah: number;
  ayah?: number;
  title: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: number;
}

export interface AudioSettings {
  reciter: string;
  autoplayNext: boolean;
  repeatMode: 'none' | 'one' | 'all';
}

export function saveLastReadPosition(surah: number, ayah: number, surahName?: string): void {
  const data: LastReadPosition = { surah, ayah, surahName, updatedAt: Date.now() };
  webKV.set('quran:last-read', JSON.stringify(data));
}

export function loadLastReadPosition(): LastReadPosition | null {
  const raw = webKV.get('quran:last-read');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastReadPosition;
  } catch {
    return null;
  }
}

export function saveRecentlyPlayed(item: Omit<RecentlyPlayedItem, 'id' | 'timestamp'>): void {
  const list = loadRecentlyPlayed();
  const id = `${item.identifier}:${item.type}:${item.surah}:${item.ayah ?? 0}`;
  const newItem: RecentlyPlayedItem = { ...item, id, timestamp: Date.now() };
  const filtered = list.filter((i) => i.id !== id);
  const updated = [newItem, ...filtered].slice(0, 30);
  webKV.set('quran:recent-audio', JSON.stringify(updated));
}

export function loadRecentlyPlayed(): RecentlyPlayedItem[] {
  const raw = webKV.get('quran:recent-audio');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlaylist(playlist: Playlist): void {
  const list = loadPlaylists();
  const filtered = list.filter((p) => p.id !== playlist.id);
  const updated = [...filtered, playlist];
  webKV.set('quran:playlists', JSON.stringify(updated));
}

export function loadPlaylists(): Playlist[] {
  const raw = webKV.get('quran:playlists');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function deletePlaylist(id: string): void {
  const list = loadPlaylists();
  const updated = list.filter((p) => p.id !== id);
  webKV.set('quran:playlists', JSON.stringify(updated));
}

export function saveAudioQueue(queue: PlaylistItem[]): void {
  webKV.set('quran:audio-queue', JSON.stringify(queue));
}

export function loadAudioQueue(): PlaylistItem[] {
  const raw = webKV.get('quran:audio-queue');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  reciter: 'ar.alafasy',
  autoplayNext: true,
  repeatMode: 'none',
};

export function saveAudioSettings(settings: AudioSettings): void {
  webKV.set('quran:audio-settings', JSON.stringify(settings));
}

export function loadAudioSettings(): AudioSettings {
  const raw = webKV.get('quran:audio-settings');
  if (!raw) return DEFAULT_AUDIO_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const reciter =
        typeof parsed.reciter === 'string' && parsed.reciter.length > 0
          ? parsed.reciter
          : DEFAULT_AUDIO_SETTINGS.reciter;
      const autoplayNext =
        typeof parsed.autoplayNext === 'boolean'
          ? parsed.autoplayNext
          : DEFAULT_AUDIO_SETTINGS.autoplayNext;
      const repeatMode =
        parsed.repeatMode === 'none' || parsed.repeatMode === 'one' || parsed.repeatMode === 'all'
          ? parsed.repeatMode
          : DEFAULT_AUDIO_SETTINGS.repeatMode;
      return { reciter, autoplayNext, repeatMode };
    }
    return DEFAULT_AUDIO_SETTINGS;
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveTasbihCount(dhikrId: string, count: number): void {
  webKV.set(`tasbih:${dhikrId}`, JSON.stringify({ count, updated_at: Date.now() }));
}

export function loadTasbihCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  const rows = webKV.getAll('tasbih:');
  for (const { key, value } of rows) {
    const parts = key.split(':');
    if (parts.length < 2) continue;
    const dhikrId = parts[1];
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed.count === 'number') {
        out[dhikrId] = parsed.count;
      }
    } catch { /* ignore */ }
  }
  return out;
}

export function saveTasbihDayTotal(date: string, delta: number): void {
  const key = `tasbih:daily:${date}`;
  const raw = webKV.get(key);
  let current = 0;
  if (raw) {
    try {
      current = JSON.parse(raw).total || 0;
    } catch { /* ignore */ }
  }
  const next = Math.max(0, current + delta);
  webKV.set(key, JSON.stringify({ total: next, updated_at: Date.now() }));
}

export function loadTasbihDayTotal(date: string): number {
  const raw = webKV.get(`tasbih:daily:${date}`);
  if (!raw) return 0;
  try {
    return JSON.parse(raw).total || 0;
  } catch {
    return 0;
  }
}

export function savePlanDay(planId: string, day: number, completed: boolean): void {
  webKV.set(`plan:${planId}:${day}`, JSON.stringify({ completed, completed_at: completed ? Date.now() : null }));
}

export function loadPlanProgress(planId: string): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  const rows = webKV.getAll('plan:');
  for (const { key, value } of rows) {
    if (!key.startsWith(`plan:${planId}:`)) continue;
    const parts = key.split(':');
    const day = parseInt(parts[2], 10);
    if (isNaN(day)) continue;
    try {
      const parsed = JSON.parse(value);
      out[day] = parsed.completed === true;
    } catch { /* ignore */ }
  }
  return out;
}

export function saveHifzStatus(surah: number, status: HifzStatus): void {
  webKV.set(`hifz:${surah}`, JSON.stringify({ status, updated_at: Date.now() }));
}

export function loadHifzStatuses(): Record<number, HifzStatus> {
  const out: Record<number, HifzStatus> = {};
  const rows = webKV.getAll('hifz:');
  for (const { key, value } of rows) {
    const parts = key.split(':');
    if (parts.length < 2) continue;
    const surah = parseInt(parts[1], 10);
    if (isNaN(surah)) continue;
    try {
      const parsed = JSON.parse(value);
      if (parsed.status === 'memorized' || parsed.status === 'revising' || parsed.status === 'not-started') {
        out[surah] = parsed.status;
      }
    } catch { /* ignore */ }
  }
  return out;
}

export interface SavedHadithItem {
  id: string; // `${collection}:${bookNumber}:${hadithNumber}`
  collection: string;
  collectionName?: string;
  bookNumber: string;
  bookName?: string;
  hadithNumber: string;
  arabicText: string;
  englishText: string;
  grade?: string;
  savedAt: number;
}

export interface RecentHadithItem {
  id: string;
  collection: string;
  collectionName?: string;
  bookNumber: string;
  bookName?: string;
  hadithNumber: string;
  arabicText: string;
  englishText: string;
  grade?: string;
  readAt: number;
}

export function saveSavedHadith(item: SavedHadithItem): void {
  webKV.set(`hadith:saved:${item.id}`, JSON.stringify(item));
}

export function removeSavedHadith(id: string): void {
  webKV.delete(`hadith:saved:${id}`);
}

export function loadSavedHadiths(): SavedHadithItem[] {
  const rows = webKV.getAll('hadith:saved:');
  const items: SavedHadithItem[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.id) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export function isHadithSaved(id: string): boolean {
  return !!webKV.get(`hadith:saved:${id}`);
}

export function saveRecentHadith(item: Omit<RecentHadithItem, 'readAt'>): void {
  const id = item.id || `${item.collection}:${item.bookNumber}:${item.hadithNumber}`;
  const record: RecentHadithItem = { ...item, id, readAt: Date.now() };
  webKV.set(`hadith:recent:${id}`, JSON.stringify(record));
}

export function loadRecentHadiths(): RecentHadithItem[] {
  const rows = webKV.getAll('hadith:recent:');
  const items: RecentHadithItem[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.id) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => (b.readAt || 0) - (a.readAt || 0)).slice(0, 50);
}

export function recordHadithRead(collection: string, bookNumber: string, hadithNumber: string): void {
  const id = `${collection}:${bookNumber}:${hadithNumber}`;
  webKV.set(`hadith:read:${id}`, JSON.stringify({ collection, bookNumber, hadithNumber, readAt: Date.now() }));
}

export function loadHadithReadCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  const rows = webKV.getAll('hadith:read:');
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      const col = parsed.collection;
      if (col) {
        out[col] = (out[col] || 0) + 1;
      }
    } catch { /* ignore */ }
  }
  return out;
}

export function loadHadithReadMarkers(): string[] {
  const rows = webKV.getAll('hadith:read:');
  const out: string[] = [];
  for (const { key } of rows) {
    const parts = key.split(':');
    if (parts.length >= 3) {
      out.push(parts.slice(2).join(':'));
    }
  }
  return out;
}

export function saveHadithProgress(collection: string, bookNumber: string, hadithNumber: string): void {
  recordHadithRead(collection, bookNumber, hadithNumber);
}

export function loadHadithProgress(): Record<string, number> {
  return loadHadithReadCounts();
}

/* ─── Fasting Storage ────────────────────────────────────────── */

export interface FastingEntry {
  date: string; // YYYY-MM-DD
  fasting: boolean;
  type: 'ramadan' | 'voluntary' | 'qada';
  notes?: string;
  completedAt?: number;
}

export interface MissedFastItem {
  id: string;
  date: string;
  reason: string;
  madeUp: boolean;
  madeUpDate?: string;
  createdAt: number;
}

export function saveFastingEntry(entry: FastingEntry): void {
  webKV.set(`fasting:entry:${entry.date}`, JSON.stringify(entry));
}

export function getFastingEntry(date: string): FastingEntry | null {
  const raw = webKV.get(`fasting:entry:${date}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FastingEntry;
  } catch {
    return null;
  }
}

export function loadFastingHistory(): FastingEntry[] {
  const rows = webKV.getAll('fasting:entry:');
  const items: FastingEntry[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.date) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export function saveMissedFast(item: MissedFastItem): void {
  webKV.set(`fasting:missed:${item.id}`, JSON.stringify(item));
}

export function deleteMissedFast(id: string): void {
  webKV.delete(`fasting:missed:${id}`);
}

export function loadMissedFasts(): MissedFastItem[] {
  const rows = webKV.getAll('fasting:missed:');
  const items: MissedFastItem[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.id) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function toggleMissedFastMadeUp(id: string, madeUp: boolean): void {
  const raw = webKV.get(`fasting:missed:${id}`);
  if (!raw) return;
  try {
    const item = JSON.parse(raw) as MissedFastItem;
    item.madeUp = madeUp;
    item.madeUpDate = madeUp ? new Date().toISOString().slice(0, 10) : undefined;
    webKV.set(`fasting:missed:${id}`, JSON.stringify(item));
  } catch { /* ignore */ }
}

/* ─── Zakat Storage ──────────────────────────────────────────── */

export interface ZakatCalculation {
  id: string;
  date: string;
  currency: string;
  totalWealth: number;
  zakatDue: number;
  nisabStandard: 'gold' | 'silver';
  breakdown: {
    cash: number;
    gold: number;
    silver: number;
    investments: number;
    other: number;
    liabilities: number;
  };
  createdAt: number;
}

export function saveZakatCalculation(calc: ZakatCalculation): void {
  webKV.set(`zakat:history:${calc.id}`, JSON.stringify(calc));
}

export function loadZakatCalculations(): ZakatCalculation[] {
  const rows = webKV.getAll('zakat:history:');
  const items: ZakatCalculation[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.id) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function deleteZakatCalculation(id: string): void {
  webKV.delete(`zakat:history:${id}`);
}

/* ─── Women's Worship Storage ───────────────────────────────── */

export type PurityStatus = 'menstruating' | 'spotting' | 'pure';

export interface PeriodEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  notes?: string;
  purityDays?: Record<string, PurityStatus>;
  createdAt: number;
}

export interface NifasEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  notes?: string;
  createdAt: number;
}

export function savePeriodEntry(entry: PeriodEntry): void {
  webKV.set(`women:period:${entry.id}`, JSON.stringify(entry));
}

export function deletePeriodEntry(id: string): void {
  webKV.delete(`women:period:${id}`);
}

export function loadPeriodEntries(): PeriodEntry[] {
  const rows = webKV.getAll('women:period:');
  const items: PeriodEntry[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.id) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function saveNifasEntry(entry: NifasEntry): void {
  webKV.set(`women:nifas:${entry.id}`, JSON.stringify(entry));
}

export function deleteNifasEntry(id: string): void {
  webKV.delete(`women:nifas:${id}`);
}

export function loadNifasEntries(): NifasEntry[] {
  const rows = webKV.getAll('women:nifas:');
  const items: NifasEntry[] = [];
  for (const { value } of rows) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.id) items.push(parsed);
    } catch { /* ignore */ }
  }
  return items.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/* ─── Women's Data Privacy (clear/delete) ────────────────────── */

/** Delete ALL women-scoped data: cycle/period, purity, nifas, and qada
 *  missed-fasts recorded as "Menstruation / Post-natal". On-device only. */
export function clearWomenData(): void {
  for (const { key } of webKV.getAll('women:period:')) webKV.delete(key);
  for (const { key } of webKV.getAll('women:nifas:')) webKV.delete(key);
  const missed = loadMissedFasts();
  for (const item of missed) {
    const reason = (item.reason || '').toLowerCase();
    if (reason.includes('menstru') || reason.includes('post-natal') || reason.includes('postnatal')) {
      deleteMissedFast(item.id);
    }
  }
}

/** Delete ONLY cycle/period history (keeps purity/ghusl/nifas/qada). */
export function clearCycleHistory(): void {
  for (const { key } of webKV.getAll('women:period:')) webKV.delete(key);
}

/* ─── Study Tools (tags & highlights) ──────────────────────────── */

export interface StudyTag {
  id: string;
  surah: number;
  ayah: number;
  tag: string;
  createdAt: number;
}

export interface VerseHighlight {
  id: string;
  surah: number;
  ayah: number;
  color: string;
  createdAt: number;
}

export function addStudyTag(surah: number, ayah: number, tag: string): StudyTag | false {
  try {
    const id = `${surah}:${ayah}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    webKV.set(`study:tag:${id}`, JSON.stringify({ id, surah, ayah, tag, createdAt }));
    return { id, surah, ayah, tag, createdAt };
  } catch {
    return false;
  }
}

export function removeStudyTag(id: string): boolean {
  try {
    webKV.delete(`study:tag:${id}`);
    return true;
  } catch {
    return false;
  }
}

export function getStudyTagsForAyah(surah: number, ayah: number): StudyTag[] {
  try {
    const rows = webKV.getAll('study:tag:');
    const items: StudyTag[] = [];
    for (const { value } of rows) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.surah === surah && parsed.ayah === ayah) {
          items.push(parsed);
        }
      } catch { /* ignore */ }
    }
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export function getAllStudyTags(): StudyTag[] {
  try {
    const rows = webKV.getAll('study:tag:');
    const items: StudyTag[] = [];
    for (const { value } of rows) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.id) items.push(parsed);
      } catch { /* ignore */ }
    }
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export function addVerseHighlight(surah: number, ayah: number, color: string): VerseHighlight | false {
  try {
    const id = `${surah}:${ayah}:${Date.now()}`;
    const createdAt = Date.now();
    // Remove existing highlight for this ayah first
    const rows = webKV.getAll('study:highlight:');
    for (const { key, value } of rows) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.surah === surah && parsed.ayah === ayah) {
          webKV.delete(key);
        }
      } catch { /* ignore */ }
    }
    webKV.set(`study:highlight:${id}`, JSON.stringify({ id, surah, ayah, color, createdAt }));
    return { id, surah, ayah, color, createdAt };
  } catch {
    return false;
  }
}

export function removeVerseHighlight(surah: number, ayah: number): boolean {
  try {
    const rows = webKV.getAll('study:highlight:');
    for (const { key, value } of rows) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.surah === surah && parsed.ayah === ayah) {
          webKV.delete(key);
        }
      } catch { /* ignore */ }
    }
    return true;
  } catch {
    return false;
  }
}

export function getVerseHighlight(surah: number, ayah: number): VerseHighlight | null {
  try {
    const rows = webKV.getAll('study:highlight:');
    for (const { value } of rows) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.surah === surah && parsed.ayah === ayah) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return null;
  } catch {
    return null;
  }
}

export function getAllVerseHighlights(): VerseHighlight[] {
  try {
    const rows = webKV.getAll('study:highlight:');
    const items: VerseHighlight[] = [];
    for (const { value } of rows) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && parsed.id) items.push(parsed);
      } catch { /* ignore */ }
    }
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

export interface MosqueCacheItem {
  mosques: import('../screens/MosqueFinderScreen').MosqueItem[];
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  cachedAt: number;
}

export function saveMosqueCache(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  mosques: import('../screens/MosqueFinderScreen').MosqueItem[]
): void {
  const key = `mosque:${centerLat.toFixed(2)}:${centerLon.toFixed(2)}:${radiusKm}`;
  webKV.set(key, JSON.stringify({ mosques, centerLat, centerLon, radiusKm, cachedAt: Date.now() }));
}

export function loadMosqueCache(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  maxAgeMs = 24 * 60 * 60 * 1000
): import('../screens/MosqueFinderScreen').MosqueItem[] | null {
  const key = `mosque:${centerLat.toFixed(2)}:${centerLon.toFixed(2)}:${radiusKm}`;
  const raw = webKV.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MosqueCacheItem;
    if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
    return parsed.mosques;
  } catch {
    return null;
  }
}



