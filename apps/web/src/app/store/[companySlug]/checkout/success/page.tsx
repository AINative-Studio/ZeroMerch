// ---------------------------------------------------------------------------
// Checkout Success Page (Story 6.1, Issue #22)
// Route: /store/[companySlug]/checkout/success?session_id=cs_...
// ---------------------------------------------------------------------------
// Shown after a successful Stripe payment. Clears cart from sessionStorage.
// ---------------------------------------------------------------------------

"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface SuccessPageProps {
  params: { companySlug: string };
}

export default function CheckoutSuccessPage({ params }: SuccessPageProps) {
  const { companySlug } = params;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const cleared = useRef(false);

  // Clear cart on success — run once only
  useEffect(() => {
    if (!cleared.current) {
      cleared.current = true;
      sessionStorage.removeItem(`zeromerch_cart_${companySlug}`);
    }
  }, [companySlug]);

  return (
    <div className="container mx-auto max-w-xl py-24 text-center">
      <div className="mb-6 flex justify-center">
        {/* Checkmark icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <svg
            className="h-8 w-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h1 className="mb-3 text-3xl font-bold tracking-tight">Order Confirmed</h1>
      <p className="mb-2 text-muted-foreground">
        Your payment was successful. A confirmation email will be sent shortly.
      </p>
      {sessionId && (
        <p className="mb-8 text-xs text-muted-foreground">
          Reference:{" "}
          <span className="font-mono">{sessionId}</span>
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/store/${companySlug}`}
          className="rounded-md border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
        >
          Continue Shopping
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          View Dashboard
        </Link>
      </div>
    </div>
  );
}
