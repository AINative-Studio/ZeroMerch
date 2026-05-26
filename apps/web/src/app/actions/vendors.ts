"use server";

// ---------------------------------------------------------------------------
// Server Actions — Vendor Management (Story 11.1, Issue #42)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Vendor, VendorProduct } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateVendorInput {
  name: string;
  type: Vendor["type"];
  api_provider: Vendor["api_provider"];
  capabilities: string[];
  average_turnaround_days: number;
}

export interface UpdateVendorInput {
  name?: string;
  type?: Vendor["type"];
  api_provider?: Vendor["api_provider"];
  status?: Vendor["status"];
  capabilities?: string[];
  average_turnaround_days?: number;
}

export interface VendorWithProducts extends Vendor {
  vendor_products: VendorProduct[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Create a new vendor record in ZeroDB.
 * Vendors are global (not per-company).
 */
export async function createVendor(
  data: CreateVendorInput
): Promise<{ vendor: Vendor } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!data.name?.trim()) return { error: "Vendor name is required" };
  if (!data.type) return { error: "Vendor type is required" };
  if (!data.api_provider) return { error: "API provider is required" };
  if (data.average_turnaround_days < 1)
    return { error: "Turnaround days must be at least 1" };

  try {
    const vendorsTable = db.table("vendors");
    const vendor = await vendorsTable.insert({
      ...data,
      status: "active",
      quality_score: 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { vendor };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create vendor";
    return { error: message };
  }
}

/**
 * Update vendor details.
 */
export async function updateVendor(
  id: string,
  data: UpdateVendorInput
): Promise<{ vendor: Vendor } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) return { error: "Vendor ID is required" };

  try {
    const vendorsTable = db.table("vendors");
    const vendor = await vendorsTable.update(id, {
      ...data,
      updated_at: new Date().toISOString(),
    });
    return { vendor };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update vendor";
    return { error: message };
  }
}

/**
 * List all vendors. Vendors are global, not per-company.
 * Optional companyId param is accepted for API symmetry but not used as a filter.
 */
export async function listVendors(
  _companyId?: string
): Promise<{ vendors: Vendor[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const vendorsTable = db.table("vendors");
    const result = await vendorsTable.query({}, 1, 100);
    return { vendors: result.data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list vendors";
    return { error: message };
  }
}

/**
 * Fetch a single vendor along with their mapped products.
 */
export async function getVendor(
  id: string
): Promise<{ vendor: VendorWithProducts } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) return { error: "Vendor ID is required" };

  try {
    const vendorsTable = db.table("vendors");
    const vendorProductsTable = db.table("vendor_products");

    const [vendor, vendorProductsResult] = await Promise.all([
      vendorsTable.get(id),
      vendorProductsTable.query({ vendor_id: id }, 1, 100),
    ]);

    return {
      vendor: {
        ...vendor,
        vendor_products: vendorProductsResult.data ?? [],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get vendor";
    return { error: message };
  }
}

/**
 * Create a vendor_products record linking a vendor to a product catalog entry.
 */
export async function addVendorProduct(
  vendorId: string,
  productId: string,
  cost: number,
  leadTimeDays: number
): Promise<{ vendorProduct: VendorProduct } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!vendorId) return { error: "Vendor ID is required" };
  if (!productId) return { error: "Product ID is required" };
  if (cost < 0) return { error: "Cost must be non-negative" };
  if (leadTimeDays < 1) return { error: "Lead time must be at least 1 day" };

  try {
    const vendorProductsTable = db.table("vendor_products");
    const vendorProduct = await vendorProductsTable.insert({
      vendor_id: vendorId,
      product_id: productId,
      cost,
      lead_time_days: leadTimeDays,
      minimum_order_quantity: 1,
    });
    return { vendorProduct };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add vendor product";
    return { error: message };
  }
}

/**
 * Update a vendor's quality score (0.0–1.0).
 */
export async function updateQualityScore(
  vendorId: string,
  newScore: number
): Promise<{ vendor: Vendor } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!vendorId) return { error: "Vendor ID is required" };
  if (newScore < 0 || newScore > 1)
    return { error: "Quality score must be between 0.0 and 1.0" };

  try {
    const vendorsTable = db.table("vendors");
    const vendor = await vendorsTable.update(vendorId, {
      quality_score: newScore,
      updated_at: new Date().toISOString(),
    });
    return { vendor };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update quality score";
    return { error: message };
  }
}

/**
 * Find the best vendor for a given product by highest quality_score.
 * Queries vendor_products to find vendors that carry the product, then
 * returns the one with the highest quality_score.
 */
export async function getBestVendorForProduct(
  productId: string
): Promise<{ vendor: Vendor; vendorProduct: VendorProduct } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!productId) return { error: "Product ID is required" };

  try {
    const vendorProductsTable = db.table("vendor_products");
    const vendorsTable = db.table("vendors");

    const vendorProductsResult = await vendorProductsTable.query(
      { product_id: productId },
      1,
      50
    );

    const vendorProducts = vendorProductsResult.data ?? [];
    if (vendorProducts.length === 0) {
      return { error: "No vendors found for this product" };
    }

    // Fetch all vendors that carry this product in parallel
    const vendorEntries = await Promise.all(
      vendorProducts.map(async (vp) => {
        try {
          const vendor = await vendorsTable.get(vp.vendor_id);
          return { vendor, vendorProduct: vp };
        } catch {
          return null;
        }
      })
    );

    // Filter active vendors and pick the one with the highest quality_score
    const activeEntries = vendorEntries.filter(
      (entry): entry is { vendor: Vendor; vendorProduct: VendorProduct } =>
        entry !== null && entry.vendor.status === "active"
    );

    if (activeEntries.length === 0) {
      return { error: "No active vendors found for this product" };
    }

    const best = activeEntries.reduce((top, current) =>
      current.vendor.quality_score > top.vendor.quality_score ? current : top
    );

    return { vendor: best.vendor, vendorProduct: best.vendorProduct };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to find best vendor";
    return { error: message };
  }
}
