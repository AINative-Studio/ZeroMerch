"use client";

// ---------------------------------------------------------------------------
// Dashboard — Company Settings (Story 2.1, Issue #6)
// ---------------------------------------------------------------------------

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@zeromerch/auth";
import { getCompany, updateCompany } from "@/app/actions/company";
import type { Company } from "@zeromerch/zerodb";

export default function CompanySettingsPage() {
  const { companyId } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [storefrontUrl, setStorefrontUrl] = useState("");

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    getCompany(companyId).then((c) => {
      setCompany(c);
      if (c) {
        setName(c.name);
        setDomain(c.domain ?? "");
        setStorefrontUrl(c.storefront_url ?? "");
      }
      setIsLoading(false);
    });
  }, [companyId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyId) return;
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateCompany(companyId, {
        name,
        domain: domain || undefined,
        storefront_url: storefrontUrl || undefined,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setCompany(result.company);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading company settings...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground mb-4">
            No company workspace found. Set one up to continue.
          </p>
          <a
            href="/onboarding"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
        <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Manage your company profile and workspace configuration.
        </p>
      </div>

      {/* Error / success banners */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
        >
          Settings saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Company ID (read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Company ID
          </label>
          <p className="font-mono text-sm text-muted-foreground">{company.id}</p>
        </div>

        {/* Slug (read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Workspace slug
          </label>
          <p className="font-mono text-sm">{company.slug}</p>
          <p className="text-xs text-muted-foreground">
            Contact support to change your slug.
          </p>
        </div>

        {/* Company name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium leading-none">
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={128}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <label htmlFor="domain" className="text-sm font-medium leading-none">
            Company domain
          </label>
          <input
            id="domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="acme.ai"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Storefront URL */}
        <div className="space-y-2">
          <label htmlFor="storefrontUrl" className="text-sm font-medium leading-none">
            Storefront URL
          </label>
          <input
            id="storefrontUrl"
            type="url"
            value={storefrontUrl}
            onChange={(e) => setStorefrontUrl(e.target.value)}
            placeholder="https://store.acme.ai"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Status badge (read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-muted-foreground">
            Status
          </label>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              company.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            }`}
          >
            {company.status}
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || !name}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
