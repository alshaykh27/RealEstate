import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Inter, Tajawal } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { dirFor, isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import "../globals.css";

const tajawal = Tajawal({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-latin",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
      default: dict.meta.title,
      template: `%s | ${dict.brand}`,
    },
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${tajawal.variable} ${ibmPlexSansArabic.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader locale={locale} brand={dict.brand} nav={dict.nav} language={dict.language} />
        {children}
      </body>
    </html>
  );
}
