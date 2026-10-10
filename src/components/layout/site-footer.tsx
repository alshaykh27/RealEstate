import Link from "next/link";

import { FacebookIcon, WhatsAppIcon } from "@/components/icons/social";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { mailtoUrl, telUrl, whatsappUrl } from "@/lib/contact";
import { getCurrentYear } from "@/lib/data/settings";

export interface ContactInfo {
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  facebook: string | null;
}

export async function SiteFooter({
  locale,
  brand,
  dict,
  contact,
}: {
  locale: Locale;
  brand: string;
  dict: Dictionary;
  contact: ContactInfo;
}) {
  const year = await getCurrentYear();

  const links = [
    { href: `/${locale}/properties`, label: dict.nav.properties },
    { href: `/${locale}/areas`, label: dict.nav.areas },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  const whatsapp = whatsappUrl(contact.whatsapp);
  const tel = telUrl(contact.phone);
  const mailto = mailtoUrl(contact.email);

  return (
    <footer className="on-dark bg-obsidian text-on-dark mt-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
          <div className="flex flex-col gap-3">
            <span className="font-heading text-on-dark text-xl font-bold">{brand}</span>
            <p className="text-on-dark-muted max-w-xs text-sm leading-relaxed">
              {dict.footer.tagline}
            </p>
          </div>
          {whatsapp || contact.facebook ? (
            <div className="flex flex-col gap-2">
              <span className="text-on-dark-muted text-xs font-medium">{dict.footer.social}</span>
              <div className="flex items-center gap-2">
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={dict.contact.whatsapp}
                    title={dict.contact.whatsapp}
                    className="bg-whatsapp inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:brightness-110"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                  </a>
                ) : null}
                {contact.facebook ? (
                  <a
                    href={contact.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={dict.contact.facebook}
                    title={dict.contact.facebook}
                    className="bg-facebook inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:brightness-110"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <nav aria-label={dict.footer.quickLinks} className="flex flex-col gap-3">
          <h2 className="text-on-dark font-heading text-sm font-semibold">
            {dict.footer.quickLinks}
          </h2>
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-on-dark-muted hover:text-gold-light text-sm transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-2">
          <h2 className="text-on-dark font-heading text-sm font-semibold">
            {dict.footer.contactHeading}
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {tel ? (
              <li>
                <a
                  href={tel}
                  className="text-on-dark-muted hover:text-gold-light transition-colors"
                >
                  {dict.contact.phone}: <bdi>{contact.phone}</bdi>
                </a>
              </li>
            ) : null}
            {mailto ? (
              <li>
                <a
                  href={mailto}
                  className="text-on-dark-muted hover:text-gold-light transition-colors"
                >
                  {dict.contact.email}: <bdi>{contact.email}</bdi>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-line-dark border-t">
        <div className="text-on-dark-muted mx-auto w-full max-w-6xl px-6 py-5 text-xs">
          {dict.footer.rights(year)}
        </div>
      </div>
    </footer>
  );
}
