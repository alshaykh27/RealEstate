import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, localeCookieName, locales } from "@/i18n/config";

function resolveLocale(request: NextRequest): string {
  const cookie = request.cookies.get(localeCookieName)?.value;
  if (cookie && isLocale(cookie)) return cookie;
  return defaultLocale;
}

const cookieOptions = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

/**
 * Refreshes the Supabase auth session for `/admin` requests and returns the
 * response carrying any rotated cookies plus the current user (or null).
 */
async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { response, user: null };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

function carryCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin is not localized: guard it, refresh the session, skip the locale redirect.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const { response, user } = await refreshSession(request);
    const isLoginRoute = pathname === "/admin/login";

    if (!user && !isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return carryCookies(response, NextResponse.redirect(url));
    }

    if (user && isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return carryCookies(response, NextResponse.redirect(url));
    }

    return response;
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
