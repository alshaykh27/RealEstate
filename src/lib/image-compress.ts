/**
 * Client-side image compression to WebP (canvas, no extra dependency). Keeps
 * the uploaded payload small before it goes straight to Supabase Storage via a
 * signed URL. Only imported from Client Components.
 */

export const MAX_IMAGE_BYTES = 3145728;
const MAX_DIMENSION = 2560;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export function isAcceptedImageType(type: string): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(type);
}

export async function compressToWebp(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );

  if (!blob || blob.type !== "image/webp") {
    throw new Error("webp-unsupported");
  }

  return { blob, width, height };
}
