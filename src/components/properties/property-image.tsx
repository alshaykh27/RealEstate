"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface PropertyImageProps {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  preload?: boolean;
  unoptimized?: boolean;
}

/**
 * Property photo with a graceful branded placeholder when the source is
 * missing or fails to load (e.g. seed rows whose storage objects are absent).
 */
export function PropertyImage({
  src,
  alt,
  sizes,
  className,
  imageClassName,
  preload,
  unoptimized,
}: PropertyImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "bg-surface-cream absolute inset-0 flex items-center justify-center",
          className,
        )}
      >
        <span className="text-ink-muted px-4 text-center text-xs font-medium">{alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      unoptimized={unoptimized}
      className={cn("object-cover", imageClassName, className)}
      onError={() => setFailed(true)}
    />
  );
}
