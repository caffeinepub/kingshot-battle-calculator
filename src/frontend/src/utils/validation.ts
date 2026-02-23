export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateScoutPaste(text: string): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Scout paste cannot be empty" };
  }
  
  const lower = text.toLowerCase();
  const hasTroopType = lower.includes('infantry') || lower.includes('cavalry') || lower.includes('archer');
  
  if (!hasTroopType) {
    return { valid: false, error: "Scout paste must contain at least one troop type (Infantry, Cavalry, or Archers)" };
  }
  
  return { valid: true };
}

export function validateTier(value: number): ValidationResult {
  if (isNaN(value) || value < 1 || value > 11) {
    return { valid: false, error: "Tier must be between 1 and 11" };
  }
  return { valid: true };
}

export function validateTG(value: number): ValidationResult {
  if (isNaN(value) || value < 0 || value > 5) {
    return { valid: false, error: "TG must be between 0 and 5" };
  }
  return { valid: true };
}

export function validateMarchSize(value: number): ValidationResult {
  if (isNaN(value) || value <= 0) {
    return { valid: false, error: "March size must be a positive number" };
  }
  if (value > 10000000) {
    return { valid: false, error: "March size seems unreasonably large" };
  }
  return { valid: true };
}

export function validateManualTroopComposition(infPct: number, cavPct: number): ValidationResult {
  if (isNaN(infPct) || isNaN(cavPct)) {
    return { valid: false, error: "Percentages must be valid numbers" };
  }
  
  if (infPct < 0 || cavPct < 0) {
    return { valid: false, error: "Percentages cannot be negative" };
  }
  
  if (infPct + cavPct > 100) {
    return { valid: false, error: "Infantry + Cavalry percentages cannot exceed 100%" };
  }
  
  return { valid: true };
}

export function validateTargetWin(value: number): ValidationResult {
  if (isNaN(value) || value < 0 || value > 100) {
    return { valid: false, error: "Target win % must be between 0 and 100" };
  }
  return { valid: true };
}

/**
 * Parse integer from string, stripping all non-numeric characters (commas, spaces, etc.)
 * Returns 0 for invalid inputs instead of NaN
 */
export function parseIntLoose(input: string): number {
  const cleaned = (input || "").replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}
