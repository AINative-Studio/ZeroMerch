// ---------------------------------------------------------------------------
// Session management — encrypted cookie via jose (JWE)
// ---------------------------------------------------------------------------

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Session, AuthUser } from "./types.js";
import { cookies } from "next/headers";

const COOKIE_NAME = "zeromerch_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Derive a 256-bit key from the AUTH_SECRET env var.
 * Throws at startup if the secret is missing.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is required for session management");
  }
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create an encrypted session cookie containing the user and token.
 * Must be called from a Server Action or Route Handler.
 */
export async function createSession(user: AuthUser, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const payload: JWTPayload & { user: AuthUser; token: string } = {
    user,
    token,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const jwt = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Read and verify the session cookie. Returns null if absent or invalid.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const { payload } = await jwtVerify(cookie.value, getSecretKey());
    const data = payload as unknown as {
      user: AuthUser;
      token: string;
      createdAt: string;
      expiresAt: string;
    };

    return {
      user: data.user,
      token: data.token,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
    };
  } catch {
    // Token expired or tampered — clear cookie
    await destroySession();
    return null;
  }
}

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

/**
 * Delete the session cookie. Called on logout.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// Verify company isolation
// ---------------------------------------------------------------------------

/**
 * Assert that the session user belongs to the specified company.
 * Throws if the company_id does not match.
 */
export function assertCompanyMatch(session: Session, companyId: string): void {
  if (session.user.company_id !== companyId) {
    throw new Error(
      `Multi-tenant violation: user ${session.user.id} (company ${session.user.company_id}) ` +
      `attempted to access workspace ${companyId}`
    );
  }
}
