# Malayalam (`ml`) & Sinhala (`si`) First-Class Language Architecture

## 1. Overview & Registration

Malayalam (`ml`) and Sinhala (`si`) are registered as first-class application languages matching the established production architecture alongside English (`en`), Arabic (`ar`), Urdu (`ur`), and Hindi (`hi`).

### Shared Language Registration:
- **`src/lib/i18n.ts`**:
  - `AppLanguage = 'en' | 'ur' | 'ar' | 'hi' | 'ml' | 'si'`
  - Imported and bundled in i18next `resources` (`ml: { translation: ml }`, `si: { translation: si }`).
  - `isAppLanguage(val)` recognizes `'ml'` and `'si'`.
  - `resolveDeviceAppLanguage()` maps device locale tags (e.g. `ml-IN`, `si-LK`) to `'ml'` and `'si'`.
  - `isRtlLanguage(lang)`: Strictly returns `lang === 'ur' || lang === 'ar'`. Both Malayalam and Sinhala return `false` (strictly LTR).
- **`src/lib/settings.tsx`**:
  - `sanitizeSettings()` accepts `'ml'` and `'si'`.
  - `CANONICAL_AUTO_LINKED_QURAN_LANGS` includes `'ml'` and `'si'`.
  - `setLanguage()` implements symmetric auto-linking for `'ml'` and `'si'`.
- **`src/screens/SettingsScreen.tsx`**:
  - Segmented control options:
    - `{ value: 'ml', label: 'മലയാളം' }`
    - `{ value: 'si', label: 'සිංහල' }`
  - Honest native direction summary row descriptions:
    - Malayalam: `'മലയാളം (Malayalam) · ഇടത്തുനിന്ന് വലത്തോട്ട് (LTR)'`
    - Sinhala: `'සිංහල (Sinhala) · වමේ සිට දකුණට (LTR)'`

---

## 2. LTR Layout Behavior

Both Malayalam and Sinhala are Left-to-Right (LTR) languages.
- **Direction Handling**:
  - `isRtlLanguage('ml') === false`
  - `isRtlLanguage('si') === false`
  - `prepareNativeLayoutDirection('ml')` calls `I18nManager.allowRTL(true); I18nManager.forceRTL(false);`
  - `prepareNativeLayoutDirection('si')` calls `I18nManager.allowRTL(true); I18nManager.forceRTL(false);`
  - Web platform: `document.documentElement.dir = 'ltr'`
- **Pairwise Transitions**:
  - Switching from RTL (`ur`, `ar`) to `ml` or `si` prepares native LTR layout (`forceRTL(false)`), updates storage atomically, and reloads exactly once.
  - Switching from `ml` or `si` to RTL (`ur`, `ar`) prepares native RTL layout (`forceRTL(true)`), updates storage atomically, and reloads exactly once.
  - Switching between `ml` and `si` or between `en`, `hi`, `ml`, `si` remains LTR (`forceRTL(false)`).

---

## 3. Quran Content, Tafsir & Audio Policy

### A. Quran Text Translation Edition
- **Malayalam**: Auto-links to `'ml'` (`ml.abdulhameed` — Cheriyamundam Abdul Hameed and Kunhi Mohammed Parappoor).
- **Sinhala**: Auto-links to `'si'` (`si.naseemismail` — A. H. M. Naseem Ismail).

### B. Tafsir Auto-Linking
- Neither AlQuran Cloud nor EveryAyah provides a verified dedicated Malayalam or Sinhala tafsir commentary.
- **Policy**: Auto-linking safely and honestly falls back to `jalalayn` (Tafsir al-Jalalayn).
- If the user previously had an auto-linked Arabic (`api-ibn-kathir-ar`) or Urdu (`api-ibn-kathir-urdu`) tafsir, switching to `ml` or `si` resets to `jalalayn`.
- Explicit user custom tafsir selections outside canonical auto-linked IDs are preserved.

### C. Translation Audio Policy
- Neither EveryAyah nor AlQuran Cloud provides standalone translation audio for Malayalam or Sinhala.
- **Honest Fallback**: We do NOT fabricate or invent fake audio translation edition identifiers (such as `ml.everyayah` or `si.everyayah`).
- If the user had auto-linked Urdu translation audio (`ur.everyayah-shamshad`), switching to `ml` or `si` resets the audio translation edition to the default English walk (`DEFAULT_AUDIO_TRANSLATION_EDITION_ID` / `'en.everyayah-walk'`).
- Arabic Quran recitations (Alafasy, Husary, Minshawi, etc.) remain untouched and fully accessible in all languages.

---

## 4. Localized Dynamic Domain Data

Every dynamic domain label in the application has been audited and localized for Malayalam and Sinhala:

1. **Surah Names (1–114)**:
   - `SURAH_NAMES_ML`: Standard Malayalam transliterated surah names in `src/lib/surahNamesLocalized.ts`.
   - `SURAH_NAMES_SI`: Standard Sinhala transliterated surah names in `src/lib/surahNamesLocalized.ts`.
   - `getLocalizedSurahName(num, fallback)` displays localized names across Quran Reader, Tafsir, Search, and Home.
2. **Surah Meaning Translations (1–114)**:
   - `SURAH_NAME_TRANSLATIONS.ml` and `SURAH_NAME_TRANSLATIONS.si` in `src/lib/surahTranslationsData.ts` provide offline translated meanings.
3. **Quran Translation Editions Metadata (61 editions)**:
   - `EDITION_METADATA_ML` and `EDITION_METADATA_SI` in `src/lib/quranLanguages.ts` provide localized `title`, `translator`, and `language` names.
4. **Selectable Translation Language Names (50 languages)**:
   - `LANGUAGE_NAMES_ML` and `LANGUAGE_NAMES_SI` in `src/lib/surahNamesLocalized.ts`.
5. **Cities & Countries (68 cities, 41 countries)**:
   - `COUNTRY_ML`, `COUNTRY_SI`, `CITY_NAMES_ML`, `CITY_NAMES_SI` in `src/lib/cities.ts`.
   - `getLocalizedCityName` and `getLocalizedCountryName` wire localized names to Prayer Times, CitiesScreen, and Qibla.
6. **Theme Accents (14 approved accents)**:
   - `LOCALIZED_ACCENT_NAMES` in `src/lib/accents.ts` provides native Malayalam and Sinhala names for all 14 accents.
7. **Tasbih & Dhikr (5 presets)**:
   - `DHIKR_LOCALIZED` in `src/screens/TasbihScreen.tsx` provides Malayalam and Sinhala transliterations and meanings for SubhanAllah, Alhamdulillah, AllahuAkbar, Astaghfirullah, and LaIlahaIllallah.
8. **Warmup & Preloader**:
   - `MAIN_LANGUAGES` in `src/lib/warmup.ts` includes `'ml'` and `'si'` for preloading surah metadata.

---

## 5. Verification & Quality Gates

Run the complete test suite:

```bash
# 1. Urdu / Arabic / Hindi / Malayalam / Sinhala i18n & structural parity
node tests/test_i18n_urdu.mjs

# 2. Language switching, pairwise transitions & auto-linking
node tests/test_language_switching.mjs

# 3. Serialized settings queue write order
node tests/test_settings_write_order.mjs

# 4. Defect regression suite (Quran chooser, Tasbih, Cities, Settings queue)
node tests/test_defect_regressions.mjs

# 5. Full test runner
npm test

# 6. Typecheck
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit

# 7. Git whitespace / diff check
git diff --check
```

---

## 6. Physical-Device Verification Checklist

On a physical Android/iOS device, verify:
- [ ] **Settings Language Selector**: Malayalam (`മലയാളം`) and Sinhala (`සිංහල`) appear with native labels.
- [ ] **Row Description**: Honest LTR labels appear:
  - Malayalam: `മലയാളം (Malayalam) · ഇടത്തുനിന്ന് വലത്തോട്ട് (LTR)`
  - Sinhala: `සිංහල (Sinhala) · වමේ සිට දකුණට (LTR)`
- [ ] **Single Reload**: Tapping Malayalam or Sinhala triggers exactly one clean reload without double-reloading or crashing.
- [ ] **Layout Direction**: Layout renders left-to-right (LTR); text, icons, and navigation align correctly.
- [ ] **Quran Reader**: Surah titles, translated verses, and metadata render correctly in Malayalam (`ml.abdulhameed`) and Sinhala (`si.naseemismail`).
- [ ] **Tasbih Counter**: Dhikr transliteration and meaning display in Malayalam / Sinhala.
- [ ] **Cities & Prayer Times**: City and country names display in Malayalam / Sinhala.
- [ ] **Theme Persistence**: Light, Dark, and System appearance settings persist across language switches.
- [ ] **Pairwise Switches**: Verify switching `ur -> ml`, `ml -> ur`, `ar -> si`, `si -> ar`, `ml -> si`, and `si -> ml`.
