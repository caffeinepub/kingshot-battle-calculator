/**
 * OCR extraction utility for processing scout report images.
 * Uses tesseract.js loaded from CDN for optical character recognition.
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

// Lazy-load tesseract.js from CDN
let tesseractPromise: Promise<any> | null = null;

async function loadTesseract() {
  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).Tesseract) {
      resolve((window as any).Tesseract);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/[email protected]/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).Tesseract) {
        resolve((window as any).Tesseract);
      } else {
        reject(new Error('Tesseract.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Tesseract.js from CDN'));
    document.head.appendChild(script);
  });

  return tesseractPromise;
}

/**
 * Performs OCR on a canvas region and returns recognized text
 */
async function recognizeText(canvas: HTMLCanvasElement): Promise<string> {
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker('eng');
  
  try {
    const { data } = await worker.recognize(canvas);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts scout data from an uploaded image file.
 * Processes the image to extract troop counts, tier, TG level, and stat bonuses.
 */
export async function extractScoutFromImage(file: File): Promise<ScoutExtractionResult> {
  try {
    // Load image to canvas
    const canvas = await imageFileToCanvas(file);
    const W = canvas.width;
    const H = canvas.height;

    // Estimate icon positions based on typical scout report layout
    // Icons are usually in the middle section, arranged horizontally
    const iconY = Math.floor(H * 0.35); // Icons typically around 35% from top
    const iconSize = Math.floor(Math.min(W, H) * 0.12); // Icons are roughly 12% of smaller dimension
    const iconX = Math.floor(W * 0.15); // First icon starts around 15% from left

    // Extract tier (Roman numeral at bottom of icon)
    const tierRegion = cropCanvas(
      canvas,
      iconX,
      iconY + Math.floor(iconSize * 0.75), // Bottom 25% of icon
      iconSize,
      Math.floor(iconSize * 0.25)
    );
    const tierPreprocessed = preprocessForOcr(tierRegion);
    const tierText = await recognizeText(tierPreprocessed);
    const tier = romanToTier(tierText);

    // Extract TG level (digit at top-right of icon)
    const tgRegion = cropCanvas(
      canvas,
      iconX + Math.floor(iconSize * 0.65), // Right 35% of icon
      iconY,
      Math.floor(iconSize * 0.35),
      Math.floor(iconSize * 0.3) // Top 30% of icon
    );
    const tgPreprocessed = preprocessForOcr(tgRegion);
    const tgText = await recognizeText(tgPreprocessed);
    const tgMatch = tgText.match(/[1-5]/);
    const tgLevel = tgMatch ? parseInt(tgMatch[0]) : null;

    // Extract full text from entire image for stat bonuses and troop counts
    const fullPreprocessed = preprocessForOcr(canvas);
    const fullText = await recognizeText(fullPreprocessed);
    const normalized = normalizeOcrText(fullText);

    // Extract march size and troop counts
    const marchSize = extractMarchSizeFromText(normalized);
    const counts = extractTroopCountsFromText(normalized);

    return {
      fullText: normalized,
      marchSize,
      counts,
      inferred: {
        tier,
        tgLevel,
      },
      debug: {
        romanText: tierText,
        tgText: tgText,
        iconBox: {
          iconX,
          iconY,
          iconSize,
          W,
          H,
        },
      },
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error(
      'Could not extract scout data from image. Please ensure the image shows a clear Kingshot scout report with visible troop icons and stat bonuses.'
    );
  }
}
