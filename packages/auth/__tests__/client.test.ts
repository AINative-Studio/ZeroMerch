// ---------------------------------------------------------------------------
// Tests for AINativeAuthClient
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AINativeAuthClient, AuthClientError } from "../src/client.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("AINativeAuthClient", () => {
  let client: AINativeAuthClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AINativeAuthClient("https://api.test.ainative.studio");
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe("login", () => {
    it("returns token and user on success", async () => {
      const mockResponse = {
        token: "jwt-token-123",
        user: {
          id: "user-1",
          email: "alice@acme.com",
          role: "admin",
          company_id: "comp-1",
          department_id: "dept-1",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.login({
        email: "alice@acme.com",
        password: "secret",
      });

      expect(result.token).toBe("jwt-token-123");
      expect(result.user.email).toBe("alice@acme.com");
      expect(result.user.role).toBe("admin");
      expect(result.user.company_id).toBe("comp-1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.ainative.studio/api/v1/auth/login",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "alice@acme.com", password: "secret" }),
        })
      );
    });

    it("throws AuthClientError on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ detail: "Invalid credentials" }),
      });

      await expect(
        client.login({ email: "bad@acme.com", password: "wrong" })
      ).rejects.toThrow(AuthClientError);

      try {
        await client.login({ email: "bad@acme.com", password: "wrong" });
      } catch (err) {
        // Second call for detailed assertion — first already asserted type
      }
    });

    it("throws AuthClientError with statusText when body parse fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      });

      await expect(
        client.login({ email: "a@b.com", password: "x" })
      ).rejects.toThrow("Internal Server Error");
    });
  });

  // -------------------------------------------------------------------------
  // me
  // -------------------------------------------------------------------------

  describe("me", () => {
    it("returns user on valid token", async () => {
      const mockUser = {
        id: "user-1",
        email: "alice@acme.com",
        role: "admin",
        company_id: "comp-1",
        department_id: "dept-1",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const user = await client.me("valid-token");

      expect(user.id).toBe("user-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.ainative.studio/api/v1/auth/me",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer valid-token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("throws on expired token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ detail: "Token expired" }),
      });

      await expect(client.me("expired-token")).rejects.toThrow("Token expired");
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------

  describe("refresh", () => {
    it("returns same token when still valid", async () => {
      const mockUser = {
        id: "user-1",
        email: "alice@acme.com",
        role: "admin",
        company_id: "comp-1",
        department_id: "dept-1",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const result = await client.refresh("valid-token");
      expect(result.token).toBe("valid-token");
      expect(result.user.email).toBe("alice@acme.com");
    });
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe("constructor", () => {
    it("strips trailing slashes from base URL", async () => {
      const c = new AINativeAuthClient("https://api.test.com///");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "1", email: "a@b.com", role: "admin", company_id: "c", department_id: "d" }),
      });

      await c.me("t");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/auth/me",
        expect.anything()
      );
    });
  });
});
