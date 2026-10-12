"use client";

import { useRef, useState } from "react";

import {
  createImageUploadUrl,
  finalizeImage,
  removeImage,
  reorderImages,
  setCover,
  updateImageAlt,
  type ImageRow,
} from "@/app/admin/_actions/images";
import { PropertyImage } from "@/components/properties/property-image";
import { admin } from "@/i18n/admin";
import { MAX_PROPERTY_IMAGES, PROPERTY_IMAGE_BUCKET, propertyImageUrl } from "@/lib/content";
import { compressToWebp, isAcceptedImageType, MAX_IMAGE_BYTES } from "@/lib/image-compress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function sortByOrder(images: ImageRow[]): ImageRow[] {
  return [...images].sort((a, b) => a.sort_order - b.sort_order);
}

function messageFor(error: unknown): string {
  const key = error instanceof Error ? error.message : "";
  if (key === "type") return admin.images.badType;
  if (key === "tooLarge") return admin.images.tooLarge;
  if (key === "compress") return admin.images.compressFailed;
  return admin.images.uploadFailed;
}

export function ImageManager({
  propertyId,
  initialImages,
}: {
  propertyId: string;
  initialImages: ImageRow[];
}) {
  const [images, setImages] = useState<ImageRow[]>(() => sortByOrder(initialImages));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atLimit = images.length >= MAX_PROPERTY_IMAGES;

  async function uploadFile(file: File): Promise<ImageRow> {
    if (!isAcceptedImageType(file.type)) throw new Error("type");

    const target = await createImageUploadUrl(propertyId);
    if ("error" in target) throw new Error("upload");

    const compressed = await compressToWebp(file).catch(() => {
      throw new Error("compress");
    });
    if (compressed.blob.size > MAX_IMAGE_BYTES) throw new Error("tooLarge");

    const supabase = getSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from(PROPERTY_IMAGE_BUCKET)
      .uploadToSignedUrl(target.path, target.token, compressed.blob, {
        contentType: "image/webp",
      });
    if (uploadError) throw new Error("upload");

    const inserted = await finalizeImage({
      propertyId,
      storagePath: target.path,
      width: compressed.width,
      height: compressed.height,
      sizeBytes: compressed.blob.size,
      altEn: "",
      altAr: null,
    });
    if ("error" in inserted) throw new Error("upload");

    return inserted;
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        if (images.length >= 20) {
          setError(admin.images.limitReached);
          break;
        }
        const inserted = await uploadFile(file);
        setImages((prev) => sortByOrder([...prev, inserted]));
      }
    } catch (uploadError) {
      setError(messageFor(uploadError));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;

    const previous = images;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrder = reordered.map((image, position) => ({ ...image, sort_order: position }));

    setImages(withOrder);
    setBusy(true);
    const result = await reorderImages(
      propertyId,
      withOrder.map((image) => image.id),
    );
    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      setImages(previous);
    }
  }

  async function onSetCover(imageId: string) {
    setBusy(true);
    setError(null);
    const result = await setCover(propertyId, imageId);
    if ("error" in result) setError(result.error);
    else setImages((prev) => prev.map((image) => ({ ...image, is_cover: image.id === imageId })));
    setBusy(false);
  }

  async function onRemove(imageId: string) {
    if (!window.confirm(admin.images.removeConfirm)) return;
    setBusy(true);
    setError(null);
    const result = await removeImage(propertyId, imageId);
    if ("error" in result) {
      setError(result.error);
    } else {
      setImages((prev) => {
        const remaining = prev.filter((image) => image.id !== imageId);
        const hadCover = prev.find((image) => image.id === imageId)?.is_cover;
        if (hadCover && remaining.length > 0) {
          return remaining.map((image, index) => ({ ...image, is_cover: index === 0 }));
        }
        return remaining;
      });
    }
    setBusy(false);
  }

  async function onAltBlur(imageId: string, altEn: string, altAr: string) {
    const result = await updateImageAlt(propertyId, imageId, altEn, altAr.trim() || null);
    if ("error" in result) setError(result.error);
  }

  return (
    <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-ink font-heading text-lg font-semibold">{admin.images.title}</h2>
          <p className="text-ink-muted mt-1 text-xs">{admin.images.hint}</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event) => onFilesSelected(event.target.files)}
          />
          <button
            type="button"
            disabled={busy || atLimit}
            onClick={() => inputRef.current?.click()}
            className="btn btn-secondary-dark text-sm"
          >
            {busy ? admin.images.uploading : admin.images.upload}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-error mb-4 text-sm">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="text-ink-secondary py-6 text-center text-sm">{admin.images.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="border-line overflow-hidden rounded-xl border">
              <div className="bg-surface-cream relative aspect-[4/3]">
                <PropertyImage
                  src={propertyImageUrl(image.storage_path)}
                  alt={image.alt_en || "property"}
                  sizes="(max-width: 640px) 100vw, 320px"
                />
                {image.is_cover ? (
                  <span className="badge badge-available absolute start-2 top-2">
                    {admin.images.cover}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1 p-2">
                {!image.is_cover ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSetCover(image.id)}
                    className="text-ink-secondary hover:text-gold-deep rounded px-2 py-1 text-xs font-medium"
                  >
                    {admin.images.setCover}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  className="text-ink-secondary hover:text-ink rounded px-2 py-1 text-xs disabled:opacity-40"
                >
                  {admin.images.moveUp}
                </button>
                <button
                  type="button"
                  disabled={busy || index === images.length - 1}
                  onClick={() => move(index, 1)}
                  className="text-ink-secondary hover:text-ink rounded px-2 py-1 text-xs disabled:opacity-40"
                >
                  {admin.images.moveDown}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(image.id)}
                  className="text-error ms-auto rounded px-2 py-1 text-xs font-medium hover:underline"
                >
                  {admin.common.remove}
                </button>
              </div>

              <div className={cn("border-line grid gap-2 border-t p-2")}>
                <input
                  aria-label={admin.images.altEn}
                  placeholder={admin.images.altEn}
                  defaultValue={image.alt_en}
                  dir="ltr"
                  onBlur={(event) => onAltBlur(image.id, event.target.value, image.alt_ar ?? "")}
                  className="border-line-strong bg-surface text-ink w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                />
                <input
                  aria-label={admin.images.altAr}
                  placeholder={admin.images.altAr}
                  defaultValue={image.alt_ar ?? ""}
                  onBlur={(event) => onAltBlur(image.id, image.alt_en, event.target.value)}
                  className="border-line-strong bg-surface text-ink w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
