// ---------------------------------------------------------------------------
// Tests for session utilities (assertCompanyMatch)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { assertCompanyMatch } from "../src/session.js";
import type { Session } from "../src/types.js";

function makeSession(companyId: string): Session {
  return {
    user: {
      id: "user-1",
      email: "alice@acme.com",
      role: "admin",
      company_id: companyId,
      department_id: "dept-1",
    },
    token: "jwt-token",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe("assertCompanyMatch", () => {
  it("does not throw when company matches", () => {
    const session = makeSession("comp-1");
    expect(() => assertCompanyMatch(session, "comp-1")).not.toThrow();
  });

  it("throws on company mismatch", () => {
    const session = makeSession("comp-1");
    expect(() => assertCompanyMatch(session, "comp-2")).toThrow(
      "Multi-tenant violation"
    );
  });

  it("error message includes both company IDs", () => {
    const session = makeSession("comp-abc");
    try {
      assertCompanyMatch(session, "comp-xyz");
      expect.unreachable("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("comp-abc");
      expect(msg).toContain("comp-xyz");
    }
  });
});
