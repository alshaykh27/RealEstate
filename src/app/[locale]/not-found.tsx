"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COPY = {
  en: {
    title: "Page not found",
    body: "The page you're looking for doesn't exist or has moved.",
    back: "Back to home",
  },
  ar: {
    title: "الصفحة غير موجودة",
    body: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    back: "العودة للرئيسية",
  },
};

export default function LocaleNotFound() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const copy = COPY[locale];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-heading text-gold-deep text-sm font-semibold tracking-wide">404</p>
      <h1 className="text-ink text-3xl font-bold">{copy.title}</h1>
      <p className="text-ink-secondary max-w-md leading-relaxed">{copy.body}</p>
      <Link href={`/${locale}`} className="btn btn-primary mt-2">
        {copy.back}
      </Link>
    </main>
  );
}
