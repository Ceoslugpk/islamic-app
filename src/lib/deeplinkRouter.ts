import { DeepLinkTarget } from './deeplinks';
import { getReadingPosition } from './continuing';

export type NavigationSetters = {
  setTab: (tab: 'home' | 'quran' | 'library' | 'tools') => void;
  setQuran: (view:
    | { screen: 'home' }
    | { screen: 'reader'; surah: number; initialAyah?: number }
    | { screen: 'audio' }
    | { screen: 'tafsir'; surah?: number }
    | { screen: 'topics' }
    | { screen: 'compare'; surah?: number; ayah?: number }
    | { screen: 'bookmarks' }
    | { screen: 'notes' }
    | { screen: 'plans' }
    | { screen: 'hifz' }
  ) => void;
  setLibrary: (view:
    | { screen: 'hub' }
    | { screen: 'tasbih' }
    | { screen: 'names' }
    | { screen: 'names-prophet' }
    | { screen: 'duas' }
    | { screen: 'hadith' }
    | { screen: 'ramadan-guide' }
    | { screen: 'prayer-guide' }
    | { screen: 'shahada' }
    | { screen: 'downloads' }
    | { screen: 'vocab' }
    | { screen: 'summary' }
    | { screen: 'tajweed' }
  ) => void;
  setTools: (view:
    | { screen: 'hub' }
    | { screen: 'qibla' }
    | { screen: 'tracker' }
    | { screen: 'location' }
    | { screen: 'cities' }
    | { screen: 'notifications' }
    | { screen: 'prayer-reminders' }
    | { screen: 'fasting' }
    | { screen: 'zakat' }
    | { screen: 'calendar' }
    | { screen: 'mosque' }
    | { screen: 'women-cycle' }
    | { screen: 'women-purity' }
    | { screen: 'women-guidance' }
    | { screen: 'women-qada' }
    | { screen: 'umrah-guide' }
    | { screen: 'umrah-resources' }
    | { screen: 'hajj-journey' }
    | { screen: 'makkah-live' }
    | { screen: 'madinah-live' }
    | { screen: 'hajj-live' }
  ) => void;
  setSettingsOpen: (open: boolean) => void;
  setPendingWomenScreen?: (
    view: { screen: 'women-cycle' | 'women-purity' | 'women-guidance' | 'women-qada' } | null
  ) => void;
  openWomenPinModal?: () => void;
  isWomenLocked?: () => boolean;
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

    case 'quran-audio': {
      setTab('quran');
      setQuran({ screen: 'audio' });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'tafsir': {
      setTab('quran');
      setQuran({ screen: 'tafsir', surah: target.surah });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'topics': {
      setTab('quran');
      setQuran({ screen: 'topics' });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'compare': {
      setTab('quran');
      setQuran({ screen: 'compare', surah: target.surah, ayah: target.ayah });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'bookmarks': {
      setTab('quran');
      setQuran({ screen: 'bookmarks' });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'notes': {
      setTab('quran');
      setQuran({ screen: 'notes' });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'plans': {
      setTab('quran');
      setQuran({ screen: 'plans' });
      setLibrary({ screen: 'hub' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'hifz': {
      setTab('quran');
      setQuran({ screen: 'hifz' });
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

    case 'tajweed': {
      setTab('library');
      setLibrary({ screen: 'tajweed' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'ramadan-guide': {
      setTab('library');
      setLibrary({ screen: 'ramadan-guide' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'prayer-guide': {
      setTab('library');
      setLibrary({ screen: 'prayer-guide' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'shahada': {
      setTab('library');
      setLibrary({ screen: 'shahada' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'downloads': {
      setTab('library');
      setLibrary({ screen: 'downloads' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'vocab': {
      setTab('library');
      setLibrary({ screen: 'vocab' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'summary': {
      setTab('library');
      setLibrary({ screen: 'summary' });
      setQuran({ screen: 'home' });
      setTools({ screen: 'hub' });
      break;
    }

    case 'live': {
      setTab('tools');
      if (target.channel === 'madinah') setTools({ screen: 'madinah-live' });
      else if (target.channel === 'hajj') setTools({ screen: 'hajj-live' });
      else setTools({ screen: 'makkah-live' });
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
      if (target.variant === 'prophet') {
        setLibrary({ screen: 'names-prophet' });
      } else {
        setLibrary({ screen: 'names' });
      }
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

    case 'cities': {
      setTab('tools');
      setTools({ screen: 'cities' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'location': {
      setTab('tools');
      setTools({ screen: 'location' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'prayer-reminders': {
      setTab('tools');
      setTools({ screen: 'prayer-reminders' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'umrah-guide': {
      setTab('tools');
      setTools({ screen: 'umrah-guide' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'umrah-resources': {
      setTab('tools');
      setTools({ screen: 'umrah-resources' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'hajj-journey': {
      setTab('tools');
      setTools({ screen: 'hajj-journey' });
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      break;
    }

    case 'women-cycle':
    case 'women-purity':
    case 'women-guidance':
    case 'women-qada': {
      setTab('tools');
      setQuran({ screen: 'home' });
      setLibrary({ screen: 'hub' });
      const targetScreen = target.type;
      if (setters.isWomenLocked && setters.isWomenLocked()) {
        if (setters.setPendingWomenScreen) {
          setters.setPendingWomenScreen({ screen: targetScreen });
        }
        if (setters.openWomenPinModal) {
          setters.openWomenPinModal();
        }
      } else {
        setTools({ screen: targetScreen });
      }
      break;
    }
  }
}