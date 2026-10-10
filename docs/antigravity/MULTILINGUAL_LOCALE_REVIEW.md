# Multilingual Locale Semantic and Safety Review

Use this guide whenever reviewing any locale or all shipped languages. It is for reviewers who may not understand the target languages. It complements `LOCALIZATION_AUDIT.md`, which covers source-string and key-structure auditing.

## Core rule

A locale is not approved because JSON parses, keys match, tests pass, or the target script appears. Semantic correctness, natural language quality, cultural appropriateness, and sensitive-content safety require evidence. For religious, medical, privacy, legal, or safety content, final approval requires a fluent qualified reviewer for that language. If no qualified reviewer exists, mark approval as pending and use `DO_NOT_SHIP` for material uncertainty.

This is read-only by default. Do not edit locale files while auditing. Do not generate replacement translations, commit, push, build, or release unless the user separately asks for a fix.

## Scope

For every target locale file under `src/locales/`:

- compare every value against `src/locales/en.json`
- inspect all language-specific maps and helpers outside JSON
- scan user-visible source literals, accessibility labels, alerts, notifications, errors, placeholders, and dynamic labels
- inspect structured content such as city names, surah names, dhikr, translator metadata, and Quran edition metadata
- inspect sensitive content separately from ordinary UI

Never silently alter canonical Quran Arabic, API identifiers, stable keys, proper names, URLs, or technical tokens.

## Evidence requirements

For every locale, record:

- locale code and language name
- source and target file hashes or commit
- key count and parity
- exact commands and exit codes
- semantic coverage: number of values individually classified, not just sampled
- qualified reviewer status: name/role only if actually provided; never invent it
- unresolved items and confidence

An agent must not claim "all translations are correct" if it reviewed only a sample. State exact coverage and limitations.

## Pass 1: Mechanical integrity

Parse files from disk programmatically and report:

- malformed JSON or invalid UTF-8
- missing keys, extra keys, duplicate keys, and empty values
- interpolation-token mismatches
- newline and placeholder mismatches
- replacement characters, control characters, broken escapes, and placeholder markers
- values identical to English, each with an explanation
- untranslated source literals passed to `t()`
- raw user-visible strings bypassing localization

Identical-to-English values are candidates, not automatic defects. Allow only justified proper nouns, brands, URLs, identifiers, numbers, units, universal abbreviations, or intentionally shared sacred text. Do not apply a blanket allowlist to a whole locale.

## Pass 2: Script, language, and naturalness

Use language-aware tooling where available, but treat automated language detection as a flagging tool, not proof. For every value classify it as:

- `NATIVE_AND_NATURAL`
- `ACCEPTABLE_TRANSLITERATION`
- `INTENTIONAL_SHARED_TEXT`
- `MIXED_BUT_INTENTIONAL`
- `RAW_ENGLISH`
- `PHONETIC_OR_MACHINE_ARTIFACT`
- `WRONG_LANGUAGE`
- `GRAMMAR_OR_MEANING_ERROR`
- `AMBIGUOUS_NEEDS_NATIVE_REVIEW`

Check:

- correct script and language, including regional variant where the product specifies one
- natural grammar, word order, tense, agreement, politeness, and punctuation
- correct plural, gender, case, honorific, and formal/informal register
- consistent terminology across repeated concepts
- no word-by-word transliteration of English sentence structure
- no accidental language mixing or copied neighboring locale content
- no culturally inappropriate idioms or offensive register
- correct directionality, punctuation, numerals, date/time formats, and text expansion

Do not flag legitimate Arabic, Persian, Hebrew, Latin, Cyrillic, CJK, or other sacred/proper-name text merely because it differs from the target script. Explain each exception.

## Pass 3: Sensitive-content safety

Create a separate inventory for content involving:

- Quran, Quran translations, ayahs, surahs, tafsir, tajweed, and Mushaf UI
- Allah's names, shahadah, duas, dhikr, salawat, and prophetic honorifics
- hadith quotations, citations, grades, and attributions
- Salah, Adhan, fasting, Ramadan, Zakat, Hajj, Umrah, Ihram, Tawaf, Sa'i, and sacred places
- purity, menstruation, nifas, women's worship, and qada guidance
- medical disclaimers or health-related guidance
- privacy, security, deletion, backups, permissions, and irreversible actions
- claims such as "verified", "authentic", "never uploaded", "secure", or "medically safe"

For each sensitive value, compare the target meaning against the English source and report:

- added, removed, reversed, or softened meaning
- incorrect religious or legal implication
- mistranslated sacred name, honorific, citation, or technical term
- wrong gender, medical, privacy, or safety meaning
- false certainty or unsupported authenticity claim
- disrespectful, obscene, insulting, discriminatory, sexual, or culturally harmful language
- ambiguity that could cause a user to perform worship incorrectly or misunderstand a safety warning

Use severity:

- **P0:** corrupted sacred meaning, dangerous medical/privacy/security meaning, or explicit abusive/hateful/sexual content in a sensitive surface.
- **P1:** major religious, legal, medical, safety, or primary-action mistranslation.
- **P2:** ordinary UI meaning error, raw English, malformed sentence, or important accessibility defect.
- **P3:** wording quality, consistency, punctuation, or low-impact polish.

Never use a profanity list as sole proof. Match terms in context, report false positives, and account for inflection, transliteration, and dialect. A substring inside a valid religious term is not automatically profanity.

## Pass 4: Back-translation

For every P0/P1 and a representative set of each sensitive category:

1. Read the target-language value without relying on the English key.
2. Produce a literal English back-meaning.
3. Compare it with the source meaning.
4. Record omissions, additions, reversal, ambiguity, and confidence.

For languages the reviewer cannot understand, use a qualified native reviewer or an independently sourced translation service only as a preliminary cross-check. Machine back-translation is not final approval and must be labelled `UNVERIFIED_MACHINE_CHECK`.

## Pass 5: Terminology and cross-locale consistency

Build a glossary from recurring source concepts and compare every locale. Check that repeated terms remain stable unless grammar requires a deliberate variant. At minimum inspect:

- Quran / Qur'an / scripture
- Allah / God and sacred names
- Prophet / Messenger and honorifics
- prayer / Salah / Adhan
- fasting / Ramadan
- supplication / dua / dhikr
- verse / ayah / chapter / surah
- ablution / Wudu
- charity / Zakat
- Hajj / Umrah / Ihram / Tawaf / Sa'i
- purity / menstruation / postpartum / nifas
- delete, restore, backup, private, device-only, permission, and warning terms

Record the source key, each locale's value, and whether differences are intentional, grammatical, suspicious, or unresolved.

## Pass 6: Automated scans

Run structural checks and language heuristics, but do not treat them as semantic proof. Useful checks include:

- Unicode script distribution and wrong-script detection
- language identification confidence
- English-identical ratio
- raw ASCII-word and phonetic-artifact frequency
- profanity/abuse/sexual-language candidates with context
- placeholder and token preservation
- suspicious prefixes such as `[Language]`, `Translation:`, or `__TERM__`
- machine-translation artifacts and repeated malformed fragments
- all literal `t()` keys against `en.json`

Every heuristic finding must be manually classified as valid, false positive, or needs native review.

## Required report

Produce Markdown with:

1. **Verdict:** exactly one of `APPROVE`, `APPROVE_WITH_WARNINGS`, or `DO_NOT_SHIP`.
2. **Scope and evidence:** files, commit/hash, commands, and exit codes.
3. **Mechanical matrix:** key counts, parity, empties, tokens, newlines, identical values.
4. **Semantic coverage matrix:** per locale, values classified and percentage covered.
5. **P0/P1 findings:** every exact `file:key`, source value, target value, meaning risk, and recommended action.
6. **Sensitive-content findings:** grouped by Quran, hadith, worship, medical, privacy, and safety.
7. **P2/P3 findings:** grouped by root pattern with all affected keys.
8. **Profanity and harmful-language scan:** terms, exact context, false positives, confidence, and unresolved items.
9. **Glossary consistency:** source term, locale values, and decisions.
10. **Remote-content boundary:** what local files prove and what remote APIs/editions still require review.
11. **Human-review gate:** whether a fluent qualified reviewer actually approved the language.
12. **Release recommendation:** ship, ship only with warnings, or block.

`DO_NOT_SHIP` is mandatory when any P0/P1 exists, when substantial content is machine-like or phonetic, when a sensitive string cannot be understood confidently, or when no qualified reviewer exists for a language with sensitive content.

## Prohibited shortcuts

- Do not equate key parity with translation quality.
- Do not call a locale safe because no profanity-list hit was found.
- Do not approve from a small sample while claiming full coverage.
- Do not use one machine translation or back-translation as theological approval.
- Do not silently replace a locale with generated text.
- Do not copy English to repair parity.
- Do not alter Quran Arabic or religious source content during an audit.
- Do not claim native-speaker review that did not happen.
