"use server";

// ---------------------------------------------------------------------------
// Server Actions — Team / user management (Story 2.2, Issue #7)
// ---------------------------------------------------------------------------

import { ZeroDBClient, ZeroDBConflictError } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { CompanyUser } from "@zeromerch/zerodb";

const db = new ZeroDBClient({
  projectId: process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec",
});

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["admin", "manager", "employee", "finance", "vendor"] as const;
type Role = (typeof VALID_ROLES)[number];

function validateEmail(email: string): void {
  if (!email?.trim()) {
    throw new Error("Email is required");
  }
  if (!EMAIL_RE.test(email.trim())) {
    throw new Error("Invalid email address");
  }
}

function validateRole(role: string): asserts role is Role {
  if (!VALID_ROLES.includes(role as Role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }
}

// ─── Duplicate check ─────────────────────────────────────────────────────────

async function assertEmailUniqueInCompany(
  companyId: string,
  email: string,
  excludeId?: string,
): Promise<void> {
  const usersTable = db.table("company_users");
  const result = await usersTable.query(
    { company_id: companyId, email: email.toLowerCase().trim() },
    1,
    1,
  );
  const existing = result.data ?? [];
  const conflict = excludeId
    ? existing.find((u) => u.id !== excludeId)
    : existing[0];
  if (conflict) {
    throw new ZeroDBConflictError(
      `A user with email "${email}" already exists in this company`,
    );
  }
}

// ─── inviteUser ──────────────────────────────────────────────────────────────

export interface InviteUserInput {
  companyId: string;
  email: string;
  role: string;
  departmentId?: string;
  fullName?: string;
}

export interface InviteUserResult {
  user: CompanyUser;
  error?: never;
}

export interface InviteUserError {
  error: string;
  user?: never;
}

/**
 * Create a pending invitation record for a user.
 * Prevents duplicate emails within the same company.
 * Sets expires_at = now + 7 days and status = "pending".
 */
export async function inviteUser(
  input: InviteUserInput,
): Promise<InviteUserResult | InviteUserError> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    validateEmail(input.email);
    validateRole(input.role);

    const normalizedEmail = input.email.toLowerCase().trim();

    await assertEmailUniqueInCompany(input.companyId, normalizedEmail);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const usersTable = db.table("company_users");
    const user = await usersTable.insert({
      company_id: input.companyId,
      email: normalizedEmail,
      full_name: input.fullName?.trim() ?? "",
      role: input.role as Role,
      department_id: input.departmentId ?? undefined,
      status: "pending",
      sso_subject: undefined,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    });

    // Stub email send — replace with actual email provider when ready
    console.log(
      `[invite] Invitation queued for ${normalizedEmail} (expires: ${expiresAt.toISOString()})`,
    );

    return { user };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to invite user";
    return { error: message };
  }
}

// ─── listUsers ───────────────────────────────────────────────────────────────

export interface ListUsersResult {
  users: CompanyUser[];
  total: number;
  error?: never;
}

export interface ListUsersError {
  error: string;
  users?: never;
  total?: never;
}

/**
 * List all users in a company. Returns active, pending, and revoked.
 */
export async function listUsers(
  companyId: string,
  page = 1,
  pageSize = 50,
): Promise<ListUsersResult | ListUsersError> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Enforce tenant isolation
  if (session.user.company_id !== companyId) {
    return { error: "Forbidden" };
  }

  try {
    const usersTable = db.table("company_users");
    const result = await usersTable.query(
      { company_id: companyId },
      page,
      pageSize,
    );
    return { users: result.data ?? [], total: result.total };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load users";
    return { error: message };
  }
}

// ─── updateUserRole ──────────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<{ user: CompanyUser } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    validateRole(role);

    const usersTable = db.table("company_users");
    const existing = await usersTable.get(userId);

    // Enforce tenant isolation
    if (existing.company_id !== session.user.company_id) {
      throw new Error("Forbidden");
    }

    const updated = await usersTable.update(userId, {
      role: role as Role,
    });
    return { user: updated };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update user role";
    return { error: message };
  }
}

// ─── revokeInvitation ────────────────────────────────────────────────────────

export async function revokeInvitation(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const usersTable = db.table("company_users");
    const existing = await usersTable.get(userId);

    // Enforce tenant isolation
    if (existing.company_id !== session.user.company_id) {
      throw new Error("Forbidden");
    }

    await usersTable.update(userId, { status: "revoked" });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to revoke invitation";
    return { error: message };
  }
}
