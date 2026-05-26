"use client";

// ---------------------------------------------------------------------------
// Dashboard — Order Detail + Shipment Timeline (Story 11.2, Issue #43)
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getShipmentsForOrder } from "@/app/actions/shipments";
import { ZeroDBClient } from "@zeromerch/zerodb";
import type { Order, Shipment, ShipmentStatus } from "@zeromerch/zerodb";
import Link from "next/link";

const PROJECT_ID =
  process.env["NEXT_PUBLIC_ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS: ShipmentStatus[] = [
  "label_created",
  "in_transit",
  "delivered",
];

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  label_created: "Label Created",
  in_transit: "In Transit",
  delivered: "Delivered",
  exception: "Exception",
};

const STATUS_ICONS: Record<ShipmentStatus, string> = {
  label_created: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  in_transit: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
  delivered: "M5 13l4 4L19 7",
  exception: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

// ─── Shipment Timeline ────────────────────────────────────────────────────────

function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const isException = shipment.status === "exception";
  const currentIdx = STATUS_STEPS.indexOf(
    isException ? "in_transit" : shipment.status
  );

  return (
    <div className="rounded-lg border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{shipment.carrier}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {shipment.tracking_number}
          </p>
        </div>
        {isException && (
          <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 text-xs font-medium">
            Exception
          </span>
        )}
      </div>

      {shipment.estimated_delivery_at && (
        <p className="text-xs text-muted-foreground">
          Estimated delivery:{" "}
          <span className="font-medium text-foreground">
            {new Date(shipment.estimated_delivery_at).toLocaleDateString(
              undefined,
              { weekday: "short", month: "short", day: "numeric" }
            )}
          </span>
        </p>
      )}

      {/* Timeline steps */}
      <div className="flex items-start gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const completed = idx <= currentIdx;
          const active = idx === currentIdx && !isException;
          return (
            <div key={step} className="flex-1 flex flex-col items-center">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${completed ? "bg-primary" : "bg-border"}`}
                  />
                )}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    completed
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-muted-foreground"
                  } ${active ? "ring-2 ring-primary/30" : ""}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={STATUS_ICONS[step]}
                    />
                  </svg>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${idx < currentIdx ? "bg-primary" : "bg-border"}`}
                  />
                )}
              </div>
              <p
                className={`mt-1.5 text-xs text-center ${
                  completed ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {STATUS_LABELS[step]}
              </p>
            </div>
          );
        })}
      </div>

      {shipment.delivered_at && (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
          Delivered on{" "}
          {new Date(shipment.delivered_at).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);

    Promise.all([
      db.table("orders").get(params.id),
      getShipmentsForOrder(params.id),
    ])
      .then(([orderData, shipmentsResult]) => {
        setOrder(orderData);
        if ("shipments" in shipmentsResult) {
          setShipments(shipmentsResult.shipments);
        } else {
          setError(shipmentsResult.error);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load order");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error ?? "Order not found"}
        </div>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:underline mb-2 inline-block"
        >
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Order {order.id.slice(0, 8).toUpperCase()}
        </h1>
        <span
          className={`mt-1 inline-block text-xs rounded-full px-2 py-0.5 font-medium ${
            order.status === "delivered"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : order.status === "cancelled"
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Order summary */}
      <div className="rounded-lg border border-border p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Subtotal
          </span>
          <p className="font-medium">${order.subtotal.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Shipping
          </span>
          <p className="font-medium">${order.shipping.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Tax
          </span>
          <p className="font-medium">${order.tax.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Total
          </span>
          <p className="font-bold">${order.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Shipments */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">
          Shipments ({shipments.length})
        </h2>
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shipments yet for this order.
          </p>
        ) : (
          shipments.map((s) => <ShipmentTimeline key={s.id} shipment={s} />)
        )}
      </div>
    </div>
  );
}
