import {
  fitWithin,
  MAX_PHOTO_BYTES,
  PHOTO_CONTENT_TYPE,
} from "@/lib/photos/constraints";

// Runs in the browser before uploading (ADR 0009). Drawing the photo on a
// canvas and encoding it again as JPEG:
// - shrinks it to at most 2048 px on its long side (a 3–8 MB phone photo
//   becomes a few hundred KB);
// - drops its metadata (EXIF), including the GPS position that phones
//   record, so a photo never reveals where it was taken;
// - leaves a format every portal accepts.

export type ResizedPhoto = { blob: Blob; width: number; height: number };

// Lower qualities are only tried if a photo is still too heavy.
const QUALITIES = [0.85, 0.7, 0.5];

export async function resizeToJpeg(file: Blob): Promise<ResizedPhoto> {
  // from-image: apply the EXIF rotation before it is dropped.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available");
    // JPEG has no transparency: paint transparent PNGs over white.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, PHOTO_CONTENT_TYPE, quality),
      );
      if (blob && blob.size <= MAX_PHOTO_BYTES) return { blob, width, height };
    }
    throw new Error("The photo is too large even after resizing");
  } finally {
    bitmap.close();
  }
}
