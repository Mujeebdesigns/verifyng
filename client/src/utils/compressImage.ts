interface CompressOptions {
  /** Longest edge of the output, in px. Larger images are downscaled to fit. */
  maxDimension: number;
  /** JPEG quality 0–1. */
  quality?: number;
}

interface CompressResult {
  /** Compressed JPEG as a base64 data URI. */
  dataUrl: string;
  /** Original (pre-downscale) dimensions, for minimum-size validation. */
  width: number;
  height: number;
}

/**
 * Downscale + re-encode an uploaded image to a small JPEG data URI.
 *
 * Vendor images are stored as base64 in the DB and sent in the JSON body, so a
 * raw multi-MB photo blows past the request body limit, the image-field cap,
 * and the DB write's transaction timeout. Compressing to ~1600px / q0.82
 * typically yields 150–500 KB, which sails through all three and keeps profile
 * fetches light. Only downscales (never upscales), so minimum-size rules hold.
 */
export function compressImage(file: File, { maxDimension, quality = 0.82 }: CompressOptions): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Image compression is not supported in this browser.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file.'));
    };

    img.src = objectUrl;
  });
}
