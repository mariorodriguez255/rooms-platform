// Limits of the photos that reach the server: the browser resizes and
// re-encodes every photo as JPEG before uploading it (see resize.ts and
// ADR 0009). The bucket enforces the same size and type.

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_PHOTO_DIMENSION = 2048;
export const PHOTO_CONTENT_TYPE = "image/jpeg";

// Every JPEG file starts with the SOI marker followed by another marker.
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// Size that fits within `max`×`max` keeping the aspect ratio. Never
// enlarges a smaller image.
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_PHOTO_DIMENSION,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
