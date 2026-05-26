"use server";

// ---------------------------------------------------------------------------
// Server Actions — Inventory Alerts (Story 11.3, Issue #44)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { ProductVariant } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryAlert {
  variant: ProductVariant;
  currentCount: number;
  reorderThreshold: number;
  suggestedReorder: number;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Check inventory alerts for a company.
 * Returns all product_variants where inventory_count <= reorder_threshold.
 */
export async function checkInventoryAlerts(
  companyId: string
): Promise<{ alerts: InventoryAlert[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) return { error: "Company ID is required" };

  try {
    const productsTable = db.table("products");
    const variantsTable = db.table("product_variants");

    // Get all products for this company
    const productsResult = await productsTable.query(
      { company_id: companyId },
      1,
      500
    );
    const products = productsResult.data ?? [];

    if (products.length === 0) return { alerts: [] };

    // Fetch variants for all products in parallel
    const variantResults = await Promise.all(
      products.map((p) => variantsTable.query({ product_id: p.id }, 1, 50))
    );

    const allVariants = variantResults.flatMap((r) => r.data ?? []);

    // Filter variants that are at or below reorder threshold
    const lowStockVariants = allVariants.filter(
      (v) => v.inventory_count <= v.reorder_threshold
    );

    const alerts: InventoryAlert[] = lowStockVariants.map((variant) => ({
      variant,
      currentCount: variant.inventory_count,
      reorderThreshold: variant.reorder_threshold,
      suggestedReorder: generateReorderQuantitySync(variant.reorder_threshold),
    }));

    return { alerts };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check inventory alerts";
    return { error: message };
  }
}

/**
 * Synchronous reorder quantity formula — used internally.
 * Formula: reorder_threshold * 3 (configurable in a future sprint).
 */
function generateReorderQuantitySync(reorderThreshold: number): number {
  return reorderThreshold * 3;
}

/**
 * Generate a suggested reorder quantity for a variant.
 * Formula: reorder_threshold * 3 (stub; configurable later).
 */
export async function generateReorderQuantity(
  variantId: string
): Promise<{ quantity: number } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!variantId) return { error: "Variant ID is required" };

  try {
    const variantsTable = db.table("product_variants");
    const variant = await variantsTable.get(variantId);
    const quantity = generateReorderQuantitySync(variant.reorder_threshold);
    return { quantity };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate reorder quantity";
    return { error: message };
  }
}

/**
 * Send an inventory alert notification.
 * Stub: logs formatted alert to console. Real notifications in enterprise sprint.
 */
export async function sendInventoryAlert(
  variantId: string,
  currentCount: number,
  suggestedReorder: number
): Promise<{ sent: boolean } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!variantId) return { error: "Variant ID is required" };
  if (currentCount < 0) return { error: "Current count must be non-negative" };
  if (suggestedReorder < 1) return { error: "Suggested reorder must be at least 1" };

  try {
    const variantsTable = db.table("product_variants");
    const variant = await variantsTable.get(variantId);

    // Stub: log the alert (real notifications in enterprise hardening sprint)
    console.log(
      `[INVENTORY ALERT] SKU: ${variant.sku} | ` +
        `Current: ${currentCount} | ` +
        `Threshold: ${variant.reorder_threshold} | ` +
        `Suggested Reorder: ${suggestedReorder} units`
    );

    return { sent: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send inventory alert";
    return { error: message };
  }
}

/**
 * Mark a variant as reordered — resets its status to active and bumps inventory count
 * by the suggested reorder quantity. This is a stub for the "Mark Reordered" button.
 */
export async function markVariantReordered(
  variantId: string
): Promise<{ variant: ProductVariant } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!variantId) return { error: "Variant ID is required" };

  try {
    const variantsTable = db.table("product_variants");
    const current = await variantsTable.get(variantId);
    const reorderQty = generateReorderQuantitySync(current.reorder_threshold);

    const variant = await variantsTable.update(variantId, {
      inventory_count: current.inventory_count + reorderQty,
      status: "active",
    });

    return { variant };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark variant as reordered";
    return { error: message };
  }
}
