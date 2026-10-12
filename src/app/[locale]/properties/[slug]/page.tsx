import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { PropertyGallery, type GalleryImage } from "@/components/properties/property-gallery";
import { PropertyGrid } from "@/components/properties/property-grid";
import { StatusBadge } from "@/components/properties/status-badge";
import { WhatsAppIcon } from "@/components/icons/social";
import { Reveal } from "@/components/motion/reveal";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { whatsappUrl } from "@/lib/contact";
import {
  formatArea,
  formatDate,
  formatPrice,
  hasValue,
  localize,
  localizedText,
  propertyImageUrl,
} from "@/lib/content";
import {
  getPropertyBySlug,
  getPublishedPropertySlugs,
  getRelatedProperties,
  getSlugRedirect,
} from "@/lib/data/properties";
import { getSiteSettings } from "@/lib/data/settings";
import { localeAlternates } from "@/lib/seo";
import type { PropertyImage } from "@/types/database";

export async function generateStaticParams() {
  const slugs = await getPublishedPropertySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/properties/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const property = await getPropertyBySlug(slug);
  if (!property) return {};

  const title = localize(
    locale,
    property.meta_title_en ?? property.title_en,
    property.meta_title_ar ?? property.title_ar,
  );
  const description = localize(
    locale,
    property.meta_description_en ?? property.description_en,
    property.meta_description_ar ?? property.description_ar,
  );
  const missingArabic = !hasValue(property.title_ar) && !hasValue(property.description_ar);
  const compound = localizedText(locale, property.compound_en, property.compound_ar);
  const titleWithCompound = compound ? `${title} — ${compound}` : title;

  return {
    title: titleWithCompound,
    description,
    alternates: localeAlternates(locale, `properties/${property.slug}`),
    robots: locale === "ar" && missingArabic ? { index: false, follow: true } : undefined,
  };
}

export default function PropertyPage({ params }: PageProps<"/[locale]/properties/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PropertyDetail params={params} />
    </Suspense>
  );
}

function sortedImages(images: PropertyImage[] | null | undefined): PropertyImage[] {
  if (!images || images.length === 0) return [];
  return [...images].sort((a, b) => {
    if (a.is_cover !== b.is_cover) return a.is_cover ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
}

async function PropertyDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const property = await getPropertyBySlug(slug);
  if (!property) {
    const redirectTarget = await getSlugRedirect(slug);
    if (redirectTarget) permanentRedirect(`/${locale}/properties/${redirectTarget}`);
    notFound();
  }

  const title = localize(locale, property.title_en, property.title_ar);
  const description = localize(locale, property.description_en, property.description_ar);
  const address = localize(locale, property.address_en, property.address_ar);
  const areaName = property.area
    ? localize(locale, property.area.name_en, property.area.name_ar)
    : null;
  const compoundName = localizedText(locale, property.compound_en, property.compound_ar);
  const locationLine = [compoundName, areaName].filter(hasValue).join(" · ");
  const features = localize(locale, property.features_en, property.features_ar) ?? [];

  const gallery: GalleryImage[] = sortedImages(property.property_images).map((image) => ({
    url: propertyImageUrl(image.storage_path),
    alt: localize(locale, image.alt_en, image.alt_ar),
  }));

  const [related, settings] = await Promise.all([
    getRelatedProperties(property.area_id, property.id, 3),
    getSiteSettings(),
  ]);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const shareUrl = siteUrl ? `${siteUrl}/${locale}/properties/${property.slug}` : undefined;
  const message = shareUrl ? `${title}\n${shareUrl}` : title;
  const whatsapp = whatsappUrl(settings?.whatsapp_number, message);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12">
      <div>
        <Link
          href={`/${locale}/properties`}
          className="text-ink-secondary hover:text-ink text-sm font-medium"
        >
          ← {dict.properties.backToResults}
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
          <PropertyGallery images={gallery} placeholderLabel={title} />
        </Reveal>

        <Reveal delay={0.1}>
          <aside className="border-line bg-surface shadow-card flex h-full flex-col gap-5 rounded-2xl border p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={property.status} labels={dict.badges} />
              {property.is_featured ? (
                <span className="badge badge-featured">{dict.badges.featured}</span>
              ) : null}
              <span className="badge badge-draft">
                {property.listing_type === "rent" ? dict.listingType.rent : dict.listingType.sale}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="text-ink text-2xl font-bold">{title}</h1>
              {locationLine ? <p className="text-ink-muted">{locationLine}</p> : null}
            </div>

            <p className="text-navy font-heading text-2xl font-bold">
              <bdi>{formatPrice(locale, property.price, property.currency)}</bdi>
            </p>

            <dl className="border-line grid grid-cols-2 gap-4 border-t pt-5 text-sm">
              {compoundName ? <Detail label={dict.fields.compound} value={compoundName} /> : null}
              <Detail
                label={dict.fields.propertyType}
                value={dict.propertyType[property.property_type]}
              />
              {property.bedrooms !== null ? (
                <Detail label={dict.fields.bedrooms} value={String(property.bedrooms)} />
              ) : null}
              {property.bathrooms !== null ? (
                <Detail label={dict.fields.bathrooms} value={String(property.bathrooms)} />
              ) : null}
              {property.area_sqm !== null ? (
                <Detail label={dict.fields.area} value={formatArea(locale, property.area_sqm)} />
              ) : null}
              {property.floor !== null ? (
                <Detail label={dict.fields.floor} value={String(property.floor)} />
              ) : null}
              {property.year_built !== null ? (
                <Detail label={dict.fields.yearBuilt} value={String(property.year_built)} />
              ) : null}
              <Detail
                label={dict.fields.listedOn}
                value={formatDate(locale, property.created_at)}
              />
            </dl>

            <div className="border-line flex flex-col gap-3 border-t pt-5">
              <p className="text-ink font-heading text-sm font-semibold">
                {dict.property.contactHeading}
              </p>
              <p className="text-ink-secondary text-sm">{dict.property.contactSubhead}</p>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  {dict.property.contactCta}
                </a>
              ) : (
                <Link href={`/${locale}/contact`} className="btn btn-primary">
                  {dict.contact.heading}
                </Link>
              )}
            </div>
          </aside>
        </Reveal>
      </div>

      <Reveal>
        <section className="flex flex-col gap-4">
          <h2 className="text-ink text-xl font-bold">{dict.property.descriptionHeading}</h2>
          {description
            .split(/\n{2,}/)
            .filter((paragraph) => paragraph.trim().length > 0)
            .map((paragraph, index) => (
              <p key={index} className="text-ink-secondary leading-relaxed">
                {paragraph}
              </p>
            ))}
        </section>
      </Reveal>

      {features.length > 0 ? (
        <Reveal>
          <section className="flex flex-col gap-4">
            <h2 className="text-ink text-xl font-bold">{dict.property.featuresHeading}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <li key={feature} className="text-ink-secondary flex items-center gap-2 text-sm">
                  <span className="bg-gold h-1.5 w-1.5 rounded-full" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      ) : null}

      <Reveal>
        <section className="flex flex-col gap-3">
          <h2 className="text-ink text-xl font-bold">{dict.property.locationHeading}</h2>
          <p className="text-ink-secondary leading-relaxed">{address}</p>
        </section>
      </Reveal>

      {related.length > 0 ? (
        <Reveal>
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-ink text-xl font-bold">{dict.property.similarHeading}</h2>
              <p className="text-ink-secondary text-sm">{dict.property.similarSubhead}</p>
            </div>
            <PropertyGrid properties={related} locale={locale} dict={dict} />
          </section>
        </Reveal>
      ) : null}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ink-muted text-xs">{label}</dt>
      <dd className="text-ink font-medium">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12">
      <div className="bg-cream h-5 w-40 animate-pulse rounded" />
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="bg-cream aspect-[16/10] animate-pulse rounded-2xl" />
        <div className="border-line bg-surface h-96 animate-pulse rounded-2xl border" />
      </div>
    </main>
  );
}
