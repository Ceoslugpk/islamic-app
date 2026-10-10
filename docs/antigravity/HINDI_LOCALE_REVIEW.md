# Hindi Locale Semantic and Religious Review

Use this guide for a read-only review of `src/locales/hi.json` and Hindi-specific app content. This is a semantic and safety audit, not a key-parity audit. Read `rules.md`, `AGENTS.md`, `docs/antigravity/README.md`, `docs/antigravity/LOCALIZATION_AUDIT.md`, and `docs/adding-app-languages.md` first.

## Non-negotiable safety boundary

Do not report Hindi as approved merely because JSON parses, keys match, tests pass, or Devanagari characters exist. A mechanically transliterated English sentence is not a Hindi translation. Do not silently rewrite Quran, hadith, dua, fiqh, Hajj, fasting, women's worship, or medical guidance.

This audit is read-only by default. Do not edit `hi.json`, source code, tests, release files, or other locale files. Do not commit, push, build, or release. Produce a report with evidence instead.

The audit can identify defects, but a final religious/language approval requires a fluent Hindi-speaking Muslim reviewer. Mark that gate as pending unless such a reviewer actually performed the review.

## Review scope

Scan all of:

- every key/value in `src/locales/hi.json`
- Hindi maps in `src/lib/cities.ts`, `src/lib/surahNamesLocalized.ts`, `src/lib/surahTranslationsData.ts`, `src/lib/quranLanguages.ts`, `src/lib/accents.ts`, and `src/screens/TasbihScreen.tsx`
- every user-visible Hindi literal or Hindi fallback in `src/screens`, `src/components`, and `src/lib`
- the Hindi Quran edition identifier and metadata, but do not treat remote Quran content as locally verified

Use the English key as the source meaning. Preserve interpolation tokens, numbers, dates, URLs, technical IDs, Arabic Quranic text, proper names, and established transliterations where appropriate.

## Four-pass review

### Pass 1: Mechanical integrity

Parse the actual files from disk and report:

- key count and exact parity with `en.json`
- missing, extra, empty, or duplicate keys
- interpolation-token and newline mismatches
- malformed UTF-8, replacement characters, control characters, placeholders, and artifact prefixes
- English-identical values, with each exception categorized
- source literals passed to `t()` that are not keys in `en.json`

### Pass 2: Hindi language quality

For every value, classify it as:

- `GOOD_HINDI`
- `ACCEPTABLE_TRANSLITERATION` — proper noun, Arabic term, API name, or established Islamic term
- `MIXED_BUT_INTENTIONAL` — technical/product term intentionally retained
- `PHONETIC_ENGLISH_ARTIFACT` — English translated word-by-word into Devanagari without natural Hindi grammar
- `RAW_ENGLISH`
- `GRAMMAR_OR_MEANING_ERROR`
- `AMBIGUOUS_REQUIRES_NATIVE_REVIEW`

Do not infer correctness from Hindi script. Check sentence grammar, word order, agreement, tense, politeness, punctuation, and whether the value sounds like something a native Hindi app would say.

Flag common mechanical artifacts such as phonetic forms of English function words and UI words (`the`, `prayer`, `worship`, `service`, `information`, `reflection`, `automatic`, `feature`, `schedule`, `reading`, etc.). Do not blanket-flag proper names or technical identifiers.

For each defect, report `file:key`, English source, Hindi value, defect class, severity, and a concise recommended meaning. Do not invent a final religious translation unless you are certain; use `NEEDS_NATIVE_REVIEW`.

### Pass 3: Islamic and sensitive-content safety

Create separate findings for:

- Quran and Quran translation labels/descriptions
- ayah/surah names and search labels
- hadith quotations and attribution language
- duas, dhikr, Allah's names, shahadah, salawat, and prophetic honorifics
- Salah, Adhan, fasting, Zakat, Hajj, Umrah, Ihram, Tawaf, Sa'i, and sacred-site guidance
- fiqh, madhab, purity, menstruation, nifas, and women's worship
- medical disclaimers and privacy/security explanations
- warnings, deletion confirmations, and irreversible actions

For each sensitive string, compare the Hindi meaning against the English source and flag:

- meaning added, removed, reversed, or softened
- Allah, Prophet, Quran, hadith, or sacred-place name mistranslated
- incorrect honorific or disrespectful wording
- a ruling presented more strongly or differently than the source
- incorrect gender, medical, or purity meaning
- confusing language that could cause worship or safety mistakes
- obscene, insulting, discriminatory, sexually explicit, or culturally inappropriate wording
- unsupported claims of authenticity, verification, privacy, or medical certainty

Use P0 for corrupted sacred meaning or unsafe religious/medical guidance, P1 for a major user-facing religious mistranslation, P2 for ordinary UI meaning/grammar defects, and P3 for polish.

Do not use a generic profanity list as proof of safety: Hindi words can be context-dependent, and false positives are common. Report the exact context for every hit and separately report false positives such as Islamic terms containing a suspicious substring.

### Pass 4: Back-translation and consistency

For every P0/P1 and a representative sample of every sensitive category:

1. Read the Hindi value without looking at the English key.
2. Write a literal English back-meaning.
3. Compare it with the source meaning.
4. Record omissions, additions, ambiguity, and confidence.

Check consistency of repeated terms across the file, including:

- Quran / Qur'an / क़ुरआन
- Allah / अल्लाह
- Prophet / Messenger / पैग़म्बर / रसूल
- prayer / Salah / नमाज़
- fasting / रोज़ा
- supplication / dua / दुआ
- chapter / surah / सूरह
- verse / ayah / आयत
- ablution / Wudu / वुज़ू
- charity / Zakat / ज़कात
- menstruation, postpartum, purity, and nifas

A term may have multiple valid Hindi choices; flag inconsistency only when it changes meaning or creates confusion.

## Required report

Write a Markdown report outside the source tree or to the path the user specifies. Include:

1. Review date and exact commit/file hashes if available.
2. Scope and commands used.
3. Mechanical integrity table.
4. Counts by classification and severity.
5. Complete P0/P1 findings with exact source/value pairs.
6. Complete list of sensitive-content findings.
7. Representative P2/P3 findings, grouped by root pattern; include all affected keys.
8. Profanity/inappropriate-language scan with false-positive analysis.
9. Terms/glossary consistency findings.
10. Remote Quran-edition boundary: what was and was not verified.
11. Human-review gate: explicitly state that final Hindi religious approval remains pending unless a qualified native reviewer performed it.
12. Final verdict: `APPROVE`, `APPROVE_WITH_WARNINGS`, or `DO_NOT_SHIP`.

`DO_NOT_SHIP` is required if any P0/P1 exists, if a substantial portion is phonetic English, or if the reviewer cannot confidently understand the sensitive strings.

Never summarize "all translations are fine" from sampling. If all 2,302 values were not individually classified, state the exact coverage and do not claim full approval.
