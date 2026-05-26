"use client";

// ---------------------------------------------------------------------------
// Dashboard — Brand Rules Configuration (Story 3.2, Issue #11)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { getBrandKit, updateBrandKit } from "@/app/actions/brand";
import type { BrandKit } from "@zeromerch/zerodb";

// ─── Color picker sub-component ──────────────────────────────────────────────

interface ColorListProps {
  label: string;
  colors: string[];
  onChange: (colors: string[]) => void;
}

function ColorList({ label, colors, onChange }: ColorListProps) {
  function handleChange(index: number, value: string) {
    const next = [...colors];
    next[index] = value;
    onChange(next);
  }

  function addColor() {
    onChange([...colors, "#000000"]);
  }

  function removeColor(index: number) {
    onChange(colors.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      <div className="space-y-2">
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => handleChange(i, e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
              aria-label={`${label} ${i + 1}`}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => handleChange(i, e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
              maxLength={7}
              className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${label} ${i + 1} hex`}
            />
            <button
              type="button"
              onClick={() => removeColor(i)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={`Remove ${label} ${i + 1}`}
            >
              <RemoveIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addColor}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-input px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <AddIcon className="h-3.5 w-3.5" />
          Add color
        </button>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function RemoveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function AddIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Product restriction options ──────────────────────────────────────────────

const PRODUCT_RESTRICTIONS = [
  { value: "alcohol", label: "Alcohol" },
  { value: "political_items", label: "Political items" },
  { value: "tobacco", label: "Tobacco / nicotine" },
  { value: "gambling", label: "Gambling-related" },
  { value: "adult_content", label: "Adult content" },
  { value: "weapons", label: "Weapons / firearms" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandRulesPage() {
  const { companyId } = useAuth();
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state — mirrors brand_kits fields
  const [primaryColors, setPrimaryColors] = useState<string[]>(["#000000"]);
  const [secondaryColors, setSecondaryColors] = useState<string[]>(["#FFFFFF"]);
  const [fontsInput, setFontsInput] = useState("");
  const [tone, setTone] = useState("");
  const [restrictedProductsSet, setRestrictedProductsSet] = useState<Set<string>>(
    new Set()
  );
  const [restrictedPhrasesInput, setRestrictedPhrasesInput] = useState("");
  const [approvedPhrasesInput, setApprovedPhrasesInput] = useState("");

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    getBrandKit(companyId).then((kit) => {
      setBrandKit(kit);
      if (kit) {
        setPrimaryColors(kit.primary_colors.length ? kit.primary_colors : ["#000000"]);
        setSecondaryColors(
          kit.secondary_colors.length ? kit.secondary_colors : ["#FFFFFF"]
        );
        setFontsInput(kit.fonts.join(", "));
        setTone(kit.tone ?? "");
        setRestrictedProductsSet(
          new Set(kit.compliance_rules?.restricted_products ?? [])
        );
        setRestrictedPhrasesInput(kit.restricted_phrases.join("\n"));
        setApprovedPhrasesInput(kit.approved_phrases.join("\n"));
      }
      setIsLoading(false);
    });
  }, [companyId]);

  function toggleRestriction(value: string) {
    setRestrictedProductsSet((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!brandKit) return;
    setError(null);
    setSaved(false);

    const fonts = fontsInput
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const restrictedPhrases = restrictedPhrasesInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const approvedPhrases = approvedPhrasesInput
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await updateBrandKit(brandKit.id, {
        primary_colors: primaryColors,
        secondary_colors: secondaryColors,
        fonts,
        tone,
        restricted_products: Array.from(restrictedProductsSet),
        restricted_phrases: restrictedPhrases,
        approved_phrases: approvedPhrases,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setBrandKit(result.brandKit);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading brand rules...</p>
      </div>
    );
  }

  if (!brandKit) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Brand Rules</h1>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            No brand kit found. Create your company workspace first.
          </p>
          <a
            href="/onboarding"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create workspace
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Rules</h1>
        <p className="text-muted-foreground">
          Configure colors, typography, product restrictions, and approved language for
          your brand kit.
        </p>
      </div>

      {/* Banners */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          Brand rules saved.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Color palette */}
        <section className="space-y-5 rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Color palette</h2>

          <ColorList
            label="Primary colors"
            colors={primaryColors}
            onChange={setPrimaryColors}
          />

          <ColorList
            label="Secondary colors"
            colors={secondaryColors}
            onChange={setSecondaryColors}
          />
        </section>

        {/* Typography */}
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Typography</h2>

          <div className="space-y-2">
            <label htmlFor="fonts" className="text-sm font-medium leading-none">
              Approved fonts
            </label>
            <input
              id="fonts"
              type="text"
              value={fontsInput}
              onChange={(e) => setFontsInput(e.target.value)}
              placeholder="Inter, Space Grotesk, Helvetica Neue"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Comma-separated font names</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="tone" className="text-sm font-medium leading-none">
              Brand tone
            </label>
            <input
              id="tone"
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="premium, technical, confident"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </section>

        {/* Product restrictions */}
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Product restrictions</h2>
          <p className="text-sm text-muted-foreground">
            Items in this list will be blocked from merch orders.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PRODUCT_RESTRICTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={restrictedProductsSet.has(value)}
                  onChange={() => toggleRestriction(value)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Language rules */}
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Language rules</h2>

          <div className="space-y-2">
            <label htmlFor="restrictedPhrases" className="text-sm font-medium leading-none">
              Restricted phrases
            </label>
            <textarea
              id="restrictedPhrases"
              rows={4}
              value={restrictedPhrasesInput}
              onChange={(e) => setRestrictedPhrasesInput(e.target.value)}
              placeholder={"Guaranteed ROI\nFree money\nLimited time only"}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">One phrase per line</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="approvedPhrases" className="text-sm font-medium leading-none">
              Approved phrases
            </label>
            <textarea
              id="approvedPhrases"
              rows={4}
              value={approvedPhrasesInput}
              onChange={(e) => setApprovedPhrasesInput(e.target.value)}
              placeholder={"Build the Future\nPowered by AI\nShip faster"}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">One phrase per line</p>
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save brand rules"}
          </button>
        </div>
      </form>
    </div>
  );
}
