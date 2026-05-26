"use client";

// ---------------------------------------------------------------------------
// Dashboard — Budget Detail (Story 9.1, Issue #34)
// ---------------------------------------------------------------------------

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@zeromerch/auth";
import { getBudget } from "@/app/actions/budgets";
import { getApprovalHistory } from "@/app/actions/approvals";
import type { BudgetWithSpend } from "@/app/actions/budgets";
import type { ApprovalRequest } from "@/app/actions/approvals";

function SpendBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { companyId } = useAuth();
  const [budget, setBudget] = useState<BudgetWithSpend | null>(null);
  const [exceptions, setExceptions] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    Promise.all([
      getBudget(id, companyId),
      getApprovalHistory(companyId),
    ]).then(([budgetResult, historyResult]) => {
      if ("error" in budgetResult) {
        setError(budgetResult.error);
      } else {
        setBudget(budgetResult.budget);
      }
      if ("approvals" in historyResult) {
        setExceptions(
          historyResult.approvals.filter(
            (a) => a.request_type === "budget_exception" && a.request_ref_id === id
          )
        );
      }
      setIsLoading(false);
    });
  }, [id, companyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading budget...</p>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error ?? "Budget not found"}
        </div>
        <Link href="/dashboard/budgets" className="text-sm text-primary hover:underline">
          Back to budgets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/budgets" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Budgets
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{budget.name}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {budget.scope} · {budget.period} · {budget.currency}
        </p>
      </div>

      {/* Spend summary */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Spend Summary</h2>
        <SpendBar pct={budget.spend_pct} />
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">${budget.spent_amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Spent</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{budget.spend_pct.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
          <div>
            <p className="text-2xl font-bold">${budget.remaining.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Limit</dt>
            <dd>${budget.limit_amount.toLocaleString()} {budget.currency}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Approval threshold</dt>
            <dd>${budget.requires_approval_over.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Status</dt>
            <dd className="capitalize">{budget.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Owner</dt>
            <dd className="font-mono text-xs truncate">{budget.owner_user_id}</dd>
          </div>
        </dl>
      </div>

      {/* Exception log */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Exception Log
          {exceptions.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {exceptions.length} record{exceptions.length !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {exceptions.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Requested by</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((ex) => (
                  <tr key={ex.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{ex.requested_by}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        ex.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : ex.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(ex.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No budget exceptions recorded.</p>
        )}
      </div>
    </div>
  );
}
