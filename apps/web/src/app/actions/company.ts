"use server";

// ---------------------------------------------------------------------------
// Server Actions — Company workspace (Story 2.1, Issue #6)
// ---------------------------------------------------------------------------

import { ZeroDBClient, ZeroDBConflictError } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Company } from "@zeromerch/zerodb";

const db = new ZeroDBClient({
  projectId: process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec",
});

// ─── Validation ──────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function validateSlug(slug: string): void {
  if (!slug || slug.length < 2 || slug.length > 64) {
    throw new Error("Slug must be between 2 and 64 characters");
  }
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "Slug must be lowercase alphanumeric with hyphens only (no leading/trailing hyphens)"
    );
  }
}

function validateCompanyInput(data: {
  name: string;
  slug: string;
  domain?: string;
}): void {
  if (!data.name?.trim()) {
    throw new Error("Company name is required");
  }
  if (data.name.length > 128) {
    throw new Error("Company name must be 128 characters or fewer");
  }
  validateSlug(data.slug);
}

// ─── Slug uniqueness ─────────────────────────────────────────────────────────

async function assertSlugUnique(slug: string, excludeId?: string): Promise<void> {
  const companiesTable = db.table("companies");
  const result = await companiesTable.query({ slug }, 1, 1);
  const existing = result.data ?? [];
  const conflict = excludeId
    ? existing.find((c) => c.id !== excludeId)
    : existing[0];
  if (conflict) {
    throw new ZeroDBConflictError(
      `Slug "${slug}" is already taken — choose a different identifier`
    );
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string;
  slug: string;
  domain?: string;
  default_currency?: string;
}

export interface CreateCompanyResult {
  company: Company;
  error?: never;
}

export interface CreateCompanyError {
  error: string;
  company?: never;
}

/**
 * Create a company, a default brand kit, and a default budget record.
 * Enforces slug uniqueness via ZeroDB query before insert.
 */
export async function createCompany(
  data: CreateCompanyInput
): Promise<CreateCompanyResult | CreateCompanyError> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    validateCompanyInput(data);
    await assertSlugUnique(data.slug);

    const companiesTable = db.table("companies");
    const brandKitsTable = db.table("brand_kits");
    const budgetsTable = db.table("budgets");

    // 1. Create company (brand_kit_id filled after brand kit creation)
    const now = new Date().toISOString();
    const company = await companiesTable.insert({
      name: data.name.trim(),
      slug: data.slug,
      domain: data.domain?.trim() ?? "",
      storefront_url: `https://${data.slug}.zeromerch.ai`,
      logo_file_id: undefined,
      brand_kit_id: undefined,
      billing_customer_id: undefined,
      default_currency: data.default_currency ?? "USD",
      status: "active" as const,
      created_at: now,
      updated_at: now,
    });

    // 2. Create default brand kit scoped to this company
    const brandKit = await brandKitsTable.insert({
      company_id: company.id,
      name: `${data.name.trim()} Brand`,
      primary_colors: ["#000000"],
      secondary_colors: ["#FFFFFF"],
      fonts: [],
      logo_files: [],
      approved_phrases: [],
      restricted_phrases: [],
      tone: "",
      compliance_rules: {
        restricted_products: [],
      },
      created_at: now,
      updated_at: now,
    });

    // 3. Link brand kit back onto company record
    const updatedCompany = await companiesTable.update(company.id, {
      brand_kit_id: brandKit.id,
      updated_at: new Date().toISOString(),
    });

    // 4. Create default company-scope budget
    await budgetsTable.insert({
      company_id: company.id,
      name: "Default Company Budget",
      owner_user_id: session.user.id,
      scope: "company" as const,
      limit_amount: 0,
      spent_amount: 0,
      currency: data.default_currency ?? "USD",
      period: "annual" as const,
      requires_approval_over: 500,
      status: "active",
    });

    return { company: updatedCompany };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create company";
    return { error: message };
  }
}

/**
 * Fetch a company by ID. Caller must belong to this company.
 */
export async function getCompany(
  id: string
): Promise<Company | null> {
  const session = await getSession();
  if (!session) redirect("/login");

  const companiesTable = db.table("companies");
  try {
    const company = await companiesTable.get(id);
    // Enforce tenant isolation
    if (session.user.company_id && company.id !== session.user.company_id) {
      throw new Error("Forbidden");
    }
    return company;
  } catch {
    return null;
  }
}

/**
 * Update a company by ID. Enforces slug uniqueness on slug change.
 */
export interface UpdateCompanyInput {
  name?: string;
  domain?: string;
  slug?: string;
  default_currency?: string;
  storefront_url?: string;
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyInput
): Promise<{ company: Company } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    if (data.slug) {
      validateSlug(data.slug);
      await assertSlugUnique(data.slug, id);
    }
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Company name cannot be empty");
    }

    const companiesTable = db.table("companies");
    const patch: Partial<Omit<Company, "id">> = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    const company = await companiesTable.update(id, patch);
    return { company };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update company";
    return { error: message };
  }
}
