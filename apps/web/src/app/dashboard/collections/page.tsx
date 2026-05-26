"use client";

// ---------------------------------------------------------------------------
// Dashboard — Product Collections (Story 4.3, Issue #16)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { listCollections } from "@/app/actions/collections";
import type { ProductCollection } from "@/app/actions/collections";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBILITY_COLORS: Record<ProductCollection["visibility"], string> = {
  all: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  department: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  campaign: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
};

const VISIBILITY_LABELS: Record<ProductCollection["visibility"], string> = {
  all: "All Employees",
  department: "Department Only",
  campaign: "Campaign Only",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CollectionIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
    </svg>
  );
}

// ─── Collection Card ──────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: ProductCollection }) {
  const visColor = VISIBILITY_COLORS[collection.visibility];
  const visLabel = VISIBILITY_LABELS[collection.visibility];

  const createdAt = new Date(collection.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{collection.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${visColor}`}
        >
          {visLabel}
        </span>
      </div>

      {collection.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {collection.description}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CollectionIcon className="h-3.5 w-3.5" />
          <span>
            {collection.product_ids.length} product
            {collection.product_ids.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{createdAt}</span>
      </div>

      {collection.visibility === "department" &&
        collection.allowed_department_ids.length > 0 && (
          <p className="text-xs text-muted-foreground -mt-1">
            {collection.allowed_department_ids.length} department
            {collection.allowed_department_ids.length !== 1 ? "s" : ""} allowed
          </p>
        )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const { session } = useAuth();
  const companyId = session?.company_id ?? "";

  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    listCollections(companyId)
      .then(setCollections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Collections
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Group products by audience, department, or campaign
          </p>
        </div>
        <Link
          href="/dashboard/collections/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Collection
        </Link>
      </div>

      {/* Collections grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 h-36 animate-pulse"
            />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <CollectionIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No collections yet.{" "}
            <Link
              href="/dashboard/collections/new"
              className="underline hover:no-underline"
            >
              Create your first collection
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}

      {!loading && collections.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {collections.length} active collection
          {collections.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
