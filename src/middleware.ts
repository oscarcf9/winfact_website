import {
  clerkClient,
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

async function isAdmin(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return (user.publicMetadata as Record<string, string>)?.role === "admin";
}

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;

  // Skip i18n for API routes
  if (isApiRoute(req)) {
    if (isAdminRoute(req)) {
      const { userId } = await auth.protect();
      if (!(await isAdmin(userId))) {
        return new Response("Forbidden", { status: 403 });
      }
    }
    return;
  }

  // Allow admin-login page through without any auth
  if (isAdminSignIn(req)) {
    return intlMiddleware(req);
  }

  // Protect admin routes — redirect to /admin-login (NOT default /sign-in)
  if (isAdminRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      // Extract locale from URL path
      const locale = url.pathname.startsWith("/es") ? "es" : "en";
      return NextResponse.redirect(new URL(`/${locale}/admin-login`, url));
    }

    if (!(await isAdmin(userId))) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Protect dashboard routes — require sign in (uses Clerk's default /sign-in redirect)
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Run next-intl middleware for locale detection/routing
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    "/api/:path*",
    "/((?!_next|.*\\..*).*)",
  ],
};
