import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localeAlternates } from "@/lib/seo";

const swatchGroups: { title: string; items: [string, string][] }[] = [
  {
    title: "Dark Luxury",
    items: [
      ["obsidian", "bg-obsidian"],
      ["charcoal", "bg-charcoal"],
      ["elevated", "bg-charcoal-elevated"],
      ["line-dark", "bg-line-dark"],
    ],
  },
  {
    title: "Signature Gold",
    items: [
      ["gold", "bg-gold"],
      ["gold-light", "bg-gold-light"],
      ["gold-deep", "bg-gold-deep"],
      ["gold-soft", "bg-gold-soft"],
    ],
  },
  {
    title: "Premium Navy",
    items: [
      ["navy", "bg-navy"],
      ["navy-deep", "bg-navy-deep"],
      ["navy-muted", "bg-navy-muted"],
      ["navy-pale", "bg-navy-pale"],
    ],
  },
  {
    title: "Warm Neutral",
    items: [
      ["ivory", "bg-ivory"],
      ["cream", "bg-cream"],
      ["beige", "bg-beige"],
      ["warmgray", "bg-warmgray"],
    ],
  },
  {
    title: "Status",
    items: [
      ["success", "bg-success"],
      ["warning", "bg-warning"],
      ["error", "bg-error"],
      ["info", "bg-info"],
      ["neutral", "bg-neutral"],
    ],
  },
];

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { alternates: localeAlternates(locale) };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const badges: [string, string][] = [
    [dict.badges.available, "badge-available"],
    [dict.badges.sold, "badge-sold"],
    [dict.badges.rented, "badge-rented"],
    [dict.badges.draft, "badge-draft"],
    [dict.badges.featured, "badge-featured"],
  ];

  return (
    <main className="flex flex-1 flex-col">
      {/* Dark cinematic section */}
      <section className="on-dark bg-obsidian flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <p className="font-heading text-gold text-sm tracking-wide">{dict.hero.eyebrow}</p>
        <h1 className="text-on-dark max-w-2xl text-3xl leading-snug font-bold sm:text-5xl">
          {dict.hero.headline}
        </h1>
        <p className="text-on-dark-muted max-w-xl text-lg leading-relaxed">{dict.hero.subhead}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#" className="btn btn-primary">
            {dict.hero.ctaPrimary}
          </a>
          <a href="#" className="btn btn-whatsapp">
            {dict.hero.ctaWhatsapp}
          </a>
          <a href="#" className="btn btn-facebook">
            {dict.hero.ctaFacebook}
          </a>
        </div>
      </section>

      {/* Light section */}
      <section className="bg-background flex flex-col items-center gap-8 px-6 py-20 text-center">
        <h2 className="text-ink text-2xl font-bold sm:text-3xl">{dict.preview.heading}</h2>
        <p className="text-ink-secondary max-w-xl text-base leading-relaxed">
          {dict.preview.subhead}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button type="button" className="btn btn-navy">
            {dict.preview.detailButton}
          </button>
          <button type="button" className="btn btn-secondary-light">
            {dict.preview.filterButton}
          </button>
          <button type="button" className="btn btn-primary" disabled>
            {dict.preview.disabledButton}
          </button>
          <button type="button" className="btn btn-primary" aria-busy="true">
            {dict.preview.loadingButton}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {badges.map(([label, cls]) => (
            <span key={label} className={`badge ${cls}`}>
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 grid w-full max-w-4xl gap-8 text-start sm:grid-cols-2 lg:grid-cols-3">
          {swatchGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              <h3 className="font-heading text-ink-secondary text-sm font-medium">{group.title}</h3>
              <div className="grid grid-cols-4 gap-2">
                {group.items.map(([label, cls]) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div
                      className={`border-line h-12 w-full rounded-md border ${cls}`}
                      aria-hidden
                    />
                    <span className="text-ink-muted text-[10px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
