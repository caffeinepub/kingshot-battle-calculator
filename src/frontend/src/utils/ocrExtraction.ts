/**
 * OCR extraction utility for processing scout report images.
 * Note: This is a placeholder implementation. Full OCR functionality requires tesseract.js to be installed.
 * To enable OCR: Add "tesseract.js": "^5.0.0" to package.json dependencies and reinstall.
 */

import { imageFileToCanvas, cropCanvas, preprocessForOcr } from './canvasUtils';
import {
  normalizeOcrText,
  extractMarchSizeFromText,
  extractTroopCountsFromText,
  romanToTier,
} from './textParsing';

export interface ScoutExtractionResult {
  fullText: string;
  marchSize: number | null;
  counts: {
    infantry: number | null;
    cavalry: number | null;
    archer: number | null;
  };
  inferred: {
    tier: number | null;
    tgLevel: number | null;
  };
  debug: {
    romanText: string;
    tgText: string;
    iconBox: {
      iconX: number;
      iconY: number;
      iconSize: number;
      W: number;
      H: number;
    };
  };
}

/**
 * Extracts scout data from an uploaded image file.
 * Currently returns a placeholder error since tesseract.js is not installed.
 */
export async function extractScoutFromImage(file: File): Promise<ScoutExtractionResult> {
  // Placeholder implementation - OCR library not available
  throw new Error(
    'Image OCR feature is not yet available. Please paste scout data manually or contact support to enable this feature.'
  );
}
