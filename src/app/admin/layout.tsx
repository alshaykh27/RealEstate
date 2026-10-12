import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Tajawal } from "next/font/google";

import "../globals.css";

/**
 * Second root layout (the public tree has its own at `app/[locale]/layout.tsx`).
 * The admin is Arabic-only and RTL, is never indexed, and opts out of instant
 * navigation validation — every screen reads the live Supabase session and
 * performs an authoritative admin check server-side.
 */
export const instant = false;

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

export const metadata: Metadata = {
  title: {
    default: "لوحة التحكم | دارفيا",
    template: "%s | لوحة التحكم — دارفيا",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} ${ibmPlexSansArabic.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-background text-ink min-h-screen font-sans antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
