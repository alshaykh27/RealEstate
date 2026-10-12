/**
 * Shared client-side image upload pipeline: authorize → compress to WebP →
 * upload straight to Supabase Storage with a signed URL → record the row.
 *
 * Used by both the edit-screen `ImageManager` and the Add-form staged uploader
 * so the two share one implementation of the signed-URL flow.
 */

import { createImageUploadUrl, finalizeImage, type ImageRow } from "@/app/admin/_actions/images";
import { admin } from "@/i18n/admin";
import { PROPERTY_IMAGE_BUCKET } from "@/lib/content";
import {
  compressToWebp,
  isAcceptedImageType,
  isHeicFile,
  MAX_IMAGE_BYTES,
} from "@/lib/image-compress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type UploadStage = "compressing" | "uploading";

export type ImageErrorKey = "heic" | "type" | "tooLarge" | "compress" | "upload";

export class ImageUploadError extends Error {
  readonly key: ImageErrorKey;

  constructor(key: ImageErrorKey) {
    super(key);
    this.name = "ImageUploadError";
    this.key = key;
  }
}

/** Maps an upload failure key to its admin-facing message. */
export function imageErrorMessage(key: ImageErrorKey | string): string {
  switch (key) {
    case "heic":
      return admin.images.heic;
    case "type":
      return admin.images.badType;
    case "tooLarge":
      return admin.images.tooLarge;
    case "compress":
      return admin.images.compressFailed;
    default:
      return admin.images.uploadFailed;
  }
}

/**
 * Validate + compress a file and upload it against a saved property. Reports
 * coarse progress (`compressing` → `uploading`) so the UI can show per-image
 * status. Throws `ImageUploadError` on any failure.
 */
export async function uploadImage(
  propertyId: string,
  file: File,
  onStage: (stage: UploadStage) => void = () => {},
): Promise<ImageRow> {
  if (isHeicFile(file)) throw new ImageUploadError("heic");
  if (!isAcceptedImageType(file.type)) throw new ImageUploadError("type");

  onStage("compressing");
  const compressed = await compressToWebp(file).catch(() => {
    throw new ImageUploadError("compress");
  });
  if (compressed.blob.size > MAX_IMAGE_BYTES) throw new ImageUploadError("tooLarge");

  onStage("uploading");
  const target = await createImageUploadUrl(propertyId);
  if ("error" in target) throw new ImageUploadError("upload");

  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from(PROPERTY_IMAGE_BUCKET)
    .uploadToSignedUrl(target.path, target.token, compressed.blob, {
      contentType: "image/webp",
    });
  if (uploadError) throw new ImageUploadError("upload");

  const inserted = await finalizeImage({
    propertyId,
    storagePath: target.path,
    width: compressed.width,
    height: compressed.height,
    sizeBytes: compressed.blob.size,
    altEn: "",
    altAr: null,
  });
  if ("error" in inserted) throw new ImageUploadError("upload");

  return inserted;
}
