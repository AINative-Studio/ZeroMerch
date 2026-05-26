// ---------------------------------------------------------------------------
// AI Budget Advisor (Story 8.3, Issue #32)
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { ZeroDBClient } from "@zeromerch/zerodb";
import type { Budget } from "@zeromerch/zerodb";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface BudgetAnomaly {
  budget_id: string;
  budget_name: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface SpendForecast {
  budget_id: string;
  budget_name: string;
  current_spend_pct: number;
  forecasted_end_pct: number;
  days_until_exhausted?: number;
}

export interface OptimizationSuggestion {
  description: string;
  estimated_savings?: number;
}

export interface BudgetInsights {
  anomalies: BudgetAnomaly[];
  forecasts: SpendForecast[];
  waste_alerts: string[];
  optimizations: OptimizationSuggestion[];
  summary: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getCachedInsights(
  companyId: string,
  db: ZeroDBClient
): Promise<BudgetInsights | null> {
  try {
    // Use events().list() — the EventsClient method that queries events
    const results = await db.events().list({ company_id: companyId }, 1, 1);
    const records = results.data ?? [];
    if (!records.length) return null;

    const record = records[0];
    const payload = record.payload as Record<string, unknown>;
    const expiresAt = payload?.expires_at as number | undefined;
    if (!expiresAt || Date.now() > expiresAt) return null;

    return payload?.insights as BudgetInsights | undefined ?? null;
  } catch {
    return null;
  }
}

async function cacheInsights(
  companyId: string,
  insights: BudgetInsights,
  db: ZeroDBClient
): Promise<void> {
  try {
    await db.events().emit("budget.insights_cache", {
      company_id: companyId,
      insights,
      expires_at: Date.now() + CACHE_TTL_MS,
    });
  } catch {
    // cache failure is non-fatal
  }
}

export async function analyzeBudgetSpend(
  companyId: string,
  db?: ZeroDBClient
): Promise<BudgetInsights> {
  const client = db ?? new ZeroDBClient();

  const cached = await getCachedInsights(companyId, client);
  if (cached) return cached;

  // Fetch budgets via query()
  const budgetsResult = await client.table("budgets").query({ company_id: companyId }, 1, 100);
  const budgets: Budget[] = (budgetsResult.data ?? []) as Budget[];

  if (!budgets.length) {
    return {
      anomalies: [],
      forecasts: [],
      waste_alerts: [],
      optimizations: [],
      summary: "No budgets configured yet.",
    };
  }

  const budgetSummary = budgets.map((b) => ({
    id: b.id,
    name: b.name,
    scope: b.scope,
    period: b.period,
    limit: b.limit_amount,
    spent: b.spent_amount,
    spend_pct: b.limit_amount > 0 ? Math.round((b.spent_amount / b.limit_amount) * 100) : 0,
    status: b.status,
    currency: b.currency,
  }));

  const prompt = `You are a corporate finance AI advisor. Analyze the following budget data and return a JSON object with keys: anomalies, forecasts, waste_alerts, optimizations, summary.

Budget data:
${JSON.stringify(budgetSummary, null, 2)}

Return ONLY valid JSON matching this TypeScript type:
{
  anomalies: Array<{ budget_id: string, budget_name: string, description: string, severity: "low"|"medium"|"high" }>,
  forecasts: Array<{ budget_id: string, budget_name: string, current_spend_pct: number, forecasted_end_pct: number, days_until_exhausted?: number }>,
  waste_alerts: string[],
  optimizations: Array<{ description: string, estimated_savings?: number }>,
  summary: string
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let insights: BudgetInsights;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    insights = JSON.parse(jsonMatch?.[0] ?? text) as BudgetInsights;
  } catch {
    insights = {
      anomalies: [],
      forecasts: budgetSummary.map((b) => ({
        budget_id: b.id,
        budget_name: b.name,
        current_spend_pct: b.spend_pct,
        forecasted_end_pct: Math.min(b.spend_pct * 1.2, 100),
      })),
      waste_alerts: [],
      optimizations: [],
      summary: text.slice(0, 500),
    };
  }

  await cacheInsights(companyId, insights, client);
  return insights;
}
