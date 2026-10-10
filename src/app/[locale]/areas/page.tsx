import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AreaCard } from "@/components/areas/area-card";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getAreas, getPublishedCountsByArea } from "@/lib/data/areas";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/areas">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.areas.heading,
    description: dict.areas.subhead,
    alternates: localeAlternates(locale, "areas"),
  };
}

export default async function AreasPage({ params }: PageProps<"/[locale]/areas">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const [areas, counts] = await Promise.all([getAreas(), getPublishedCountsByArea()]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-ink text-3xl font-bold">{dict.areas.heading}</h1>
        <p className="text-ink-secondary max-w-2xl leading-relaxed">{dict.areas.subhead}</p>
      </header>

      {areas.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              locale={locale}
              countLabel={dict.areas.count(counts[area.id] ?? 0)}
              exploreLabel={dict.areas.explore}
            />
          ))}
        </div>
      ) : (
        <p className="text-ink-secondary">{dict.area.empty}</p>
      )}
    </main>
  );
}
