"use client";

// ---------------------------------------------------------------------------
// AuthProvider — wired to AINative Auth via server actions
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@zeromerch/auth/hooks";
import type { AuthContextValue, AuthUser } from "@zeromerch/auth";

interface AuthProviderProps {
  children: React.ReactNode;
  /** Initial user from server-side session (passed from layout). */
  initialUser?: AuthUser | null;
  /** Initial token from server-side session. */
  initialToken?: string | null;
}

/**
 * AuthProvider wraps the app and provides auth state via React context.
 *
 * On the server side, the dashboard layout reads the session cookie and
 * passes `initialUser` / `initialToken` as props. On the client side,
 * login and logout call server actions that manage the httpOnly cookie.
 */
export function AuthProvider({ children, initialUser, initialToken }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  // If initial data is provided, loading is already complete
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setToken(initialToken ?? null);
      setIsLoading(false);
    } else {
      // No initial user — session is unauthenticated
      setIsLoading(false);
    }
  }, [initialUser, initialToken]);

  const login = useCallback(async (_email: string, _password: string) => {
    // Login is handled by the server action in the login form.
    // This is a no-op on the client; the form submission triggers
    // loginAction which sets the cookie and redirects.
    throw new Error("Use the login form — auth is handled server-side");
  }, []);

  const logout = useCallback(async () => {
    // Import dynamically to avoid bundling server action in client chunk
    const { logoutAction } = await import("@/app/actions/auth");
    await logoutAction();
    setUser(null);
    setToken(null);
  }, []);

  const assertCompany = useCallback(
    (companyId: string) => {
      if (user && user.company_id !== companyId) {
        throw new Error(
          `Multi-tenant violation: user belongs to company ${user.company_id}, ` +
          `not ${companyId}`
        );
      }
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      companyId: user?.company_id ?? null,
      login,
      logout,
      assertCompany,
    }),
    [user, token, isLoading, login, logout, assertCompany]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
