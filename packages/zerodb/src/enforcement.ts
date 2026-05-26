// ---------------------------------------------------------------------------
// Budget enforcement (Story 9.3, Issue #36)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "./client.js";

export class BudgetExceededError extends Error {
  constructor(
    public readonly budgetId: string,
    public readonly requested: number,
    public readonly remaining: number
  ) {
    super(
      `Budget ${budgetId} exceeded: requested ${requested}, remaining ${remaining}`
    );
    this.name = "BudgetExceededError";
  }
}

export type EnforcementResult =
  | { approved: true; requiresApproval: false }
  | { requiresApproval: true; approvalId: string; approved: false };

/**
 * Enforces budget limits for an order.
 * - Throws BudgetExceededError if the requested amount exceeds the remaining balance.
 * - Returns { requiresApproval: true, approvalId } if the amount exceeds requires_approval_over.
 * - Returns { approved: true } if the order is within limits and no approval needed.
 */
export async function enforceOrderBudget(
  companyId: string,
  userId: string,
  orderAmount: number,
  budgetId: string,
  db?: ZeroDBClient
): Promise<EnforcementResult> {
  const client = db ?? new ZeroDBClient();

  const budget = await client.table("budgets").get(budgetId);
  if (!budget || budget.company_id !== companyId) {
    throw new Error(`Budget ${budgetId} not found`);
  }

  const remaining = Math.max(budget.limit_amount - (budget.spent_amount ?? 0), 0);

  if (orderAmount > remaining) {
    throw new BudgetExceededError(budgetId, orderAmount, remaining);
  }

  if (orderAmount > budget.requires_approval_over) {
    // Create an approval request
    const approval = await client.table("approval_requests").insert({
      company_id: companyId,
      request_type: "order",
      request_ref_id: budgetId,
      requested_by: userId,
      approver_user_id: userId, // will be re-routed by approvals action in UI
      status: "pending",
      reason: `Order amount $${orderAmount} exceeds approval threshold $${budget.requires_approval_over}`,
      created_at: new Date().toISOString(),
    });
    return { requiresApproval: true, approvalId: approval.id, approved: false };
  }

  return { approved: true, requiresApproval: false };
}

/**
 * Records spend against a budget. Does not enforce — call enforceOrderBudget first.
 */
export async function trackBudgetSpend(
  budgetId: string,
  amount: number,
  db?: ZeroDBClient
): Promise<void> {
  const client = db ?? new ZeroDBClient();

  const budget = await client.table("budgets").get(budgetId);
  if (!budget) throw new Error(`Budget ${budgetId} not found`);

  const newSpend = (budget.spent_amount ?? 0) + amount;
  const status =
    newSpend >= budget.limit_amount ? "exhausted" : budget.status;

  await client.table("budgets").update(budgetId, {
    spent_amount: newSpend,
    status,
  });
}
