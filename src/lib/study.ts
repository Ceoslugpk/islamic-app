/**
 * Study data layer — bookmarks, notes, tags & highlights persistence via db.ts.
 * Keys: 'bookmarks', 'notes', 'study_tags', 'verse_highlights' stored as JSON arrays.
 */

import { saveQuranCache, loadQuranCache } from './db';
import {
  addStudyTag,
  removeStudyTag,
  getStudyTagsForAyah,
  getAllStudyTags,
  addVerseHighlight,
  removeVerseHighlight,
  getVerseHighlight,
  getAllVerseHighlights,
  StudyTag,
  VerseHighlight,
} from './db';

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

// Re-export study tools types
export type { StudyTag, VerseHighlight };

function dedupeBookmarks(existing: VerseRef[], newRef: VerseRef): VerseRef[] {
  if (!newRef) return Array.isArray(existing) ? existing : [];
  const list = Array.isArray(existing) ? existing : [];
  const key = `${newRef.surah}:${newRef.ayah}`;
  const already = list.find((b) => b && `${b.surah}:${b.ayah}` === key);
  if (already) return list;
  return [...list, newRef];
}

export function getBookmarks(): VerseRef[] {
  try {
    const raw = loadQuranCache<VerseRef[]>(BOOKMARKS_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function isBookmarked(surah: number, ayah: number): boolean {
  try {
    const bookmarks = getBookmarks();
    return bookmarks.some((b) => b && b.surah === surah && b.ayah === ayah);
  } catch {
    return false;
  }
}

export function addBookmark(ref: VerseRef): boolean {
  if (!ref) return false;
  try {
    const bookmarks = getBookmarks();
    const updated = dedupeBookmarks(bookmarks, ref);
    saveQuranCache(BOOKMARKS_KEY, updated);
    return true;
  } catch {
    return false;
  }
}

export function removeBookmark(surah: number, ayah: number): boolean {
  try {
    const bookmarks = getBookmarks();
    const updated = bookmarks.filter((b) => !(b && b.surah === surah && b.ayah === ayah));
    if (updated.length === bookmarks.length) return false;
    saveQuranCache(BOOKMARKS_KEY, updated);
    return true;
  } catch {
    return false;
  }
}

export function getNotes(): Note[] {
  try {
    const raw = loadQuranCache<Note[]>(NOTES_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function addNote(surah: number, ayah: number, body: string): Note | false {
  try {
    const notes = getNotes();
    const id = `${surah}:${ayah}:${Date.now()}`;
    const newNote: Note = { id, surah, ayah, body, createdAt: Date.now() };
    const updated = [...notes, newNote];
    saveQuranCache(NOTES_KEY, updated);
    return newNote;
  } catch {
    return false;
  }
}

export function deleteNote(id: string): boolean {
  try {
    const notes = getNotes();
    const before = notes.length;
    const updated = notes.filter((n) => n && n.id !== id);
    if (updated.length >= before) return false;
    saveQuranCache(NOTES_KEY, updated);
    return true;
  } catch {
    return false;
  }
}

// Study Tags
export function addStudyTagFn(surah: number, ayah: number, tag: string): StudyTag | false {
  try {
    return addStudyTag(surah, ayah, tag);
  } catch {
    return false;
  }
}

export function removeStudyTagFn(id: string): boolean {
  try {
    return removeStudyTag(id);
  } catch {
    return false;
  }
}

export function getStudyTagsForAyahFn(surah: number, ayah: number): StudyTag[] {
  try {
    const tags = getStudyTagsForAyah(surah, ayah);
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}

export function getAllStudyTagsFn(): StudyTag[] {
  try {
    const tags = getAllStudyTags();
    return Array.isArray(tags) ? tags : [];
  } catch {
    return [];
  }
}

// Verse Highlights
export function addVerseHighlightFn(surah: number, ayah: number, color: string): VerseHighlight | false {
  try {
    return addVerseHighlight(surah, ayah, color);
  } catch {
    return false;
  }
}

export function removeVerseHighlightFn(surah: number, ayah: number): boolean {
  try {
    return removeVerseHighlight(surah, ayah);
  } catch {
    return false;
  }
}

export function getVerseHighlightFn(surah: number, ayah: number): VerseHighlight | null {
  try {
    return getVerseHighlight(surah, ayah);
  } catch {
    return null;
  }
}

export function getAllVerseHighlightsFn(): VerseHighlight[] {
  try {
    const highlights = getAllVerseHighlights();
    return Array.isArray(highlights) ? highlights : [];
  } catch {
    return [];
  }
}