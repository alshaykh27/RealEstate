import Link from "next/link";

import { PropertyImage } from "@/components/properties/property-image";
import { StatusBadge } from "@/components/properties/status-badge";
import type { Locale } from "@/i18n/config";
import { fieldLabel, type Dictionary } from "@/i18n/dictionaries";
import {
  coverImage,
  formatArea,
  formatPrice,
  localize,
  localizedText,
  propertyImageUrl,
} from "@/lib/content";
import type { PropertyListItem } from "@/types/database";

export function PropertyCard({
  property,
  locale,
  dict,
}: {
  property: PropertyListItem;
  locale: Locale;
  dict: Dictionary;
}) {
  const title = localize(locale, property.title_en, property.title_ar);
  const areaName = property.area
    ? localize(locale, property.area.name_en, property.area.name_ar)
    : null;
  const cover = coverImage(property.property_images);
  const alt = cover ? localize(locale, cover.alt_en, cover.alt_ar) : title;
  const compoundName = localizedText(locale, property.compound_en, property.compound_ar);
  const href = `/${locale}/properties/${property.slug}`;

  return (
    <Link
      href={href}
      className="group border-line bg-surface shadow-card hover:shadow-elevated hover:border-gold-deep/40 flex h-full flex-col overflow-hidden rounded-2xl border transition-[box-shadow,border-color]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PropertyImage
          src={cover ? propertyImageUrl(cover.storage_path) : null}
          alt={alt}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          imageClassName="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute start-3 top-3 flex flex-wrap gap-2">
          <StatusBadge status={property.status} labels={dict.badges} />
          {property.is_featured ? (
            <span className="badge badge-featured">{dict.badges.featured}</span>
          ) : null}
        </div>
        <span className="bg-obsidian/70 text-on-dark absolute end-3 bottom-3 rounded-full px-3 py-1 text-xs font-medium">
          {property.listing_type === "rent" ? dict.listingType.rent : dict.listingType.sale}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-ink group-hover:text-navy line-clamp-1 text-lg font-semibold transition-colors">
            {title}
          </h3>
          {areaName ? (
            <p className="flex items-center gap-1.5">
              <span className="bg-gold-soft text-ink-secondary rounded-full px-2 py-0.5 text-xs font-medium">
                <span className="text-gold-deep font-semibold">{dict.common.areaLabel}: </span>
                {areaName}
              </span>
            </p>
          ) : null}
          {compoundName ? (
            <p className="text-ink-muted min-w-0 truncate text-xs">
              <span className="font-medium">{dict.fields.compound}: </span>
              {compoundName}
            </p>
          ) : null}
        </div>

        <div className="text-ink-secondary flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>{dict.propertyType[property.property_type]}</span>
          {property.bedrooms !== null ? (
            <span>
              {dict.fields.bedrooms}: {property.bedrooms}
            </span>
          ) : null}
          {property.bathrooms !== null ? (
            <span>
              {dict.fields.bathrooms}: {property.bathrooms}
            </span>
          ) : null}
          {property.area_sqm !== null ? <span>{formatArea(locale, property.area_sqm)}</span> : null}
          {property.land_area_sqm !== null ? (
            <span>
              {fieldLabel(dict, "landArea")}: {formatArea(locale, property.land_area_sqm)}
            </span>
          ) : null}
        </div>

        <div className="border-line mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-navy font-heading text-lg font-bold">
            <bdi>{formatPrice(locale, property.price, property.currency)}</bdi>
          </span>
          <span className="text-gold-deep shrink-0 text-sm font-medium">
            {dict.common.viewDetails}
          </span>
        </div>
      </div>
    </Link>
  );
}
