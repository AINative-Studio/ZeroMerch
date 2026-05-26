// ---------------------------------------------------------------------------
// API Route — POST /api/checkout (Story 6.1, Issue #22)
// ---------------------------------------------------------------------------
// Creates a Stripe Checkout Session from a cart payload.
// Writes a pending order to ZeroDB and returns { url, orderId, sessionId }.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/app/actions/checkout";
import type { CheckoutCartItem } from "@/app/actions/checkout";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    companyId,
    companySlug,
    cartItems,
    userId,
    campaignId,
    recipientId,
    taxRate,
    shippingAmount,
    paidBy,
  } = body as {
    companyId?: string;
    companySlug?: string;
    cartItems?: CheckoutCartItem[];
    userId?: string;
    campaignId?: string;
    recipientId?: string;
    taxRate?: number;
    shippingAmount?: number;
    paidBy?: string;
  };

  if (!companyId || !companySlug) {
    return NextResponse.json(
      { error: "companyId and companySlug are required" },
      { status: 400 }
    );
  }
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json(
      { error: "cartItems must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    const result = await createCheckoutSession(
      companyId,
      companySlug,
      cartItems,
      userId,
      {
        campaignId,
        recipientId,
        taxRate,
        shippingAmount,
        paidBy: paidBy as Parameters<typeof createCheckoutSession>[4]["paidBy"],
      }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("[checkout] createCheckoutSession error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
