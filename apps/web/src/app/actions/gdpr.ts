"use server";

// ---------------------------------------------------------------------------
// GDPR Server Actions — Story 13.2 (Issue #51)
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import { ZeroDBClient } from "@zeromerch/zerodb";
import { auditLogger } from "@zeromerch/audit";

const PROJECT_ID = process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";
const db = new ZeroDBClient({ projectId: PROJECT_ID });

export interface UserDataExport {
  user: Record<string, unknown> | null;
  orders: unknown[];
  orderItems: unknown[];
  redemptionLinks: unknown[];
  preferences: unknown[];
}

export interface GDPRDeletionResult {
  userId: string;
  anonymized: boolean;
  deletedRecords: { preferences: number };
  processedAt: string;
}

export async function exportUserData(userId: string, companyId: string): Promise<UserDataExport> {
  if (!userId || !companyId) throw new Error("userId and companyId are required");

  const [userResult, ordersResult, prefsResult, linksResult] = await Promise.all([
    db.table("company_users").query({ user_id: userId, company_id: companyId }, 1, 1),
    db.table("orders").query({ recipient_id: userId, company_id: companyId }, 1, 200),
    db.table("recipient_preferences").query({ user_id: userId, company_id: companyId }, 1, 100),
    db.table("redemption_links").query({ recipient_id: userId, company_id: companyId }, 1, 200),
  ]);

  const orders = ordersResult.data ?? [];
  const orderIds = orders.map((o) => (o as Record<string, unknown>)["id"] as string);
  const orderItems: unknown[] = [];
  for (const orderId of orderIds) {
    const r = await db.table("order_items").query({ order_id: orderId }, 1, 50);
    orderItems.push(...(r.data ?? []));
  }

  return {
    user: (userResult.data?.[0] as Record<string, unknown> | undefined) ?? null,
    orders,
    orderItems,
    redemptionLinks: linksResult.data ?? [],
    preferences: prefsResult.data ?? [],
  };
}

export async function deleteUserData(
  userId: string,
  companyId: string,
  requestedBy: string
): Promise<GDPRDeletionResult> {
  if (!userId || !companyId) throw new Error("userId and companyId are required");

  const anonEmail = `deleted-${randomUUID()}@zeromerch.deleted`;
  const userResult = await db.table("company_users").query(
    { user_id: userId, company_id: companyId },
    1,
    1
  );
  const userRecord = userResult.data?.[0] as Record<string, unknown> | undefined;
  if (userRecord) {
    await db.table("company_users").update(userRecord["id"] as string, {
      email: anonEmail,
      name: "Deleted User",
      status: "deleted",
    } as never);
  }

  const prefsResult = await db.table("recipient_preferences").query(
    { user_id: userId, company_id: companyId },
    1,
    100
  );
  for (const pref of prefsResult.data ?? []) {
    await db.table("recipient_preferences").delete((pref as Record<string, unknown>)["id"] as string);
  }

  await auditLogger.log({
    company_id: companyId,
    event_type: "gdpr.user_deleted",
    actor_type: "user",
    actor_id: requestedBy,
    object_type: "company_user",
    object_id: userId,
    payload: { anonymized_email: anonEmail, requested_by: requestedBy },
  }).catch(() => {});

  return {
    userId,
    anonymized: true,
    deletedRecords: { preferences: prefsResult.data?.length ?? 0 },
    processedAt: new Date().toISOString(),
  };
}

export async function logGDPRRequest(
  type: "export" | "deletion",
  userId: string,
  requestedBy: string
): Promise<void> {
  await db.events().emit(`gdpr.${type}_requested`, {
    user_id: userId,
    requested_by: requestedBy,
    requested_at: new Date().toISOString(),
  });
}
