// ---------------------------------------------------------------------------
// API Route — POST /api/webhooks/stripe (Story 6.1, Issue #22)
// ---------------------------------------------------------------------------
// Receives Stripe webhook events. Verifies signature, dispatches to handler.
// IMPORTANT: Must use raw body (not parsed JSON) for signature verification.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/app/actions/checkout";

// Disable Next.js body parsing — Stripe webhook verification requires the
// raw request body as a string.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  try {
    const result = await handleWebhook(body, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handling failed";
    // Log event type for debugging without exposing payload details
    console.error("[stripe-webhook] Error processing webhook:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
