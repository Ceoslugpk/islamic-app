import { DeepLinkTarget } from './deeplinks';
import { getReadingPosition } from './continuing';

export type NavigationSetters = {
  setTab: (tab: 'home' | 'quran' | 'library' | 'tools') => void;
  setQuran: (view: { screen: 'home' } | { screen: 'reader'; surah: number; initialAyah?: number } | { screen: 'audio' } | { screen: 'tafsir'; surah?: number } | { screen: 'topics' } | { screen: 'compare'; surah?: number; ayah?: number } | { screen: 'bookmarks' } | { screen: 'notes' } | { screen: 'plans' } | { screen: 'hifz' }) => void;
  setLibrary: (view: { screen: 'hub' } | { screen: 'tasbih' } | { screen: 'names' } | { screen: 'duas' } | { screen: 'hadith' }) => void;
  setTools: (view: { screen: 'hub' } | { screen: 'qibla' } | { screen: 'tracker' } | { screen: 'location' } | { screen: 'cities' } | { screen: 'notifications' } | { screen: 'prayer-reminders' } | { screen: 'fasting' } | { screen: 'zakat' } | { screen: 'calendar' } | { screen: 'mosque' } | { screen: 'women-cycle' } | { screen: 'women-purity' } | { screen: 'women-guidance' } | { screen: 'women-qada' }) => void;
  setSettingsOpen: (open: boolean) => void;
};

export async function handleDeepLink(
  target: DeepLinkTarget,
  setters: NavigationSetters
): Promise<void> {
  const { setTab, setQuran, setLibrary, setTools, setSettingsOpen } = setters;

  switch (target.type) {
    case 'home':
    case 'prayer': {
      setTab('home');
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'quran-continue': {
      setTab('quran');
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      try {
        const pos = await getReadingPosition();
        if (pos && typeof pos.surah === 'number' && pos.surah >= 1 && pos.surah <= 114) {
          setQuran({ screen: 'reader', surah: pos.surah, initialAyah: pos.ayah });
        } else {
          setQuran({ screen: 'reader', surah: 1, initialAyah: 1 });
        }
      } catch {
        setQuran({ screen: 'home' });
      }
      break;
    }

    case 'quran': {
      setTab('quran');
      setQuran({ screen: 'reader', surah: target.surah, initialAyah: target.ayah });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'hadith': {
      setTab('library');
      setLibrary({ screen: 'hadith' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'live': {
      setTab('tools');
      setTools({ screen: 'hub' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'qibla': {
      setTab('tools');
      setTools({ screen: 'qibla' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'tracker': {
      setTab('tools');
      setTools({ screen: 'tracker' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'library': {
      setTab('library');
      setLibrary({ screen: 'hub' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'tools': {
      setTab('tools');
      setTools({ screen: 'hub' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'settings': {
      setSettingsOpen(true);
      break;
    }

    case 'mosque': {
      setTab('tools');
      setTools({ screen: 'mosque' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'fasting': {
      setTab('tools');
      setTools({ screen: 'fasting' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'zakat': {
      setTab('tools');
      setTools({ screen: 'zakat' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'names': {
      setTab('library');
      setLibrary({ screen: 'names' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'tasbih': {
      setTab('library');
      setLibrary({ screen: 'tasbih' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'duas':
    case 'adhkar': {
      setTab('library');
      setLibrary({ screen: 'duas' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'calendar': {
      setTab('tools');
      setTools({ screen: 'calendar' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }
  }
}