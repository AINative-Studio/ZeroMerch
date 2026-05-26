"use client";

// ---------------------------------------------------------------------------
// Public Event Drop Landing Page (Story 7.2, Issue #27)
//
// Route: /join/[campaignId]
// - Shows campaign products when live
// - Countdown when upcoming
// - Expired state when past end_at
// - Invite-only: validates email before showing products
// - QR-only: accessible from any entry point (QR = sharing the URL)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { getPublicCampaign, validateInviteAccess } from "@/app/actions/campaigns";
import type { CampaignWithProducts } from "@/app/actions/campaigns";
import type { CampaignProductWithDetails } from "@/app/actions/campaigns";

// ─── Countdown ────────────────────────────────────────────────────────────────

function useCountdown(targetIso?: string) {
  const [remaining, setRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining({ days, hours, minutes, seconds });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return remaining;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-bold tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─── Product card (public) ────────────────────────────────────────────────────

function PublicProductCard({ cp }: { cp: CampaignProductWithDetails }) {
  const product = cp.product;
  if (!product) return null;

  const colors = cp.variant_rules?.allow_colors ?? [];

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-base font-semibold">{product.name}</h3>
      <p className="text-sm text-muted-foreground line-clamp-3">
        {product.description}
      </p>
      {colors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {colors.map((color) => (
            <span
              key={color}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize"
            >
              {color}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm font-bold">
          {product.currency} {product.base_price.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground">
          Max {cp.max_quantity_per_recipient} per person
        </span>
      </div>
    </div>
  );
}

// ─── Invite gate ──────────────────────────────────────────────────────────────

function InviteGate({
  campaignId,
  onGranted,
}: {
  campaignId: string;
  onGranted: () => void;
}) {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [denied, setDenied] = useState(false);
  const [, startTransition] = useTransition();

  const handleCheck = () => {
    if (!email.trim()) return;
    setChecking(true);
    setDenied(false);
    startTransition(async () => {
      const result = await validateInviteAccess(campaignId, email.trim());
      setChecking(false);
      if ("error" in result) {
        setDenied(true);
        return;
      }
      if (result.allowed) {
        onGranted();
      } else {
        setDenied(true);
      }
    });
  };

  return (
    <div className="max-w-sm mx-auto rounded-lg border border-border bg-card p-8 space-y-5 text-center">
      <div>
        <h2 className="text-lg font-semibold">Invite-Only Drop</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email to verify your invite.
        </p>
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCheck()}
        placeholder="you@example.com"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {denied && (
        <p className="text-sm text-destructive">
          Your email is not on the invite list for this drop.
        </p>
      )}
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking || !email.trim()}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {checking ? "Checking..." : "Check my invite"}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JoinCampaignPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const [data, setData] = useState<{
    campaign: CampaignWithProducts;
    products: CampaignProductWithDetails[];
    state: "live" | "upcoming" | "expired" | "not_found";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [inviteGranted, setInviteGranted] = useState(false);
  const [, startTransition] = useTransition();

  const countdown = useCountdown(
    data?.state === "upcoming" ? data.campaign.start_at : undefined
  );

  useEffect(() => {
    if (!campaignId) return;

    startTransition(async () => {
      const result = await getPublicCampaign(campaignId);
      if ("error" in result) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setData(result);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Campaign not found</h1>
          <p className="text-sm text-muted-foreground">
            This link may be invalid or the campaign has been removed.
          </p>
        </div>
      </div>
    );
  }

  const { campaign, products, state } = data;
  const accessMode = campaign.access_mode ?? "public";
  const isInviteOnly = accessMode === "invite_only";
  const showInviteGate = isInviteOnly && !inviteGranted;

  // ── Expired ──
  if (state === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">⌛</div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-base text-muted-foreground">
            This merch drop has ended. Check back for future drops.
          </p>
          {campaign.end_at && (
            <p className="text-sm text-muted-foreground">
              Closed{" "}
              {new Date(campaign.end_at).toLocaleDateString(undefined, {
                dateStyle: "long",
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Upcoming ──
  if (state === "upcoming") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-base text-muted-foreground">Merch drop coming soon</p>
        </div>
        {countdown ? (
          <div className="flex items-center gap-6">
            <CountdownUnit value={countdown.days} label="Days" />
            <span className="text-3xl font-bold text-muted-foreground">:</span>
            <CountdownUnit value={countdown.hours} label="Hours" />
            <span className="text-3xl font-bold text-muted-foreground">:</span>
            <CountdownUnit value={countdown.minutes} label="Min" />
            <span className="text-3xl font-bold text-muted-foreground">:</span>
            <CountdownUnit value={countdown.seconds} label="Sec" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Starting soon...</p>
        )}
        {campaign.start_at && (
          <p className="text-sm text-muted-foreground">
            Starts{" "}
            {new Date(campaign.start_at).toLocaleString(undefined, {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>
    );
  }

  // ── Live ──

  // Show invite gate if required
  if (showInviteGate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-base text-muted-foreground">Merch Drop</p>
        </div>
        <InviteGate
          campaignId={campaignId}
          onGranted={() => setInviteGranted(true)}
        />
      </div>
    );
  }

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center space-y-3">
          <h1 className="text-4xl font-bold">{campaign.name}</h1>
          <p className="text-base text-muted-foreground">
            Claim your merch below
          </p>
          {campaign.end_at && (
            <p className="text-sm text-muted-foreground">
              Drop closes {formatDate(campaign.end_at)}
            </p>
          )}
          {accessMode !== "public" && (
            <span className="inline-block rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-medium capitalize">
              {accessMode.replace("_", " ")} access
            </span>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {products.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No products have been added to this drop yet.
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-6">
              Available Merch ({products.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((cp) => (
                <PublicProductCard key={cp.id} cp={cp} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-10">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground">
          Powered by ZeroMerch
        </div>
      </div>
    </div>
  );
}
