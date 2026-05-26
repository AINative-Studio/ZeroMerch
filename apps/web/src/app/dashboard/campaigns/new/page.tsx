"use client";

// ---------------------------------------------------------------------------
// Campaign Creation Wizard — 4 steps (Story 7.1, Issue #26)
//   Step 1: Name, type, dates
//   Step 2: Product picker with max qty
//   Step 3: Budget + visibility rules
//   Step 4: Review + publish or save as draft
// ---------------------------------------------------------------------------

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@zeromerch/auth";
import {
  createCampaign,
  addProductToCampaign,
  publishCampaign,
  setCampaignAccess,
} from "@/app/actions/campaigns";
import { listProducts } from "@/app/actions/products";
import type { CampaignType, Product, VariantRules } from "@zeromerch/zerodb";
import type { CampaignAccessMode } from "@/app/actions/campaigns";

// ─── Label maps ───────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  {
    value: "event_drop",
    label: "Event Drop",
    description: "QR-code gated merch for events, conferences, or launches.",
  },
  {
    value: "onboarding",
    label: "Onboarding",
    description: "Welcome kit for new employees or customers.",
  },
  {
    value: "customer_gift",
    label: "Customer Gift",
    description: "Automated gifting triggered by CRM or deal events.",
  },
  {
    value: "employee_store",
    label: "Employee Store",
    description: "Self-service merch portal for team members.",
  },
  {
    value: "vip_drop",
    label: "VIP Drop",
    description: "Exclusive, invite-only merch drop for VIPs.",
  },
];

const STEP_LABELS = [
  "Details",
  "Products",
  "Settings",
  "Review",
];

// ─── Step 1: Basic details ────────────────────────────────────────────────────

interface Step1Data {
  name: string;
  type: CampaignType | "";
  start_at: string;
  end_at: string;
}

function Step1({
  data,
  onChange,
}: {
  data: Step1Data;
  onChange: (d: Step1Data) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="camp-name">
          Campaign Name
        </label>
        <input
          id="camp-name"
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. GDC 2026 Hackathon Drop"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Campaign Type</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPAIGN_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => onChange({ ...data, type: ct.value })}
              className={`rounded-lg border p-4 text-left transition-colors ${
                data.type === ct.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <p className="text-sm font-semibold">{ct.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{ct.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="start-at">
            Start Date
          </label>
          <input
            id="start-at"
            type="datetime-local"
            value={data.start_at}
            onChange={(e) => onChange({ ...data, start_at: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="end-at">
            End Date
          </label>
          <input
            id="end-at"
            type="datetime-local"
            value={data.end_at}
            onChange={(e) => onChange({ ...data, end_at: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Product picker ───────────────────────────────────────────────────

interface SelectedProduct {
  productId: string;
  name: string;
  maxQty: number;
  allowColors: string;
  allowSizes: boolean;
}

function Step2({
  companyId,
  selected,
  onToggle,
}: {
  companyId: string;
  selected: SelectedProduct[];
  onToggle: (updated: SelectedProduct[]) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    startTransition(async () => {
      const result = await listProducts(companyId, { status: "active" });
      if (!("error" in result)) {
        setProducts(result.products);
      }
      setLoading(false);
    });
  }, [companyId]);

  const isSelected = (id: string) => selected.some((s) => s.productId === id);

  const toggleProduct = (product: Product) => {
    if (isSelected(product.id)) {
      onToggle(selected.filter((s) => s.productId !== product.id));
    } else {
      onToggle([
        ...selected,
        {
          productId: product.id,
          name: product.name,
          maxQty: 1,
          allowColors: "",
          allowSizes: true,
        },
      ]);
    }
  };

  const updateSelected = (productId: string, patch: Partial<SelectedProduct>) => {
    onToggle(
      selected.map((s) => (s.productId === productId ? { ...s, ...patch } : s))
    );
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading products...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No active products found. Add products to your catalog first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select products to include in this campaign.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {products.map((product) => {
          const sel = selected.find((s) => s.productId === product.id);
          return (
            <div
              key={product.id}
              className={`rounded-lg border p-4 transition-colors ${
                sel
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {product.currency} {product.base_price.toFixed(2)} &middot;{" "}
                    {product.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleProduct(product)}
                  className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    sel
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {sel ? "Remove" : "Add"}
                </button>
              </div>

              {sel && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-24">Max qty/recipient</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={sel.maxQty}
                      onChange={(e) =>
                        updateSelected(product.id, {
                          maxQty: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-24">Allow sizes</label>
                    <input
                      type="checkbox"
                      checked={sel.allowSizes}
                      onChange={(e) =>
                        updateSelected(product.id, { allowSizes: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-24">Allow colors</label>
                    <input
                      type="text"
                      value={sel.allowColors}
                      onChange={(e) =>
                        updateSelected(product.id, { allowColors: e.target.value })
                      }
                      placeholder="Black, White (blank = all)"
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Settings ─────────────────────────────────────────────────────────

interface Step3Data {
  budgetId: string;
  accessMode: CampaignAccessMode;
}

function Step3({
  campaignType,
  data,
  onChange,
}: {
  campaignType: CampaignType | "";
  data: Step3Data;
  onChange: (d: Step3Data) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="budget-id">
          Budget ID (optional)
        </label>
        <input
          id="budget-id"
          type="text"
          value={data.budgetId}
          onChange={(e) => onChange({ ...data, budgetId: e.target.value })}
          placeholder="budget_uuid"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave blank to use the company default budget.
        </p>
      </div>

      {(campaignType === "event_drop" || campaignType === "vip_drop") && (
        <div>
          <p className="text-sm font-medium mb-3">Access Mode</p>
          <div className="space-y-2">
            {(
              [
                {
                  value: "public",
                  label: "Public",
                  description: "Anyone with the link can redeem.",
                },
                {
                  value: "invite_only",
                  label: "Invite Only",
                  description: "Recipient email must be on the invite list.",
                },
                {
                  value: "qr_only",
                  label: "QR Code Only",
                  description: "Accessible only by scanning the QR code.",
                },
              ] as { value: CampaignAccessMode; label: string; description: string }[]
            ).map((mode) => (
              <label
                key={mode.value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  data.accessMode === mode.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="access-mode"
                  value={mode.value}
                  checked={data.accessMode === mode.value}
                  onChange={() => onChange({ ...data, accessMode: mode.value })}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function Step4({
  step1,
  step3,
  products,
  onPublish,
  onSaveDraft,
  saving,
}: {
  step1: Step1Data;
  step3: Step3Data;
  products: SelectedProduct[];
  onPublish: () => void;
  onSaveDraft: () => void;
  saving: boolean;
}) {
  const typeLabel =
    CAMPAIGN_TYPES.find((t) => t.value === step1.type)?.label ?? step1.type;

  const formatDate = (iso: string) => {
    if (!iso) return "Not set";
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
        <h3 className="text-sm font-semibold">Campaign Details</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{step1.name || "—"}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-medium">{typeLabel || "—"}</dd>
          <dt className="text-muted-foreground">Starts</dt>
          <dd className="font-medium">{formatDate(step1.start_at)}</dd>
          <dt className="text-muted-foreground">Ends</dt>
          <dd className="font-medium">{formatDate(step1.end_at)}</dd>
          <dt className="text-muted-foreground">Access</dt>
          <dd className="font-medium capitalize">{step3.accessMode.replace("_", " ")}</dd>
          {step3.budgetId && (
            <>
              <dt className="text-muted-foreground">Budget</dt>
              <dd className="font-mono text-xs">{step3.budgetId}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
        <h3 className="text-sm font-semibold">
          Products ({products.length})
        </h3>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products selected.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.productId} className="flex justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-muted-foreground">
                  Max {p.maxQty}/recipient
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={saving || !step1.start_at || !step1.end_at}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Publishing..." : "Publish Campaign"}
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save as Draft"}
        </button>
      </div>

      {(!step1.start_at || !step1.end_at) && (
        <p className="text-xs text-destructive">
          Start and end dates are required to publish. You can save as draft without them.
        </p>
      )}
    </div>
  );
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step1, setStep1] = useState<Step1Data>({
    name: "",
    type: "",
    start_at: "",
    end_at: "",
  });

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const [step3, setStep3] = useState<Step3Data>({
    budgetId: "",
    accessMode: "public",
  });

  const companyId = user?.company_id ?? "";

  const canAdvance = () => {
    if (step === 1) return !!step1.name.trim() && !!step1.type;
    if (step === 2) return true; // products are optional
    if (step === 3) return true;
    return false;
  };

  const handleCreateAndFinish = async (publish: boolean) => {
    if (!companyId) {
      setError("Company not found. Please re-login.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create campaign
      const createResult = await createCampaign(companyId, {
        name: step1.name.trim(),
        type: step1.type as CampaignType,
        start_at: step1.start_at
          ? new Date(step1.start_at).toISOString()
          : undefined,
        end_at: step1.end_at
          ? new Date(step1.end_at).toISOString()
          : undefined,
        budget_id: step3.budgetId || undefined,
        access_mode: step3.accessMode,
      });

      if ("error" in createResult) {
        setError(createResult.error);
        setSaving(false);
        return;
      }

      const campaign = createResult.campaign;

      // Set access mode (also stored in campaign record)
      if (step3.accessMode !== "public") {
        await setCampaignAccess(campaign.id, step3.accessMode);
      }

      // Attach products
      for (const sp of selectedProducts) {
        const variantRules: VariantRules = {
          allow_sizes: sp.allowSizes,
          allow_colors: sp.allowColors
            ? sp.allowColors.split(",").map((c) => c.trim()).filter(Boolean)
            : [],
        };
        await addProductToCampaign(
          campaign.id,
          sp.productId,
          variantRules,
          sp.maxQty
        );
      }

      // Publish if requested
      if (publish) {
        const publishResult = await publishCampaign(campaign.id);
        if ("error" in publishResult) {
          setError(publishResult.error);
          setSaving(false);
          return;
        }
      }

      // Redirect to campaign detail or QR page for event drops
      if (publish && step1.type === "event_drop") {
        router.push(`/dashboard/campaigns/${campaign.id}/qr`);
      } else {
        router.push(`/dashboard/campaigns`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">New Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a merch campaign for your team, customers, or event.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, idx) => {
          const num = idx + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : num}
                </div>
                <span
                  className={`mt-1 text-xs whitespace-nowrap ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-2 mb-4 transition-colors ${
                    isDone ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {step === 1 && <Step1 data={step1} onChange={setStep1} />}
        {step === 2 && (
          <Step2
            companyId={companyId}
            selected={selectedProducts}
            onToggle={setSelectedProducts}
          />
        )}
        {step === 3 && (
          <Step3
            campaignType={step1.type}
            data={step3}
            onChange={setStep3}
          />
        )}
        {step === 4 && (
          <Step4
            step1={step1}
            step3={step3}
            products={selectedProducts}
            onPublish={() => handleCreateAndFinish(true)}
            onSaveDraft={() => handleCreateAndFinish(false)}
            saving={saving}
          />
        )}

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canAdvance()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
