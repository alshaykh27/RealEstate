import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.about.heading,
    description: dict.about.subhead,
    alternates: localeAlternates(locale, "about"),
  };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <main className="flex flex-1 flex-col">
      <section className="on-dark bg-obsidian px-6 py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <h1 className="text-on-dark text-3xl font-bold sm:text-4xl">{dict.about.heading}</h1>
          <p className="text-on-dark-muted max-w-2xl leading-relaxed">{dict.about.subhead}</p>
        </div>
      </section>

      <section className="bg-background mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-16">
        <p className="text-ink-secondary leading-relaxed">{dict.about.bodyOne}</p>
        <p className="text-ink-secondary leading-relaxed">{dict.about.bodyTwo}</p>
      </section>

      <section className="bg-cream border-line border-y">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-ink mb-8 text-2xl font-bold">{dict.about.valuesHeading}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dict.about.values.map((value) => (
              <div
                key={value.title}
                className="border-line bg-surface shadow-card flex flex-col gap-2 rounded-2xl border p-6"
              >
                <h3 className="text-ink text-lg font-semibold">{value.title}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-wrap gap-4 px-6 py-16">
        <Link href={`/${locale}/properties`} className="btn btn-primary">
          {dict.home.viewAllProperties}
        </Link>
        <Link href={`/${locale}/contact`} className="btn btn-navy">
          {dict.nav.contact}
        </Link>
      </section>
    </main>
  );
}
