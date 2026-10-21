const WOMEN_SPECIFIC_REASON_TOKENS = [
  'menstru',
  'period',
  'menses',
  'haidh',
  'hayd',
  'haydh',
  'haiz',
  'hayz',
  'nifas',
  'nifaas',
  'post-natal',
  'postnatal',
  'post natal',
  'postpartum',
  'حيض',
  'نفاس',
] as const;

function normalizeWomenReason(reason: string): string {
  return reason
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[‐‑‒–—]/g, '-');
}

/** The single privacy classifier for free-text qada reasons. */
export function isWomenSpecificReason(reason: unknown): boolean {
  if (typeof reason !== 'string') return false;
  const normalized = normalizeWomenReason(reason);
  return WOMEN_SPECIFIC_REASON_TOKENS.some((token) => normalized.includes(token));
}
