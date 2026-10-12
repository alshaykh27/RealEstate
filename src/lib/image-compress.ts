/**
 * Client-side image compression to WebP (canvas, no extra dependency). Keeps
 * the uploaded payload small before it goes straight to Supabase Storage via a
 * signed URL. Only imported from Client Components.
 */

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Longest side of the compressed image, in pixels. */
const TARGET_DIMENSION = 1600;
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.12;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export function isAcceptedImageType(type: string): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(type);
}

/**
 * HEIC/HEIF (the default iPhone photo format) cannot be decoded by
 * `createImageBitmap` in most browsers, so we detect it up front and surface a
 * clear message instead of a generic failure. Checks both MIME type and the
 * file extension (some browsers report an empty/incorrect type).
 */
export function isHeicFile(file: { type?: string; name?: string }): boolean {
  const type = (file.type ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.(heic|heif)$/.test(name);
}

function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

export async function compressToWebp(file: File): Promise<CompressedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("decode");
  }

  const scale = Math.min(1, TARGET_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("canvas-unavailable");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Iterate quality downwards until the WebP fits the 3 MiB budget (or we hit
  // the floor, in which case the caller rejects it as too large).
  let quality = START_QUALITY;
  let blob = await encodeWebp(canvas, quality);
  while ((!blob || blob.size > MAX_IMAGE_BYTES) && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await encodeWebp(canvas, quality);
  }

  if (!blob || blob.type !== "image/webp") {
    throw new Error("webp-unsupported");
  }

  return { blob, width, height };
}
