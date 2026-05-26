"use client";

// ---------------------------------------------------------------------------
// Dashboard — Campaign List (Story 7.1, Issue #26)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { listCampaigns } from "@/app/actions/campaigns";
import type { Campaign, CampaignType, CampaignStatus } from "@zeromerch/zerodb";
import Link from "next/link";

// ─── Label maps ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<CampaignType, string> = {
  event_drop: "Event Drop",
  onboarding: "Onboarding",
  customer_gift: "Customer Gift",
  employee_store: "Employee Store",
  vip_drop: "VIP Drop",
};

const TYPE_COLORS: Record<CampaignType, string> = {
  event_drop:
    "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  onboarding:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  customer_gift:
    "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  employee_store:
    "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  vip_drop:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  archived:
    "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
};

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const typeColor =
    TYPE_COLORS[campaign.type] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const statusColor =
    STATUS_COLORS[campaign.status] ??
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{campaign.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor}`}
        >
          {campaign.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}
        >
          {TYPE_LABELS[campaign.type] ?? campaign.type}
        </span>
        {campaign.agent_generated && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            AI Generated
          </span>
        )}
      </div>

      {(campaign.start_at || campaign.end_at) && (
        <div className="text-xs text-muted-foreground flex gap-3">
          {campaign.start_at && (
            <span>Starts {formatDate(campaign.start_at)}</span>
          )}
          {campaign.end_at && (
            <span>Ends {formatDate(campaign.end_at)}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <Link
          href={`/dashboard/campaigns/${campaign.id}`}
          className="text-xs text-primary hover:underline"
        >
          View details
        </Link>
        {campaign.type === "event_drop" && (
          <Link
            href={`/dashboard/campaigns/${campaign.id}/qr`}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            QR Code
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const ALL_STATUSES: CampaignStatus[] = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
];
const ALL_TYPES: CampaignType[] = [
  "event_drop",
  "onboarding",
  "customer_gift",
  "employee_store",
  "vip_drop",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<CampaignType | "">("");
  const [, startTransition] = useTransition();

  const companyId = user?.company_id ?? "";

  const load = () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const result = await listCampaigns(companyId, {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setCampaigns(result.campaigns);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage merch drops, onboarding kits, and gifting campaigns.
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | "")}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as CampaignType | "")}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div className="text-sm text-muted-foreground">Loading campaigns...</div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No campaigns found.{" "}
            <Link
              href="/dashboard/campaigns/new"
              className="text-primary hover:underline"
            >
              Create your first campaign.
            </Link>
          </p>
        </div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
