"use client";

// ---------------------------------------------------------------------------
// Dashboard — Product Search (Story 4.2, Issue #15)
// ---------------------------------------------------------------------------

import { useState, useTransition, useRef } from "react";
import { useAuth } from "@zeromerch/auth";
import { searchProducts } from "@/app/actions/products";
import type { SearchResult } from "@/app/actions/products";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["apparel", "accessories", "stationery", "drinkware"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  apparel: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  accessories: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  stationery: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  drinkware: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : pct >= 60
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}
      title="Semantic similarity score"
    >
      {pct}% match
    </span>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SearchResult }) {
  const { product, score } = result;
  const categoryColor =
    CATEGORY_COLORS[product.category] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
        <ScoreBadge score={score} />
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2">
        {product.description}
      </p>

      <div className="flex flex-wrap gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryColor}`}
        >
          {product.category}
        </span>
        {product.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm font-semibold tabular-nums">
          {product.currency} {product.base_price.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          {product.status}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductSearchPage() {
  const { session } = useAuth();
  const companyId = session?.company_id ?? "";

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch() {
    if (!query.trim() || !companyId) return;
    setError(null);

    const filters: { category?: string; tags?: string[] } = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedTags.length > 0) filters.tags = selectedTags;

    startTransition(async () => {
      try {
        const res = await searchProducts(companyId, query.trim(), filters);
        setResults(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults(null);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Products
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Search
        </h1>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products semantically, e.g. 'premium hoodie for developers'…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-3 h-10 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search query"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isPending || !query.trim() || !companyId}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border bg-muted/30">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Tag filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Tags
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Add tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              className="h-8 w-28 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={addTag}
              className="h-8 px-2 rounded border border-input bg-background text-xs hover:bg-muted transition-colors"
            >
              +
            </button>
          </div>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-destructive transition-colors"
                aria-label={`Remove ${tag} tag filter`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {results.length === 0
              ? "No products matched your search."
              : `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`}
          </p>

          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map(({ product, score }) => (
                <ResultCard key={product.id} result={{ product, score }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Idle state */}
      {results === null && !isPending && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Enter a search query to find products using semantic search.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try: "premium hoodie for developer events" or "office drinkware"
          </p>
        </div>
      )}
    </div>
  );
}
