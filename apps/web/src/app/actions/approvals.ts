"use server";

// ---------------------------------------------------------------------------
// Approval workflow server actions (Story 9.2, Issue #35)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import type { ApprovalRequest, ApprovalRequestType, ApprovalStatus } from "@zeromerch/zerodb";
import { auditLogger } from "@zeromerch/audit";

export type { ApprovalRequest };

function getDb() {
  return new ZeroDBClient();
}

// ─── Approver routing ─────────────────────────────────────────────────────────

async function resolveApprover(
  companyId: string,
  requestType: ApprovalRequestType,
  requestedBy: string,
  db: ZeroDBClient
): Promise<string> {
  try {
    const users = await db.table("company_users").list({ company_id: companyId });
    const all: Array<{ user_id: string; role: string }> = Array.isArray(users)
      ? users
      : (users as { data?: Array<{ user_id: string; role: string }> }).data ?? [];

    const targetRole =
      requestType === "order" || requestType === "budget_exception" ? "finance" : "manager";

    const match = all.find(
      (u) => u.role === targetRole && u.user_id !== requestedBy
    );
    if (match) return match.user_id;

    const admin = all.find((u) => u.role === "admin" && u.user_id !== requestedBy);
    return admin?.user_id ?? requestedBy;
  } catch {
    return requestedBy;
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createApprovalRequest(
  companyId: string,
  input: {
    request_type: ApprovalRequestType;
    request_ref_id: string;
    requested_by: string;
    reason?: string;
    agent_recommendation?: "approve" | "reject" | "escalate";
  }
): Promise<{ approval: ApprovalRequest } | { error: string }> {
  if (!input.request_ref_id?.trim()) return { error: "Reference ID is required" };

  try {
    const db = getDb();
    const approverUserId = await resolveApprover(
      companyId,
      input.request_type,
      input.requested_by,
      db
    );

    const approval = await db.table("approval_requests").insert({
      company_id: companyId,
      request_type: input.request_type,
      request_ref_id: input.request_ref_id,
      requested_by: input.requested_by,
      approver_user_id: approverUserId,
      status: "pending",
      reason: input.reason,
      agent_recommendation: input.agent_recommendation,
      created_at: new Date().toISOString(),
    });
    // Audit: approval created — Story 13.1 (Issue #50)
    await auditLogger.log({
      company_id: companyId,
      event_type: "approval.created",
      actor_type: "user",
      actor_id: input.requested_by,
      object_type: "approval_request",
      object_id: approval.id,
      payload: {
        request_type: input.request_type,
        request_ref_id: input.request_ref_id,
        approver_user_id: approverUserId,
      },
    }).catch(() => {});
    return { approval };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create approval request" };
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function approveRequest(
  approvalId: string,
  userId: string,
  notes?: string
): Promise<{ approval: ApprovalRequest } | { error: string }> {
  try {
    const db = getDb();
    const existing = await db.table("approval_requests").get(approvalId);
    if (!existing) return { error: "Approval request not found" };
    if (existing.status !== "pending" && existing.status !== "escalated") {
      return { error: "Request is already resolved" };
    }

    const updated = await db.table("approval_requests").update(approvalId, {
      status: "approved",
      resolved_at: new Date().toISOString(),
      ...(notes ? { reason: notes } : {}),
    });
    // Audit: approval resolved — Story 13.1 (Issue #50)
    await auditLogger.log({
      company_id: existing.company_id,
      event_type: "approval.resolved",
      actor_type: "user",
      actor_id: userId,
      object_type: "approval_request",
      object_id: approvalId,
      payload: { status: "approved", notes },
    }).catch(() => {});
    return { approval: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve request" };
  }
}

export async function rejectRequest(
  approvalId: string,
  userId: string,
  reason: string
): Promise<{ approval: ApprovalRequest } | { error: string }> {
  if (!reason?.trim()) return { error: "Rejection reason is required" };

  try {
    const db = getDb();
    const existing = await db.table("approval_requests").get(approvalId);
    if (!existing) return { error: "Approval request not found" };
    if (existing.status !== "pending" && existing.status !== "escalated") {
      return { error: "Request is already resolved" };
    }

    const updated = await db.table("approval_requests").update(approvalId, {
      status: "rejected",
      reason: reason.trim(),
      resolved_at: new Date().toISOString(),
    });
    // Audit: approval resolved — Story 13.1 (Issue #50)
    await auditLogger.log({
      company_id: existing.company_id,
      event_type: "approval.resolved",
      actor_type: "user",
      actor_id: userId,
      object_type: "approval_request",
      object_id: approvalId,
      payload: { status: "rejected", reason },
    }).catch(() => {});
    return { approval: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reject request" };
  }
}

export async function escalateRequest(
  approvalId: string,
  companyId: string
): Promise<{ approval: ApprovalRequest } | { error: string }> {
  try {
    const db = getDb();
    const existing = await db.table("approval_requests").get(approvalId);
    if (!existing || existing.company_id !== companyId) return { error: "Approval request not found" };
    if (existing.status !== "pending") return { error: "Only pending requests can be escalated" };

    // Re-route to admin
    const users = await db.table("company_users").list({ company_id: companyId });
    const all: Array<{ user_id: string; role: string }> = Array.isArray(users)
      ? users
      : (users as { data?: Array<{ user_id: string; role: string }> }).data ?? [];
    const admin = all.find(
      (u) => u.role === "admin" && u.user_id !== existing.approver_user_id
    );

    const updated = await db.table("approval_requests").update(approvalId, {
      status: "escalated",
      ...(admin ? { approver_user_id: admin.user_id } : {}),
    });
    return { approval: updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to escalate request" };
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPendingApprovals(
  companyId: string,
  userId?: string
): Promise<{ approvals: ApprovalRequest[] } | { error: string }> {
  try {
    const db = getDb();
    const result = await db.table("approval_requests").list({
      company_id: companyId,
      ...(userId ? { approver_user_id: userId } : {}),
    });
    const all: ApprovalRequest[] = Array.isArray(result) ? result : result.data ?? [];
    return { approvals: all.filter((a) => a.status === "pending" || a.status === "escalated") };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch approvals" };
  }
}

export async function getApprovalHistory(
  companyId: string
): Promise<{ approvals: ApprovalRequest[] } | { error: string }> {
  try {
    const db = getDb();
    const result = await db.table("approval_requests").list({ company_id: companyId });
    const all: ApprovalRequest[] = Array.isArray(result) ? result : result.data ?? [];
    return { approvals: all.filter((a) => a.status === "approved" || a.status === "rejected") };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch history" };
  }
}

export async function getApprovalRequest(
  approvalId: string
): Promise<{ approval: ApprovalRequest } | { error: string }> {
  try {
    const db = getDb();
    const approval = await db.table("approval_requests").get(approvalId);
    if (!approval) return { error: "Approval request not found" };
    return { approval };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch approval request" };
  }
}
