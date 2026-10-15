import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaCard } from "@/components/areas/area-card";
import { Hero } from "@/components/home/hero";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { PropertyGrid } from "@/components/properties/property-grid";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localize } from "@/lib/content";
import { getAreas, getPublishedCountsByArea } from "@/lib/data/areas";
import { getFeaturedProperties } from "@/lib/data/properties";
import { getSiteSettings } from "@/lib/data/settings";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: localeAlternates(locale),
  };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const [settings, featured, areas, areaCounts] = await Promise.all([
    getSiteSettings(),
    getFeaturedProperties(6),
    getAreas(),
    getPublishedCountsByArea(),
  ]);

  const heroHeadline = settings
    ? localize(locale, settings.hero_headline_en, settings.hero_headline_ar)
    : dict.hero.headline;
  const heroSubhead = settings
    ? localize(locale, settings.hero_subhead_en, settings.hero_subhead_ar)
    : dict.hero.subhead;

  return (
    <main className="flex flex-1 flex-col">
      <Hero
        locale={locale}
        eyebrow={dict.hero.eyebrow}
        headline={heroHeadline}
        subhead={heroSubhead}
        ctaLabel={dict.hero.ctaPrimary}
        videoUrl={settings?.promo_video_url}
        videoTitle={dict.hero.videoTitle}
      />

      {featured.length > 0 ? (
        <section className="bg-background mx-auto w-full max-w-6xl px-6 py-20">
          <RevealGroup className="mb-10 flex flex-col gap-3">
            <p className="font-heading text-gold-deep text-sm tracking-wide">
              {dict.home.featuredEyebrow}
            </p>
            <h2 className="text-ink text-2xl font-bold sm:text-3xl">{dict.home.featuredHeading}</h2>
            <p className="text-ink-secondary max-w-2xl text-base leading-relaxed">
              {dict.home.featuredSubhead}
            </p>
          </RevealGroup>
          <PropertyGrid properties={featured} locale={locale} dict={dict} />
          <div className="mt-10 text-center">
            <Link href={`/${locale}/properties`} className="btn btn-secondary-light">
              {dict.home.viewAllProperties}
            </Link>
          </div>
        </section>
      ) : null}

      {areas.length > 0 ? (
        <section className="bg-cream border-line border-y">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <RevealGroup className="mb-10 flex flex-col gap-3">
              <p className="font-heading text-gold-deep text-sm tracking-wide">
                {dict.home.areasEyebrow}
              </p>
              <h2 className="text-ink text-2xl font-bold sm:text-3xl">{dict.home.areasHeading}</h2>
              <p className="text-ink-secondary max-w-2xl text-base leading-relaxed">
                {dict.home.areasSubhead}
              </p>
            </RevealGroup>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((area, index) => (
                <Reveal key={area.id} className="h-full" delay={Math.min(index, 5) * 0.08}>
                  <TiltCard>
                    <AreaCard
                      area={area}
                      locale={locale}
                      countLabel={dict.areas.count(areaCounts[area.id] ?? 0)}
                      exploreLabel={dict.areas.explore}
                    />
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-background mx-auto w-full max-w-6xl px-6 py-20">
        <Reveal className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-4">
            <p className="font-heading text-gold-deep text-sm tracking-wide">
              {dict.home.aboutEyebrow}
            </p>
            <h2 className="text-ink text-2xl font-bold sm:text-3xl">{dict.home.aboutHeading}</h2>
            <p className="text-ink-secondary text-base leading-relaxed">{dict.home.aboutBody}</p>
            <div>
              <Link href={`/${locale}/about`} className="btn btn-navy">
                {dict.nav.about}
              </Link>
            </div>
          </div>

          <div className="on-dark bg-navy-deep flex flex-col gap-4 rounded-2xl p-8">
            <h2 className="text-on-dark text-xl font-bold">{dict.home.contactHeading}</h2>
            <p className="text-on-dark-muted text-sm leading-relaxed">{dict.home.contactBody}</p>
            <div className="mt-2">
              <Link href={`/${locale}/contact`} className="btn btn-primary">
                {dict.nav.contact}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
