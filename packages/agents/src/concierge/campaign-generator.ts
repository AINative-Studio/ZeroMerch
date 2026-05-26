// ---------------------------------------------------------------------------
// Campaign generator — natural language to campaign draft (Story 8.2, Issue #31)
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { ZeroDBClient } from "@zeromerch/zerodb";
import { searchProducts } from "./tools.js";
import type { CampaignType, BrandKit } from "@zeromerch/zerodb";

const MODEL = "claude-sonnet-4-6";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampaignDraftData {
  id?: string;
  name: string;
  type: CampaignType;
  product_ids: string[];
  budget_estimate: number;
  status: "draft";
  agent_generated: true;
  created_at: string;
}

export interface GeneratedCampaign {
  draft: CampaignDraftData;
  brandIssues: string[];
  budgetEstimate: number;
}

interface LLMCampaignPlan {
  name: string;
  type: CampaignType;
  suggested_products: string[];
  budget_estimate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDb(): ZeroDBClient {
  return new ZeroDBClient({ projectId: PROJECT_ID });
}

async function fetchBrandKit(
  companyId: string,
  db: ZeroDBClient
): Promise<BrandKit | null> {
  try {
    const result = await db.table("brand_kits").query({ company_id: companyId }, 1, 1);
    const kits = result.data ?? [];
    return kits[0] ?? null;
  } catch {
    return null;
  }
}

function checkBrandCompliance(
  plan: LLMCampaignPlan,
  brandKit: BrandKit | null
): string[] {
  if (!brandKit) return [];

  const issues: string[] = [];
  const restricted = brandKit.compliance_rules?.restricted_products ?? [];

  for (const restrictedType of restricted) {
    if (plan.type === restrictedType) {
      issues.push(
        `Campaign type "${plan.type}" is restricted by brand compliance rules.`
      );
    }
    for (const productName of plan.suggested_products) {
      if (productName.toLowerCase().includes(restrictedType.toLowerCase())) {
        issues.push(
          `Suggested product "${productName}" matches restricted category "${restrictedType}".`
        );
      }
    }
  }

  return issues;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateCampaignFromPrompt(
  prompt: string,
  companyId: string,
  _userId: string
): Promise<GeneratedCampaign> {
  const anthropic = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"],
  });
  const db = getDb();

  // Step 1: Ask Claude to produce a structured campaign plan
  const planningPrompt = `You are a corporate merchandise campaign planner. Given the following request, produce a JSON campaign plan.

Request: ${prompt}

Return ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "name": "<descriptive campaign name>",
  "type": "<one of: event_drop | onboarding | customer_gift | employee_store | vip_drop>",
  "suggested_products": ["<product name or category>", ...],
  "budget_estimate": <number in USD>
}

Choose the campaign type that best fits the request. Keep budget_estimate realistic for the number of suggested products.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: planningPrompt }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "";

  let plan: LLMCampaignPlan = {
    name: `Campaign from: ${prompt.slice(0, 50)}`,
    type: "event_drop",
    suggested_products: [],
    budget_estimate: 500,
  };

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? rawText) as Partial<LLMCampaignPlan>;
    plan = {
      name: parsed.name ?? plan.name,
      type: parsed.type ?? plan.type,
      suggested_products: Array.isArray(parsed.suggested_products)
        ? parsed.suggested_products
        : plan.suggested_products,
      budget_estimate:
        typeof parsed.budget_estimate === "number"
          ? parsed.budget_estimate
          : plan.budget_estimate,
    };
  } catch {
    // Use defaults defined above
  }

  // Step 2: Resolve product names → product IDs via vector search
  const productIds: string[] = [];
  const seen = new Set<string>();

  await Promise.all(
    plan.suggested_products.map(async (productQuery) => {
      try {
        const matches = await searchProducts({
          query: productQuery,
          company_id: companyId,
        });
        for (const match of matches.slice(0, 2)) {
          if (!seen.has(match.id)) {
            seen.add(match.id);
            productIds.push(match.id);
          }
        }
      } catch {
        // Search failure for one product — continue with others
      }
    })
  );

  // Step 3: Brand compliance check
  const brandKit = await fetchBrandKit(companyId, db);
  const brandIssues = checkBrandCompliance(plan, brandKit);

  // Step 4: Assemble draft (not persisted yet — caller decides)
  const draft: CampaignDraftData = {
    name: plan.name,
    type: plan.type,
    product_ids: productIds,
    budget_estimate: plan.budget_estimate,
    status: "draft",
    agent_generated: true,
    created_at: new Date().toISOString(),
  };

  return {
    draft,
    brandIssues,
    budgetEstimate: plan.budget_estimate,
  };
}
