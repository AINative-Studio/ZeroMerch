"use client";

// ---------------------------------------------------------------------------
// Dashboard — Vendor Management (Story 11.1, Issue #42)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { listVendors, updateVendor } from "@/app/actions/vendors";
import type { Vendor } from "@zeromerch/zerodb";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  print_on_demand:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  bulk_fulfillment:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  local_vendor:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const PROVIDER_LABELS: Record<string, string> = {
  printful: "Printful",
  printify: "Printify",
  custom: "Custom API",
  manual: "Manual",
};

// ─── Quality Stars ────────────────────────────────────────────────────────────

function QualityStars({ score }: { score: number }) {
  const filled = Math.round(score * 5);
  return (
    <span className="flex gap-0.5" aria-label={`Quality score: ${score.toFixed(2)}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < filled ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ─── Vendor Card ─────────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  onToggle,
  toggling,
}: {
  vendor: Vendor;
  onToggle: (id: string, current: Vendor["status"]) => void;
  toggling: boolean;
}) {
  const typeColor =
    TYPE_COLORS[vendor.type] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold leading-tight">{vendor.name}</h3>
          <span className="text-xs text-muted-foreground">
            {PROVIDER_LABELS[vendor.api_provider] ?? vendor.api_provider}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeColor}`}
        >
          {vendor.type.replace(/_/g, " ")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <QualityStars score={vendor.quality_score} />
        <span className="text-xs text-muted-foreground">
          {(vendor.quality_score * 100).toFixed(0)}%
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        Avg. turnaround:{" "}
        <span className="font-medium text-foreground">
          {vendor.average_turnaround_days}d
        </span>
      </div>

      {vendor.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {vendor.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize"
            >
              {cap.replace(/_/g, " ")}
            </span>
          ))}
          {vendor.capabilities.length > 4 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{vendor.capabilities.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <Link
          href={`/dashboard/vendors/${vendor.id}`}
          className="text-xs text-primary hover:underline"
        >
          View details
        </Link>
        <button
          onClick={() => onToggle(vendor.id, vendor.status)}
          disabled={toggling}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
            vendor.status === "active"
              ? "border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              : "border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          }`}
        >
          {vendor.status === "active" ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listVendors()
      .then((result) => {
        if ("error" in result) {
          setError(result.error);
        } else {
          setVendors(result.vendors);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  function handleToggle(id: string, current: Vendor["status"]) {
    const newStatus: Vendor["status"] =
      current === "active" ? "inactive" : "active";
    setTogglingId(id);
    startTransition(async () => {
      const result = await updateVendor(id, { status: newStatus });
      if ("vendor" in result) {
        setVendors((prev) =>
          prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
        );
      }
      setTogglingId(null);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage fulfillment partners and quality scores
          </p>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Vendor
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {vendors.length === 0 && !error ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No vendors yet.{" "}
            <Link href="/dashboard/vendors/new" className="text-primary hover:underline">
              Add your first vendor
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onToggle={handleToggle}
              toggling={isPending && togglingId === vendor.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
