"use client";

// ---------------------------------------------------------------------------
// Dashboard — Budget List (Story 9.1, Issue #34)
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@zeromerch/auth";
import { listBudgets } from "@/app/actions/budgets";
import type { BudgetWithSpend } from "@/app/actions/budgets";

function SpendBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const styles: Record<string, string> = {
    company: "bg-blue-100 text-blue-800",
    department: "bg-purple-100 text-purple-800",
    campaign: "bg-orange-100 text-orange-800",
    user: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[scope] ?? "bg-gray-100 text-gray-800"}`}>
      {scope}
    </span>
  );
}

function BudgetCard({ budget }: { budget: BudgetWithSpend }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/dashboard/budgets/${budget.id}`}
            className="text-sm font-semibold hover:underline"
          >
            {budget.name}
          </Link>
          <p className="text-xs text-muted-foreground capitalize">{budget.period} · {budget.currency}</p>
        </div>
        <ScopeBadge scope={budget.scope} />
      </div>

      <SpendBar pct={budget.spend_pct} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>${budget.spent_amount.toLocaleString()} spent</span>
        <span>{budget.spend_pct.toFixed(0)}%</span>
        <span>${budget.limit_amount.toLocaleString()} limit</span>
      </div>

      {budget.status === "exhausted" && (
        <p className="text-xs font-medium text-red-600">Budget exhausted</p>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  const { companyId } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    listBudgets(companyId).then((result) => {
      if ("budgets" in result) setBudgets(result.budgets);
      else setError(result.error);
      setIsLoading(false);
    });
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Monitor spend and set approval thresholds.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/budgets/insights"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            AI Insights
          </Link>
          <Link
            href="/dashboard/budgets/new"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New Budget
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {budgets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No budgets yet. Create your first budget.</p>
          <Link href="/dashboard/budgets/new" className="mt-3 inline-block text-sm text-primary hover:underline">
            Create budget
          </Link>
        </div>
      )}
    </div>
  );
}
