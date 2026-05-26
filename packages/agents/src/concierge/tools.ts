// ---------------------------------------------------------------------------
// Concierge tool implementations (Stories 8.1, 8.2)
// Each function maps to one Anthropic tool definition in prompts.ts
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import type {
  BudgetStatus,
  CampaignDraft,
  CreateCampaignDraftInput,
  GetBudgetStatusInput,
  GetCampaignHistoryInput,
  ProductRecommendation,
  SearchProductsInput,
} from "../types.js";
import type { CampaignType, Budget, Product } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

function getDb(): ZeroDBClient {
  return new ZeroDBClient({ projectId: PROJECT_ID });
}

// ─── search_products ──────────────────────────────────────────────────────────

export async function searchProducts(
  input: SearchProductsInput
): Promise<ProductRecommendation[]> {
  const { query, company_id } = input;
  const apiUrl =
    process.env["ZERODB_API_URL"]?.replace(/\/$/, "") ??
    "https://api.ainative.studio";
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiKey = process.env["ZERODB_API_KEY"];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiToken) headers["Authorization"] = `Bearer ${apiToken}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/projects/${PROJECT_ID}/vectors/search`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          query_text: query,
          collection: "product_embeddings",
          top_k: 5,
          filters: { company_id },
        }),
      }
    );

    if (res.ok) {
      const data = (await res.json()) as Array<{
        id: string;
        score: number;
        metadata: Record<string, unknown>;
      }>;
      return data.map((match) => ({
        id: match.id,
        name: String(match.metadata["name"] ?? ""),
        description: String(match.metadata["description"] ?? ""),
        category: String(match.metadata["category"] ?? ""),
        base_price: Number(match.metadata["base_price"] ?? 0),
        currency: String(match.metadata["currency"] ?? "USD"),
        score: match.score,
      }));
    }
  } catch {
    // Fall through to table scan fallback
  }

  // Fallback: scan products table directly
  const db = getDb();
  const result = await db.table("products").query({ company_id }, 1, 10);
  const products = (result.data ?? []) as Product[];

  // Simple text filter on fallback
  const lowerQuery = query.toLowerCase();
  const filtered = products
    .filter(
      (p) =>
        p.status === "active" &&
        (p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery) ||
          p.tags.some((t) => t.toLowerCase().includes(lowerQuery)))
    )
    .slice(0, 5);

  return filtered.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    base_price: p.base_price,
    currency: p.currency,
  }));
}

// ─── get_budget_status ────────────────────────────────────────────────────────

export async function getBudgetStatus(
  input: GetBudgetStatusInput
): Promise<BudgetStatus[]> {
  const { company_id } = input;
  const db = getDb();

  const result = await db.table("budgets").query({ company_id }, 1, 50);
  const budgets = (result.data ?? []) as Budget[];

  return budgets
    .filter((b) => b.status === "active")
    .map((b) => ({
      id: b.id,
      name: b.name,
      spent: b.spent_amount,
      limit: b.limit_amount,
      currency: b.currency,
      spend_pct:
        b.limit_amount > 0
          ? Math.round((b.spent_amount / b.limit_amount) * 100)
          : 0,
      status: b.status,
    }));
}

// ─── create_campaign_draft ────────────────────────────────────────────────────

export async function createCampaignDraft(
  input: CreateCampaignDraftInput
): Promise<CampaignDraft> {
  const { company_id, name, type, product_ids, budget_id } = input;
  const db = getDb();

  const campaign = await db.table("campaigns").insert({
    company_id,
    name,
    type: type as CampaignType,
    status: "draft",
    budget_id: budget_id ?? undefined,
    created_by: "concierge-agent",
    agent_generated: true,
    agent_prompt: `Concierge-generated campaign: ${name}`,
    created_at: new Date().toISOString(),
  });

  // Associate products
  await Promise.all(
    product_ids.map((product_id, idx) =>
      db.table("campaign_products").insert({
        campaign_id: campaign.id,
        product_id,
        variant_rules: {},
        max_quantity_per_recipient: 1,
        display_order: idx,
      })
    )
  );

  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    product_ids,
    budget_id: campaign.budget_id,
    status: "draft",
    agent_generated: true,
    created_at: campaign.created_at,
  };
}

// ─── get_campaign_history ─────────────────────────────────────────────────────

export async function getCampaignHistory(
  input: GetCampaignHistoryInput
): Promise<Array<{ id: string; name: string; type: string; status: string; created_at: string }>> {
  const { company_id, query } = input;
  const apiUrl =
    process.env["ZERODB_API_URL"]?.replace(/\/$/, "") ??
    "https://api.ainative.studio";
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiKey = process.env["ZERODB_API_KEY"];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiToken) headers["Authorization"] = `Bearer ${apiToken}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/projects/${PROJECT_ID}/vectors/search`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          query_text: query,
          collection: "campaign_embeddings",
          top_k: 5,
          filters: { company_id },
        }),
      }
    );

    if (res.ok) {
      const data = (await res.json()) as Array<{
        id: string;
        score: number;
        metadata: Record<string, unknown>;
      }>;
      return data.map((match) => ({
        id: match.id,
        name: String(match.metadata["name"] ?? ""),
        type: String(match.metadata["type"] ?? ""),
        status: String(match.metadata["status"] ?? ""),
        created_at: String(match.metadata["created_at"] ?? ""),
      }));
    }
  } catch {
    // Fall through to table scan
  }

  // Fallback: table query
  const db = getDb();
  const result = await db.table("campaigns").query({ company_id }, 1, 10);
  const campaigns = result.data ?? [];

  return campaigns.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    created_at: c.created_at,
  }));
}
