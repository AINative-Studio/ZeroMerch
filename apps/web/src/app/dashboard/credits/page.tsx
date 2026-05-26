"use client";

// ---------------------------------------------------------------------------
// Dashboard — Employee Credit Balance (Story 6.2, Issue #23)
// Route: /dashboard/credits
// ---------------------------------------------------------------------------
// Shows the authenticated employee's credit balance, per-link breakdown,
// and expiry dates. Uses getUserCreditBalance server action.
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { getUserCreditBalance } from "@/app/actions/redemption";
import type { CreditBalance } from "@/app/actions/redemption";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "No expiry";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function isExpiringSoon(iso: string | undefined): boolean {
  if (!iso) return false;
  const days =
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;

    startTransition(async () => {
      try {
        const data = await getUserCreditBalance(user.id, user.company_id);
        setBalance(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load credits"
        );
      }
    });
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your credits.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Credits</h1>
        <p className="mt-1 text-muted-foreground">
          Your available gifting and merch credits across all campaigns.
        </p>
      </div>

      {/* Total balance card */}
      <div className="mb-8 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {isPending ? (
          <div className="h-14 animate-pulse rounded-md bg-muted" />
        ) : (
          <>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Available Balance
            </p>
            <p className="mt-2 text-5xl font-bold tracking-tight">
              {balance ? formatCurrency(balance.total) : "—"}
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Per-link breakdown */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Redemption History</h2>

        {isPending ? (
          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-20 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </ul>
        ) : balance && balance.links.length > 0 ? (
          <ul className="space-y-3">
            {balance.links.map((link) => {
              const expiringSoon = isExpiringSoon(link.expiresAt);
              return (
                <li
                  key={link.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      Campaign{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {link.campaignId.slice(0, 8)}…
                      </span>
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${
                        expiringSoon
                          ? "font-semibold text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {expiringSoon && "Expires soon — "}
                      Expires {formatDate(link.expiresAt)}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        link.status === "unused"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {link.status}
                    </span>
                    <p className="text-base font-semibold">
                      {formatCurrency(link.creditAmount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No active credits found. Credits are issued by your company admin
              via campaigns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
