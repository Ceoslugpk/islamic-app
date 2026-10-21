import assert from 'node:assert/strict';
import path from 'node:path';
import { loadCommonJsModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
let bookmarks = [];
let notes = [{ id: '1:1:note', surah: 1, ayah: 1, body: 'old', createdAt: 1 }];

const study = loadCommonJsModule({
  root: ROOT,
  relativePath: 'src/lib/study.ts',
  modules: {
    './db': {
      saveQuranCache: () => false,
      loadQuranCache: (key) => key === 'bookmarks' ? bookmarks : notes,
      addStudyTag: () => false,
      removeStudyTag: () => false,
      getStudyTagsForAyah: () => [],
      getAllStudyTags: () => [],
      addVerseHighlight: () => false,
      removeVerseHighlight: () => false,
      getVerseHighlight: () => null,
      getAllVerseHighlights: () => [],
    },
  },
});

const ref = { surah: 2, ayah: 3, text: 'text' };
assert.equal(study.addBookmark(ref), false, 'addBookmark must surface a failed cache write');
assert.equal(study.addNote(2, 3, 'new note'), false, 'addNote must surface a failed cache write');
assert.equal(study.removeBookmark(1, 1), false, 'removeBookmark must surface a failed cache write');
assert.equal(study.deleteNote('1:1:note'), false, 'deleteNote must surface a failed cache write');
console.log('F4 PASS: study mutations report saveQuranCache failure to callers');
