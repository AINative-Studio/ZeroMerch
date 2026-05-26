"use server";

// ---------------------------------------------------------------------------
// Server Actions — AI Merch Concierge (Stories 8.1, 8.2)
// Issues #30, #31
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { generateCampaignFromPrompt } from "@zeromerch/agents";
import type { GeneratedCampaign } from "@zeromerch/agents";
import type { Budget } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

function getDb(): ZeroDBClient {
  return new ZeroDBClient({ projectId: PROJECT_ID });
}

// ─── Budget pill data ─────────────────────────────────────────────────────────

export interface BudgetPillData {
  spent: number;
  limit: number;
  currency: string;
}

export async function getBudgetPillData(
  companyId: string
): Promise<BudgetPillData | null> {
  if (!companyId) return null;

  try {
    const db = getDb();
    const result = await db
      .table("budgets")
      .query({ company_id: companyId, status: "active" }, 1, 50);

    const budgets = (result.data ?? []) as Budget[];
    if (!budgets.length) return null;

    // Aggregate all active budgets
    const currency = budgets[0]?.currency ?? "USD";
    const spent = budgets.reduce((sum, b) => sum + b.spent_amount, 0);
    const limit = budgets.reduce((sum, b) => sum + b.limit_amount, 0);

    return { spent, limit, currency };
  } catch {
    return null;
  }
}

// ─── Generate campaign from natural language ──────────────────────────────────

export async function generateCampaign(
  prompt: string,
  companyId: string,
  userId: string
): Promise<GeneratedCampaign | { error: string }> {
  if (!prompt?.trim()) return { error: "Prompt is required" };
  if (!companyId) return { error: "company_id is required" };
  if (!userId) return { error: "user_id is required" };

  try {
    const result = await generateCampaignFromPrompt(prompt, companyId, userId);
    return result;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to generate campaign",
    };
  }
}

// ─── Approve campaign draft ───────────────────────────────────────────────────

export async function approveCampaignDraft(
  draftId: string,
  companyId: string
): Promise<{ success: true; campaign_id: string } | { error: string }> {
  if (!draftId) return { error: "draftId is required" };
  if (!companyId) return { error: "companyId is required" };

  try {
    const db = getDb();
    const campaign = await db.table("campaigns").get(draftId);

    if (!campaign) {
      return { error: "Campaign not found" };
    }
    if (campaign.company_id !== companyId) {
      return { error: "Forbidden" };
    }
    if (campaign.status !== "draft") {
      return { error: `Campaign is already in status: ${campaign.status}` };
    }

    await db.table("campaigns").update(draftId, { status: "active" });

    return { success: true, campaign_id: draftId };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to approve campaign draft",
    };
  }
}
