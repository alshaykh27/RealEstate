import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/contact";
import { getSiteSettings } from "@/lib/data/settings";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.contact.heading,
    description: dict.contact.subhead,
    alternates: localeAlternates(locale, "contact"),
  };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, settings] = await Promise.all([getDictionary(locale), getSiteSettings()]);

  const whatsapp = whatsappUrl(settings?.whatsapp_number);
  const tel = telUrl(settings?.phone);
  const mailto = mailtoUrl(settings?.email);
  const facebook = settings?.facebook_url ?? null;

  const methods: {
    key: string;
    label: string;
    value: string | null | undefined;
    href: string;
    external: boolean;
  }[] = [];

  if (whatsapp) {
    methods.push({
      key: "whatsapp",
      label: dict.contact.whatsapp,
      value: settings?.whatsapp_number,
      href: whatsapp,
      external: true,
    });
  }
  if (facebook) {
    methods.push({
      key: "facebook",
      label: dict.contact.facebook,
      value: null,
      href: facebook,
      external: true,
    });
  }
  if (tel) {
    methods.push({
      key: "phone",
      label: dict.contact.phone,
      value: settings?.phone,
      href: tel,
      external: false,
    });
  }
  if (mailto) {
    methods.push({
      key: "email",
      label: dict.contact.email,
      value: settings?.email,
      href: mailto,
      external: false,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-ink text-3xl font-bold">{dict.contact.heading}</h1>
        <p className="text-ink-secondary max-w-2xl leading-relaxed">{dict.contact.subhead}</p>
      </header>

      {methods.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {methods.map((method, index) => (
            <Reveal key={method.key} delay={Math.min(index, 5) * 0.08}>
              <a
                href={method.href}
                target={method.external ? "_blank" : undefined}
                rel={method.external ? "noopener noreferrer" : undefined}
                className="border-line bg-surface shadow-card hover:shadow-elevated hover:border-gold-deep/40 flex h-full flex-col gap-2 rounded-2xl border p-6 transition-[box-shadow,border-color]"
              >
                <span className="text-gold-deep font-heading text-sm font-semibold">
                  {method.label}
                </span>
                {method.value ? (
                  <span className="text-ink text-lg font-medium">
                    <bdi>{method.value}</bdi>
                  </span>
                ) : (
                  <span className="text-ink text-lg font-medium">→</span>
                )}
              </a>
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="text-ink-secondary">{dict.contact.subhead}</p>
      )}
    </main>
  );
}
