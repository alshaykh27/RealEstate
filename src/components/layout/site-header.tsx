"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const homePath = `/${locale}`;
  const isHome = pathname === homePath || pathname === `${homePath}/`;
  const dark = isHome && !scrolled;

  const links = [
    { href: `/${locale}/properties`, label: nav.properties },
    { href: `/${locale}/areas`, label: nav.areas },
    { href: `/${locale}/about`, label: nav.about },
    { href: `/${locale}/contact`, label: nav.contact },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur transition-colors",
        dark ? "bg-obsidian/70 border-transparent" : "border-line bg-surface/80",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href={homePath}
          className={cn(
            "font-heading text-lg font-bold transition-colors",
            dark ? "text-on-dark" : "text-ink",
          )}
        >
          {brand}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={cn(
                "text-sm font-medium transition-colors",
                dark
                  ? "text-on-dark-secondary hover:text-on-dark"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher
          current={locale}
          labels={{ ar: language.ar, en: language.en }}
          label={language.label}
          inverse={dark}
        />
      </div>
    </header>
  );
}
