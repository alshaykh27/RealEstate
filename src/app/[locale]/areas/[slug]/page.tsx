import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PropertyGrid } from "@/components/properties/property-grid";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localize } from "@/lib/content";
import { getAreaBySlug, getAreas } from "@/lib/data/areas";
import { searchProperties } from "@/lib/data/properties";
import { localeAlternates } from "@/lib/seo";

export async function generateStaticParams() {
  const areas = await getAreas();
  return areas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/areas/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const area = await getAreaBySlug(slug);
  if (!area) return {};

  return {
    title: localize(locale, area.name_en, area.name_ar),
    description: localize(locale, area.description_en, area.description_ar),
    alternates: localeAlternates(locale, `areas/${area.slug}`),
  };
}

export default function AreaPage({ params }: PageProps<"/[locale]/areas/[slug]">) {
  return (
    <Suspense fallback={<AreaSkeleton />}>
      <AreaDetail params={params} />
    </Suspense>
  );
}

async function AreaDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const area = await getAreaBySlug(slug);
  if (!area) notFound();

  const name = localize(locale, area.name_en, area.name_ar);
  const description = localize(locale, area.description_en, area.description_ar);
  const results = await searchProperties({ areaId: area.id, pageSize: 24, sort: "newest" });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/${locale}/areas`}
          className="text-ink-secondary hover:text-ink text-sm font-medium"
        >
          ← {dict.area.backToAreas}
        </Link>
      </div>

      <header className="flex flex-col gap-3">
        <h1 className="text-ink text-3xl font-bold">{name}</h1>
        <p className="text-ink-secondary max-w-3xl leading-relaxed">{description}</p>
        <p className="text-gold-deep text-sm font-medium">
          {dict.search.resultsCount(results.total)}
        </p>
      </header>

      <PropertyGrid
        properties={results.items}
        locale={locale}
        dict={dict}
        empty={<p className="text-ink-secondary">{dict.area.empty}</p>}
      />
    </main>
  );
}

function AreaSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="bg-cream h-5 w-32 animate-pulse rounded" />
      <div className="flex flex-col gap-3">
        <div className="bg-cream h-9 w-56 animate-pulse rounded" />
        <div className="bg-cream h-5 w-96 animate-pulse rounded" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-line bg-surface overflow-hidden rounded-2xl border">
            <div className="bg-cream aspect-[4/3] animate-pulse" />
            <div className="flex flex-col gap-3 p-5">
              <div className="bg-cream h-5 w-3/4 animate-pulse rounded" />
              <div className="bg-cream h-6 w-1/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
