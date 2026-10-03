# Free Islamic Data APIs (Hadith & Adhkar)
Researched: 2026-10-03

## Verified keyless (recommended)

### 1. islamic.app
- **Provider**: islamic.app (Mohamed Ouaryaghli)
- **Base URL**: `https://api.islamic.app/v1`
- **Keyless?**: Yes — fully keyless by default. Optional `X-Api-Key` header only for higher tier (20,000/min).
- **Rate limit**: 600 requests/min per IP (anonymous). Rate-limit headers: `X-RateLimit-Limit`, `X-RateLimit-Reset`.
- **CORS**: ✅ Verified — `access-control-allow-origin: *`
- **Data covered**:
  - **Hadith**: ~50,000 hadiths across 17 collections (Bukhari, Muslim, Nasa'i, Abu Dawud, Tirmidhi, Ibn Majah, Malik, Ahmad, Darimi, Riyad as-Salihin, Adab al-Mufrad, Shama'il, Mishkat, Bulugh al-Maram, Forty Hadith collections, Hisn al-Muslim, Virtues of Qur'an). Full Arabic + English text, grades, sunnah.com URNs.
  - **Adhkar/Duas**: 268 duas from Hisn al-Muslim, 132 categories, named shortcuts (morning, evening, after-prayer, before-sleep, prayer, mosque, travel, food, home, anxiety, protection, forgiveness, hajj, etc.), curated slugs with transliteration/virtue/source.
- **Sample endpoints**:
  - Collections: `https://api.islamic.app/v1/hadith/collections`
  - Single collection: `https://api.islamic.app/v1/hadith/collections/bukhari`
  - Books in collection: `https://api.islamic.app/v1/hadith/collections/bukhari/books`
  - Hadiths in book: `https://api.islamic.app/v1/hadith/collections/bukhari/books/1/hadiths?limit=10`
  - Single hadith: `https://api.islamic.app/v1/hadith/collections/bukhari/books/1/hadiths/1`
  - Lookup by URN: `https://api.islamic.app/v1/hadith/urn/10`
  - FTS5 search: `https://api.islamic.app/v1/hadith/search?q=intention&lang=en`
  - Random hadith: `https://api.islamic.app/v1/hadith/random`
  - Hadith of the day: `https://api.islamic.app/v1/hadith/today`
  - All adhkar categories: `https://api.islamic.app/v1/dhikr`
  - Adhkar by category/shortcut: `https://api.islamic.app/v1/dhikr/morning`
  - Single dua by slug: `https://api.islamic.app/v1/dhikr/entry/ayat-al-kursi`
  - Random dua: `https://api.islamic.app/v1/dhikr/random`
- **Reliability notes**: Hosted on Cloudflare Workers + D1 (SQLite). Actively maintained (2026-07-01 spec). Quran surface shape-compatible with quran.com v4. Fair-use IP limits only. No uptime SLA but personal project with good track record.

### 2. UmmahAPI
- **Provider**: UmmahAPI
- **Base URL**: `https://ummahapi.com/api`
- **Keyless?**: Yes — completely free, no API key required. Optional free key for higher limits (5,000/min per key vs 100/min anonymous).
- **Rate limit**: 100 requests/min per IP (anonymous). Registered keys: 5,000/min per key. Headers: `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`.
- **CORS**: ✅ Verified — `access-control-allow-origin: *`
- **Data covered**:
  - **Hadith**: 36,000+ hadiths from 10 collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik, Nawawi 40, Qudsi 40, Shah Waliullah 40). Arabic + English, grading info.
  - **Duas**: 126 authentic duas from Quran & Sunnah across 27 categories (morning, evening, prayer, sleep, travel, food, protection, forgiveness, etc.). Arabic, transliteration, translation, source reference.
- **Sample endpoints**:
  - Collections: `https://ummahapi.com/api/hadith/collections`
  - Single hadith: `https://ummahapi.com/api/hadith/bukhari/1`
  - Search: `https://ummahapi.com/api/hadith/search?q=prayer`
  - All duas: `https://ummahapi.com/api/duas`
  - Categories: `https://ummahapi.com/api/duas/categories`
  - Duas by category: `https://ummahapi.com/api/duas/category/morning`
  - Random dua: `https://ummahapi.com/api/duas/random`
- **Reliability notes**: Backed by fawazahmed0/hadith-api via jsDelivr CDN for hadith. Good documentation at `/api/docs` and OpenAPI spec at `/openapi.json`. Also provides widgets.

### 3. Dua API (Hisnul Muslim) — Cloudflare Workers
- **Provider**: ThelightHub / hisnul.workers.dev
- **Base URL**: `https://dua-api.hisnul.workers.dev`
- **Keyless?**: Yes — completely free, no API key, CORS enabled.
- **Rate limit**: 12 requests/second (per-second limit observed).
- **CORS**: ✅ Verified — `access-control-allow-origin: *`
- **Data covered**:
  - **Adhkar/Duas**: 421 authentic duas from Hisnul Muslim + Quranic duas + special adhkar. Full Arabic text (with/without diacritics), Bengali translations, word-by-word breakdown (Arabic ↔ Bengali), 18 topic categories, 3 books, 218 chapters.
- **Sample endpoints**:
  - Search (Bengali): `https://dua-api.hisnul.workers.dev/api/search?q=morning`
  - Search (Arabic): `https://dua-api.hisnul.workers.dev/api/search/arabic?q=صباح`
  - Random dua: `https://dua-api.hisnul.workers.dev/api/random`
- **Reliability notes**: Deployed on Cloudflare Workers edge network. Open-source. Good for Bengali-speaking users.

### 4. HisnMuslim.com Official API
- **Provider**: HisnMuslim.com (Said bin Ali bin Wahf al-Qahatani)
- **Base URL**: `https://www.hisnmuslim.com/api` (also `http://www.hisnmuslim.com/api`)
- **Keyless?**: Yes — no key required.
- **CORS**: ✅ Verified — works from browser (tested).
- **Data covered**:
  - **Adhkar/Duas**: Complete Hisn al-Muslim (132 categories). Arabic text, transliteration, translation, audio URLs, repeat counts.
  - **Languages**: Arabic (`/api/ar/`) and English (`/api/en/`).
- **Sample endpoints**:
  - Category index (Arabic): `https://www.hisnmuslim.com/api/ar/husn_ar.json`
  - Category index (English): `https://www.hisnmuslim.com/api/en/husn_en.json`
  - Single category: `https://www.hisnmuslim.com/api/ar/27.json` (morning/evening)
  - Audio: `https://www.hisnmuslim.com/audio/ar/ar_7esn_AlMuslim_by_Doors_028.mp3`
- **Reliability notes**: Original source for Hisn al-Muslim data. Uses HTTP (not HTTPS) for some assets. JSON structure is nested (multiple top-level objects). No rate limits documented.

### 5. Naikiyah / Dua Data API (Vercel)
- **Provider**: Naikiyah (dua-data-api.vercel.app)
- **Base URL**: `https://dua-data-api.vercel.app`
- **Keyless?**: Yes — free, no key.
- **Data covered**:
  - **Adhkar**: Morning & evening adhkar, post-salah zikr, 100+ categorized duas, complete prayer guide, surah virtues, 40 Hadith Nawawi, fiqh basics.
- **Sample endpoints**:
  - Daily adhkar: `https://dua-data-api.vercel.app/api/dailyAdkar`
  - Morning adhkar: `https://dua-data-api.vercel.app/api/morningAdhkar`
  - Evening adhkar: `https://dua-data-api.vercel.app/api/eveningAdhkar`
  - 40 Nawawi: `https://dua-data-api.vercel.app/api/fortyNawawi`
- **Reliability notes**: Vercel-hosted. Simpler structure, good for basic adhkar needs.

---

## Free with key

### 1. Sunnah.com Official API
- **Provider**: Sunnah.com
- **Signup URL**: Create issue at https://github.com/sunnah-com/api/issues
- **What key unlocks**: Full access to 17 collections, books, chapters, hadiths, search, URN lookup, random hadith. Offline dump also available on request.
- **Free tier limits**: Not publicly documented; keys issued manually. Typical approval within days/weeks (backlog exists).
- **CORS**: Requires `X-API-KEY` header. CORS policy not explicitly documented.
- **Notes**: Most authoritative source (direct from sunnah.com). Python/Flask backend. Documentation at https://sunnah.stoplight.io/docs/api/

### 2. HadithAPI.com
- **Provider**: HadithAPI.com (Zain Shabir)
- **Signup URL**: https://hadithapi.com/register (Google/Facebook/email)
- **What key unlocks**: Books, chapters, hadiths in Arabic, Urdu, English. Multiple grades.
- **Free tier limits**: Requires key for all endpoints (403 without). No public rate limit docs.
- **CORS**: Not verified.
- **Notes**: Commercial-friendly free tier. Documentation at https://hadithapi.com/docs/hadiths

### 3. i-muslim.com
- **Provider**: i-muslim
- **Signup URL**: https://i-muslim.com/en/developers (contact form)
- **What key unlocks**: Hadith collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik, Nawawi 40, Qudsi 40), Quran, prayer times, qibla, hijri calendar, mosques. Scoped keys (read/write/delete).
- **Free tier limits**: Rate limited per key. Manual approval (~24 hours).
- **CORS**: Not verified.
- **Notes**: Unique write capability for translations.

### 4. Quran.com v4 / Quran Foundation Content API
- **Provider**: Quran.com / Quran Foundation
- **Signup URL**: https://quran.com/developers (Developer Console)
- **What key unlocks**: Hadith references by ayah (3 endpoints), plus full Quran content (verses, translations, tafsirs, audio, search). App credentials required (no user OAuth).
- **Free tier limits**: Not publicly documented.
- **CORS**: Not verified for hadith endpoints.
- **Notes**: Hadith coverage is limited to ayah-linked references, not full collections.

---

## Dead / unreliable (avoid)

| API | Reason |
|-----|--------|
| `api.hadith.gading.dev` | **Down / no response** — curl HEAD/GET returns no output (connection fails). GitHub repo last push Jul 2023. |
| `api.musl.com` | Requires signup for unrecoverable public key. No documentation accessible without key. |
| `islamicfinder.org` | No public API found; website only. |
| `alquran.cloud` / `api.alquran.cloud` | **Quran only** — no hadith or adhkar endpoints. |
| `quranenc.com` / `hadeethenc.com` / `islamhouse.com` | Require API keys; limited documentation; hadith layer unclear. |
| `fawazahmed0/hadith-api` (jsDelivr CDN) | Static JSON files only — no search, no pagination, no adhkar. Good for offline bundling, not live API. |

---

## Recommendation

**For Hadith**: Integrate **islamic.app** first — it's the only keyless API offering all 6 canonical collections + 11 more, full Arabic/English text, grades, sunnah.com URNs, FTS5 search (diacritic-insensitive Arabic), random/daily hadith, and book/chapter navigation. 600 req/min is generous for mobile clients.

**For Adhkar/Duas**: Use **islamic.app `/v1/dhikr/*`** as primary (268 Hisn al-Muslim duas, 132 categories, named shortcuts, curated slugs with transliteration/virtue/source). Supplement with **UmmahAPI `/api/duas/*`** for simpler 126-dua set with 27 categories if you need lighter payloads or different categorization. Both are keyless, CORS-enabled, and well-documented.