"use client";

// ---------------------------------------------------------------------------
// Dashboard — Department Spend Dashboard (Story 12.2, Issue #47)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { getCompanySpendSummary, type CompanySpendSummary, type DepartmentSpendRow, type MonthlyTrend } from "@/app/actions/analytics";

type Period = "month" | "quarter" | "year";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ pctUsed, overage }: { pctUsed: number; overage: boolean }) {
  if (overage) return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Over Budget</span>;
  if (pctUsed >= 80) return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-0.5 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />At Risk</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />On Track</span>;
}

const CATEGORY_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500"];

function CategoryBar({ category, spend, pct, colorClass }: { category: string; spend: number; pct: number; colorClass: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground capitalize truncate">{category}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-24 text-right text-xs font-medium tabular-nums shrink-0">{formatCurrency(spend)}</span>
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums shrink-0">{clamped.toFixed(0)}%</span>
    </div>
  );
}

function MonthlyBarChart({ data }: { data: MonthlyTrend[] }) {
  const maxSpend = Math.max(...data.map((d) => d.spend), 1);
  return (
    <div className="flex items-end gap-3 h-28">
      {data.map(({ month, spend }) => (
        <div key={month} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{spend > 0 ? formatCurrency(spend) : "—"}</span>
          <div className="w-full flex items-end h-16">
            <div className="w-full rounded-t-sm bg-primary/70 transition-all duration-500" style={{ height: `${Math.max(4, (spend / maxSpend) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">{month}</span>
        </div>
      ))}
    </div>
  );
}

function PeriodButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
      {label}
    </button>
  );
}

export default function SpendDashboardPage() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? "";
  const [period, setPeriod] = useState<Period>("year");
  const [summary, setSummary] = useState<CompanySpendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!companyId) return;
    setLoading(true); setError(null);
    startTransition(async () => {
      const result = await getCompanySpendSummary(companyId);
      if ("error" in result) { setError(result.error); } else { setSummary(result); }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const filteredTrend = summary ? period === "month" ? summary.monthlyTrend.slice(-1) : period === "quarter" ? summary.monthlyTrend.slice(-3) : summary.monthlyTrend : [];
  const departments = summary?.spendByDepartment ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Department Spend</h1>
          <p className="text-sm text-muted-foreground mt-1">Budget utilization across all departments.</p>
        </div>
        <div className="flex gap-2">
          <PeriodButton label="Current Month" active={period === "month"} onClick={() => setPeriod("month")} />
          <PeriodButton label="Current Quarter" active={period === "quarter"} onClick={() => setPeriod("quarter")} />
          <PeriodButton label="Current Year" active={period === "year"} onClick={() => setPeriod("year")} />
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {loading && <div className="space-y-4"><div className="h-24 animate-pulse rounded-lg bg-muted" /><div className="h-64 animate-pulse rounded-lg bg-muted" /></div>}

      {!loading && summary && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 border-t-2 border-t-primary">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Company Spend</span>
                <div className="text-3xl font-bold mt-1">{formatCurrency(summary.totalSpend)}</div>
                <div className="text-sm text-muted-foreground mt-1">of {formatCurrency(summary.annualBudget)} annual budget</div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">{summary.annualPctUsed.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">budget used</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${summary.annualPctUsed >= 100 ? "bg-red-500" : summary.annualPctUsed >= 80 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${Math.min(100, summary.annualPctUsed)}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold">Department Breakdown</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Department", "Budget", "Spent", "Remaining", "% Used", "Status"].map((col, i) => (
                      <th key={col} className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${i === 0 ? "text-left" : "text-right last:text-center"}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No departments found.</td></tr>}
                  {departments.map((dept: DepartmentSpendRow) => {
                    const remaining = Math.max(0, dept.budget_limit - dept.spend);
                    return (
                      <tr key={dept.department_id} className={`border-b border-border last:border-0 ${dept.overage ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                        <td className="px-5 py-3 font-medium">{dept.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{dept.budget_limit > 0 ? formatCurrency(dept.budget_limit) : "—"}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium">{formatCurrency(dept.spend)}</td>
                        <td className={`px-5 py-3 text-right tabular-nums ${dept.overage ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>{dept.budget_limit > 0 ? formatCurrency(remaining) : "—"}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{dept.budget_limit > 0 ? `${dept.pct_used.toFixed(0)}%` : "—"}</td>
                        <td className="px-5 py-3 text-center"><StatusBadge pctUsed={dept.pct_used} overage={dept.overage} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {summary.spendByCategory.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Spend by Category</h2>
              <div className="space-y-3">
                {summary.spendByCategory.map((cat, i) => <CategoryBar key={cat.category} category={cat.category} spend={cat.spend} pct={cat.pct} colorClass={CATEGORY_COLORS[i % CATEGORY_COLORS.length]!} />)}
              </div>
            </div>
          )}

          {filteredTrend.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Monthly Spend Trend <span className="ml-2 text-xs font-normal text-muted-foreground">({period === "month" ? "current month" : period === "quarter" ? "last 3 months" : "last 6 months"})</span></h2>
              <MonthlyBarChart data={filteredTrend} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
