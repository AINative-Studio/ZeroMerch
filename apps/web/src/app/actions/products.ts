"use server";

// ---------------------------------------------------------------------------
// Server Actions — Product Catalog (Stories 4.1, 4.2 — Issues #14, #15)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { syncProducts as commerceSync } from "@zeromerch/commerce";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Product, ProductVariant } from "@zeromerch/zerodb";

export type { Product, ProductVariant };

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const API_BASE =
  process.env["ZERODB_API_URL"] ?? "https://api.ainative.studio";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductFilters {
  category?: string;
  status?: Product["status"];
  tags?: string[];
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface SearchResult {
  product: Product;
  score: number;
}

export interface SyncProductsResult {
  synced: number;
  products: string[];
  errors: string[];
}

// ─── Story 4.1 — Sync ZeroCommerce Products ──────────────────────────────────

export async function syncProducts(
  companyId: string
): Promise<SyncProductsResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) {
    throw new Error("companyId is required");
  }

  return commerceSync(companyId);
}

// ─── Story 4.1 — List Products ───────────────────────────────────────────────

export async function listProducts(
  companyId: string,
  filters?: ProductFilters
): Promise<Product[]> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) {
    throw new Error("companyId is required");
  }

  const filter: Record<string, unknown> = { company_id: companyId };

  if (filters?.category) {
    filter["category"] = filters.category;
  }
  if (filters?.status) {
    filter["status"] = filters.status;
  }

  const res = await db.table("products").query(filter, 1, 100);
  let items = res.data;

  // Client-side tag filter (ZeroDB array filter may not support contains yet)
  if (filters?.tags && filters.tags.length > 0) {
    items = items.filter((p) =>
      filters.tags!.some((tag) => p.tags.includes(tag))
    );
  }

  return items;
}

// ─── Story 4.1 — Get Product + Variants ──────────────────────────────────────

export async function getProduct(id: string): Promise<ProductWithVariants> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) {
    throw new Error("id is required");
  }

  const product = await db.table("products").get(id);

  const variantsRes = await db
    .table("product_variants")
    .query({ product_id: id }, 1, 200);

  return { ...product, variants: variantsRes.data };
}

// ─── Story 4.2 — Semantic Product Search ─────────────────────────────────────

export async function searchProducts(
  companyId: string,
  query: string,
  filters?: ProductFilters
): Promise<SearchResult[]> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId || !query) {
    throw new Error("companyId and query are required");
  }

  const token = process.env["ZERODB_API_TOKEN"];
  if (!token) {
    throw new Error("ZERODB_API_TOKEN is not configured");
  }

  // 1. Get embedding for query
  const embedRes = await fetch(
    `${API_BASE}/api/v1/projects/${PROJECT_ID}/embeddings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: query }),
    }
  );

  if (!embedRes.ok) {
    const msg = await embedRes.text().catch(() => `HTTP ${embedRes.status}`);
    throw new Error(`Embedding failed (${embedRes.status}): ${msg}`);
  }

  const { embedding } = (await embedRes.json()) as { embedding: number[] };

  // 2. Vector search with company_id filter
  const matches = await db
    .vector("product_embeddings")
    .search(embedding, 10);

  // 3. Filter to this company
  const companyMatches = matches.filter(
    (m) => m.metadata["company_id"] === companyId
  );

  // 4. Apply optional category/tag filter on metadata
  let filtered = companyMatches;
  if (filters?.category) {
    filtered = filtered.filter(
      (m) => m.metadata["category"] === filters.category
    );
  }
  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter((m) => {
      const tags = m.metadata["tags"];
      if (!Array.isArray(tags)) return false;
      return (filters.tags as string[]).some((t) => (tags as string[]).includes(t));
    });
  }

  // 5. Fetch full product records
  const results: SearchResult[] = [];

  for (const match of filtered) {
    try {
      const product = await db.table("products").get(match.id);
      if (filters?.status && product.status !== filters.status) continue;
      results.push({ product, score: match.score });
    } catch {
      // Product row not found — skip stale vector entry
    }
  }

  return results;
}
