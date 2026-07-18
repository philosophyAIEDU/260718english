/*
 * Client-side image preprocessing.
 *
 * Photos straight from a phone camera are often 8–12 MP; sending them as-is
 * makes the Gemini call slow and costly. Before uploading we downscale the
 * longest edge to MAX_DIMENSION px and re-encode as JPEG. The processed
 * image only lives in memory — it is never persisted anywhere.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Resize/compress an image File and return { base64, mimeType, previewUrl }.
 * `base64` is the raw payload (no data: prefix) ready for the Gemini API.
 */
export async function prepareImageForUpload(file) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = jpegDataUrl.split(',')[1];

  return {
    base64,
    mimeType: 'image/jpeg',
    previewUrl: jpegDataUrl,
    width,
    height,
  };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The selected file is not a valid image.'));
    img.src = src;
  });
}
