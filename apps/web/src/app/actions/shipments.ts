"use server";

// ---------------------------------------------------------------------------
// Server Actions — Shipment Tracking (Story 11.2, Issue #43)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Shipment, ShipmentStatus } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Create a shipment record in ZeroDB linked to an order and vendor.
 */
export async function createShipment(
  orderId: string,
  vendorId: string,
  carrier: string,
  trackingNumber: string,
  estimatedDelivery: string
): Promise<{ shipment: Shipment } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!orderId) return { error: "Order ID is required" };
  if (!vendorId) return { error: "Vendor ID is required" };
  if (!carrier?.trim()) return { error: "Carrier is required" };
  if (!trackingNumber?.trim()) return { error: "Tracking number is required" };

  try {
    const shipmentsTable = db.table("shipments");
    const shipment = await shipmentsTable.insert({
      order_id: orderId,
      vendor_id: vendorId,
      carrier,
      tracking_number: trackingNumber,
      status: "label_created" as ShipmentStatus,
      estimated_delivery_at: estimatedDelivery,
      created_at: new Date().toISOString(),
    });
    return { shipment };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create shipment";
    return { error: message };
  }
}

/**
 * Update a shipment's status through the lifecycle:
 * label_created → in_transit → delivered | exception
 */
export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus
): Promise<{ shipment: Shipment } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) return { error: "Shipment ID is required" };

  const validStatuses: ShipmentStatus[] = [
    "label_created",
    "in_transit",
    "delivered",
    "exception",
  ];
  if (!validStatuses.includes(status)) {
    return { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` };
  }

  try {
    const shipmentsTable = db.table("shipments");
    const updates: Partial<Shipment> = { status };
    if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }
    const shipment = await shipmentsTable.update(id, updates);
    return { shipment };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update shipment status";
    return { error: message };
  }
}

/**
 * Fetch all shipments for a given order.
 */
export async function getShipmentsForOrder(
  orderId: string
): Promise<{ shipments: Shipment[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!orderId) return { error: "Order ID is required" };

  try {
    const shipmentsTable = db.table("shipments");
    const result = await shipmentsTable.query({ order_id: orderId }, 1, 50);
    return { shipments: result.data ?? [] };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch shipments for order";
    return { error: message };
  }
}

/**
 * Fetch all shipments for a recipient by resolving their orders first.
 * Accepts a recipientId and returns all shipments linked to that recipient's orders.
 */
export async function getShipmentsForRecipient(
  recipientId: string
): Promise<{ shipments: Shipment[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!recipientId) return { error: "Recipient ID is required" };

  try {
    const ordersTable = db.table("orders");
    const shipmentsTable = db.table("shipments");

    const ordersResult = await ordersTable.query(
      { recipient_id: recipientId },
      1,
      100
    );
    const orders = ordersResult.data ?? [];

    if (orders.length === 0) return { shipments: [] };

    const shipmentResults = await Promise.all(
      orders.map((order) =>
        shipmentsTable.query({ order_id: order.id }, 1, 10)
      )
    );

    const shipments = shipmentResults.flatMap((r) => r.data ?? []);
    return { shipments };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch shipments for recipient";
    return { error: message };
  }
}
