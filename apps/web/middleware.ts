import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(_req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    /*
     * Protect all dashboard routes. Excludes:
     * - / (landing page — public)
     * - api/auth (NextAuth)
     * - api/v1  (SDK routes, protected by API key)
     * - api/webhooks, api/cron
     * - _next/static, _next/image, favicon
     * - login, verify (auth pages)
     */
    "/((?!$|api/auth|api/v1|api/webhooks|api/cron|_next/static|_next/image|favicon.ico|login|verify|sitemap.xml|robots.txt).*)",
  ],
};
