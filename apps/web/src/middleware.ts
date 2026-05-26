// ---------------------------------------------------------------------------
// Next.js Edge Middleware — route protection
// ---------------------------------------------------------------------------

export { authMiddleware as middleware } from "@zeromerch/auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
