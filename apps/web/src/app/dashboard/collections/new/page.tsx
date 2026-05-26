"use client";

// ---------------------------------------------------------------------------
// Dashboard — Create Collection (Story 4.3, Issue #16)
// ---------------------------------------------------------------------------

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@zeromerch/auth";
import { createCollection } from "@/app/actions/collections";
import type { CollectionVisibility } from "@/app/actions/collections";
import Link from "next/link";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

// ─── Visibility option ────────────────────────────────────────────────────────

interface VisibilityOption {
  value: CollectionVisibility;
  label: string;
  description: string;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: "all",
    label: "All Employees",
    description: "Visible to everyone in the company",
  },
  {
    value: "department",
    label: "Department Only",
    description: "Restricted to specific departments",
  },
  {
    value: "campaign",
    label: "Campaign Only",
    description: "Available within a campaign redemption flow",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewCollectionPage() {
  const { session } = useAuth();
  const router = useRouter();
  const companyId = session?.company_id ?? "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("all");
  const [departmentInput, setDepartmentInput] = useState("");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addDepartment() {
    const id = departmentInput.trim();
    if (id && !departmentIds.includes(id)) {
      setDepartmentIds([...departmentIds, id]);
    }
    setDepartmentInput("");
  }

  function removeDepartment(id: string) {
    setDepartmentIds(departmentIds.filter((d) => d !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Collection name is required");
      return;
    }
    if (!companyId) {
      setError("No company session found. Please refresh.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        await createCollection(companyId, {
          name: name.trim(),
          description: description.trim(),
          visibility,
          allowed_department_ids:
            visibility === "department" ? departmentIds : [],
        });
        router.push("/dashboard/collections");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create collection");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/collections"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Collections
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Collection
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium leading-none"
          >
            Collection name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="e.g. New Hire Essentials"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium leading-none"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Describe the purpose or audience for this collection…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">Visibility</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`relative flex cursor-pointer rounded-lg border p-3 transition-colors ${
                  visibility === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  className="sr-only"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Department restriction (shown when visibility === "department") */}
        {visibility === "department" && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <label className="text-sm font-medium leading-none">
              Allowed departments
            </label>
            <p className="text-xs text-muted-foreground">
              Enter department IDs that are allowed to see this collection.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Department ID…"
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addDepartment())
                }
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={addDepartment}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors"
              >
                Add
              </button>
            </div>

            {departmentIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {departmentIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-mono"
                  >
                    {id}
                    <button
                      type="button"
                      onClick={() => removeDepartment(id)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                      aria-label={`Remove department ${id}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || !companyId}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creating…" : "Create Collection"}
          </button>
          <Link
            href="/dashboard/collections"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
