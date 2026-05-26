"use client";

// ---------------------------------------------------------------------------
// Dashboard — Inventory Alerts (Story 11.3, Issue #44)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import {
  checkInventoryAlerts,
  markVariantReordered,
} from "@/app/actions/inventory";
import type { ProductVariant } from "@zeromerch/zerodb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertRow {
  variant: ProductVariant;
  currentCount: number;
  reorderThreshold: number;
  suggestedReorder: number;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StockBadge({ count, threshold }: { count: number; threshold: number }) {
  if (count === 0) {
    return (
      <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 text-xs font-medium">
        Out of Stock
      </span>
    );
  }
  if (count <= threshold) {
    return (
      <span className="rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-0.5 text-xs font-medium">
        Low Stock
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 text-xs font-medium">
      OK
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const companyId = user?.company_id as string | undefined;

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    checkInventoryAlerts(companyId)
      .then((result) => {
        if ("error" in result) {
          setError(result.error);
        } else {
          setAlerts(result.alerts);
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  function handleMarkReordered(variantId: string) {
    setReorderingId(variantId);
    startTransition(async () => {
      const result = await markVariantReordered(variantId);
      if ("variant" in result) {
        // Remove from alerts list (now has stock above threshold)
        setAlerts((prev) => prev.filter((a) => a.variant.id !== variantId));
      }
      setReorderingId(null);
    });
  }

  const displayed = showLowOnly
    ? alerts.filter((a) => a.currentCount > 0 && a.currentCount <= a.reorderThreshold)
    : alerts;

  const outOfStockCount = alerts.filter((a) => a.currentCount === 0).length;
  const lowStockCount = alerts.filter(
    (a) => a.currentCount > 0 && a.currentCount <= a.reorderThreshold
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Low stock alerts and reorder suggestions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLowOnly((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              showLowOnly
                ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
                : "bg-background text-muted-foreground border-input hover:border-primary"
            }`}
          >
            {showLowOnly ? "Showing Low Stock Only" : "Show Low Stock Only"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {outOfStockCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Out of Stock</p>
          </div>
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {lowStockCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Low Stock</p>
          </div>
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="text-2xl font-bold">{alerts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Alerts</p>
          </div>
        </div>
      )}

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {showLowOnly
              ? "No low-stock variants to show."
              : "All inventory levels are healthy."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  SKU
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  Size / Color
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                  In Stock
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Threshold
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Suggested Reorder
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((alert) => {
                const { variant } = alert;
                const isReordering =
                  isPending && reorderingId === variant.id;

                return (
                  <tr
                    key={variant.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      {variant.sku}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {[variant.size, variant.color].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {alert.currentCount}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                      {alert.reorderThreshold}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-primary font-medium">
                        +{alert.suggestedReorder}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge
                        count={alert.currentCount}
                        threshold={alert.reorderThreshold}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleMarkReordered(variant.id)}
                        disabled={isReordering}
                        className="text-xs px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {isReordering ? "Updating..." : "Mark Reordered"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
