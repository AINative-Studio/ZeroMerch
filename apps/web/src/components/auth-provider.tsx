"use client";

import React, { createContext, useContext, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "member" | "viewer";
}

export interface Session {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<Session>({
  user: null,
  accessToken: null,
  isLoading: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AuthProvider — stub implementation.
 *
 * Real authentication (AINative Auth / JWT) will be wired in Batch B.
 * For now the session is always unauthenticated so the app shell renders
 * without errors.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Stub: session is always unauthenticated until Batch B wires AINative Auth.
  const session = useMemo<Session>(
    () => ({
      user: null,
      accessToken: null,
      isLoading: false,
    }),
    []
  );

  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): Session {
  return useContext(AuthContext);
}
