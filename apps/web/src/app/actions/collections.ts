"use server";

// ---------------------------------------------------------------------------
// Server Actions — Product Collections (Story 4.3 — Issue #16)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type {
  ProductCollection,
  CollectionVisibility,
  Product,
} from "@zeromerch/zerodb";

export type { ProductCollection, CollectionVisibility };

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCollectionInput {
  name: string;
  description: string;
  visibility: CollectionVisibility;
  allowed_department_ids?: string[];
  product_ids?: string[];
}

export interface CollectionWithProducts extends ProductCollection {
  products: Product[];
}

// ─── Story 4.3 — Create Collection ───────────────────────────────────────────

export async function createCollection(
  companyId: string,
  data: CreateCollectionInput
): Promise<ProductCollection> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) throw new Error("companyId is required");
  if (!data.name?.trim()) throw new Error("Collection name is required");

  const now = new Date().toISOString();
  const id = `coll-${companyId}-${Date.now()}`;

  const collection = {
    id,
    company_id: companyId,
    name: data.name.trim(),
    description: data.description?.trim() ?? "",
    product_ids: data.product_ids ?? [],
    visibility: data.visibility,
    allowed_department_ids: data.allowed_department_ids ?? [],
    status: "active" as const,
    created_at: now,
  };

  return db.table("product_collections").insert(collection);
}

// ─── Story 4.3 — Add Product to Collection ───────────────────────────────────

export async function addProductToCollection(
  collectionId: string,
  productId: string
): Promise<ProductCollection> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!collectionId) throw new Error("collectionId is required");
  if (!productId) throw new Error("productId is required");

  // Fetch current collection
  const collection = await db.table("product_collections").get(collectionId);

  // Append productId if not already present
  if (collection.product_ids.includes(productId)) {
    return collection;
  }

  const updatedIds = [...collection.product_ids, productId];
  return db.table("product_collections").update(collectionId, {
    product_ids: updatedIds,
  });
}

// ─── Story 4.3 — List Collections ────────────────────────────────────────────

export async function listCollections(
  companyId: string
): Promise<ProductCollection[]> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) throw new Error("companyId is required");

  const res = await db
    .table("product_collections")
    .query({ company_id: companyId }, 1, 100);

  return res.data.filter((c) => c.status === "active");
}

// ─── Story 4.3 — Get Collection + Products ───────────────────────────────────

export async function getCollection(
  id: string
): Promise<CollectionWithProducts> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) throw new Error("id is required");

  const collection = await db.table("product_collections").get(id);

  // Fetch all referenced products
  const products: Product[] = [];
  for (const productId of collection.product_ids) {
    try {
      const product = await db.table("products").get(productId);
      products.push(product);
    } catch {
      // Product no longer exists — skip it
    }
  }

  return { ...collection, products };
}
