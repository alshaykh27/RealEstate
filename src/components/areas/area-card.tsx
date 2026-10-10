import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { localize } from "@/lib/content";
import type { Area } from "@/types/database";

export function AreaCard({
  area,
  countLabel,
  exploreLabel,
  locale,
}: {
  area: Area;
  countLabel: string;
  exploreLabel: string;
  locale: Locale;
}) {
  const name = localize(locale, area.name_en, area.name_ar);
  const description = localize(locale, area.description_en, area.description_ar);

  return (
    <Link
      href={`/${locale}/areas/${area.slug}`}
      className="group border-line bg-surface shadow-card hover:shadow-elevated hover:border-gold-deep/40 flex h-full flex-col gap-2 rounded-2xl border p-6 transition-[box-shadow,border-color]"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-ink group-hover:text-navy text-lg font-semibold">{name}</h3>
        <span className="text-gold-deep shrink-0 text-sm font-medium">{countLabel}</span>
      </div>
      <p className="text-ink-secondary line-clamp-3 text-sm leading-relaxed">{description}</p>
      <span className="text-navy mt-2 text-sm font-medium">{exploreLabel} →</span>
    </Link>
  );
}
