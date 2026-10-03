import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';

/**
 * Load the editorial font pairing: Instrument Serif (display) + Manrope (UI)
 * + Amiri / Noto Naskh Arabic (Arabic / Quran Naskh).
 * Returns [loaded, error].
 */
export function useEditorialFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    InstrumentSerif_400Regular,
    Amiri_400Regular,
    Amiri_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_700Bold,
  });
  return [loaded, error as Error | null];
}
