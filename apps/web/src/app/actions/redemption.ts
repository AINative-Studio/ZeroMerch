"use server";

// ---------------------------------------------------------------------------
// Server Actions — Employee Credits (Story 6.2, Issue #23)
//                  Gift Redemption Flow (Story 6.3, Issue #24)
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from "crypto";
import { ZeroDBClient } from "@zeromerch/zerodb";
import type { RedemptionLink, Order, OrderItem } from "@zeromerch/zerodb";
import { auditLogger } from "@zeromerch/audit";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditBalance {
  total: number;
  links: Array<{
    id: string;
    campaignId: string;
    creditAmount: number;
    expiresAt: string | undefined;
    status: RedemptionLink["status"];
  }>;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface GiftClaimResult {
  orderId: string;
  message: string;
}

// ─── getUserCreditBalance (Story 6.2) ─────────────────────────────────────────

/**
 * Sum all active (unused, non-expired) redemption links for a user.
 *
 * Returns the total available credit and the individual link details.
 */
export async function getUserCreditBalance(
  userId: string,
  companyId: string
): Promise<CreditBalance> {
  if (!userId || !companyId) {
    throw new Error("userId and companyId are required");
  }

  const linksTable = db.table<RedemptionLink>("redemption_links");
  const result = await linksTable.query(
    { recipient_id: userId, company_id: companyId, status: "unused" },
    1,
    100
  );

  const now = new Date();
  let total = 0;
  const links: CreditBalance["links"] = [];

  for (const link of result.data ?? []) {
    // Skip expired links (status may not have been updated yet)
    if (link.expires_at && new Date(link.expires_at) < now) {
      continue;
    }

    total += link.credit_amount;
    links.push({
      id: link.id,
      campaignId: link.campaign_id,
      creditAmount: link.credit_amount,
      expiresAt: link.expires_at,
      status: link.status,
    });
  }

  return { total, links };
}

// ─── applyCredit (Story 6.2) ─────────────────────────────────────────────────

/**
 * Decrement a redemption link's credit balance by `amount`.
 *
 * Rules enforced:
 * - Link must be status 'unused'
 * - Link must not be expired
 * - `amount` must be > 0 and <= credit_amount (no overage)
 *
 * Returns the remaining credit after application.
 */
export async function applyCredit(
  redemptionLinkId: string,
  orderId: string,
  amount: number
): Promise<{ remainingCredit: number }> {
  if (!redemptionLinkId || !orderId) {
    throw new Error("redemptionLinkId and orderId are required");
  }
  if (amount <= 0) {
    throw new Error("Credit amount must be greater than zero");
  }

  const linksTable = db.table<RedemptionLink>("redemption_links");
  const link = await linksTable.get(redemptionLinkId);

  if (link.status !== "unused") {
    throw new Error(
      `Redemption link is not available (status: ${link.status})`
    );
  }
  if (isExpired(link.expires_at)) {
    // Mark as expired for consistency
    await linksTable.update(redemptionLinkId, { status: "expired" });
    throw new Error("Redemption link has expired");
  }
  if (amount > link.credit_amount) {
    throw new Error(
      `Cannot apply $${amount.toFixed(2)} — only $${link.credit_amount.toFixed(2)} available`
    );
  }

  const remaining = Math.round((link.credit_amount - amount) * 100) / 100;

  // If fully consumed, mark as used; otherwise reduce balance
  if (remaining === 0) {
    await linksTable.update(redemptionLinkId, {
      status: "used",
      credit_amount: 0,
    });
  } else {
    await linksTable.update(redemptionLinkId, { credit_amount: remaining });
  }

  // Emit credit applied event
  const events = db.events();
  await events.emit("redemption.credit_applied", {
    redemption_link_id: redemptionLinkId,
    order_id: orderId,
    amount_applied: amount,
    remaining_credit: remaining,
  });

  return { remainingCredit: remaining };
}

// ─── createRedemptionLink (Story 6.2) ────────────────────────────────────────

/**
 * Generate a new redemption link (gift or credit grant).
 *
 * - Generates a cryptographically random 32-byte token
 * - Stores sha256(token) as token_hash (never the raw token)
 * - Returns the plain token for delivery to recipient (store nowhere)
 */
export async function createRedemptionLink(
  companyId: string,
  campaignId: string,
  recipientId: string,
  creditAmount: number,
  expiresInDays: number
): Promise<{ token: string; linkId: string }> {
  if (!companyId || !campaignId || !recipientId) {
    throw new Error("companyId, campaignId, and recipientId are required");
  }
  if (creditAmount <= 0) {
    throw new Error("creditAmount must be greater than zero");
  }
  if (expiresInDays < 1) {
    throw new Error("expiresInDays must be at least 1");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = sha256(token);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const linksTable = db.table<RedemptionLink>("redemption_links");
  const link = await linksTable.insert({
    company_id: companyId,
    campaign_id: campaignId,
    recipient_id: recipientId,
    token_hash: tokenHash,
    status: "unused",
    credit_amount: creditAmount,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  } as Omit<RedemptionLink, "id">);

  // Emit event for audit trail
  const events = db.events();
  await events.emit("redemption.link_created", {
    link_id: link.id,
    company_id: companyId,
    campaign_id: campaignId,
    recipient_id: recipientId,
    credit_amount: creditAmount,
    expires_at: expiresAt.toISOString(),
  });

  return { token, linkId: link.id };
}

// ─── claimGift (Story 6.3) ────────────────────────────────────────────────────

/**
 * Redeem a gift link by plain token.
 *
 * Steps:
 *  1. Hash the token and look up the redemption_link
 *  2. Validate: not expired, not used/revoked
 *  3. Create an order record with the shipping address
 *  4. Mark the redemption_link as 'used'
 *
 * No authentication required — this is the guest claim path.
 */
export async function claimGift(
  token: string,
  shippingAddress: ShippingAddress
): Promise<GiftClaimResult> {
  if (!token) {
    throw new Error("Token is required");
  }
  if (
    !shippingAddress.name ||
    !shippingAddress.line1 ||
    !shippingAddress.city ||
    !shippingAddress.state ||
    !shippingAddress.postalCode ||
    !shippingAddress.country
  ) {
    throw new Error("All required shipping address fields must be provided");
  }

  const tokenHash = sha256(token);

  const linksTable = db.table<RedemptionLink>("redemption_links");
  const result = await linksTable.query({ token_hash: tokenHash }, 1, 1);
  const link = result.data?.[0];

  if (!link) {
    throw new Error("Gift link not found");
  }
  if (link.status === "used") {
    throw new Error("This gift has already been claimed");
  }
  if (link.status === "revoked") {
    throw new Error("This gift link has been revoked");
  }
  if (link.status === "expired" || isExpired(link.expires_at)) {
    if (link.status !== "expired") {
      await linksTable.update(link.id, { status: "expired" });
    }
    throw new Error("This gift link has expired");
  }

  // Create the order — gift orders are paid by company credit
  const ordersTable = db.table<Order>("orders");
  const order = await ordersTable.insert({
    company_id: link.company_id,
    campaign_id: link.campaign_id,
    recipient_id: link.recipient_id,
    status: "pending",
    subtotal: link.credit_amount,
    shipping: 0,
    tax: 0,
    total: link.credit_amount,
    paid_by: "company_credit",
    created_at: new Date().toISOString(),
    // Persist shipping address as metadata on the order via zerocommerce_order_id
    // field until a dedicated address field is added to the orders schema.
    // The address is stored as JSON string prefix for downstream fulfillment.
    zerocommerce_order_id: `gift:${JSON.stringify(shippingAddress)}`,
  } as Omit<Order, "id">);

  // Mark link as used
  await linksTable.update(link.id, { status: "used" });

  // Emit event for downstream fulfillment triggers
  const events = db.events();
  await events.emit("redemption.used", {
    redemption_link_id: link.id,
    order_id: order.id,
    company_id: link.company_id,
    campaign_id: link.campaign_id,
    recipient_id: link.recipient_id,
    shipping_address: shippingAddress,
  });

  // Audit: redemption link used — Story 13.1 (Issue #50)
  await auditLogger.log({
    company_id: link.company_id,
    event_type: "redemption_link.used",
    actor_type: "system",
    actor_id: link.recipient_id,
    object_type: "redemption_link",
    object_id: link.id,
    payload: { order_id: order.id, campaign_id: link.campaign_id },
  }).catch(() => {});

  return {
    orderId: order.id,
    message: "Your gift has been claimed successfully. You will receive a confirmation email shortly.",
  };
}

// ─── lookupRedemptionLink (Story 6.3 — read-only, for page rendering) ─────────

/**
 * Validate a raw token and return the link details for display.
 *
 * Does NOT mark the link as used — use claimGift() for that.
 * Returns null if token is invalid.
 */
export async function lookupRedemptionLink(token: string): Promise<{
  link: RedemptionLink;
  isValid: boolean;
  errorReason?: string;
} | null> {
  if (!token) return null;

  const tokenHash = sha256(token);
  const linksTable = db.table<RedemptionLink>("redemption_links");
  const result = await linksTable.query({ token_hash: tokenHash }, 1, 1);
  const link = result.data?.[0];

  if (!link) return null;

  if (link.status === "used") {
    return { link, isValid: false, errorReason: "already_used" };
  }
  if (link.status === "revoked") {
    return { link, isValid: false, errorReason: "revoked" };
  }
  if (link.status === "expired" || isExpired(link.expires_at)) {
    return { link, isValid: false, errorReason: "expired" };
  }

  return { link, isValid: true };
}
