import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, localeCookieName, locales } from "@/i18n/config";

function resolveLocale(request: NextRequest): string {
  const cookie = request.cookies.get(localeCookieName)?.value;
  if (cookie && isLocale(cookie)) return cookie;
  return defaultLocale;
}

const cookieOptions = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin is not localized: keep it unprefixed, out of the locale redirect.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }

  const pathLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathLocale) {
    const response = NextResponse.next();
    if (request.cookies.get(localeCookieName)?.value !== pathLocale) {
      response.cookies.set(localeCookieName, pathLocale, cookieOptions);
    }
    return response;
  }

  const locale = resolveLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.cookies.set(localeCookieName, locale, cookieOptions);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
