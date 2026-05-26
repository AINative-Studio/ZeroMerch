// ---------------------------------------------------------------------------
// Gift Redemption Page (Story 6.3, Issue #24)
// Route: /redeem/[token]
// ---------------------------------------------------------------------------
// Public page — no login required.
// Validates the token, shows gift details, collects shipping address,
// and submits the claim via claimGift() server action.
// ---------------------------------------------------------------------------

import { lookupRedemptionLink, claimGift } from "@/app/actions/redemption";
import type { ShippingAddress } from "@/app/actions/redemption";
import RedeemForm from "./redeem-form";

interface RedeemPageProps {
  params: { token: string };
}

export const dynamic = "force-dynamic";

export default async function RedeemPage({ params }: RedeemPageProps) {
  const { token } = params;

  // Server-side token validation
  const result = await lookupRedemptionLink(token);

  if (!result) {
    return <TokenError reason="not_found" />;
  }
  if (!result.isValid) {
    return <TokenError reason={result.errorReason ?? "invalid"} />;
  }

  const { link } = result;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-xl py-16">
        {/* Gift header */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v13m0-13V6a4 4 0 00-4-4H6m6 6V6a4 4 0 014-4h2M7 8H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2h-2"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">You have a gift!</h1>
          <p className="mt-2 text-muted-foreground">
            You have been sent a merch credit worth{" "}
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(link.credit_amount)}
            </span>
            .
          </p>
          {link.expires_at && (
            <p className="mt-1 text-sm text-muted-foreground">
              Offer expires{" "}
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(link.expires_at))}
              .
            </p>
          )}
        </div>

        {/* Shipping form — client component handles submission */}
        <RedeemForm token={token} creditAmount={link.credit_amount} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          No account required. Your shipping address is used only to fulfill this
          order and is not stored beyond fulfillment.
        </p>
      </div>
    </div>
  );
}

// ─── Error states ─────────────────────────────────────────────────────────────

function TokenError({ reason }: { reason: string }) {
  const messages: Record<string, { title: string; body: string }> = {
    not_found: {
      title: "Gift link not found",
      body: "This link doesn't exist or may have been mistyped. Please check the link in your email and try again.",
    },
    already_used: {
      title: "Already claimed",
      body: "This gift has already been claimed. Each gift link can only be used once.",
    },
    expired: {
      title: "Link expired",
      body: "Unfortunately this gift link has expired. Please contact the sender for a new link.",
    },
    revoked: {
      title: "Link revoked",
      body: "This gift link has been revoked. Please contact the sender for assistance.",
    },
  };

  const { title, body } = messages[reason] ?? {
    title: "Invalid link",
    body: "This gift link is not valid. Please contact the sender.",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md py-32 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
