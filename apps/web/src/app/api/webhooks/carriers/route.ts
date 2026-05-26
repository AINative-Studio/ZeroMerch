// ---------------------------------------------------------------------------
// Carrier Webhook Handler (Story 11.2, Issue #43)
//
// Receives carrier webhook payloads and updates shipment status.
// Stub implementation: logs payload and maps event_type to ShipmentStatus.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { ZeroDBClient } from "@zeromerch/zerodb";
import type { ShipmentStatus } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Event type mapping ───────────────────────────────────────────────────────

const EVENT_TYPE_TO_STATUS: Record<string, ShipmentStatus> = {
  // Generic
  label_created: "label_created",
  shipped: "in_transit",
  in_transit: "in_transit",
  out_for_delivery: "in_transit",
  delivered: "delivered",
  exception: "exception",
  failed_delivery: "exception",
  returned: "exception",
  // UPS
  "X1": "in_transit",
  "D1": "delivered",
  // FedEx
  "OD": "in_transit",
  "DL": "delivered",
  // USPS
  "A1": "in_transit",
  "01": "delivered",
};

// ─── Payload schema ───────────────────────────────────────────────────────────

interface CarrierWebhookPayload {
  shipment_id?: string;
  tracking_number?: string;
  event_type?: string;
  carrier?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: CarrierWebhookPayload;

  try {
    payload = (await req.json()) as CarrierWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Log the payload (stub — real webhook processing in production sprint)
  console.log("[carrier-webhook] Received payload:", JSON.stringify(payload));

  const { shipment_id, tracking_number, event_type } = payload;

  if (!event_type) {
    return NextResponse.json(
      { error: "event_type is required" },
      { status: 400 }
    );
  }

  // Map event_type to a ShipmentStatus
  const newStatus = EVENT_TYPE_TO_STATUS[event_type.toLowerCase()];
  if (!newStatus) {
    console.log(
      `[carrier-webhook] Unknown event_type "${event_type}" — no status change`
    );
    return NextResponse.json({ received: true, status_updated: false });
  }

  // Resolve shipment by ID or tracking number
  try {
    const shipmentsTable = db.table("shipments");

    let shipmentId = shipment_id;

    if (!shipmentId && tracking_number) {
      const result = await shipmentsTable.query(
        { tracking_number },
        1,
        1
      );
      const found = result.data?.[0];
      if (found) {
        shipmentId = found.id;
      }
    }

    if (!shipmentId) {
      console.log(
        "[carrier-webhook] Could not resolve shipment from payload — acknowledged without update"
      );
      return NextResponse.json({ received: true, status_updated: false });
    }

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "delivered") {
      updates["delivered_at"] = payload.timestamp ?? new Date().toISOString();
    }

    await shipmentsTable.update(shipmentId, updates);

    console.log(
      `[carrier-webhook] Shipment ${shipmentId} updated to "${newStatus}"`
    );

    return NextResponse.json({
      received: true,
      status_updated: true,
      shipment_id: shipmentId,
      new_status: newStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[carrier-webhook] Error updating shipment:", message);
    // Return 200 to prevent carrier from retrying on our application errors
    return NextResponse.json(
      { received: true, status_updated: false, error: message },
      { status: 200 }
    );
  }
}
