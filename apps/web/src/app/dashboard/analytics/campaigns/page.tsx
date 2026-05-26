"use client";

// ---------------------------------------------------------------------------
// Dashboard — Campaign Analytics (Story 12.1, Issue #46)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition, useCallback } from "react";
import { useAuth } from "@zeromerch/auth";
import { listCampaigns } from "@/app/actions/campaigns";
import { getCampaignAnalytics, type CampaignAnalytics, type TopProduct } from "@/app/actions/analytics";
import type { Campaign } from "@zeromerch/zerodb";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function downloadCSV(analytics: CampaignAnalytics, campaignName: string) {
  const rows: string[][] = [
    ["Metric", "Value"],
    ["Campaign", campaignName],
    ["Total Redemptions", String(analytics.totalRedemptions)],
    ["Total Links", String(analytics.totalLinks)],
    ["Unused Links", String(analytics.unusedLinks)],
    ["Expired Links", String(analytics.expiredLinks)],
    ["Redemption Rate (%)", analytics.redemptionRate.toFixed(1)],
    ["Total Spend (USD)", analytics.totalSpend.toFixed(2)],
    ["Estimated ROI (USD per redemption)", analytics.estimatedROI.toFixed(2)],
    [],
    ["Top Products", "", ""],
    ["Product Name", "Quantity Redeemed", "Revenue (USD)"],
    ...analytics.topProducts.map((p: TopProduct) => [p.name, String(p.quantity), p.revenue.toFixed(2)]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, ''""'')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `campaign-analytics-${campaignName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "green" | "yellow" | "red" | "blue" }) {
  const accentClass = { green: "border-t-2 border-t-green-500", yellow: "border-t-2 border-t-yellow-500", red: "border-t-2 border-t-red-500", blue: "border-t-2 border-t-blue-500" }[accent ?? "blue"] ?? "border-t-2 border-t-blue-500";
  return (
    <div className={`rounded-lg border border-border bg-card p-5 flex flex-col gap-1 ${accentClass}`}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function RedemptionBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 80 ? "bg-green-500" : clamped >= 50 ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Redemption Rate</span>
        <span className="text-xs font-semibold">{clamped.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] text-muted-foreground">
        <span>0%</span><span>100%</span>
      </div>
    </div>
  );
}

export default function CampaignAnalyticsPage() {
  const { user } = useAuth();
  const companyId = user?.company_id ?? "";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!companyId) return;
    setLoadingCampaigns(true);
    startTransition(async () => {
      const result = await listCampaigns(companyId);
      if ("error" in result) { setError(result.error); }
      else { setCampaigns(result.campaigns); if (result.campaigns.length > 0) setSelectedId(result.campaigns[0]!.id); }
      setLoadingCampaigns(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadAnalytics = useCallback((campaignId: string) => {
    if (!campaignId) return;
    setLoadingAnalytics(true); setError(null);
    startTransition(async () => {
      const result = await getCampaignAnalytics(campaignId);
      if ("error" in result) { setError(result.error); setAnalytics(null); }
      else { setAnalytics(result); }
      setLoadingAnalytics(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (selectedId) loadAnalytics(selectedId); }, [selectedId, loadAnalytics]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaign Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Redemption rates, spend, top products, and ROI by campaign.</p>
        </div>
        {analytics && selectedCampaign && (
          <button onClick={() => downloadCSV(analytics, selectedCampaign.name)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            Export CSV
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="campaign-select" className="text-sm font-medium text-muted-foreground shrink-0">Campaign</label>
        {loadingCampaigns ? (
          <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
        ) : (
          <select id="campaign-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]">
            {campaigns.length === 0 && <option value="">No campaigns found</option>}
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loadingAnalytics && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
        </div>
      )}

      {!loadingAnalytics && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Redemptions" value={String(analytics.totalRedemptions)} sub={`of ${analytics.totalLinks} links`} accent="green" />
            <StatCard label="Unused Links" value={String(analytics.unusedLinks)} sub="not yet redeemed" accent="yellow" />
            <StatCard label="Total Spend" value={formatCurrency(analytics.totalSpend)} sub="from fulfilled orders" accent="blue" />
            <StatCard label="Est. ROI" value={formatCurrency(analytics.estimatedROI)} sub="per redemption" accent="green" />
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <RedemptionBar pct={analytics.redemptionRate} />
            <div className="mt-3 flex flex-wrap gap-6 text-xs text-muted-foreground">
              <span>Used: <strong>{analytics.totalRedemptions}</strong></span>
              <span>Unused: <strong>{analytics.unusedLinks}</strong></span>
              <span>Expired/Revoked: <strong>{analytics.expiredLinks}</strong></span>
            </div>
          </div>

          {analytics.topProducts.length > 0 ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold">Top Products</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Qty Redeemed</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProducts.map((product, i) => (
                      <tr key={product.product_id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-5 py-3 font-medium">{product.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{product.quantity.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No product redemptions recorded for this campaign yet.</p>
            </div>
          )}
        </div>
      )}

      {!loadingAnalytics && !analytics && !error && !loadingCampaigns && (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Select a campaign above to view its analytics.</p>
        </div>
      )}
    </div>
  );
}
