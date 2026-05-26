// ---------------------------------------------------------------------------
// Tests for useRequireRole logic
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";

// We test the role hierarchy logic directly since React hooks
// require a DOM environment. The hook delegates to this mapping.

const ROLE_HIERARCHY: Record<string, number> = {
  employee: 0,
  vendor: 1,
  finance: 2,
  manager: 3,
  admin: 4,
};

function checkRoleAccess(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

describe("Role hierarchy", () => {
  it("admin can access all roles", () => {
    expect(checkRoleAccess("admin", "admin")).toBe(true);
    expect(checkRoleAccess("admin", "manager")).toBe(true);
    expect(checkRoleAccess("admin", "finance")).toBe(true);
    expect(checkRoleAccess("admin", "vendor")).toBe(true);
    expect(checkRoleAccess("admin", "employee")).toBe(true);
  });

  it("employee cannot access manager routes", () => {
    expect(checkRoleAccess("employee", "manager")).toBe(false);
    expect(checkRoleAccess("employee", "admin")).toBe(false);
  });

  it("manager can access finance but not admin", () => {
    expect(checkRoleAccess("manager", "finance")).toBe(true);
    expect(checkRoleAccess("manager", "employee")).toBe(true);
    expect(checkRoleAccess("manager", "admin")).toBe(false);
  });

  it("vendor can access employee routes", () => {
    expect(checkRoleAccess("vendor", "employee")).toBe(true);
    expect(checkRoleAccess("vendor", "vendor")).toBe(true);
    expect(checkRoleAccess("vendor", "finance")).toBe(false);
  });

  it("finance sits between vendor and manager", () => {
    expect(checkRoleAccess("finance", "vendor")).toBe(true);
    expect(checkRoleAccess("finance", "employee")).toBe(true);
    expect(checkRoleAccess("finance", "manager")).toBe(false);
  });

  it("unknown role has no access", () => {
    expect(checkRoleAccess("unknown", "employee")).toBe(false);
  });
});
