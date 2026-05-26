"use server";

// ---------------------------------------------------------------------------
// Server Actions — Department management (Story 2.3, Issue #8)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Department, CompanyUser } from "@zeromerch/zerodb";

const db = new ZeroDBClient({
  projectId: process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec",
});

// ─── Validation ──────────────────────────────────────────────────────────────

function validateDepartmentName(name: string): void {
  if (!name?.trim()) {
    throw new Error("Department name is required");
  }
  if (name.trim().length > 128) {
    throw new Error("Department name must be 128 characters or fewer");
  }
}

// ─── createDepartment ────────────────────────────────────────────────────────

export interface CreateDepartmentInput {
  companyId: string;
  name: string;
  managerUserId?: string;
}

export interface CreateDepartmentResult {
  department: Department;
  error?: never;
}

export interface CreateDepartmentError {
  error: string;
  department?: never;
}

/**
 * Create a department scoped to a company, optionally assigning a manager.
 */
export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<CreateDepartmentResult | CreateDepartmentError> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Enforce tenant isolation
  if (session.user.company_id !== input.companyId) {
    return { error: "Forbidden" };
  }

  try {
    validateDepartmentName(input.name);

    // If a manager was specified, verify they belong to the same company
    if (input.managerUserId) {
      const usersTable = db.table("company_users");
      const manager = await usersTable.get(input.managerUserId);
      if (manager.company_id !== input.companyId) {
        throw new Error("Manager must belong to the same company");
      }
    }

    const deptsTable = db.table("departments");
    const now = new Date().toISOString();
    const department = await deptsTable.insert({
      company_id: input.companyId,
      name: input.name.trim(),
      budget_id: undefined,
      manager_user_id: input.managerUserId ?? undefined,
      created_at: now,
    });

    // If a manager is assigned, update their record to point to this dept
    if (input.managerUserId) {
      const usersTable = db.table("company_users");
      await usersTable.update(input.managerUserId, {
        department_id: department.id,
      });
    }

    return { department };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create department";
    return { error: message };
  }
}

// ─── listDepartments ─────────────────────────────────────────────────────────

export interface DepartmentWithStats extends Department {
  member_count: number;
  manager?: CompanyUser | null;
}

export interface ListDepartmentsResult {
  departments: DepartmentWithStats[];
  error?: never;
}

export interface ListDepartmentsError {
  error: string;
  departments?: never;
}

/**
 * List all departments for a company, enriched with member count and manager info.
 */
export async function listDepartments(
  companyId: string,
): Promise<ListDepartmentsResult | ListDepartmentsError> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Enforce tenant isolation
  if (session.user.company_id !== companyId) {
    return { error: "Forbidden" };
  }

  try {
    const deptsTable = db.table("departments");
    const usersTable = db.table("company_users");

    // Fetch all departments and all company users in parallel
    const [deptsResult, usersResult] = await Promise.all([
      deptsTable.query({ company_id: companyId }, 1, 200),
      usersTable.query({ company_id: companyId }, 1, 500),
    ]);

    const departments = deptsResult.data ?? [];
    const users = usersResult.data ?? [];

    // Build a lookup for member counts and manager records
    const memberCountByDept: Record<string, number> = {};
    const managerById: Record<string, CompanyUser> = {};

    for (const user of users) {
      if (user.department_id) {
        memberCountByDept[user.department_id] =
          (memberCountByDept[user.department_id] ?? 0) + 1;
      }
      managerById[user.id] = user;
    }

    const enriched: DepartmentWithStats[] = departments.map((dept) => ({
      ...dept,
      member_count: memberCountByDept[dept.id] ?? 0,
      manager: dept.manager_user_id
        ? (managerById[dept.manager_user_id] ?? null)
        : null,
    }));

    return { departments: enriched };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load departments";
    return { error: message };
  }
}

// ─── assignManager ───────────────────────────────────────────────────────────

/**
 * Assign a user as manager of a department.
 * Verifies both records belong to the same company.
 */
export async function assignManager(
  deptId: string,
  userId: string,
): Promise<{ department: Department } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const deptsTable = db.table("departments");
    const usersTable = db.table("company_users");

    const [dept, user] = await Promise.all([
      deptsTable.get(deptId),
      usersTable.get(userId),
    ]);

    // Enforce tenant isolation
    if (dept.company_id !== session.user.company_id) {
      throw new Error("Forbidden");
    }
    if (user.company_id !== dept.company_id) {
      throw new Error("Manager must belong to the same company as the department");
    }

    const updated = await deptsTable.update(deptId, {
      manager_user_id: userId,
    });

    return { department: updated };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to assign manager";
    return { error: message };
  }
}

// ─── assignUserToDepartment ───────────────────────────────────────────────────

/**
 * Assign a user to a department. Both must belong to the same company.
 */
export async function assignUserToDepartment(
  userId: string,
  deptId: string,
): Promise<{ user: CompanyUser } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const deptsTable = db.table("departments");
    const usersTable = db.table("company_users");

    const [dept, user] = await Promise.all([
      deptsTable.get(deptId),
      usersTable.get(userId),
    ]);

    // Enforce tenant isolation
    if (dept.company_id !== session.user.company_id) {
      throw new Error("Forbidden");
    }
    if (user.company_id !== dept.company_id) {
      throw new Error("User and department must belong to the same company");
    }

    const updated = await usersTable.update(userId, {
      department_id: deptId,
    });

    return { user: updated };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to assign user to department";
    return { error: message };
  }
}
