/**
 * Canvas preprocessing utilities for OCR image processing.
 * Provides functions to load images, crop regions, and preprocess for improved OCR accuracy.
 */

/**
 * Loads an image file and draws it to a canvas
 */
export async function imageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return canvas;
}

/**
 * Crops a region from a source canvas
 */
export function cropCanvas(
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(w));
  c.height = Math.max(1, Math.floor(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  ctx.drawImage(src, x, y, w, h, 0, 0, c.width, c.height);
  return c;
}

/**
 * Preprocesses canvas for OCR by converting to grayscale and applying binary threshold
 */
export function preprocessForOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    // Grayscale conversion
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Binary threshold at 160
    const v = gray > 160 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }

  ctx.putImageData(img, 0, 0);
  return c;
}
