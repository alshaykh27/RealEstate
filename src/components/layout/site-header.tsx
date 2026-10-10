import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({
  locale,
  brand,
  nav,
  language,
}: {
  locale: Locale;
  brand: string;
  nav: Dictionary["nav"];
  language: Dictionary["language"];
}) {
  const links = [
    { href: `/${locale}/properties`, label: nav.properties },
    { href: `/${locale}/areas`, label: nav.areas },
    { href: `/${locale}/about`, label: nav.about },
    { href: `/${locale}/contact`, label: nav.contact },
  ];

  return (
    <header className="border-line bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href={`/${locale}`} className="font-heading text-ink text-lg font-bold">
          {brand}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="text-ink-secondary hover:text-ink text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher
          current={locale}
          labels={{ ar: language.ar, en: language.en }}
          label={language.label}
        />
      </div>
    </header>
  );
}
