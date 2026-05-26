"use client";

// ---------------------------------------------------------------------------
// Dashboard — AI Budget Insights (Story 8.3, Issue #32)
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@zeromerch/auth";
import type { BudgetInsights } from "@zeromerch/agents";

export default function BudgetInsightsPage() {
  const { companyId } = useAuth();
  const [insights, setInsights] = useState<BudgetInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    fetch(`/api/ai/budget-insights?company_id=${encodeURIComponent(companyId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInsights(data.insights);
      })
      .catch(() => setError("Failed to load insights"))
      .finally(() => setIsLoading(false));
  }, [companyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Generating AI insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <Link href="/dashboard/budgets" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Budgets
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">AI Budget Insights</h1>
          <p className="text-muted-foreground text-sm">Updated hourly · Powered by Claude</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {insights && (
        <>
          {/* Summary */}
          <div className="rounded-lg border border-border bg-blue-50 dark:bg-blue-950 p-5">
            <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Summary</h2>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">{insights.summary}</p>
          </div>

          {/* Anomalies */}
          {insights.anomalies.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Anomalies</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.anomalies.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.budget_name}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        a.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : a.severity === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Forecasts */}
          {insights.forecasts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Spend Forecasts</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.forecasts.map((f, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <p className="text-sm font-medium">{f.budget_name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current</span>
                        <span>{f.current_spend_pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${f.current_spend_pct}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Forecasted end-of-period</span>
                        <span>{f.forecasted_end_pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.forecasted_end_pct >= 100 ? "bg-red-400" : "bg-orange-400"}`}
                          style={{ width: `${Math.min(f.forecasted_end_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    {f.days_until_exhausted !== undefined && (
                      <p className="text-xs text-red-600">Exhausted in ~{f.days_until_exhausted} days</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Waste alerts */}
          {insights.waste_alerts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Waste Alerts</h2>
              <ul className="space-y-2">
                {insights.waste_alerts.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100">
                    <span className="mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Optimizations */}
          {insights.optimizations.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Optimization Suggestions</h2>
              <div className="space-y-2">
                {insights.optimizations.map((opt, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex-1">
                      <p className="text-sm">{opt.description}</p>
                    </div>
                    {opt.estimated_savings !== undefined && (
                      <span className="shrink-0 text-sm font-semibold text-green-600">
                        ~${opt.estimated_savings.toLocaleString()} saved
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {insights.anomalies.length === 0 &&
            insights.waste_alerts.length === 0 &&
            insights.optimizations.length === 0 && (
              <p className="text-sm text-muted-foreground">No issues detected. Your budgets look healthy.</p>
            )}
        </>
      )}
    </div>
  );
}
