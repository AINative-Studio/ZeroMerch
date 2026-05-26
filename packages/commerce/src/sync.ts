// ---------------------------------------------------------------------------
// Sync — ZeroCommerce → ZeroDB
// Products, variants, and product embeddings
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { ZeroCommerceClient } from "./client.js";
import type { SyncResult } from "./types.js";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const API_BASE =
  process.env["ZERODB_API_URL"] ?? "https://api.ainative.studio";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const token = process.env["ZERODB_API_TOKEN"];
  if (!token) {
    throw new Error("ZERODB_API_TOKEN is not configured");
  }

  const res = await fetch(
    `${API_BASE}/api/v1/projects/${PROJECT_ID}/embeddings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Embedding request failed (${res.status}): ${msg}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

// ─── Main sync ───────────────────────────────────────────────────────────────

/**
 * syncProducts — pulls products from ZeroCommerce, upserts them to ZeroDB
 * tables, and writes vector embeddings to the product_embeddings collection.
 *
 * @param companyId — tenant company UUID
 * @returns SyncResult with count and any per-product errors
 */
export async function syncProducts(companyId: string): Promise<SyncResult> {
  if (!companyId) {
    throw new Error("companyId is required");
  }

  const zcClient = new ZeroCommerceClient();
  const db = new ZeroDBClient({ projectId: PROJECT_ID });

  const products = await zcClient.fetchProducts();

  const result: SyncResult = {
    synced: 0,
    products: [],
    errors: [],
  };

  for (const product of products) {
    try {
      // 1. Build deterministic product row ID (company-scoped)
      const productRowId = `${companyId}-${product.id}`;

      // 2. Upsert to products table
      const productRow = {
        id: productRowId,
        company_id: companyId,
        zerocommerce_product_id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        tags: product.tags,
        base_price: product.base_price,
        currency: product.currency,
        status: product.status,
        semantic_text: buildEmbeddingText(product.name, product.description, product.tags, product.category),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try update first, fall back to insert
      try {
        await db.table("products").update(productRowId, {
          name: productRow.name,
          description: productRow.description,
          category: productRow.category,
          tags: productRow.tags,
          base_price: productRow.base_price,
          status: productRow.status,
          semantic_text: productRow.semantic_text,
          updated_at: productRow.updated_at,
        });
      } catch {
        await db.table("products").insert(productRow as Parameters<typeof db.table<"products">["insert"]>[0]);
      }

      // 3. Upsert variants
      for (const variant of product.variants) {
        const variantRowId = `${companyId}-${variant.id}`;
        const variantRow = {
          id: variantRowId,
          product_id: productRowId,
          zerocommerce_variant_id: variant.id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          price: variant.price,
          inventory_count: variant.inventory_count,
          reorder_threshold: variant.reorder_threshold,
          status: variant.status,
        };

        try {
          await db.table("product_variants").update(variantRowId, {
            inventory_count: variantRow.inventory_count,
            price: variantRow.price,
            status: variantRow.status,
          });
        } catch {
          await db.table("product_variants").insert(variantRow as Parameters<typeof db.table<"product_variants">["insert"]>[0]);
        }
      }

      // 4. Generate embedding text
      const embeddingText = buildEmbeddingText(
        product.name,
        product.description,
        product.tags,
        product.category
      );

      // 5. Get embedding vector
      const embedding = await getEmbedding(embeddingText);

      // 6. Upsert to vector collection
      await db.vector("product_embeddings").upsert(productRowId, embedding, {
        company_id: companyId,
        category: product.category,
        price: product.base_price,
        tags: product.tags,
        name: product.name,
      });

      result.synced += 1;
      result.products.push(product.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${product.name}: ${msg}`);
    }
  }

  return result;
}

function buildEmbeddingText(
  name: string,
  description: string,
  tags: string[],
  category: string
): string {
  return `${name} — ${description} — tags: ${tags.join(", ")} — category: ${category}`;
}
