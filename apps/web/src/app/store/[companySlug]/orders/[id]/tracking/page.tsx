"use client";

// ---------------------------------------------------------------------------
// Store — Recipient-Facing Tracking Page (Story 11.2, Issue #43)
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getShipmentsForOrder } from "@/app/actions/shipments";
import { ZeroDBClient } from "@zeromerch/zerodb";
import type { Shipment, ShipmentStatus } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["NEXT_PUBLIC_ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Status display ───────────────────────────────────────────────────────────

const STEP_LABELS: { status: ShipmentStatus; label: string; description: string }[] = [
  {
    status: "label_created",
    label: "Order Received",
    description: "Your shipment label has been created.",
  },
  {
    status: "in_transit",
    label: "On the Way",
    description: "Your package is in transit with the carrier.",
  },
  {
    status: "delivered",
    label: "Delivered",
    description: "Your package has been delivered.",
  },
];

function getStepIndex(status: ShipmentStatus): number {
  if (status === "exception") return 1;
  return ["label_created", "in_transit", "delivered"].indexOf(status);
}

// ─── Tracking Card ────────────────────────────────────────────────────────────

function TrackingCard({ shipment }: { shipment: Shipment }) {
  const currentStep = getStepIndex(shipment.status);
  const isException = shipment.status === "exception";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
      {/* Carrier + Tracking */}
      <div className="text-center">
        <p className="text-lg font-bold">{shipment.carrier}</p>
        <p className="text-sm font-mono text-muted-foreground mt-0.5">
          {shipment.tracking_number}
        </p>
      </div>

      {/* Exception Banner */}
      {isException && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 text-center">
          There is an issue with this shipment. Please contact support.
        </div>
      )}

      {/* ETA */}
      {shipment.estimated_delivery_at && shipment.status !== "delivered" && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Estimated Delivery
          </p>
          <p className="text-xl font-bold">
            {new Date(shipment.estimated_delivery_at).toLocaleDateString(
              undefined,
              { weekday: "long", month: "long", day: "numeric" }
            )}
          </p>
        </div>
      )}

      {/* Delivered confirmation */}
      {shipment.status === "delivered" && shipment.delivered_at && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Delivered on
          </p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">
            {new Date(shipment.delivered_at).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      )}

      {/* Step timeline */}
      <div className="space-y-3">
        {STEP_LABELS.map((step, idx) => {
          const completed = idx <= currentStep;
          const active = idx === currentStep && !isException;
          return (
            <div key={step.status} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                    completed
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-muted-foreground"
                  } ${active ? "ring-2 ring-primary/20" : ""}`}
                >
                  {completed ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={`w-0.5 h-6 mt-1 ${
                      idx < currentStep ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div className="pt-1">
                <p
                  className={`text-sm font-medium ${
                    completed ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {active && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecipientTrackingPage() {
  const params = useParams<{ companySlug: string; id: string }>();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);

    Promise.all([
      getShipmentsForOrder(params.id),
      db.table("orders").get(params.id).catch(() => null),
    ])
      .then(([shipmentsResult, orderData]) => {
        if ("shipments" in shipmentsResult) {
          setShipments(shipmentsResult.shipments);
        } else {
          setError(shipmentsResult.error);
        }
        if (orderData) {
          setOrderTotal(orderData.total);
        }
      })
      .catch(() => setError("Failed to load tracking information"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Track Your Order</h1>
          {orderTotal !== null && (
            <p className="text-sm text-muted-foreground">
              Order total: ${orderTotal.toFixed(2)}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {shipments.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Your order is being prepared. Tracking info will appear here once
              it ships.
            </p>
          </div>
        )}

        {shipments.map((s) => (
          <TrackingCard key={s.id} shipment={s} />
        ))}

        <p className="text-xs text-center text-muted-foreground pt-4">
          Need help?{" "}
          <a
            href={`mailto:support@zeromerch.ai`}
            className="text-primary hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
