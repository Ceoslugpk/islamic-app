/**
 * Study data layer — bookmarks & notes persistence via db.ts.
 * Keys: 'bookmarks' and 'notes' stored as JSON arrays.
 */

import { saveQuranCache, loadQuranCache } from './db';

const BOOKMARKS_KEY = 'bookmarks';
const NOTES_KEY = 'notes';

export interface VerseRef {
  surah: number;
  ayah: number;
  surahName?: string;
  text: string;
  translation?: string;
}

export interface Note {
  id: string;
  surah: number;
  ayah: number;
  body: string;
  createdAt: number;
}

function dedupeBookmarks(existing: VerseRef[], newRef: VerseRef): VerseRef[] {
  const key = `${newRef.surah}:${newRef.ayah}`;
  const already = existing.find((b) => `${b.surah}:${b.ayah}` === key);
  if (already) return existing;
  return [...existing, newRef];
}

export function getBookmarks(): VerseRef[] {
  const raw = loadQuranCache<VerseRef[]>(BOOKMARKS_KEY);
  return raw ?? [];
}

export function isBookmarked(surah: number, ayah: number): boolean {
  const bookmarks = getBookmarks();
  return bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
}

export function addBookmark(ref: VerseRef): boolean {
  const bookmarks = getBookmarks();
  const updated = dedupeBookmarks(bookmarks, ref);
  try {
    saveQuranCache(BOOKMARKS_KEY, updated);
    return true;
  } catch {
    return false;
  }
}

export function removeBookmark(surah: number, ayah: number): boolean {
  const bookmarks = getBookmarks();
  const updated = bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah));
  if (updated.length === bookmarks.length) return false;
  try {
    saveQuranCache(BOOKMARKS_KEY, updated);
    return true;
  } catch {
    return false;
  }
}

export function getNotes(): Note[] {
  const raw = loadQuranCache<Note[]>(NOTES_KEY);
  return raw ?? [];
}

export function addNote(surah: number, ayah: number, body: string): Note | false {
  const notes = getNotes();
  const id = `${surah}:${ayah}:${Date.now()}`;
  const newNote: Note = { id, surah, ayah, body, createdAt: Date.now() };
  const updated = [...notes, newNote];
  try {
    saveQuranCache(NOTES_KEY, updated);
    return newNote;
  } catch {
    return false;
  }
}

export function deleteNote(id: string): boolean {
  const notes = getNotes();
  const before = notes.length;
  const updated = notes.filter((n) => n.id !== id);
  if (updated.length >= before) return false;
  try {
    saveQuranCache(NOTES_KEY, updated);
    return true;
  } catch {
    return false;
  }
}