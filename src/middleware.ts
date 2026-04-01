import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/(en|es)/dashboard(.*)",
]);

const isAdminRoute = createRouteMatcher([
  "/(en|es)/admin(.*)",
]);

const isAdminSignIn = createRouteMatcher([
  "/(en|es)/admin-login(.*)",
]);

const isApiRoute = createRouteMatcher([
  "/api(.*)",
]);

/**
 * Admin role checking strategy:
 * - Middleware only checks AUTHENTICATION (is the user logged in?)
 * - The DATABASE is the single source of truth for the "admin" role
 * - requireAdmin() in API routes and server components queries the DB
 * - This prevents Clerk metadata / DB role mismatches
 */
// CORS: restrict to known origins in production, allow localhost in development
const PRODUCTION_ORIGINS = [
  "https://winfactpicks.com",
  "https://www.winfactpicks.com",
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean) as string[];

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8081", // Expo web
];

function getAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  const allowlist = isProd ? PRODUCTION_ORIGINS : [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];
  return allowlist.includes(requestOrigin) ? requestOrigin : null;
}

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;

  // Canonical www redirect: non-www → www (301 permanent)
  const host = req.headers.get("host") || "";
  if (
    host === "winfactpicks.com" &&
    (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")
  ) {
    const wwwUrl = new URL(url.pathname + url.search, "https://www.winfactpicks.com");
    return NextResponse.redirect(wwwUrl, 301);
  }

  // Capture referral code from ?ref= parameter (first-touch attribution)
  const refCode = url.searchParams.get("ref");
  const shouldSetRefCookie = refCode && !req.cookies.get("wf_ref");

  // Skip i18n for API routes
  if (isApiRoute(req)) {
    const origin = req.headers.get("origin");
    const allowedOrigin = getAllowedOrigin(origin);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      };
      if (allowedOrigin) {
        headers["Access-Control-Allow-Origin"] = allowedOrigin;
      }
      return new NextResponse(null, { status: 204, headers });
    }

    // Admin API routes: only check auth here — requireAdmin() in the handler checks DB role
    if (isAdminRoute(req)) {
      await auth.protect();
    }

    const response = NextResponse.next();
    if (allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return response;
  }

  // Allow admin-login page through without any auth
  if (isAdminSignIn(req)) {
    return intlMiddleware(req);
  }

  // Admin page routes: only check auth — actual role check happens in the page's requireAdmin()
  if (isAdminRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      const locale = url.pathname.startsWith("/es") ? "es" : "en";
      return NextResponse.redirect(new URL(`/${locale}/admin-login`, url));
    }

    // Role check is deferred to requireAdmin() in the server component/API handler
    // This ensures the DATABASE is the single source of truth for admin access
  }

  // Protect dashboard routes — require sign in
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Run next-intl middleware for locale detection/routing
  const response = intlMiddleware(req);

  // Set referral cookie on the final response (works for all route types)
  if (shouldSetRefCookie && response) {
    response.cookies.set("wf_ref", refCode!, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
  }

  return response;
});

export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    "/api/:path*",
    "/((?!_next|.*\\..*).*)",
  ],
};
