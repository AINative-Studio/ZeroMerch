"use client";

// ---------------------------------------------------------------------------
// Dashboard — Vendor Detail (Story 11.1, Issue #42)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVendor, updateQualityScore, addVendorProduct } from "@/app/actions/vendors";
import type { Vendor, VendorProduct } from "@zeromerch/zerodb";
import Link from "next/link";

// ─── Quality Stars (interactive) ─────────────────────────────────────────────

function QualityInput({
  score,
  onChange,
}: {
  score: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const val = (i + 1) / 5;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(val)}
            aria-label={`Set quality score to ${val.toFixed(1)}`}
            className="focus:outline-none"
          >
            <svg
              className={`h-5 w-5 transition-colors ${
                i < Math.round(score * 5)
                  ? "text-yellow-400"
                  : "text-gray-300 dark:text-gray-600 hover:text-yellow-300"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground self-center">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quality score edit
  const [editingScore, setEditingScore] = useState(false);
  const [draftScore, setDraftScore] = useState(0);

  // Add product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newLeadTime, setNewLeadTime] = useState("7");
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    getVendor(params.id)
      .then((result) => {
        if ("error" in result) {
          setError(result.error);
        } else {
          setVendor(result.vendor);
          setVendorProducts(result.vendor.vendor_products);
          setDraftScore(result.vendor.quality_score);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function handleScoreSave() {
    if (!vendor) return;
    startTransition(async () => {
      const result = await updateQualityScore(vendor.id, draftScore);
      if ("vendor" in result) {
        setVendor((v) => (v ? { ...v, quality_score: draftScore } : v));
        setEditingScore(false);
      }
    });
  }

  function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!vendor) return;
    startTransition(async () => {
      const result = await addVendorProduct(
        vendor.id,
        newProductId,
        Number(newCost),
        Number(newLeadTime)
      );
      if ("error" in result) {
        setAddError(result.error);
      } else {
        setVendorProducts((prev) => [...prev, result.vendorProduct]);
        setNewProductId("");
        setNewCost("");
        setNewLeadTime("7");
        setShowAddProduct(false);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error ?? "Vendor not found"}
        </div>
        <Link
          href="/dashboard/vendors"
          className="text-sm text-primary hover:underline"
        >
          Back to vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/vendors"
            className="text-xs text-muted-foreground hover:underline mb-2 inline-block"
          >
            Vendors
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{vendor.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground capitalize">
              {vendor.type.replace(/_/g, " ")}
            </span>
            <span className="text-muted-foreground">·</span>
            <span
              className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                vendor.status === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {vendor.status}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-border p-4 space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            API Provider
          </span>
          <p className="font-medium capitalize">{vendor.api_provider}</p>
        </div>
        <div className="rounded-lg border border-border p-4 space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Avg. Turnaround
          </span>
          <p className="font-medium">{vendor.average_turnaround_days} days</p>
        </div>
      </div>

      {/* Capabilities */}
      {vendor.capabilities.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Capabilities</h2>
          <div className="flex flex-wrap gap-2">
            {vendor.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground capitalize"
              >
                {cap.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quality Score */}
      <div className="rounded-lg border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quality Score</h2>
          {!editingScore && (
            <button
              onClick={() => setEditingScore(true)}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        {editingScore ? (
          <div className="space-y-3">
            <QualityInput score={draftScore} onChange={setDraftScore} />
            <div className="flex gap-2">
              <button
                onClick={handleScoreSave}
                disabled={isPending}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setDraftScore(vendor.quality_score);
                  setEditingScore(false);
                }}
                className="rounded-md border border-input px-4 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <QualityInput score={vendor.quality_score} onChange={() => {}} />
        )}
      </div>

      {/* Products */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Products ({vendorProducts.length})
          </h2>
          <button
            onClick={() => setShowAddProduct((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showAddProduct ? "Cancel" : "+ Add Product"}
          </button>
        </div>

        {showAddProduct && (
          <form
            onSubmit={handleAddProduct}
            className="rounded-lg border border-border p-4 space-y-3 bg-muted/40"
          >
            {addError && (
              <p className="text-xs text-destructive">{addError}</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 space-y-1">
                <label className="text-xs font-medium">Product ID</label>
                <input
                  type="text"
                  required
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  placeholder="product_uuid"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Cost ($)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Lead Time (days)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newLeadTime}
                  onChange={(e) => setNewLeadTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </form>
        )}

        {vendorProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products mapped to this vendor yet.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Product ID
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Cost
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Min Qty
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Lead Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vendorProducts.map((vp) => (
                  <tr key={vp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {vp.product_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      ${vp.cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {vp.minimum_order_quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {vp.lead_time_days}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
