"use client";

// ---------------------------------------------------------------------------
// CampaignConfirmCard — draft approval card surfaced when agent generates a campaign
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react";
import { approveCampaignDraft } from "@/app/actions/concierge";
import type { CampaignDraft } from "@zeromerch/agents";

interface CampaignConfirmCardProps {
  draft: CampaignDraft;
  companyId: string;
  onApprove?: (campaignId: string) => void;
  onDiscard?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  event_drop: "Event Drop",
  onboarding: "Onboarding",
  customer_gift: "Customer Gift",
  employee_store: "Employee Store",
  vip_drop: "VIP Drop",
};

export function CampaignConfirmCard({
  draft,
  companyId,
  onApprove,
  onDiscard,
}: CampaignConfirmCardProps) {
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  function handleApprove() {
    startTransition(async () => {
      setError(null);
      const result = await approveCampaignDraft(draft.id, companyId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setApproved(true);
        onApprove?.(result.campaign_id);
      }
    });
  }

  function handleDiscard() {
    setDismissed(true);
    onDiscard?.();
  }

  return (
    <div className="my-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm dark:border-primary/30 dark:bg-primary/10">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Campaign Draft
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-foreground">
            {draft.name}
          </h3>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Draft
        </span>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Type:</span>
          <span>{TYPE_LABELS[draft.type] ?? draft.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Products:</span>
          <span>
            {draft.product_ids.length > 0
              ? `${draft.product_ids.length} product${draft.product_ids.length !== 1 ? "s" : ""} selected`
              : "No products selected"}
          </span>
        </div>
        {draft.budget_id && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Budget:</span>
            <span className="font-mono text-xs">{draft.budget_id}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}

      {/* Actions */}
      {approved ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Campaign activated successfully
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Approving..." : "Approve & Create"}
          </button>
          <button
            onClick={handleDiscard}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
