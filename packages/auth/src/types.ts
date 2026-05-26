// ---------------------------------------------------------------------------
// Auth types — Role, User, Session, AuthResponse
// ---------------------------------------------------------------------------

/**
 * ZeroMerch roles. Maps to AINative Auth roles with ZeroMerch-specific
 * additions (vendor, finance).
 */
export type Role = "admin" | "manager" | "employee" | "finance" | "vendor";

/**
 * Authenticated user returned by AINative Auth `/api/v1/auth/me`.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  company_id: string;
  department_id: string;
  name?: string;
}

/**
 * Server-side session stored in the encrypted cookie.
 */
export interface Session {
  user: AuthUser;
  token: string;
  /** ISO-8601 timestamp when the session was created. */
  createdAt: string;
  /** ISO-8601 timestamp when the session expires. */
  expiresAt: string;
}

/**
 * Response from `POST /api/v1/auth/login`.
 */
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/**
 * Client-side auth state exposed via React context.
 */
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Active workspace company_id — used for multi-tenant isolation. */
  companyId: string | null;
}

/**
 * Auth context value including actions.
 */
export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Verify that the current user belongs to the given company. */
  assertCompany: (companyId: string) => void;
}

/**
 * Credentials for login.
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Error returned by auth endpoints.
 */
export interface AuthError {
  detail: string;
  status: number;
}
