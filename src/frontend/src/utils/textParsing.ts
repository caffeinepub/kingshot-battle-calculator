/**
 * Text parsing utilities for extracting structured data from OCR results.
 * Handles normalization, number parsing, Roman numerals, and pattern matching for scout data.
 */

/**
 * Normalizes OCR text by cleaning whitespace and special characters
 */
export function normalizeOcrText(s: string): string {
  return (s || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a number from text, removing commas and spaces
 */
export function parseNumberLoose(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Converts Roman numerals (I-XI) to tier numbers (1-11)
 */
export function romanToTier(roman: string): number | null {
  const r = roman.toUpperCase().replace(/[^IVX]/g, '');
  if (!r) return null;
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
  };
  return map[r] ?? null;
}

/**
 * Extracts march size from scout text using common patterns
 */
export function extractMarchSizeFromText(text: string): number | null {
  const patterns = [
    /march\s*size\s*[:\-]?\s*([\d,\s]{3,})/i,
    /\bmarch\b\s*[:\-]?\s*([\d,\s]{3,})/i,
    /troops\s*sent\s*[:\-]?\s*([\d,\s]{3,})/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseNumberLoose(m[1]);
      if (n != null) return n;
    }
  }
  return null;
}

/**
 * Extracts troop counts (infantry, cavalry, archer) from scout text
 */
export function extractTroopCountsFromText(text: string): {
  infantry: number | null;
  cavalry: number | null;
  archer: number | null;
} {
  const get = (label: string) => {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*([\\d,\\s]{1,})`, 'i');
    const m = text.match(re);
    return m?.[1] ? parseNumberLoose(m[1]) : null;
  };

  const infantry = get('infantry');
  const cavalry = get('cavalry');
  const archer = get('archer|archers');

  return { infantry, cavalry, archer };
}
