/**
 * ZeroMerch collection schema definitions.
 *
 * Run `pnpm --filter @zeromerch/zerodb schema` to provision all MVP collections
 * in your ZeroDB project on first run.
 */

import { ZeroDBClient } from "./client.js";

// ─── Collection Definitions ──────────────────────────────────────────────────

export interface CollectionSchema {
  name: string;
  kind: "table" | "vector" | "memory" | "event";
  description: string;
  /** For vector collections: embedding dimensionality */
  dimensions?: number;
  /** For table collections: field definitions for ZeroDB schema validation */
  fields?: FieldDef[];
}

export interface FieldDef {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "timestamp";
  required?: boolean;
  indexed?: boolean;
}

/** All 15 MVP table collections */
export const TABLE_COLLECTIONS: CollectionSchema[] = [
  {
    name: "companies",
    kind: "table",
    description: "Core tenant records — one row per customer company",
    fields: [
      { name: "name", type: "string", required: true, indexed: true },
      { name: "slug", type: "string", required: true, indexed: true },
      { name: "domain", type: "string", indexed: true },
      { name: "storefront_url", type: "string" },
      { name: "logo_file_id", type: "string" },
      { name: "brand_kit_id", type: "string", indexed: true },
      { name: "billing_customer_id", type: "string" },
      { name: "default_currency", type: "string", required: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "created_at", type: "timestamp", required: true },
      { name: "updated_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "company_users",
    kind: "table",
    description: "Users belonging to a company (active, pending invitation, or revoked)",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "email", type: "string", required: true, indexed: true },
      { name: "full_name", type: "string", required: true },
      { name: "role", type: "string", required: true, indexed: true },
      { name: "department_id", type: "string", indexed: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "sso_subject", type: "string" },
      { name: "expires_at", type: "timestamp" },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "departments",
    kind: "table",
    description: "Organizational departments within a company",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "name", type: "string", required: true, indexed: true },
      { name: "budget_id", type: "string", indexed: true },
      { name: "manager_user_id", type: "string", indexed: true },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "brand_kits",
    kind: "table",
    description: "Brand guidelines and compliance rules per company",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "name", type: "string", required: true },
      { name: "primary_colors", type: "array" },
      { name: "secondary_colors", type: "array" },
      { name: "fonts", type: "array" },
      { name: "logo_files", type: "array" },
      { name: "approved_phrases", type: "array" },
      { name: "restricted_phrases", type: "array" },
      { name: "tone", type: "string" },
      { name: "compliance_rules", type: "object" },
      { name: "created_at", type: "timestamp", required: true },
      { name: "updated_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "products",
    kind: "table",
    description: "Merchandise product catalog entries",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "zerocommerce_product_id", type: "string", indexed: true },
      { name: "name", type: "string", required: true, indexed: true },
      { name: "description", type: "string" },
      { name: "category", type: "string", indexed: true },
      { name: "tags", type: "array" },
      { name: "base_price", type: "number", required: true },
      { name: "currency", type: "string", required: true },
      { name: "vendor_id", type: "string", indexed: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "semantic_text", type: "string" },
      { name: "created_at", type: "timestamp", required: true },
      { name: "updated_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "product_variants",
    kind: "table",
    description: "Size/color variants for a product",
    fields: [
      { name: "product_id", type: "string", required: true, indexed: true },
      { name: "zerocommerce_variant_id", type: "string" },
      { name: "sku", type: "string", required: true, indexed: true },
      { name: "size", type: "string", indexed: true },
      { name: "color", type: "string", indexed: true },
      { name: "price", type: "number", required: true },
      { name: "inventory_count", type: "number", required: true },
      { name: "reorder_threshold", type: "number", required: true },
      { name: "status", type: "string", required: true, indexed: true },
    ],
  },
  {
    name: "campaigns",
    kind: "table",
    description: "Merch campaigns and drops",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "name", type: "string", required: true },
      { name: "type", type: "string", required: true, indexed: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "start_at", type: "timestamp" },
      { name: "end_at", type: "timestamp" },
      { name: "budget_id", type: "string", indexed: true },
      { name: "created_by", type: "string", required: true, indexed: true },
      { name: "agent_generated", type: "boolean" },
      { name: "agent_prompt", type: "string" },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "campaign_products",
    kind: "table",
    description: "Products included in a campaign with variant rules",
    fields: [
      { name: "campaign_id", type: "string", required: true, indexed: true },
      { name: "product_id", type: "string", required: true, indexed: true },
      { name: "variant_rules", type: "object" },
      { name: "max_quantity_per_recipient", type: "number" },
      { name: "display_order", type: "number" },
    ],
  },
  {
    name: "recipients",
    kind: "table",
    description: "People who can receive merch (employees, customers, etc.)",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "type", type: "string", required: true, indexed: true },
      { name: "email", type: "string", required: true, indexed: true },
      { name: "full_name", type: "string", required: true },
      { name: "external_ref", type: "string", indexed: true },
      { name: "department_id", type: "string", indexed: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "redemption_links",
    kind: "table",
    description: "One-time redemption tokens for campaign recipients",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "campaign_id", type: "string", required: true, indexed: true },
      { name: "recipient_id", type: "string", required: true, indexed: true },
      { name: "token_hash", type: "string", required: true, indexed: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "credit_amount", type: "number", required: true },
      { name: "expires_at", type: "timestamp" },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "orders",
    kind: "table",
    description: "Placed orders tracking payment and fulfillment state",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "campaign_id", type: "string", indexed: true },
      { name: "recipient_id", type: "string", required: true, indexed: true },
      { name: "zerocommerce_order_id", type: "string", indexed: true },
      { name: "stripe_checkout_session_id", type: "string" },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "subtotal", type: "number", required: true },
      { name: "shipping", type: "number", required: true },
      { name: "tax", type: "number", required: true },
      { name: "total", type: "number", required: true },
      { name: "paid_by", type: "string", required: true },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "order_items",
    kind: "table",
    description: "Line items within an order",
    fields: [
      { name: "order_id", type: "string", required: true, indexed: true },
      { name: "product_id", type: "string", required: true, indexed: true },
      { name: "variant_id", type: "string", required: true, indexed: true },
      { name: "quantity", type: "number", required: true },
      { name: "unit_price", type: "number", required: true },
      { name: "customization", type: "object" },
    ],
  },
  {
    name: "budgets",
    kind: "table",
    description: "Spend budgets scoped by company, department, campaign, or user",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "name", type: "string", required: true },
      { name: "owner_user_id", type: "string", required: true, indexed: true },
      { name: "scope", type: "string", required: true, indexed: true },
      { name: "limit_amount", type: "number", required: true },
      { name: "spent_amount", type: "number", required: true },
      { name: "currency", type: "string", required: true },
      { name: "period", type: "string", required: true },
      { name: "requires_approval_over", type: "number" },
      { name: "status", type: "string", required: true, indexed: true },
    ],
  },
  {
    name: "approval_requests",
    kind: "table",
    description: "Governance approval requests for orders, campaigns, designs, budgets",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "request_type", type: "string", required: true, indexed: true },
      { name: "request_ref_id", type: "string", required: true, indexed: true },
      { name: "requested_by", type: "string", required: true, indexed: true },
      { name: "approver_user_id", type: "string", required: true, indexed: true },
      { name: "status", type: "string", required: true, indexed: true },
      { name: "reason", type: "string" },
      { name: "agent_recommendation", type: "string" },
      { name: "created_at", type: "timestamp", required: true },
      { name: "resolved_at", type: "timestamp" },
    ],
  },
  {
    name: "events",
    kind: "table",
    description: "Platform event log — automation and audit trail",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "event_type", type: "string", required: true, indexed: true },
      { name: "actor_type", type: "string", required: true, indexed: true },
      { name: "actor_id", type: "string", required: true, indexed: true },
      { name: "object_type", type: "string", required: true, indexed: true },
      { name: "object_id", type: "string", required: true, indexed: true },
      { name: "payload", type: "object" },
      { name: "processed", type: "boolean", indexed: true },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
  {
    name: "agent_memories",
    kind: "table",
    description: "Working, episodic, and semantic memories for AI agents",
    fields: [
      { name: "company_id", type: "string", required: true, indexed: true },
      { name: "agent_name", type: "string", required: true, indexed: true },
      { name: "memory_type", type: "string", required: true, indexed: true },
      { name: "subject", type: "string", required: true },
      { name: "content", type: "string", required: true },
      { name: "entities", type: "array" },
      { name: "importance", type: "number" },
      { name: "decay_score", type: "number" },
      { name: "source_ref", type: "string", indexed: true },
      { name: "created_at", type: "timestamp", required: true },
    ],
  },
];

/** Vector collections for semantic product and campaign search */
export const VECTOR_COLLECTIONS: CollectionSchema[] = [
  {
    name: "product_embeddings",
    kind: "vector",
    description: "Semantic embeddings for product catalog search",
    dimensions: 1536,
  },
  {
    name: "campaign_embeddings",
    kind: "vector",
    description: "Semantic embeddings for campaign discovery",
    dimensions: 1536,
  },
];

/** All MVP collections combined */
export const ALL_COLLECTIONS: CollectionSchema[] = [
  ...TABLE_COLLECTIONS,
  ...VECTOR_COLLECTIONS,
];

// ─── Schema Init ─────────────────────────────────────────────────────────────

/**
 * Provisions all MVP collections in ZeroDB for a project.
 * Safe to run multiple times — skips collections that already exist.
 *
 * @example
 * ```ts
 * import { ZeroDBClient } from "@zeromerch/zerodb";
 * import { initSchema } from "@zeromerch/zerodb/schema";
 *
 * const client = new ZeroDBClient();
 * await initSchema(client);
 * ```
 */
export async function initSchema(
  client: ZeroDBClient,
  options: { verbose?: boolean } = {},
): Promise<{ created: string[]; skipped: string[]; failed: string[] }> {
  const results = { created: [] as string[], skipped: [] as string[], failed: [] as string[] };

  for (const collection of TABLE_COLLECTIONS) {
    try {
      await provisionTableCollection(client, collection);
      results.created.push(collection.name);
      if (options.verbose) {
        console.log(`[zerodb:schema] Created table: ${collection.name}`);
      }
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      // 409 Conflict = already exists; treat as skipped
      if (error.statusCode === 409) {
        results.skipped.push(collection.name);
        if (options.verbose) {
          console.log(`[zerodb:schema] Skipped (already exists): ${collection.name}`);
        }
      } else {
        results.failed.push(collection.name);
        console.error(
          `[zerodb:schema] Failed to create ${collection.name}:`,
          error.message,
        );
      }
    }
  }

  for (const collection of VECTOR_COLLECTIONS) {
    try {
      await provisionVectorCollection(client, collection);
      results.created.push(collection.name);
      if (options.verbose) {
        console.log(`[zerodb:schema] Created vector collection: ${collection.name}`);
      }
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      if (error.statusCode === 409) {
        results.skipped.push(collection.name);
        if (options.verbose) {
          console.log(`[zerodb:schema] Skipped (already exists): ${collection.name}`);
        }
      } else {
        results.failed.push(collection.name);
        console.error(
          `[zerodb:schema] Failed to create vector collection ${collection.name}:`,
          error.message,
        );
      }
    }
  }

  return results;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function provisionTableCollection(
  client: ZeroDBClient,
  schema: CollectionSchema,
): Promise<void> {
  // Use the internal request method via the table client's insert endpoint
  // to POST the collection definition to ZeroDB's tables management API.
  // We hit the tables endpoint without a table name suffix to create it.
  await (client as unknown as { request: (m: string, p: string, b: unknown) => Promise<unknown> })
    .request("POST", `/api/v1/projects/${getProjectId(client)}/tables`, {
      name: schema.name,
      description: schema.description,
      fields: schema.fields ?? [],
    });
}

async function provisionVectorCollection(
  client: ZeroDBClient,
  schema: CollectionSchema,
): Promise<void> {
  await (client as unknown as { request: (m: string, p: string, b: unknown) => Promise<unknown> })
    .request("POST", `/api/v1/projects/${getProjectId(client)}/vectors`, {
      name: schema.name,
      description: schema.description,
      dimensions: schema.dimensions ?? 1536,
    });
}

function getProjectId(client: ZeroDBClient): string {
  return (client as unknown as { projectId: string }).projectId;
}
