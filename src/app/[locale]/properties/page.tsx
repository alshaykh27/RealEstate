import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  PropertyFilters,
  type PropertyFiltersLabels,
  type FilterTypeOption,
} from "@/components/properties/property-filters";
import { PropertyGrid } from "@/components/properties/property-grid";
import { Reveal } from "@/components/motion/reveal";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { localize } from "@/lib/content";
import { getAreaBySlug, getAreas } from "@/lib/data/areas";
import { DEFAULT_PAGE_SIZE, searchProperties } from "@/lib/data/properties";
import {
  firstParam,
  parsePropertySearch,
  PROPERTY_TYPES,
  type SearchParamValue,
} from "@/lib/search-params";
import { localeAlternates } from "@/lib/seo";

type SearchParams = Record<string, SearchParamValue>;

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/properties">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.search.heading,
    description: dict.search.subhead,
    alternates: localeAlternates(locale, "properties"),
  };
}

export default async function PropertiesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/properties">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const propertyTypes: FilterTypeOption[] = PROPERTY_TYPES.map((value) => ({
    value,
    label: dict.propertyType[value],
  }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <Reveal>
          <h1 className="text-ink text-3xl font-bold">{dict.search.heading}</h1>
          <p className="text-ink-secondary mt-3 max-w-2xl leading-relaxed">{dict.search.subhead}</p>
        </Reveal>
      </header>

      <Suspense fallback={<div className="border-line bg-surface h-56 rounded-2xl border" />}>
        <Filters locale={locale} dict={dict} propertyTypes={propertyTypes} />
      </Suspense>

      <Suspense fallback={<ResultsSkeleton />}>
        <Results locale={locale} dict={dict} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Filters({
  locale,
  dict,
  propertyTypes,
}: {
  locale: Locale;
  dict: Dictionary;
  propertyTypes: FilterTypeOption[];
}) {
  const areas = await getAreas();
  const labels: PropertyFiltersLabels = {
    heading: dict.search.filtersHeading,
    listingType: dict.fields.listingType,
    propertyType: dict.fields.propertyType,
    area: dict.nav.areas,
    bedrooms: dict.fields.bedrooms,
    price: dict.fields.price,
    size: dict.fields.area,
    all: dict.common.all,
    min: dict.common.min,
    max: dict.common.max,
    apply: dict.common.apply,
    reset: dict.common.reset,
    sort: dict.common.sort,
    sortNewest: dict.search.sortNewest,
    sortPriceAsc: dict.search.sortPriceAsc,
    sortPriceDesc: dict.search.sortPriceDesc,
    listingSale: dict.listingType.sale,
    listingRent: dict.listingType.rent,
  };

  return (
    <PropertyFilters
      areas={areas.map((area) => ({
        slug: area.slug,
        name: localize(locale, area.name_en, area.name_ar),
      }))}
      propertyTypes={propertyTypes}
      bedrooms={BEDROOM_OPTIONS}
      labels={labels}
    />
  );
}

async function Results({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Dictionary;
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const parsed = parsePropertySearch(resolved);
  const area = parsed.areaSlug ? await getAreaBySlug(parsed.areaSlug) : null;

  const result = await searchProperties({
    ...parsed.filters,
    areaId: area?.id,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const basePath = `/${locale}/properties`;
  const hrefForPage = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(resolved)) {
      if (key === "page") continue;
      const single = firstParam(value);
      if (single) query.set(key, single);
    }
    if (page > 1) query.set("page", String(page));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-secondary text-sm">{dict.search.resultsCount(result.total)}</p>

      <PropertyGrid
        properties={result.items}
        locale={locale}
        dict={dict}
        empty={
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-ink text-xl font-semibold">{dict.search.emptyTitle}</h2>
            <p className="text-ink-secondary max-w-md">{dict.search.emptyBody}</p>
          </div>
        }
      />

      {result.pageCount > 1 ? (
        <nav
          aria-label={dict.search.heading}
          className="border-line flex items-center justify-between gap-4 border-t pt-6"
        >
          {result.page > 1 ? (
            <a href={hrefForPage(result.page - 1)} className="btn btn-secondary-light">
              {dict.properties.prev}
            </a>
          ) : (
            <span />
          )}
          <span className="text-ink-secondary text-sm">
            {dict.properties.pageInfo(result.page, result.pageCount)}
          </span>
          {result.page < result.pageCount ? (
            <a href={hrefForPage(result.page + 1)} className="btn btn-secondary-light">
              {dict.properties.next}
            </a>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border-line bg-surface overflow-hidden rounded-2xl border">
          <div className="bg-cream aspect-[4/3] animate-pulse" />
          <div className="flex flex-col gap-3 p-5">
            <div className="bg-cream h-5 w-3/4 animate-pulse rounded" />
            <div className="bg-cream h-4 w-1/2 animate-pulse rounded" />
            <div className="bg-cream h-6 w-1/3 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
