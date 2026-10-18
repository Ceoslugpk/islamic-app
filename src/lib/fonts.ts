import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Lora_500Medium } from '@expo-google-fonts/lora';
import { Poppins_400Regular, Poppins_500Medium } from '@expo-google-fonts/poppins';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_500Medium, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import { SourceSans3_500Medium } from '@expo-google-fonts/source-sans-3';

/**
 * Load the editorial font pairing: Lora / Instrument Serif (display) + Poppins / Manrope (UI)
 * + Amiri / Noto Naskh Arabic (Arabic / Quran Naskh) + Noto Nastaliq Urdu (Urdu) + Source Sans 3 (brand wordmark).
 * Returns [loaded, error].
 */
export function useEditorialFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    InstrumentSerif_400Regular,
    Lora_500Medium,
    Poppins_400Regular,
    Poppins_500Medium,
    Amiri_400Regular,
    Amiri_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_500Medium,
    NotoNaskhArabic_700Bold,
    NotoNastaliqUrdu_400Regular,
    SourceSans3_500Medium,
  });
  return [loaded, error as Error | null];
}
