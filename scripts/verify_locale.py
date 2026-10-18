#!/usr/bin/env python3
"""
scripts/verify_locale.py

Authoritative localization verifier for the Islamic App:
1. Exact key parity against en.json across all 49 locale files (zero missing, zero extra).
2. No empty or whitespace-only translation strings.
3. Token & placeholder parity ({n}, {{n}}, {{edition}}, {surah}, etc.).
4. Exact newline (\\n) count parity.
5. Arabic script and token corruption check (e.g., exact {n} not corrupted to {ن}).
6. Protected-content classification and English-copy ratio tracking.
"""

import os
import sys
import json
import glob
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LOCALES_DIR = os.path.join(ROOT, "src", "locales")
EN_PATH = os.path.join(LOCALES_DIR, "en.json")

REGISTERED_LOCALES = ["en", "ur", "ar", "hi", "ml", "si", "bn", "ms", "ta", "id", "ps"]

# Legitimate protected content permitted to remain identical to English:
# Proper nouns, technical identifiers, Arabic quotations/transliterations, URLs, numbers.
PROTECTED_PATTERNS = [
    r"^[0-9\s\.\,\+\-\/\:\(\)\%\#\·\✓\★\☆]+$", # Pure numbers, punctuation, mathematical symbols
    r"^https?://",                            # URLs
    r"^[A-Z0-9_\-]+$",                        # Technical codes/IDs
    r"^(Makkah|Madinah|Mina|Arafat|Muzdalifah|Kaaba|Haram|Qibla|Zamzam|Tawaf|Sa'i|Jamarat)$", # Universal sacred toponyms
]

def extract_tokens(s):
    return sorted(re.findall(r"\{[^\}]+\}", s))

def is_protected(key, value):
    if key == value:
        for pat in PROTECTED_PATTERNS:
            if re.search(pat, key, re.IGNORECASE):
                return True
    return False

def verify_locales():
    if not os.path.exists(EN_PATH):
        print(f"ERROR: en.json not found at {EN_PATH}")
        sys.exit(1)

    with open(EN_PATH, "r", encoding="utf-8") as f:
        en_dict = json.load(f)

    en_keys = list(en_dict.keys())
    en_key_set = set(en_keys)
    total_en_keys = len(en_keys)

    print(f"==================================================")
    print(f"VERIFY LOCALE SUITE: 49 Locale Inventory Audit")
    print(f"Canonical en.json key count: {total_en_keys}")
    print(f"==================================================")

    all_files = sorted(glob.glob(os.path.join(LOCALES_DIR, "*.json")))
    if len(all_files) != 49:
        print(f"ERROR: Expected 49 locale JSON files, found {len(all_files)}")
        sys.exit(1)

    errors = []
    locale_stats = {}

    for file_path in all_files:
        loc = os.path.basename(file_path).replace(".json", "")
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        keys = list(data.keys())
        key_set = set(keys)

        # 1. Key count and parity
        missing = en_key_set - key_set
        extra = key_set - en_key_set
        order_match = (keys == en_keys)

        if missing:
            errors.append(f"[{loc}] Missing {len(missing)} keys. Examples: {list(missing)[:3]}")
        if extra:
            errors.append(f"[{loc}] Extra {len(extra)} keys. Examples: {list(extra)[:3]}")
        if not order_match:
            errors.append(f"[{loc}] Key order does not match canonical en.json")

        # 2. Empty values, token parity, newline parity
        identical_count = 0
        protected_count = 0

        for k in en_keys:
            v = data.get(k, "")
            if not isinstance(v, str) or len(v.strip()) == 0:
                errors.append(f"[{loc}] Empty or invalid value for key: {k!r}")
                continue

            en_val = en_dict[k]
            en_tokens = extract_tokens(en_val)
            v_tokens = extract_tokens(v)

            if en_tokens != v_tokens:
                errors.append(f"[{loc}] Token mismatch for key {k!r}: en={en_tokens} != {loc}={v_tokens}")

            if v.count("\n") != en_val.count("\n"):
                errors.append(f"[{loc}] Newline mismatch for key {k!r}: en={en_val.count(chr(10))} != {loc}={v.count(chr(10))}")

            if v == en_val and loc != "en":
                if is_protected(k, v):
                    protected_count += 1
                else:
                    identical_count += 1

        # Check Arabic token corruption specifically
        if loc == "ar":
            for k, v in data.items():
                if "{ن}" in v:
                    errors.append(f"[ar] Corrupted token '{{ن}}' found in key {k!r}")

        locale_stats[loc] = {
            "total_keys": len(keys),
            "identical": identical_count,
            "protected": protected_count,
            "identical_pct": (identical_count / total_en_keys) * 100
        }

    # Summary report
    print(f"\n--- Registered Locales Audit ---")
    for loc in REGISTERED_LOCALES:
        s = locale_stats[loc]
        print(f"  Locale: {loc:<4} | Keys: {s['total_keys']:<5} | Identical: {s['identical']:<4} | Protected: {s['protected']:<3} | Identical%: {s['identical_pct']:.2f}%")

    print(f"\n--- Kazakh (kk.json) Audit ---")
    s_kk = locale_stats["kk"]
    print(f"  Locale: kk   | Keys: {s_kk['total_keys']:<5} | Identical: {s_kk['identical']:<4} | Protected: {s_kk['protected']:<3} | Identical%: {s_kk['identical_pct']:.2f}%")

    if errors:
        print(f"\n❌ FAIL: {len(errors)} localization errors detected:")
        for e in errors[:25]:
            print(f"  - {e}")
        if len(errors) > 25:
            print(f"  ... and {len(errors) - 25} more errors.")
        sys.exit(1)

    print(f"\n✅ SUCCESS: All 49 locale files pass 100% key parity, zero missing keys, token parity, and newline parity!")
    return 0

if __name__ == "__main__":
    verify_locales()
