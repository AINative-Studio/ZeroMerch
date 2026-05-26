"use client";

// ---------------------------------------------------------------------------
// Dashboard — Product Catalog (Story 4.1, Issue #14)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { syncProducts, listProducts } from "@/app/actions/products";
import type { Product } from "@/app/actions/products";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["all", "apparel", "accessories", "stationery", "drinkware"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  apparel: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  accessories: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  stationery: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  drinkware: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

const STATUS_COLORS: Record<Product["status"], string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const categoryColor =
    CATEGORY_COLORS[product.category] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const statusColor = STATUS_COLORS[product.status];

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">
          {product.name}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor}`}
        >
          {product.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {product.description}
      </p>

      {/* Category + Tags */}
      <div className="flex flex-wrap gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryColor}`}
        >
          {product.category}
        </span>
        {product.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-sm font-semibold tabular-nums">
          {product.currency} {product.base_price.toFixed(2)}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TagIcon className="h-3 w-3" />
          <span>{product.tags.length} tags</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sync Banner ──────────────────────────────────────────────────────────────

function SyncBanner({
  synced,
  errors,
  onDismiss,
}: {
  synced: number;
  errors: string[];
  onDismiss: () => void;
}) {
  const hasErrors = errors.length > 0;
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
        hasErrors
          ? "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200"
          : "border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-200"
      }`}
    >
      <div>
        <span className="font-medium">
          {synced} product{synced !== 1 ? "s" : ""} synced.
        </span>
        {hasErrors && (
          <ul className="mt-1 ml-3 list-disc text-xs opacity-80">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-xs underline opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { session } = useAuth();
  const companyId = session?.company_id ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load products
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const filters =
      activeCategory === "all" ? undefined : { category: activeCategory };
    listProducts(companyId, filters)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId, activeCategory]);

  function handleSync() {
    if (!companyId) return;
    startTransition(async () => {
      try {
        const result = await syncProducts(companyId);
        setSyncResult({ synced: result.synced, errors: result.errors });
        // Reload product list after sync
        const refreshed = await listProducts(
          companyId,
          activeCategory === "all" ? undefined : { category: activeCategory }
        );
        setProducts(refreshed);
      } catch (err) {
        console.error(err);
        setSyncResult({ synced: 0, errors: ["Sync failed. Check server logs."] });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and sync your corporate merch products
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products/search"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <SearchIcon className="h-4 w-4" />
            Search
          </Link>
          <button
            onClick={handleSync}
            disabled={isPending || !companyId}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshIcon
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
            {isPending ? "Syncing…" : "Sync Products"}
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <SyncBanner
          synced={syncResult.synced}
          errors={syncResult.errors}
          onDismiss={() => setSyncResult(null)}
        />
      )}

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No products found.{" "}
            <button
              onClick={handleSync}
              className="underline hover:no-underline"
            >
              Sync from ZeroCommerce
            </button>{" "}
            to populate your catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && products.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {products.length} product{products.length !== 1 ? "s" : ""}{" "}
          {activeCategory !== "all" ? `in ${activeCategory}` : "total"}
        </p>
      )}
    </div>
  );
}
