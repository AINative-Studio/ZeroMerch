"use server";

// ---------------------------------------------------------------------------
// Server Actions — Campaign Engine (Stories 7.1, 7.2, 7.3)
//                  Issues #26, #27, #28
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type {
  Campaign,
  CampaignProduct,
  CampaignType,
  CampaignStatus,
  VariantRules,
  Product,
  ProductVariant,
} from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const APP_BASE_URL =
  process.env["NEXT_PUBLIC_APP_URL"] ?? "https://zeromerch.ai";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignAccessMode = "public" | "invite_only" | "qr_only";

export interface CampaignWithProducts extends Campaign {
  products: CampaignProductWithDetails[];
  access_mode?: CampaignAccessMode;
}

export interface CampaignProductWithDetails extends CampaignProduct {
  product?: Product;
}

export interface CreateCampaignInput {
  name: string;
  type: CampaignType;
  start_at?: string;
  end_at?: string;
  budget_id?: string;
  agent_generated?: boolean;
  agent_prompt?: string;
  access_mode?: CampaignAccessMode;
}

export interface UpdateCampaignInput {
  name?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  start_at?: string;
  end_at?: string;
  budget_id?: string;
  agent_generated?: boolean;
  agent_prompt?: string;
  access_mode?: CampaignAccessMode;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  type?: CampaignType;
}

// ─── Story 7.1 — Campaign CRUD ───────────────────────────────────────────────

/**
 * Create a new campaign record in ZeroDB.
 */
export async function createCampaign(
  companyId: string,
  data: CreateCampaignInput
): Promise<{ campaign: Campaign } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) return { error: "companyId is required" };
  if (!data.name?.trim()) return { error: "Campaign name is required" };
  if (!data.type) return { error: "Campaign type is required" };

  try {
    const campaignsTable = db.table("campaigns");

    const now = new Date().toISOString();
    // Use unknown cast to allow access_mode as an extra metadata field
    const insertData = {
      company_id: companyId,
      name: data.name.trim(),
      type: data.type,
      status: "draft" as const,
      start_at: data.start_at ?? undefined,
      end_at: data.end_at ?? undefined,
      budget_id: data.budget_id ?? undefined,
      created_by: session.user.id,
      agent_generated: data.agent_generated ?? false,
      agent_prompt: data.agent_prompt ?? undefined,
      created_at: now,
      // access_mode stored as an extra field alongside the typed schema
      access_mode: data.access_mode ?? "public",
    } as Omit<Campaign, "id"> & { access_mode?: CampaignAccessMode };
    const record = await (campaignsTable as unknown as {
      insert: (d: unknown) => Promise<Campaign & { access_mode?: CampaignAccessMode }>;
    }).insert(insertData);

    return { campaign: record as Campaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return { error: message };
  }
}

/**
 * Update an existing campaign.
 */
export async function updateCampaign(
  id: string,
  data: UpdateCampaignInput
): Promise<{ campaign: Campaign } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) return { error: "Campaign id is required" };

  try {
    const campaignsTable = db.table("campaigns");
    const updated = await campaignsTable.update(id, data as Record<string, unknown>);
    return { campaign: updated as Campaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update campaign";
    return { error: message };
  }
}

/**
 * List campaigns for a company with optional status/type filters.
 */
export async function listCampaigns(
  companyId: string,
  filters?: CampaignFilters
): Promise<{ campaigns: Campaign[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) return { error: "companyId is required" };

  try {
    const campaignsTable = db.table("campaigns");

    const filter: Record<string, unknown> = { company_id: companyId };
    if (filters?.status) filter["status"] = filters.status;
    if (filters?.type) filter["type"] = filters.type;

    const result = await campaignsTable.query(filter, 1, 100);
    return { campaigns: (result.data ?? []) as Campaign[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list campaigns";
    return { error: message };
  }
}

/**
 * Get a single campaign with its attached products.
 */
export async function getCampaign(
  id: string
): Promise<{ campaign: CampaignWithProducts } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) return { error: "Campaign id is required" };

  try {
    const campaignsTable = db.table("campaigns");
    const campaignProductsTable = db.table("campaign_products");

    const [rawCampaign, cpResult] = await Promise.all([
      campaignsTable.get(id),
      campaignProductsTable.query({ campaign_id: id }, 1, 50),
    ]);

    const campaign = rawCampaign as Campaign & { access_mode?: CampaignAccessMode };
    const campaignProducts = (cpResult.data ?? []) as CampaignProduct[];

    // Fetch product details for each campaign product
    let products: CampaignProductWithDetails[] = campaignProducts;
    if (campaignProducts.length > 0) {
      const productsTable = db.table("products");
      const productFetches = campaignProducts.map(async (cp) => {
        try {
          const product = await productsTable.get(cp.product_id);
          return { ...cp, product: product as Product };
        } catch {
          return cp;
        }
      });
      products = await Promise.all(productFetches);
    }

    // Sort by display_order
    products.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    return {
      campaign: {
        ...campaign,
        products,
        access_mode: campaign.access_mode ?? "public",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get campaign";
    return { error: message };
  }
}

/**
 * Attach a product to a campaign with variant rules.
 */
export async function addProductToCampaign(
  campaignId: string,
  productId: string,
  variantRules: VariantRules,
  maxQtyPerRecipient = 1
): Promise<{ campaignProduct: CampaignProduct } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!campaignId) return { error: "campaignId is required" };
  if (!productId) return { error: "productId is required" };

  try {
    const campaignProductsTable = db.table("campaign_products");

    // Get current max display_order
    const existing = await campaignProductsTable.query(
      { campaign_id: campaignId },
      1,
      100
    );
    const currentItems = existing.data ?? [];
    const maxOrder = currentItems.reduce(
      (max, item) => Math.max(max, (item as CampaignProduct).display_order ?? 0),
      0
    );

    const record = await campaignProductsTable.insert({
      campaign_id: campaignId,
      product_id: productId,
      variant_rules: variantRules,
      max_quantity_per_recipient: maxQtyPerRecipient,
      display_order: maxOrder + 1,
    });

    return { campaignProduct: record as CampaignProduct };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add product to campaign";
    return { error: message };
  }
}

/**
 * Publish a campaign — validates required fields then sets status to 'active'.
 */
export async function publishCampaign(
  id: string
): Promise<{ campaign: Campaign } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!id) return { error: "Campaign id is required" };

  try {
    const campaignsTable = db.table("campaigns");
    const campaign = (await campaignsTable.get(id)) as Campaign;

    if (!campaign.start_at) {
      return { error: "start_at is required before publishing" };
    }
    if (!campaign.end_at) {
      return { error: "end_at is required before publishing" };
    }

    const updated = await campaignsTable.update(id, { status: "active" });
    return { campaign: updated as Campaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to publish campaign";
    return { error: message };
  }
}

// ─── Story 7.2 — Event Drop Extras ───────────────────────────────────────────

/**
 * Generate a QR code URL pointing to the public event drop page.
 * Returns the URL that should be encoded into a QR code.
 */
export async function generateQRCode(
  campaignId: string
): Promise<{ qrUrl: string; landingUrl: string } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!campaignId) return { error: "campaignId is required" };

  try {
    const campaignsTable = db.table("campaigns");
    const campaign = (await campaignsTable.get(campaignId)) as Campaign;

    if (campaign.type !== "event_drop") {
      return { error: "QR codes are only generated for event_drop campaigns" };
    }

    const landingUrl = `${APP_BASE_URL}/join/${campaignId}`;
    // The QR code URL is the landing URL itself — the client renders the SVG
    return { qrUrl: landingUrl, landingUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate QR code";
    return { error: message };
  }
}

/**
 * Set the access mode for a campaign (public, invite_only, qr_only).
 */
export async function setCampaignAccess(
  campaignId: string,
  mode: CampaignAccessMode
): Promise<{ campaign: Campaign } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!campaignId) return { error: "campaignId is required" };

  const validModes: CampaignAccessMode[] = ["public", "invite_only", "qr_only"];
  if (!validModes.includes(mode)) {
    return { error: `Invalid access mode: ${mode}` };
  }

  try {
    const campaignsTable = db.table("campaigns");
    // access_mode is stored as an extra metadata field on the campaign record
    const updated = await (campaignsTable as unknown as {
      update: (id: string, d: unknown) => Promise<Campaign>;
    }).update(campaignId, { access_mode: mode });
    return { campaign: updated as Campaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set campaign access";
    return { error: message };
  }
}

/**
 * Public: get campaign for join page — no auth required.
 * Returns campaign + products if the drop is live, or error/state if not.
 */
export async function getPublicCampaign(campaignId: string): Promise<
  | {
      campaign: Campaign & { access_mode?: CampaignAccessMode };
      products: CampaignProductWithDetails[];
      state: "live" | "upcoming" | "expired" | "not_found";
    }
  | { error: string; state: "not_found" }
> {
  if (!campaignId) return { error: "campaignId is required", state: "not_found" };

  try {
    const campaignsTable = db.table("campaigns");
    const campaignProductsTable = db.table("campaign_products");

    const rawCampaign = await campaignsTable.get(campaignId);
    const campaign = rawCampaign as Campaign & { access_mode?: CampaignAccessMode };

    const now = new Date();
    const startAt = campaign.start_at ? new Date(campaign.start_at) : null;
    const endAt = campaign.end_at ? new Date(campaign.end_at) : null;

    let state: "live" | "upcoming" | "expired" | "not_found" = "live";

    if (campaign.status === "archived" || campaign.status === "completed") {
      state = "expired";
    } else if (endAt && now > endAt) {
      state = "expired";
    } else if (startAt && now < startAt) {
      state = "upcoming";
    } else if (campaign.status !== "active") {
      state = "upcoming";
    }

    // Fetch products regardless (needed for display in upcoming state too)
    const cpResult = await campaignProductsTable.query(
      { campaign_id: campaignId },
      1,
      50
    );
    const campaignProducts = (cpResult.data ?? []) as CampaignProduct[];

    let products: CampaignProductWithDetails[] = campaignProducts;
    if (campaignProducts.length > 0) {
      const productsTable = db.table("products");
      const productFetches = campaignProducts.map(async (cp) => {
        try {
          const product = await productsTable.get(cp.product_id);
          return { ...cp, product: product as Product };
        } catch {
          return cp;
        }
      });
      products = await Promise.all(productFetches);
      products.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }

    return { campaign, products, state };
  } catch {
    return { error: "Campaign not found", state: "not_found" };
  }
}

/**
 * Validate invite-only access: checks if email has an unused redemption_link.
 */
export async function validateInviteAccess(
  campaignId: string,
  email: string
): Promise<{ allowed: boolean; linkId?: string } | { error: string }> {
  if (!campaignId) return { error: "campaignId is required" };
  if (!email?.trim()) return { error: "email is required" };

  try {
    const redemptionLinksTable = db.table("redemption_links");

    // First get recipient by email
    const recipientsTable = db.table("recipients");
    const recipientResult = await recipientsTable.query({ email: email.trim().toLowerCase() }, 1, 5);
    const recipients = recipientResult.data ?? [];

    if (recipients.length === 0) {
      return { allowed: false };
    }

    // Check if any of these recipients have a valid redemption link for this campaign
    for (const recipient of recipients) {
      const linkResult = await redemptionLinksTable.query(
        {
          campaign_id: campaignId,
          recipient_id: recipient.id,
          status: "unused",
        },
        1,
        1
      );
      const links = linkResult.data ?? [];
      if (links.length > 0) {
        return { allowed: true, linkId: links[0]!.id as string };
      }
    }

    return { allowed: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to validate access";
    return { error: message };
  }
}

// ─── Story 7.3 — Scheduled Activation ────────────────────────────────────────

/**
 * Schedule a campaign to activate at a specific time.
 * Campaign stays 'draft'; start_at is set to activateAt.
 */
export async function scheduleCampaignActivation(
  campaignId: string,
  activateAt: string
): Promise<{ campaign: Campaign } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!campaignId) return { error: "campaignId is required" };
  if (!activateAt) return { error: "activateAt is required" };

  const activateDate = new Date(activateAt);
  if (isNaN(activateDate.getTime())) {
    return { error: "activateAt must be a valid ISO date string" };
  }

  try {
    const campaignsTable = db.table("campaigns");
    // Keep status as draft; update start_at to the desired activation time
    const updated = await campaignsTable.update(campaignId, {
      start_at: activateAt,
      status: "draft",
    });
    return { campaign: updated as Campaign };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to schedule campaign activation";
    return { error: message };
  }
}

/**
 * Activate all draft campaigns whose start_at <= now for a company.
 * Validates inventory on activation and logs warnings for zero-inventory products.
 */
export async function checkAndActivateCampaigns(
  companyId: string
): Promise<{ activated: string[]; warnings: string[] } | { error: string }> {
  if (!companyId) return { error: "companyId is required" };

  try {
    const campaignsTable = db.table("campaigns");
    const campaignProductsTable = db.table("campaign_products");
    const variantsTable = db.table("product_variants");

    const now = new Date().toISOString();

    // Query draft campaigns for this company
    const draftResult = await campaignsTable.query(
      { company_id: companyId, status: "draft" },
      1,
      100
    );
    const draftCampaigns = (draftResult.data ?? []) as Campaign[];

    // Filter to those whose start_at <= now
    const due = draftCampaigns.filter((c) => {
      if (!c.start_at) return false;
      return new Date(c.start_at) <= new Date(now);
    });

    const activated: string[] = [];
    const warnings: string[] = [];

    for (const campaign of due) {
      // Inventory validation
      const cpResult = await campaignProductsTable.query(
        { campaign_id: campaign.id },
        1,
        50
      );
      const campaignProducts = (cpResult.data ?? []) as Array<{
        product_id: string;
        campaign_id: string;
      }>;

      for (const cp of campaignProducts) {
        const variantResult = await variantsTable.query(
          { product_id: cp.product_id },
          1,
          50
        );
        const variants = (variantResult.data ?? []) as ProductVariant[];
        const zeroInventory = variants.filter((v) => v.inventory_count <= 0);
        if (zeroInventory.length > 0) {
          const msg = `[INVENTORY WARNING] Campaign ${campaign.id} (${campaign.name}): product ${cp.product_id} has ${zeroInventory.length} variant(s) with zero inventory`;
          console.warn(msg);
          warnings.push(msg);
        }
      }

      // Activate the campaign
      await campaignsTable.update(campaign.id, { status: "active" });
      console.log(
        `[CAMPAIGN ACTIVATED] id=${campaign.id} name="${campaign.name}" company=${companyId}`
      );
      activated.push(campaign.id);
    }

    return { activated, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to activate campaigns";
    return { error: message };
  }
}

/**
 * Expire all active campaigns whose end_at <= now for a company.
 */
export async function checkAndExpireCampaigns(
  companyId: string
): Promise<{ expired: string[] } | { error: string }> {
  if (!companyId) return { error: "companyId is required" };

  try {
    const campaignsTable = db.table("campaigns");
    const now = new Date().toISOString();

    // Query active campaigns for this company
    const activeResult = await campaignsTable.query(
      { company_id: companyId, status: "active" },
      1,
      100
    );
    const activeCampaigns = (activeResult.data ?? []) as Campaign[];

    // Filter to those whose end_at <= now
    const due = activeCampaigns.filter((c) => {
      if (!c.end_at) return false;
      return new Date(c.end_at) <= new Date(now);
    });

    const expired: string[] = [];

    for (const campaign of due) {
      await campaignsTable.update(campaign.id, { status: "completed" });
      console.log(
        `[CAMPAIGN EXPIRED] id=${campaign.id} name="${campaign.name}" company=${companyId}`
      );
      expired.push(campaign.id);
    }

    return { expired };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to expire campaigns";
    return { error: message };
  }
}
