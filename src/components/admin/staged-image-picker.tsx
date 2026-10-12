"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { reorderImages, setCover } from "@/app/admin/_actions/images";
import { PropertyImage } from "@/components/properties/property-image";
import { admin } from "@/i18n/admin";
import { MAX_PROPERTY_IMAGES } from "@/lib/content";
import { isAcceptedImageType, isHeicFile } from "@/lib/image-compress";
import { imageErrorMessage, ImageUploadError, uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

export type StagedStatus = "queued" | "compressing" | "uploading" | "done" | "failed";

export interface StagedItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string | null;
  status: StagedStatus;
  error: string | null;
  imageId: string | null;
  attempts: number;
}

export interface UploadSummary {
  uploaded: number;
  failed: number;
  total: number;
  allDone: boolean;
}

export interface StagedImagePickerHandle {
  /** Uploads every item that is not already done. Skips successful images. */
  uploadAll(propertyId: string): Promise<UploadSummary>;
  /** Retries a single item (used by the per-image Retry button). */
  uploadOne(propertyId: string, itemId: string): Promise<UploadSummary>;
  reset(): void;
  count(): number;
}

const STATUS_LABEL: Record<StagedStatus, string> = {
  queued: admin.images.statusQueued,
  compressing: admin.images.statusCompressing,
  uploading: admin.images.statusUploading,
  done: admin.images.statusDone,
  failed: admin.images.statusFailed,
};

const STATUS_CLASS: Record<StagedStatus, string> = {
  queued: "badge-draft",
  compressing: "badge-rented",
  uploading: "badge-rented",
  done: "badge-available",
  failed: "badge-error",
};

/** Builds a staged entry; invalid types are kept as failed so the message shows. */
function makeItem(file: File): StagedItem {
  const id = crypto.randomUUID();
  const base = { id, file, name: file.name, imageId: null, attempts: 0 };

  if (isHeicFile(file)) {
    return { ...base, previewUrl: null, status: "failed", error: admin.images.heic };
  }
  if (!isAcceptedImageType(file.type)) {
    return { ...base, previewUrl: null, status: "failed", error: admin.images.badType };
  }
  return {
    ...base,
    previewUrl: URL.createObjectURL(file),
    status: "queued",
    error: null,
  };
}

interface StagedImagePickerProps {
  busy?: boolean;
  onRetryItem?: (id: string) => void;
}

/**
 * Pre-save image picker for the Add form. Files are held locally with per-image
 * status; they are only uploaded once the property has been created (as a
 * draft). Successful uploads are never repeated.
 */
export const StagedImagePicker = forwardRef<StagedImagePickerHandle, StagedImagePickerProps>(
  function StagedImagePicker({ busy = false, onRetryItem }, ref) {
    const [items, setItems] = useState<StagedItem[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const itemsRef = useRef<StagedItem[]>(items);
    const galleryRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      itemsRef.current = items;
    }, [items]);

    const atLimit = items.length >= MAX_PROPERTY_IMAGES;

    function addFiles(list: FileList | null) {
      if (!list || list.length === 0) return;
      const incoming = Array.from(list);
      let overflow = false;
      setItems((prev) => {
        const next = [...prev];
        for (const file of incoming) {
          if (next.length >= MAX_PROPERTY_IMAGES) {
            overflow = true;
            break;
          }
          next.push(makeItem(file));
        }
        return next;
      });
      setNotice(overflow ? admin.images.limitReached : null);
    }

    function removeItem(id: string) {
      setItems((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
        return prev.filter((item) => item.id !== id);
      });
      setNotice(null);
    }

    function reset() {
      for (const item of itemsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      itemsRef.current = [];
      setItems([]);
      setNotice(null);
    }

    async function runUpload(propertyId: string, ids: string[]): Promise<UploadSummary> {
      const working = itemsRef.current.map((item) => ({ ...item }));
      const byId = new Map(working.map((item) => [item.id, item]));

      const commit = () => {
        itemsRef.current = working;
        setItems(working.map((item) => ({ ...item })));
      };

      let uploaded = 0;
      let failed = 0;
      let retried = false;

      for (const id of ids) {
        const item = byId.get(id);
        if (!item || item.status === "done") continue;

        if (item.attempts > 0) retried = true;
        item.attempts += 1;
        item.status = "compressing";
        item.error = null;
        commit();

        try {
          const row = await uploadImage(propertyId, item.file, (stage) => {
            item.status = stage;
            commit();
          });
          item.status = "done";
          item.imageId = row.id;
          uploaded += 1;
        } catch (error) {
          item.status = "failed";
          item.error = imageErrorMessage(error instanceof ImageUploadError ? error.key : "");
          failed += 1;
        }
        commit();
      }

      // A retry can upload out of the display order; restore order + cover then.
      const allDone = working.length > 0 && working.every((item) => item.status === "done");
      if (retried && allDone) {
        const orderedIds = working
          .map((item) => item.imageId)
          .filter((value): value is string => Boolean(value));
        await reorderImages(propertyId, orderedIds).catch(() => {});
        if (orderedIds[0]) await setCover(propertyId, orderedIds[0]).catch(() => {});
      }

      return { uploaded, failed, total: working.length, allDone };
    }

    useImperativeHandle(ref, () => ({
      uploadAll: (propertyId) =>
        runUpload(
          propertyId,
          itemsRef.current.filter((item) => item.status !== "done").map((item) => item.id),
        ),
      uploadOne: (propertyId, itemId) => runUpload(propertyId, [itemId]),
      reset,
      count: () => itemsRef.current.length,
    }));

    return (
      <section className="border-line bg-surface rounded-xl border p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-ink font-heading text-lg font-semibold">{admin.images.title}</h2>
            <p className="text-ink-muted mt-1 text-xs">{admin.images.stagedHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy || atLimit}
              onClick={() => galleryRef.current?.click()}
              className="btn btn-secondary-dark text-sm"
            >
              {admin.images.upload}
            </button>
            <button
              type="button"
              disabled={busy || atLimit}
              onClick={() => cameraRef.current?.click()}
              className="btn btn-outline text-sm"
            >
              {admin.images.takePhoto}
            </button>
          </div>
        </div>

        {notice ? (
          <p role="alert" className="text-error mb-4 text-sm">
            {notice}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="text-ink-secondary py-6 text-center text-sm">{admin.images.empty}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <li key={item.id} className="border-line overflow-hidden rounded-xl border">
                <div className="bg-surface-cream relative aspect-[4/3]">
                  <PropertyImage
                    src={item.previewUrl}
                    alt={item.name}
                    sizes="(max-width: 640px) 100vw, 320px"
                    unoptimized
                  />
                  {index === 0 ? (
                    <span className="badge badge-featured absolute end-2 top-2">
                      {admin.images.cover}
                    </span>
                  ) : null}
                </div>
                <div className="border-line flex flex-col gap-2 border-t px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("badge", STATUS_CLASS[item.status])}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    <span dir="auto" className="text-ink-muted truncate text-xs">
                      {item.name}
                    </span>
                  </div>
                  {item.error ? <p className="text-error text-xs">{item.error}</p> : null}
                  <div className="flex items-center justify-end gap-3">
                    {item.status === "failed" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRetryItem?.(item.id)}
                        className="text-action-navy text-xs font-medium hover:underline"
                      >
                        {admin.images.retry}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={
                        busy || item.status === "compressing" || item.status === "uploading"
                      }
                      onClick={() => removeItem(item.id)}
                      className="text-error text-xs font-medium hover:underline"
                    >
                      {admin.common.remove}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  },
);
