// POST /api/webhooks/stripe — Stripe webhook with idempotency
// Story 13.3 (Issue #52)

import { type NextRequest, NextResponse } from "next/server";
import { ZeroDBClient } from "@zeromerch/zerodb";
import { handleWebhook } from "@/app/actions/checkout";

const db = new ZeroDBClient({ projectId: process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec" });
const IDEM_TYPE = "webhook.stripe.processed";

async function isProcessed(id: string): Promise<boolean> {
  try {
    const r = await db.events().list({ event_type: IDEM_TYPE, object_id: id } as never, 1, 1);
    return (r.data?.length ?? 0) > 0;
  } catch { return false; }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const eventId = body["id"] as string | undefined;
  const eventType = body["type"] as string | undefined;
  if (!eventId || !eventType) return NextResponse.json({ error: "Missing id or type" }, { status: 400 });

  if (await isProcessed(eventId)) return NextResponse.json({ skipped: true, reason: "already_processed" });

  try {
    await handleWebhook(body);
    db.events().emit(IDEM_TYPE, { object_id: eventId, stripe_event_type: eventType, processed_at: new Date().toISOString() }).catch(() => {});
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
