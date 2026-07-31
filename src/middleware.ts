import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — adds security headers to all responses.
 * Runs on every request.
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico|public|sw.js|manifest.webmanifest|icons|images|tarot|badges).*)",
  ],
};
