// ---------------------------------------------------------------------------
// Next.js middleware helper — route protection
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "zeromerch_session";
const LOGIN_PATH = "/login";

/** Routes that require authentication (prefix match). */
const PROTECTED_PREFIXES = ["/dashboard"];

/** Routes that should redirect authenticated users away (e.g. login page). */
const AUTH_ROUTES = ["/login"];

/**
 * Derive the signing key from AUTH_SECRET. Mirrors session.ts logic.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // In middleware context, missing secret means auth is misconfigured.
    // Allow the request through so the app can render an error page
    // rather than an opaque 500.
    return new Uint8Array(32);
  }
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

/**
 * Check whether the session cookie contains a valid, non-expired JWT.
 * Does NOT call the AINative API — that happens server-side on page load.
 */
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return false;

  try {
    await jwtVerify(cookie.value, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

/**
 * Middleware handler for route protection.
 *
 * Usage in `apps/web/src/middleware.ts`:
 * ```ts
 * export { authMiddleware as middleware } from "@zeromerch/auth/middleware";
 * export const config = { matcher: ["/dashboard/:path*", "/login"] };
 * ```
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const authenticated = await hasValidSession(request);

  // Protected route — redirect unauthenticated users to login
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !authenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth route — redirect authenticated users to dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
