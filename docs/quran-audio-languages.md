# Non-Arabic Quran Audio — Research
Researched: 2026-10-04

## Verified working (recommended)

### AlQuran Cloud / islamic.network CDN
**Provider:** AlQuran Cloud API (https://api.alquran.cloud/v1/edition?format=audio)
**CDN Base:** https://cdn.islamic.network/quran/audio/128/{identifier}/{globalAyah}.mp3
**Bitrate:** Only 128kbps returns 200; 64/256 return 403
**Pattern:** versebyverse editions use global ayah number (1-6236)

| Language | Edition Identifier | English Name | Type | Sample URL (tested 200) |
|----------|-------------------|--------------|------|-------------------------|
| Chinese (zh) | zh.chinese | Chinese | versebyverse | https://cdn.islamic.network/quran/audio/128/zh.chinese/1.mp3 |
| French (fr) | fr.leclerc | Youssouf Leclerc | versebyverse | https://cdn.islamic.network/quran/audio/128/fr.leclerc/1.mp3 |
| Russian (ru) | ru.kuliev-audio | Elmir Kuliev by 1MuslimApp | versebyverse | https://cdn.islamic.network/quran/audio/128/ru.kuliev-audio/1.mp3 |
| Kazakh (kk) | kk.khalifahaltai-audio | Kazakh Translation Audio by Khalifah Altai | versebyverse | https://cdn.islamic.network/quran/audio/128/kk.khalifahaltai-audio/1.mp3 |
| Turkish (tr) | tr.vakfi-audio | Diyanet Vakfı | translation | https://cdn.islamic.network/quran/audio/128/tr.vakfi-audio/1.mp3 |
| Uzbek (uz) | uz.sodik-audio | Muhammad Sodik Muhammad Yusuf | versebyverse | https://cdn.islamic.network/quran/audio/128/uz.sodik-audio/1.mp3 |

**Notes:** All 6 return HTTP 200 with valid MP3 content. CDN supports CORS. API is keyless.

---

### EveryAyah (everyayah.com)
**Provider:** EveryAyah.com
**CDN Base:** https://everyayah.com/data/{subfolder}/{surah}{ayah}.mp3 (format: 001001)
**Bitrates:** Vary per reciter (16–192kbps)
**Pattern:** surah+ayah (3+3 digits), e.g., 001001 = Surah 1, Ayah 1

| Language | Reciter / Edition | Subfolder | Bitrate | Sample URL (tested 200) |
|----------|-------------------|-----------|---------|-------------------------|
| English | Sahih International (Ibrahim Walk) | English/Sahih_Intnl_Ibrahim_Walk_192kbps | 192kbps | https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps/001001.mp3 |
| Persian | Makarem (Kabiri) | translations/Makarem_Kabiri_16Kbps | 16kbps | https://everyayah.com/data/translations/Makarem_Kabiri_16Kbps/001001.mp3 |
| Persian | Fooladvand (Hedayatfar) | translations/Fooladvand_Hedayatfar_40Kbps | 40kbps | https://everyayah.com/data/translations/Fooladvand_Hedayatfar_40Kbps/001001.mp3 |
| Azerbaijani | Balayev | translations/azerbaijani/balayev | ~46kbps | https://everyayah.com/data/translations/azerbaijani/balayev/001001.mp3 |
| Urdu | Shamshad Ali Khan | translations/urdu_shamshad_ali_khan_46kbps | 46kbps | https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/001001.mp3 |
| Bosnian | Besim Korkut | translations/besim_korkut_ajet_po_ajet | ~32kbps | https://everyayah.com/data/translations/besim_korkut_ajet_po_ajet/001001.mp3 |
| Urdu | Farhat Hashmi (word-for-word) | translations/urdu_farhat_hashmi | ~32kbps | https://everyayah.com/data/translations/urdu_farhat_hashmi/001001.mp3 |

**Notes:** All 7 return HTTP 200. No API key required. CORS headers present. Recitations list at https://everyayah.com/data/recitations.js.

---

## Available but unverified / partial

### AlQuran Cloud (listed but CDN returns 403)
| Language | Edition Identifier | English Name | Type | Status |
|----------|-------------------|--------------|------|--------|
| English | en.walk | Ibrahim Walk | versebyverse | 403 |
| Persian | fa.hedayatfarfooladvand | Fooladvand (read by Hedayatfar) | translation | 403 |
| Urdu | ur.khan | Shamshad Ali Khan | versebyverse | 403 |
| Russian | ru.kuliev-audio-2 | Elmir Kuliev 2 by 1MuslimApp | versebyverse | 403 |
| English | en.misharyrashidalafasyenglishtranslationsaheehibrahimwalk | Mishary Rashid Alafasy + Saheeh Intl (Ibrahim Walk) | surahbysurah | 403 |
| English | en.muhammadayyubenglishtranslationmuhsinkhanmikaalwaters | Muhammad Ayyub + Muhsin Khan (Mikaal Waters) | surahbysurah | 403 |
| English | en.sudaisandshuraymenglishtranslationpickthallaslamathar | Sudais & Shuraym + Pickthall (Aslam Athar) | surahbysurah | 403 |
| Burmese | my.hashimtinmyint | Hashim Tin Myint | surahbysurah | 403 |

**Note:** The 3 English "surahbysurah" editions may use a different URL pattern (surah:ayah format), but tested patterns (001001, globalAyah) also return 403. May require different CDN path or are deprecated.

### mp3quran.net
**Finding:** Language-specific endpoints (_english.json, _urdu.json, _indonesia.json, _turkey.json, _bengali.json, _farsi.json, _france.json, etc.) exist but contain **only Arabic reciters with localized names** — no actual non-Arabic translation audio. No verified non-Arabic audio files found.

### quran.com API v4
**Finding:** `/api/v4/resources/recitations` and `/api/v4/chapter_recitations/{surah}` return only Arabic recitations. `/api/v4/resources/translations` lists text translations only. No translation audio endpoint found.

### Quran Central (qurancentral.com)
**Finding:** React-based web app; no public REST API discovered. Audio served via proprietary domains (fe-data-video.qurancentral.com, podcasts.qurancentral.com). Not suitable for keyless integration.

### fawazahmed0/quran-api (jsDelivr)
**Finding:** https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions.json contains 100+ text translations in many languages, but **zero audio editions** (format=audio).

---

## Not available (tried)

| Source | Tested | Result |
|--------|--------|--------|
| Quran Central API | /api, network inspection | No public API; React SPA only |
| mp3quran.net translation audio | _english.json, _urdu.json, _indonesia.json, _turkey.json, _bengali.json, _farsi.json, _france.json | Only Arabic reciters with localized metadata |
| quran.com translation audio | /api/v4/resources/recitations, /chapter_recitations | Arabic-only |
| islamic.network non-audio editions | /edition?format=text | Text only |
| EveryAyah additional languages | Full recitations.js scan | Only 7 non-Arabic entries found |

---

## Recommendation

**First integration: AlQuran Cloud (islamic.network CDN) for the 6 verified editions.** They use the same CDN pattern as the existing Arabic audio in the app (bitrate 128, globalAyah numbering), require zero code changes beyond adding the edition identifiers, and cover Chinese, French, Russian, Kazakh, Turkish, and Uzbek — all verse-by-verse or full translation audio.

**Second integration: EveryAyah** for English (Sahih International), Persian (two editions), Azerbaijani, Urdu (two editions), and Bosnian. These use a different URL pattern (surah+ayah) and lower bitrates, but are keyless, CORS-enabled, and cover high-demand languages missing from AlQuran Cloud (especially English, Urdu, Persian).

**Skip:** mp3quran.net, quran.com, Quran Central, fawazahmed0 — no usable non-Arabic audio found.