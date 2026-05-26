// ---------------------------------------------------------------------------
// AINativeAuthClient — communicates with AINative Auth API
// ---------------------------------------------------------------------------

import type { AuthUser, LoginCredentials, LoginResponse } from "./types.js";

const DEFAULT_API_URL = "https://api.ainative.studio";

/**
 * Low-level HTTP client for AINative Auth endpoints.
 *
 * All methods throw on non-2xx responses with a descriptive message.
 * This client is environment-agnostic (works in Node, Edge, browser).
 */
export class AINativeAuthClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.AINATIVE_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
  }

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  /**
   * Authenticate with email + password.
   * Returns the JWT token and user object.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new AuthClientError(body.detail ?? "Login failed", res.status);
    }

    return res.json() as Promise<LoginResponse>;
  }

  // -------------------------------------------------------------------------
  // Me (session validation)
  // -------------------------------------------------------------------------

  /**
   * Validate a JWT and return the current user.
   * Used for session persistence — called on every protected request.
   */
  async me(token: string): Promise<AuthUser> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new AuthClientError(body.detail ?? "Session invalid", res.status);
    }

    return res.json() as Promise<AuthUser>;
  }

  // -------------------------------------------------------------------------
  // Refresh (future — calls refresh endpoint when available)
  // -------------------------------------------------------------------------

  /**
   * Refresh an expiring token.
   * Falls back to re-validating via `/me` if the refresh endpoint
   * is not yet deployed.
   */
  async refresh(token: string): Promise<LoginResponse> {
    // AINative Auth does not yet expose a dedicated refresh endpoint.
    // Validate the current token; if still valid return it unchanged.
    const user = await this.me(token);
    return { token, user };
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class AuthClientError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
  }
}
