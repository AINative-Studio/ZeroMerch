// ---------------------------------------------------------------------------
// React hooks — useAuth(), useRequireRole()
// ---------------------------------------------------------------------------

"use client";

import { createContext, useContext } from "react";
import type { AuthContextValue, Role } from "./types.js";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const defaultValue: AuthContextValue = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  companyId: null,
  login: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: async () => {
    throw new Error("AuthProvider not mounted");
  },
  assertCompany: () => {
    throw new Error("AuthProvider not mounted");
  },
};

export const AuthContext = createContext<AuthContextValue>(defaultValue);

// ---------------------------------------------------------------------------
// useAuth
// ---------------------------------------------------------------------------

/**
 * Access the current auth state and actions.
 * Must be used inside an `<AuthProvider>`.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === defaultValue) {
    throw new Error("useAuth() must be used within an <AuthProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// useRequireRole
// ---------------------------------------------------------------------------

/**
 * Role hierarchy for comparison. Higher index = more privileged.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  employee: 0,
  vendor: 1,
  finance: 2,
  manager: 3,
  admin: 4,
};

/**
 * Require that the current user has at least the specified role.
 *
 * If `redirect` is true (default), redirects to /dashboard on failure.
 * If `redirect` is false, returns `{ authorized: false }` instead.
 *
 * @throws Error if user is not authenticated (should never happen
 * behind middleware, but guards against misuse).
 */
export function useRequireRole(
  requiredRole: Role,
  options: { redirect?: boolean } = {}
): { authorized: boolean } {
  const { user, isLoading, isAuthenticated } = useAuth();
  const shouldRedirect = options.redirect ?? true;

  if (isLoading) {
    return { authorized: false };
  }

  if (!isAuthenticated || !user) {
    if (shouldRedirect && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return { authorized: false };
  }

  const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;

  if (userLevel < requiredLevel) {
    if (shouldRedirect && typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
    return { authorized: false };
  }

  return { authorized: true };
}
