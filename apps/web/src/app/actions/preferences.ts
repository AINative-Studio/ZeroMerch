"use server";

// ---------------------------------------------------------------------------
// Server Actions — Preference Learning
// Story 10.3 — Issue #40
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { ZeroMemoryClient, ns } from "@zeromerch/memory";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Product, VectorMatch } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });
const memory = new ZeroMemoryClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecipientPreferences {
  id?: string;
  recipient_id: string;
  shirt_size?: string;
  hoodie_size?: string;
  shoe_size?: string | null;
  preferred_colors: string[];
  shipping_address_id?: string;
  allergies_or_restrictions: string[];
  updated_at?: string;
}

export interface ProductRecommendation {
  product: Product;
  similarity_score: number;
  reason: string;
}

export interface PreferenceProfile {
  recipient_id: string;
  inferred_shirt_size?: string;
  inferred_hoodie_size?: string;
  inferred_colors: string[];
  favorite_categories: string[];
  purchase_count: number;
  last_purchase_at?: string;
}

// ─── Embedding helper ─────────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiUrl = process.env["ZERODB_API_URL"] ?? "https://api.ainative.studio";

  if (!apiToken) return null;

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/projects/${PROJECT_ID}/embeddings/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!res.ok) return null;

    const body = (await res.json()) as { embedding?: number[]; data?: number[] };
    const vector = body.embedding ?? body.data;
    return Array.isArray(vector) ? vector : null;
  } catch {
    return null;
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Record a purchase as an episodic memory and update recipient_preferences.
 *
 * Called after order completion. Stores purchase in the employee_preferences
 * memory namespace so the preference inference engine can learn from it.
 * Also triggers a preference re-inference if the recipient record is found.
 */
export async function recordPurchase(
  recipientId: string,
  productId: string,
  variantId: string,
  companyId: string
): Promise<{ recorded: true } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // Fetch recipient, product, and variant in parallel
    const [recipient, product, variant] = await Promise.all([
      db.table("recipients").get(recipientId),
      db.table("products").get(productId),
      db.table("product_variants").get(variantId),
    ]);

    const recipientName = recipient.full_name ?? "Unknown recipient";
    const productName = product.name ?? "Unknown product";
    const color = variant.color ?? "unknown color";
    const size = variant.size ?? "unknown size";
    const category = product.category ?? "general";
    const variantLabel = [color, size].filter(Boolean).join("/");

    // Store episodic memory for this purchase
    await memory.store(ns.preferences(companyId), {
      subject: `${recipientName} purchase: ${productName} ${variantLabel}`,
      content: `${recipientName} purchased ${productName} in ${color}/${size}. Category: ${category}.`,
      memory_type: "episodic",
      entities: [recipientName, productName, color, size, category],
      importance: 0.7,
      source_ref: `order:${productId}:${variantId}`,
    });

    // Update recipient_preferences with observed size/color
    const existingPrefs = await db
      .table("recipient_preferences" as never)
      .query({ recipient_id: recipientId } as never, 1, 1)
      .then((r: { data?: RecipientPreferences[] }) => (r.data ?? [])[0] ?? null)
      .catch(() => null) as RecipientPreferences | null;

    if (existingPrefs) {
      const updatedColors = [...new Set([...(existingPrefs.preferred_colors ?? []), color])];
      const updateData: Partial<RecipientPreferences> = {
        preferred_colors: updatedColors,
        updated_at: new Date().toISOString(),
      };

      // Only overwrite sizes if not yet set
      if (!existingPrefs.shirt_size && category === "apparel" && size) {
        updateData.shirt_size = size;
      }
      if (!existingPrefs.hoodie_size && productName.toLowerCase().includes("hoodie") && size) {
        updateData.hoodie_size = size;
      }

      await db
        .table("recipient_preferences" as never)
        .update(existingPrefs.id!, updateData as never);
    } else {
      // Create initial preferences record
      const newPrefs: Omit<RecipientPreferences, "id"> = {
        recipient_id: recipientId,
        preferred_colors: [color],
        allergies_or_restrictions: [],
        updated_at: new Date().toISOString(),
      };
      if (size && category === "apparel") newPrefs.shirt_size = size;
      if (size && productName.toLowerCase().includes("hoodie")) newPrefs.hoodie_size = size;

      await db
        .table("recipient_preferences" as never)
        .insert(newPrefs as never);
    }

    return { recorded: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record purchase";
    return { error: message };
  }
}

/**
 * Infer a recipient's preference profile from purchase history + memory.
 *
 * 1. Query orders + order_items for the recipient to get purchase history.
 * 2. Recall existing preference memories from ZeroDB.
 * 3. Synthesize a preference profile (sizes, colors, categories).
 * 4. Persist the updated profile to recipient_preferences.
 */
export async function inferPreferences(
  recipientId: string,
  companyId: string
): Promise<{ profile: PreferenceProfile } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // Fetch orders for this recipient in parallel with memory recall
    const [ordersResult, memoryContext] = await Promise.all([
      db.table("orders").query({ recipient_id: recipientId, company_id: companyId }, 1, 50),
      memory.recall(ns.preferences(companyId), recipientId, {
        limit: 20,
        memory_types: ["episodic", "semantic"],
      }),
    ]);

    const orders = ordersResult.data ?? [];

    // Fetch order items for all orders
    const itemResults = await Promise.all(
      orders.map((o) =>
        db.table("order_items").query({ order_id: o.id }, 1, 20)
      )
    );

    const allItems = itemResults.flatMap((r) => r.data ?? []);

    // Fetch product details for each unique product
    const uniqueProductIds = [...new Set(allItems.map((i) => i.product_id))];
    const products = await Promise.all(
      uniqueProductIds.map((id) =>
        db.table("products").get(id).catch(() => null)
      )
    );
    const productMap = new Map(
      products
        .filter(Boolean)
        .map((p) => [p!.id, p!])
    );

    // Fetch variant details for size/color
    const uniqueVariantIds = [...new Set(allItems.map((i) => i.variant_id))];
    const variants = await Promise.all(
      uniqueVariantIds.map((id) =>
        db.table("product_variants").get(id).catch(() => null)
      )
    );
    const variantMap = new Map(
      variants
        .filter(Boolean)
        .map((v) => [v!.id, v!])
    );

    // Tally colors, sizes, categories from purchase history
    const colorCounts = new Map<string, number>();
    const categoryCount = new Map<string, number>();
    const sizes: string[] = [];

    for (const item of allItems) {
      const variant = variantMap.get(item.variant_id);
      const product = productMap.get(item.product_id);

      if (variant?.color) {
        colorCounts.set(variant.color, (colorCounts.get(variant.color) ?? 0) + 1);
      }
      if (variant?.size) {
        sizes.push(variant.size);
      }
      if (product?.category) {
        categoryCount.set(product.category, (categoryCount.get(product.category) ?? 0) + 1);
      }
    }

    // Extract preference signals from memory records
    for (const mem of memoryContext) {
      const lower = mem.content.toLowerCase();
      // Simple color extraction from memory content
      const colorKeywords = ["black", "white", "navy", "grey", "gray", "green", "blue", "red"];
      for (const c of colorKeywords) {
        if (lower.includes(c)) {
          colorCounts.set(c, (colorCounts.get(c) ?? 0) + 0.5);
        }
      }
    }

    // Sort colors by frequency
    const sortedColors = [...colorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);

    // Infer most common size
    const sizeFreq = new Map<string, number>();
    for (const s of sizes) sizeFreq.set(s, (sizeFreq.get(s) ?? 0) + 1);
    const preferredSize = [...sizeFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    // Sort categories by frequency
    const topCategories = [...categoryCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);

    const lastOrder = orders.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    const profile: PreferenceProfile = {
      recipient_id: recipientId,
      inferred_shirt_size: preferredSize,
      inferred_hoodie_size: preferredSize,
      inferred_colors: sortedColors.slice(0, 4),
      favorite_categories: topCategories,
      purchase_count: allItems.length,
      last_purchase_at: lastOrder?.created_at,
    };

    // Persist inferred preferences back to recipient_preferences
    const existingPrefsResult = await db
      .table("recipient_preferences" as never)
      .query({ recipient_id: recipientId } as never, 1, 1)
      .then((r: { data?: RecipientPreferences[] }) => r.data ?? [])
      .catch(() => []) as RecipientPreferences[];

    const existing = existingPrefsResult[0];

    if (existing?.id) {
      await db.table("recipient_preferences" as never).update(existing.id, {
        preferred_colors: sortedColors.slice(0, 4),
        shirt_size: preferredSize ?? existing.shirt_size,
        hoodie_size: preferredSize ?? existing.hoodie_size,
        updated_at: new Date().toISOString(),
      } as never);
    }

    return { profile };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preference inference failed";
    return { error: message };
  }
}

/**
 * Generate personalized product recommendations for a recipient.
 *
 * 1. Load recipient_preferences from ZeroDB.
 * 2. Build a preference query string from sizes and colors.
 * 3. Vector search products with the preference query.
 * 4. Filter out already-purchased products.
 * 5. Return top `count` recommendations with reasons.
 */
export async function getPersonalizedRecommendations(
  recipientId: string,
  companyId: string,
  count = 5
): Promise<{ recommendations: ProductRecommendation[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    // Load preferences, past orders, and memory in parallel
    const [prefsResult, ordersResult, memoryContext] = await Promise.all([
      db
        .table("recipient_preferences" as never)
        .query({ recipient_id: recipientId } as never, 1, 1)
        .then((r: { data?: RecipientPreferences[] }) => r.data ?? [])
        .catch(() => []) as Promise<RecipientPreferences[]>,
      db.table("orders").query({ recipient_id: recipientId, company_id: companyId }, 1, 100),
      memory.recall(ns.preferences(companyId), `${recipientId} preferences`, {
        limit: 10,
        memory_types: ["episodic", "semantic"],
      }),
    ]);

    const prefs = (prefsResult as RecipientPreferences[])[0];
    const pastOrders = ordersResult.data ?? [];

    // Collect already-purchased product IDs to exclude
    const purchasedItems = await Promise.all(
      pastOrders.map((o) =>
        db.table("order_items").query({ order_id: o.id }, 1, 50)
      )
    );
    const purchasedProductIds = new Set(
      purchasedItems.flatMap((r) => (r.data ?? []).map((i) => i.product_id))
    );

    // Build preference query string
    const colorClause = prefs?.preferred_colors?.length
      ? prefs.preferred_colors.slice(0, 3).join(", ")
      : "";
    const sizeClause = prefs?.shirt_size ?? "";

    // Augment with memory context signals
    const memorySignals = memoryContext
      .slice(0, 3)
      .map((m) => m.subject)
      .join("; ");

    const preferenceQuery = [colorClause, sizeClause, "apparel merch", memorySignals]
      .filter(Boolean)
      .join(" ");

    // Vector search on product_embeddings
    const queryVector = await getEmbedding(preferenceQuery);

    let productResults: Array<{ product: Product; score: number }> = [];

    if (queryVector) {
      const vectorClient = db.vector("product_embeddings");
      const matches: VectorMatch[] = await vectorClient.search(queryVector, 30);

      const productIds = matches
        .filter(
          (m) =>
            (m.metadata["company_id"] as string) === companyId &&
            !purchasedProductIds.has(m.metadata["object_id"] as string)
        )
        .map((m) => ({ id: m.metadata["object_id"] as string, score: m.score }));

      const products = await Promise.all(
        productIds.slice(0, 20).map(async ({ id, score }) => {
          try {
            const product = await db.table("products").get(id);
            return { product, score };
          } catch {
            return null;
          }
        })
      );

      productResults = products
        .filter(
          (r): r is { product: Product; score: number } =>
            r !== null && r.product.status === "active"
        )
        .sort((a, b) => b.score - a.score);
    } else {
      // Fallback: list active products, filter out purchased
      const allProds = await db.table("products").query(
        { company_id: companyId, status: "active" },
        1,
        30
      );
      productResults = (allProds.data ?? [])
        .filter((p) => !purchasedProductIds.has(p.id))
        .map((p) => ({ product: p, score: 0.5 }));
    }

    const recommendations: ProductRecommendation[] = productResults
      .slice(0, count)
      .map(({ product, score }) => {
        // Build a human-readable reason
        const colorMatch = prefs?.preferred_colors?.some((c) =>
          product.tags?.includes(c) || product.description?.toLowerCase().includes(c.toLowerCase())
        );
        const reason = colorMatch
          ? `Matches preferred colors (${prefs!.preferred_colors.slice(0, 2).join(", ")})`
          : `Recommended based on purchase history`;

        return { product, similarity_score: score, reason };
      });

    return { recommendations };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recommendations failed";
    return { error: message };
  }
}
