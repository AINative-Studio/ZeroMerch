"use client";

// ---------------------------------------------------------------------------
// Dashboard — AI Operational Insights (Story 12.3, Issue #48)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { getAIInsights, type AIInsights } from "@/app/actions/analytics";

type Severity = "info" | "warning" | "critical";

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[severity]}`}>{severity}</span>;
}

function InsightCard({ title, items, severity, icon }: { title: string; items: string[]; severity: Severity; icon: string }) {
  const borderColors: Record<Severity, string> = { info: "border-t-blue-500", warning: "border-t-yellow-500", critical: "border-t-red-500" };
  return (
    <div className={`rounded-lg border border-border bg-card p-5 border-t-2 ${borderColors[severity]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{icon}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <SeverityBadge severity={severity} />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No findings in this category.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => <li key={i} className="flex gap-2 text-sm"><span className="mt-0.5 shrink-0 text-muted-foreground">•</span><span>{item}</span></li>)}
        </ul>
      )}
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5">
          <div className="h-4 w-40 animate-pulse rounded bg-muted mb-4" />
          <div className="space-y-2"><div className="h-3 w-full animate-pulse rounded bg-muted" /><div className="h-3 w-5/6 animate-pulse rounded bg-muted" /><div className="h-3 w-4/6 animate-pulse rounded bg-muted" /></div>
        </div>
      ))}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
}

export default function AIInsightsPage() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? "";
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function fetchInsights() {
    if (!companyId) return;
    setLoading(true); setError(null);
    startTransition(async () => {
      const result = await getAIInsights(companyId);
      if ("error" in result) { setError(result.error); } else { setInsights(result); }
      setLoading(false);
    });
  }

  useEffect(() => { if (companyId) fetchInsights(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">AI Operational Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Waste detection, top products, budget inefficiencies, and vendor recommendations.</p>
        </div>
        <div className="flex items-center gap-3">
          {insights?.generatedAt && !loading && (
            <span className="text-xs text-muted-foreground">Last updated: {formatTimestamp(insights.generatedAt)}</span>
          )}
          <button onClick={() => fetchInsights()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Analyzing...</>
            ) : "Refresh Insights"}
          </button>
        </div>
      </div>

      {error && !loading && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading && (
        <div className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Fetching live data and generating AI analysis &mdash; this may take a few seconds.
          </div>
          <InsightSkeleton />
        </div>
      )}

      {!loading && insights && (
        <div className="space-y-5">
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
            Insights are cached for 1 hour. Click &ldquo;Refresh Insights&rdquo; to regenerate from the latest data.
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InsightCard title="Waste Detected" items={insights.waste} severity={insights.waste.length === 0 ? "info" : insights.waste.length >= 3 ? "critical" : "warning"} icon="W" />
            <InsightCard title="Top Performing Products" items={insights.popular} severity="info" icon="S" />
            <InsightCard title="Budget Inefficiencies" items={insights.inefficiencies} severity={insights.inefficiencies.length === 0 ? "info" : insights.inefficiencies.length >= 3 ? "critical" : "warning"} icon="!" />
            <InsightCard title="Vendor Recommendations" items={insights.vendorRecs} severity="info" icon="V" />
          </div>
        </div>
      )}

      {!loading && !insights && !error && (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No insights available. Click &ldquo;Refresh Insights&rdquo; to run the analysis.</p>
        </div>
      )}
    </div>
  );
}
