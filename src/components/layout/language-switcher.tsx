"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({
  current,
  labels,
  label,
}: {
  current: Locale;
  labels: Record<Locale, string>;
  label: string;
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
            className={
              isActive
                ? "bg-navy rounded-full px-3 py-1.5 text-xs font-medium text-white"
                : "text-ink-secondary hover:text-ink hover:bg-cream rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            }
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
