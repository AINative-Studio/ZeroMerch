"use client";

// ---------------------------------------------------------------------------
// Dashboard — New Budget Form (Story 9.1, Issue #34)
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@zeromerch/auth";
import { createBudget } from "@/app/actions/budgets";
import type { BudgetScope, BudgetPeriod } from "@zeromerch/zerodb";

const SCOPES: { value: BudgetScope; label: string; description: string }[] = [
  { value: "company", label: "Company-wide", description: "Applies to all departments and users" },
  { value: "department", label: "Department", description: "Scoped to a specific team" },
  { value: "campaign", label: "Campaign", description: "Tied to a single campaign" },
  { value: "user", label: "Per-user", description: "Individual spend limit" },
];

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "campaign", label: "Campaign duration" },
];

export default function NewBudgetPage() {
  const { companyId, user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [scope, setScope] = useState<BudgetScope>("company");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [limitAmount, setLimitAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [approvalThreshold, setApprovalThreshold] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !user?.id) return;

    const limit = parseFloat(limitAmount);
    const threshold = parseFloat(approvalThreshold);

    if (isNaN(limit) || limit <= 0) {
      setError("Limit must be a positive number");
      return;
    }
    if (isNaN(threshold) || threshold < 0) {
      setError("Approval threshold must be >= 0");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createBudget(companyId, {
        name,
        owner_user_id: user.id,
        scope,
        period,
        limit_amount: limit,
        currency,
        requires_approval_over: threshold,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/budgets");
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/dashboard/budgets" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Budgets
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">New Budget</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Budget name</label>
          <input
            id="name" type="text" required value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q2 Marketing Budget"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Scope */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Scope</legend>
          <div className="grid grid-cols-2 gap-2">
            {SCOPES.map((s) => (
              <label
                key={s.value}
                className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors ${
                  scope === s.value
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-muted-foreground/50"
                }`}
              >
                <input
                  type="radio" name="scope" value={s.value}
                  checked={scope === s.value}
                  onChange={() => setScope(s.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Period */}
        <div className="space-y-1.5">
          <label htmlFor="period" className="text-sm font-medium">Period</label>
          <select
            id="period" value={period}
            onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Limit + currency */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="limitAmount" className="text-sm font-medium">Limit amount</label>
            <input
              id="limitAmount" type="number" required min="1" step="0.01"
              value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="5000"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="w-24 space-y-1.5">
            <label htmlFor="currency" className="text-sm font-medium">Currency</label>
            <select
              id="currency" value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Approval threshold */}
        <div className="space-y-1.5">
          <label htmlFor="approvalThreshold" className="text-sm font-medium">
            Approval required over
          </label>
          <p className="text-xs text-muted-foreground">
            Orders above this amount require manager approval. Set 0 to always require approval.
          </p>
          <input
            id="approvalThreshold" type="number" required min="0" step="0.01"
            value={approvalThreshold} onChange={(e) => setApprovalThreshold(e.target.value)}
            placeholder="500"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={isPending}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creating..." : "Create budget"}
          </button>
          <Link
            href="/dashboard/budgets"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
