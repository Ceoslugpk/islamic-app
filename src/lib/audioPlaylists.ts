export interface PlaylistItem {
  surah: number;
  ayah: number;
  label: string;
}

export interface PresetPlaylist {
  id: string;
  title: string;
  subtitle: string;
  items: PlaylistItem[];
}

export const PRESET_PLAYLISTS: PresetPlaylist[] = [
  {
    id: 'morning-protection',
    title: 'Morning Protection',
    subtitle: 'Ayat al-Kursi and the three Quls for daily protection',
    items: [
      { surah: 2, ayah: 255, label: 'Ayat al-Kursi' },
      { surah: 113, ayah: 1, label: 'Al-Falaq' },
      { surah: 114, ayah: 1, label: 'An-Nas' },
      { surah: 112, ayah: 1, label: 'Al-Ikhlas' },
    ],
  },
  {
    id: 'evening-calm',
    title: 'Evening Calm',
    subtitle: 'Soothing verses from Ar-Rahman, Al-Mulk, and Ad-Duha',
    items: [
      { surah: 55, ayah: 1, label: 'Ar-Rahman 55:1' },
      { surah: 55, ayah: 2, label: 'Ar-Rahman 55:2' },
      { surah: 55, ayah: 3, label: 'Ar-Rahman 55:3' },
      { surah: 55, ayah: 13, label: 'Ar-Rahman 55:13' },
      { surah: 67, ayah: 1, label: 'Al-Mulk' },
      { surah: 93, ayah: 1, label: 'Ad-Duha' },
    ],
  },
  {
    id: 'forgiveness',
    title: 'Forgiveness',
    subtitle: 'Verses of hope and Allah\'s mercy for those who repent',
    items: [
      { surah: 25, ayah: 70, label: 'Al-Furqan 25:70' },
      { surah: 39, ayah: 53, label: 'Az-Zumar 39:53' },
      { surah: 40, ayah: 3, label: 'Al-Ghafir 40:3' },
      { surah: 42, ayah: 25, label: 'Ash-Shura 42:25' },
    ],
  },
  {
    id: 'gratitude',
    title: 'Gratitude',
    subtitle: 'Reminders to be thankful for Allah\'s blessings',
    items: [
      { surah: 14, ayah: 7, label: 'Ibrahim 14:7' },
      { surah: 2, ayah: 152, label: 'Al-Baqarah 2:152' },
      { surah: 31, ayah: 12, label: 'Luqman 31:12' },
      { surah: 43, ayah: 13, label: 'Az-Zukhruf 43:13' },
    ],
  },
  {
    id: 'patience-strength',
    title: 'Patience & Strength',
    subtitle: 'Verses on perseverance through trials and reliance on Allah',
    items: [
      { surah: 2, ayah: 153, label: 'Al-Baqarah 2:153' },
      { surah: 2, ayah: 155, label: 'Al-Baqarah 2:155' },
      { surah: 2, ayah: 156, label: 'Al-Baqarah 2:156' },
      { surah: 29, ayah: 59, label: 'Al-Ankabut 29:59' },
      { surah: 65, ayah: 3, label: 'At-Talaq 65:3' },
    ],
  },
  {
    id: 'last-two-ayahs',
    title: 'Last Two Ayahs',
    subtitle: 'The final two verses of Surah Al-Baqarah, repeated for memorization',
    items: [
      { surah: 2, ayah: 285, label: 'Al-Baqarah 2:285' },
      { surah: 2, ayah: 286, label: 'Al-Baqarah 2:286' },
      { surah: 2, ayah: 285, label: 'Al-Baqarah 2:285 (repeat)' },
      { surah: 2, ayah: 286, label: 'Al-Baqarah 2:286 (repeat)' },
    ],
  },
];