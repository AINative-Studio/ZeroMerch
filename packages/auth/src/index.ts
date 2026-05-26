// ---------------------------------------------------------------------------
// @zeromerch/auth — barrel export
// ---------------------------------------------------------------------------

// Types
export type {
  Role,
  AuthUser,
  Session,
  LoginResponse,
  AuthState,
  AuthContextValue,
  LoginCredentials,
  AuthError,
} from "./types.js";

// Client
export { AINativeAuthClient, AuthClientError } from "./client.js";

// Session (server-only — uses next/headers)
export { createSession, getSession, destroySession, assertCompanyMatch } from "./session.js";

// Hooks (client-only)
export { AuthContext, useAuth, useRequireRole } from "./hooks.js";

// Middleware
export { authMiddleware } from "./middleware.js";
