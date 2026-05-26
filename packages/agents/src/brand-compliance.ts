// ---------------------------------------------------------------------------
// AI Brand Compliance Review (Story 3.3, Issue #12)
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { ZeroDBClient } from "@zeromerch/zerodb";
import type { AssetUsageStatus } from "@zeromerch/zerodb";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ReviewStatus = "approved" | "rejected" | "needs_human_review";

export interface DesignReview {
  id: string;
  asset_id: string;
  company_id: string;
  score: number;
  status: ReviewStatus;
  findings: string[];
  reviewed_at: string;
  override_by?: string;
  override_at?: string;
}

// Access tables not in CollectionTypeMap via a raw cast
function rawTable<T>(client: ZeroDBClient, name: string) {
  const c = client as unknown as {
    table: (n: string) => {
      insert: (data: Partial<T>) => Promise<T>;
      get: (id: string) => Promise<T | null>;
      update: (id: string, data: Partial<T>) => Promise<T>;
      query: (filter?: Record<string, unknown>, page?: number, pageSize?: number) => Promise<{ data?: T[] }>;
    };
  };
  return c.table(name);
}

export async function reviewDesignAsset(
  assetId: string,
  companyId: string,
  db?: ZeroDBClient
): Promise<DesignReview> {
  const client = db ?? new ZeroDBClient();

  const asset = await client.table("design_assets").get(assetId);
  if (!asset || asset.company_id !== companyId) {
    throw new Error(`Asset ${assetId} not found`);
  }

  // Use query() — the only available method on TableClient
  const brandKitResult = await client.table("brand_kits").query({ company_id: companyId }, 1, 5);
  const kits = (brandKitResult.data ?? []) as Array<{
    id: string;
    compliance_rules: unknown;
    restricted_phrases: string[];
    approved_phrases: string[];
    primary_colors: string[];
    fonts: string[];
  }>;
  const brandKit = kits[0];

  const prompt = `You are a brand compliance AI. Review this design asset against the brand guidelines.

Asset:
- Type: ${asset.asset_type}
- Format: ${(asset.metadata as Record<string, unknown>)?.format ?? "unknown"}
- Name: ${(asset.metadata as Record<string, unknown>)?.original_name ?? "unknown"}
- Dimensions: ${(asset.metadata as Record<string, unknown>)?.dimensions ?? "unknown"}
- Safe for print: ${(asset.metadata as Record<string, unknown>)?.safe_for_print ?? "unknown"}

Brand Guidelines:
${brandKit ? JSON.stringify({
  compliance_rules: brandKit.compliance_rules,
  restricted_phrases: brandKit.restricted_phrases,
  approved_phrases: brandKit.approved_phrases,
  primary_colors: brandKit.primary_colors,
  fonts: brandKit.fonts,
}, null, 2) : "No brand kit configured."}

Return ONLY valid JSON with keys:
{
  "score": <0.0-1.0 compliance score>,
  "status": <"approved" | "rejected" | "needs_human_review">,
  "findings": [<string observations/issues>]
}

Scoring: >0.9 = approved, <0.5 = rejected, else needs_human_review.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let score = 0.7;
  let status: ReviewStatus = "needs_human_review";
  let findings: string[] = [];

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? text) as {
      score?: number;
      status?: ReviewStatus;
      findings?: string[];
    };
    score = typeof parsed.score === "number" ? parsed.score : 0.7;
    status = parsed.status ?? "needs_human_review";
    findings = Array.isArray(parsed.findings) ? parsed.findings : [];
  } catch {
    findings = ["Unable to parse AI response — manual review required."];
  }

  // Persist review
  const review = await rawTable<DesignReview>(client, "design_reviews").insert({
    asset_id: assetId,
    company_id: companyId,
    score,
    status,
    findings,
    reviewed_at: new Date().toISOString(),
  });

  // Update asset usage_status
  const usageStatus: AssetUsageStatus =
    status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";
  await client.table("design_assets").update(assetId, { usage_status: usageStatus });

  return review;
}

export async function overrideReview(
  reviewId: string,
  newStatus: ReviewStatus,
  userId: string,
  db?: ZeroDBClient
): Promise<DesignReview> {
  const client = db ?? new ZeroDBClient();

  const existing = await rawTable<DesignReview>(client, "design_reviews").get(reviewId);
  if (!existing) throw new Error(`Review ${reviewId} not found`);

  const updated = await rawTable<DesignReview>(client, "design_reviews").update(reviewId, {
    status: newStatus,
    override_by: userId,
    override_at: new Date().toISOString(),
    findings: [...(existing.findings ?? []), `Human override by ${userId}: set to ${newStatus}`],
  });

  // Sync asset status
  const usageStatus: AssetUsageStatus =
    newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "pending";
  await client.table("design_assets").update(existing.asset_id, { usage_status: usageStatus });

  return updated;
}
