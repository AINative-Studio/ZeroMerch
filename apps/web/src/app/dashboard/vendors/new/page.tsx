"use client";

// ---------------------------------------------------------------------------
// Dashboard — New Vendor Form (Story 11.1, Issue #42)
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVendor } from "@/app/actions/vendors";
import type { Vendor } from "@zeromerch/zerodb";

// ─── Constants ────────────────────────────────────────────────────────────────

const VENDOR_TYPES: { value: Vendor["type"]; label: string }[] = [
  { value: "print_on_demand", label: "Print on Demand" },
  { value: "bulk_fulfillment", label: "Bulk Fulfillment" },
  { value: "local_vendor", label: "Local Vendor" },
];

const API_PROVIDERS: { value: Vendor["api_provider"]; label: string }[] = [
  { value: "printful", label: "Printful" },
  { value: "printify", label: "Printify" },
  { value: "custom", label: "Custom API" },
  { value: "manual", label: "Manual" },
];

const CAPABILITY_OPTIONS = [
  "embroidery",
  "screen_print",
  "dtg",
  "stickers",
  "sublimation",
  "engraving",
  "laser_cut",
  "packaging",
  "kitting",
  "warehousing",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewVendorPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<Vendor["type"]>("print_on_demand");
  const [apiProvider, setApiProvider] = useState<Vendor["api_provider"]>("manual");
  const [turnaround, setTurnaround] = useState(7);
  const [capabilities, setCapabilities] = useState<string[]>([]);

  function toggleCapability(cap: string) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createVendor({
        name,
        type,
        api_provider: apiProvider,
        capabilities,
        average_turnaround_days: turnaround,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/dashboard/vendors/${result.vendor.id}`);
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Vendor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register a new fulfillment partner
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Vendor Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Print Partner Inc."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Vendor Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as Vendor["type"])}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {VENDOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* API Provider */}
        <div className="space-y-2">
          <label htmlFor="api_provider" className="text-sm font-medium">
            API Provider
          </label>
          <select
            id="api_provider"
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value as Vendor["api_provider"])}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {API_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Turnaround */}
        <div className="space-y-2">
          <label htmlFor="turnaround" className="text-sm font-medium">
            Average Turnaround (days)
          </label>
          <input
            id="turnaround"
            type="number"
            required
            min={1}
            max={90}
            value={turnaround}
            onChange={(e) => setTurnaround(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Capabilities</span>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_OPTIONS.map((cap) => {
              const selected = capabilities.includes(cap);
              return (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapability(cap)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors capitalize ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:border-primary"
                  }`}
                >
                  {cap.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
          {capabilities.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {capabilities.length} selected
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Vendor"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-input px-6 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
