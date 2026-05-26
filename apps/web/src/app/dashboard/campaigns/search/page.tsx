// ---------------------------------------------------------------------------
// Semantic Campaign Search — Story 10.2, Issue #39
// ---------------------------------------------------------------------------

import { Suspense } from "react";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import { searchCampaigns } from "@/app/actions/semantic-search";
import type { CampaignSearchResult } from "@/app/actions/semantic-search";
import type { Campaign } from "@zeromerch/zerodb";

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Campaign Search",
  description: "Semantically search campaigns using natural language",
};

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Campaign["status"] }) {
  const styles: Record<Campaign["status"], string> = {
    active: "bg-green-100 text-green-800 border border-green-200",
    draft: "bg-gray-100 text-gray-700 border border-gray-200",
    paused: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    completed: "bg-blue-100 text-blue-800 border border-blue-200",
    archived: "bg-red-100 text-red-700 border border-red-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// ─── Similarity badge ─────────────────────────────────────────────────────────

function SimilarityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : pct >= 60
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {pct}% match
    </span>
  );
}

// ─── Type chip ────────────────────────────────────────────────────────────────

function TypeChip({ type }: { type: Campaign["type"] }) {
  const labels: Record<Campaign["type"], string> = {
    event_drop: "Event Drop",
    onboarding: "Onboarding",
    customer_gift: "Customer Gift",
    employee_store: "Employee Store",
    vip_drop: "VIP Drop",
  };
  return (
    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {labels[type] ?? type}
    </span>
  );
}

// ─── Campaign result card ─────────────────────────────────────────────────────

function CampaignResultCard({ result }: { result: CampaignSearchResult }) {
  const { campaign, similarity_score } = result;

  const startDate = campaign.start_at
    ? new Date(campaign.start_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const endDate = campaign.end_at
    ? new Date(campaign.end_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {campaign.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeChip type={campaign.type} />
            <StatusBadge status={campaign.status} />
          </div>
        </div>
        <SimilarityBadge score={similarity_score} />
      </div>

      {/* Date range */}
      {(startDate || endDate) && (
        <p className="text-xs text-muted-foreground">
          {startDate && endDate
            ? `${startDate} — ${endDate}`
            : startDate
            ? `Starts ${startDate}`
            : `Ends ${endDate}`}
        </p>
      )}

      {/* Agent prompt preview */}
      {campaign.agent_prompt && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {campaign.agent_prompt}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <a
          href={`/dashboard/campaigns/${campaign.id}`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          View Campaign
        </a>
        <a
          href={`/dashboard/campaigns/new?clone=${campaign.id}`}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Clone this campaign
        </a>
      </div>
    </div>
  );
}

// ─── Search results section ───────────────────────────────────────────────────

async function SearchResults({
  companyId,
  query,
}: {
  companyId: string;
  query: string;
}) {
  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">Enter a search query to find campaigns.</p>
        <p className="mt-1 text-xs">
          Try: "GDC hackathon drop" or "employee onboarding kit Q4"
        </p>
      </div>
    );
  }

  const result = await searchCampaigns(companyId, query);

  if ("error" in result) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Search failed: {result.error}
      </div>
    );
  }

  if (result.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">No campaigns matched "{query}".</p>
        <p className="mt-1 text-xs">Try a different query or create a new campaign.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Found {result.results.length} campaign{result.results.length !== 1 ? "s" : ""} matching &quot;{query}&quot;
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {result.results.map((r) => (
          <CampaignResultCard key={r.campaign.id} result={r} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CampaignSearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const companyId = session.user.company_id;
  const query = searchParams.q?.trim() ?? "";

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaign Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search campaigns using natural language. Powered by semantic vector search.
        </p>
      </div>

      {/* Search form */}
      <form method="GET" action="/dashboard/campaigns/search" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder='Find campaigns like our GDC hackathon drop...'
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Search
        </button>
      </form>

      {/* Results */}
      <Suspense
        fallback={
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Searching campaigns...
          </div>
        }
      >
        <SearchResults companyId={companyId} query={query} />
      </Suspense>
    </div>
  );
}
