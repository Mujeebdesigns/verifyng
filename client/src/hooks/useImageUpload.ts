import { useState } from 'react';
import { compressImage } from '../utils/compressImage.js';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '../utils/constants.js';

interface UseImageUploadOptions {
  /** Longest edge the compressed image is downscaled to. */
  maxDimension: number;
  minWidth: number;
  minHeight: number;
}

/**
 * Validates size/dimensions then compresses an uploaded image so the stored/
 * uploaded base64 stays small (raw multi-MB photos otherwise blow past
 * request body limits — see compressImage). Shared by the vendor registration
 * wizard and the vendor dashboard's cover/logo upload forms.
 */
export function useImageUpload({ maxDimension, minWidth, minHeight }: UseImageUploadOptions) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setError('Image is too large. Maximum size is 8MB.');
      return;
    }

    try {
      const { dataUrl, width, height } = await compressImage(file, { maxDimension });
      if (width < minWidth || height < minHeight) {
        setError(`Image is too small (${width}x${height}px). Minimum required is ${minWidth}x${minHeight}px.`);
        return;
      }
      setValue(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid image file.');
    }
  };

  return { value, setValue, error, setError, handleChange };
}
