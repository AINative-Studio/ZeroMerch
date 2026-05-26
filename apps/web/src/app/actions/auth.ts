"use server";

// ---------------------------------------------------------------------------
// Server Actions for auth — called from client components
// ---------------------------------------------------------------------------

import { AINativeAuthClient, createSession, destroySession, getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { AuthUser } from "@zeromerch/auth";

const authClient = new AINativeAuthClient();

/**
 * Server Action: authenticate with email + password.
 * Sets the session cookie and redirects to dashboard.
 */
export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const { token, user } = await authClient.login({ email, password });
    await createSession(user, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return { error: message };
  }

  // redirect() throws internally — must be outside try/catch
  redirect("/dashboard");
}

/**
 * Server Action: destroy session and redirect to login.
 */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Server-side helper: get the current user from the session cookie.
 * Returns null if no valid session exists.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}
