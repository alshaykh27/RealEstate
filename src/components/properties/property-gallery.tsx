"use client";

import { useState } from "react";

import { PropertyImage } from "@/components/properties/property-image";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  alt: string;
}

export function PropertyGallery({
  images,
  placeholderLabel,
}: {
  images: GalleryImage[];
  placeholderLabel: string;
}) {
  const [active, setActive] = useState(0);
  const safeImages = images.length > 0 ? images : [{ url: "", alt: placeholderLabel }];
  const current = safeImages[Math.min(active, safeImages.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="border-line relative aspect-[16/10] overflow-hidden rounded-2xl border">
        <PropertyImage
          src={current.url || null}
          alt={current.alt}
          sizes="(min-width: 1024px) 60vw, 100vw"
          preload
        />
      </div>

      {safeImages.length > 1 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {safeImages.map((image, index) => (
            <li key={`${index}-${image.url}`}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={image.alt}
                aria-current={index === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors",
                  index === active ? "border-gold" : "border-line hover:border-gold-light",
                )}
              >
                <PropertyImage src={image.url || null} alt={image.alt} sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
