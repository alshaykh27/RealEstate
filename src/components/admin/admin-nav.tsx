"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { admin } from "@/i18n/admin";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: admin.nav.overview, exact: true },
  { href: "/admin/properties", label: admin.nav.properties, exact: false },
  { href: "/admin/settings", label: admin.nav.settings, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={admin.nav.overview} className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-charcoal-elevated text-gold"
                : "text-on-dark-secondary hover:bg-charcoal-elevated hover:text-on-dark",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
