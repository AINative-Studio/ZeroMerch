"use server";

// ---------------------------------------------------------------------------
// Budget server actions (Story 9.1, Issue #34)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import type { Budget, BudgetScope, BudgetPeriod } from "@zeromerch/zerodb";

export type { Budget };

export interface BudgetWithSpend extends Budget {
  spend_pct: number;
  remaining: number;
}

function getDb() {
  return new ZeroDBClient();
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createBudget(
  companyId: string,
  input: {
    name: string;
    owner_user_id: string;
    scope: BudgetScope;
    limit_amount: number;
    currency?: string;
    period: BudgetPeriod;
    requires_approval_over: number;
  }
): Promise<{ budget: Budget } | { error: string }> {
  if (!input.name?.trim()) return { error: "Name is required" };
  if (input.limit_amount <= 0) return { error: "Limit must be positive" };
  if (input.requires_approval_over < 0) return { error: "Approval threshold must be >= 0" };

  try {
    const db = getDb();
    const budget = await db.table("budgets").insert({
      company_id: companyId,
      name: input.name.trim(),
      owner_user_id: input.owner_user_id,
      scope: input.scope,
      limit_amount: input.limit_amount,
      spent_amount: 0,
      currency: input.currency ?? "USD",
      period: input.period,
      requires_approval_over: input.requires_approval_over,
      status: "active",
    });
    return { budget };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create budget" };
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getBudget(
  budgetId: string,
  companyId: string
): Promise<{ budget: BudgetWithSpend } | { error: string }> {
  try {
    const db = getDb();
    const budget = await db.table("budgets").get(budgetId);
    if (!budget || budget.company_id !== companyId) return { error: "Budget not found" };
    return { budget: enrichBudget(budget) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch budget" };
  }
}

export async function listBudgets(
  companyId: string
): Promise<{ budgets: BudgetWithSpend[] } | { error: string }> {
  try {
    const db = getDb();
    const result = await db.table("budgets").list({ company_id: companyId });
    const items: Budget[] = Array.isArray(result) ? result : result.data ?? [];
    return { budgets: items.map(enrichBudget) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to list budgets" };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateBudgetSpend(
  budgetId: string,
  companyId: string,
  amount: number
): Promise<{ budget: BudgetWithSpend } | { error: string }> {
  try {
    const db = getDb();
    const existing = await db.table("budgets").get(budgetId);
    if (!existing || existing.company_id !== companyId) return { error: "Budget not found" };

    const newSpend = (existing.spent_amount ?? 0) + amount;
    const status =
      newSpend >= existing.limit_amount
        ? "exhausted"
        : existing.status;

    const updated = await db.table("budgets").update(budgetId, {
      spent_amount: newSpend,
      status,
    });
    return { budget: enrichBudget(updated) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update spend" };
  }
}

// ─── Check availability ───────────────────────────────────────────────────────

export async function checkBudgetAvailability(
  budgetId: string,
  companyId: string,
  requestedAmount: number
): Promise<{ available: boolean; requiresApproval: boolean; remaining: number } | { error: string }> {
  const result = await getBudget(budgetId, companyId);
  if ("error" in result) return result;
  const { budget } = result;
  const remaining = budget.remaining;
  if (requestedAmount > remaining) {
    return { available: false, requiresApproval: false, remaining };
  }
  return {
    available: true,
    requiresApproval: requestedAmount > budget.requires_approval_over,
    remaining,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enrichBudget(b: Budget): BudgetWithSpend {
  const spend_pct = b.limit_amount > 0 ? Math.min((b.spent_amount / b.limit_amount) * 100, 100) : 0;
  const remaining = Math.max(b.limit_amount - b.spent_amount, 0);
  return { ...b, spend_pct, remaining };
}
