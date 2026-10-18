import type { PropertyFilters, PropertySort } from "@/lib/data/properties";
import type { ListingType, PropertyStatus, PropertyType } from "@/types/database";

export const LISTING_TYPES = ["sale", "rent"] as const;
export const PROPERTY_TYPES = [
  "apartment",
  "duplex",
  "penthouse",
  "studio",
  "villa",
  "twin_house",
  "quattro_villa",
  "standalone_villa",
  "townhouse",
  "family_house",
  "chalet",
  "land",
  "office",
  "shop",
] as const;
export const PROPERTY_STATUSES = ["available", "sold", "rented"] as const;
export const PROPERTY_SORTS = ["newest", "price-asc", "price-desc"] as const;

export type SearchParamValue = string | string[] | undefined;

export function firstParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: SearchParamValue): number | undefined {
  const raw = firstParam(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickOne<T extends string>(value: SearchParamValue, allowed: readonly T[]): T | undefined {
  const raw = firstParam(value);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

export interface ParsedPropertySearch {
  filters: PropertyFilters;
  areaSlug: string | null;
  page: number;
}

/** Parses and validates the property listing search params. */
export function parsePropertySearch(
  searchParams: Record<string, SearchParamValue>,
): ParsedPropertySearch {
  const page = Math.max(1, Math.trunc(toNumber(searchParams.page) ?? 1));

  return {
    areaSlug: firstParam(searchParams.area) ?? null,
    page,
    filters: {
      listingType: pickOne<ListingType>(searchParams.listingType, LISTING_TYPES),
      propertyType: pickOne<PropertyType>(searchParams.propertyType, PROPERTY_TYPES),
      compound: firstParam(searchParams.compound)?.trim() || undefined,
      status: pickOne<PropertyStatus>(searchParams.status, PROPERTY_STATUSES),
      bedrooms: toNumber(searchParams.bedrooms),
      minPrice: toNumber(searchParams.minPrice),
      maxPrice: toNumber(searchParams.maxPrice),
      minArea: toNumber(searchParams.minArea),
      maxArea: toNumber(searchParams.maxArea),
      sort: pickOne<PropertySort>(searchParams.sort, PROPERTY_SORTS) ?? "newest",
      page,
    },
  };
}
