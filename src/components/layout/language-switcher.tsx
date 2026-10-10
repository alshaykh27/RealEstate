"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  current,
  labels,
  label,
  inverse = false,
}: {
  current: Locale;
  labels: Record<Locale, string>;
  label: string;
  inverse?: boolean;
}) {
  const pathname = usePathname() ?? `/${current}`;
  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {locales.map((locale) => {
        const isActive = locale === current;
        const href = `/${locale}${rest ? `/${rest}` : ""}`;
        return (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-navy text-white"
                : inverse
                  ? "text-on-dark-secondary hover:text-on-dark"
                  : "text-ink-secondary hover:text-ink hover:bg-cream",
              inverse && isActive && "bg-gold text-obsidian",
            )}
          >
            <span lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
              {labels[locale]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
