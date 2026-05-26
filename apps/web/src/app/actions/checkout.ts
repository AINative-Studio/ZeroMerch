"use server";

// ---------------------------------------------------------------------------
// Server Actions — Stripe Checkout (Story 6.1, Issue #22)
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { StripeClient } from "@zeromerch/payments";
import type { CartItem } from "@zeromerch/payments";
import type { Order, OrderItem } from "@zeromerch/zerodb";
import { headers } from "next/headers";
import { auditLogger } from "@zeromerch/audit";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });
const stripe = new StripeClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutCartItem {
  productId: string;
  variantId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  customization?: {
    logo_asset_id?: string;
    placement?: string;
    thread_color?: string;
  };
}

export interface CreateCheckoutResult {
  url: string;
  orderId: string;
  sessionId: string;
}

// ─── createCheckoutSession ────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session and persist a pending order in ZeroDB.
 *
 * - Writes one `orders` row (status: 'pending') with stripe_checkout_session_id
 * - Writes one `order_items` row per cart item
 * - Returns the Stripe-hosted checkout URL
 */
export async function createCheckoutSession(
  companyId: string,
  companySlug: string,
  cartItems: CheckoutCartItem[],
  userId: string,
  options: {
    campaignId?: string;
    recipientId?: string;
    taxRate?: number;
    shippingAmount?: number;
    paidBy?: Order["paid_by"];
  } = {}
): Promise<CreateCheckoutResult> {
  if (!companyId || !companySlug) {
    throw new Error("companyId and companySlug are required");
  }
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart must contain at least one item");
  }

  // Validate cart items
  for (const item of cartItems) {
    if (!item.productId || !item.variantId) {
      throw new Error("Each cart item must have productId and variantId");
    }
    if (item.quantity < 1) {
      throw new Error("Item quantity must be at least 1");
    }
    if (item.unitPrice < 0) {
      throw new Error("Item unit price cannot be negative");
    }
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const taxRate = options.taxRate ?? 0;
  const shippingAmount = options.shippingAmount ?? 0;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax + shippingAmount;

  // Build success/cancel URLs from the current request host
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const successUrl = `${baseUrl}/store/${companySlug}/checkout/success`;
  const cancelUrl = `${baseUrl}/store/${companySlug}/checkout`;

  // Create pending order in ZeroDB first (before Stripe — we need the order ID
  // so we can attach it to webhook metadata if needed)
  const ordersTable = db.table<Order>("orders");
  const order = await ordersTable.insert({
    company_id: companyId,
    campaign_id: options.campaignId,
    recipient_id: options.recipientId ?? userId,
    stripe_checkout_session_id: "", // filled in below after session creation
    status: "pending",
    subtotal,
    shipping: shippingAmount,
    tax,
    total,
    paid_by: options.paidBy ?? "recipient",
    created_at: new Date().toISOString(),
  } as Omit<Order, "id">);

  // Create order items
  const itemsTable = db.table<OrderItem>("order_items");
  await Promise.all(
    cartItems.map((item) =>
      itemsTable.insert({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        customization: item.customization,
      } as Omit<OrderItem, "id">)
    )
  );

  // Create Stripe checkout session
  const stripeItems: CartItem[] = cartItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    customizationLabel: item.customization?.placement,
  }));

  const session = await stripe.createCheckoutSession({
    companyId,
    companySlug,
    userId,
    cartItems: stripeItems,
    taxCents: Math.round(tax * 100),
    shippingCents: Math.round(shippingAmount * 100),
    successUrl,
    cancelUrl,
  });

  // Update order with session ID
  await ordersTable.update(order.id, {
    stripe_checkout_session_id: session.sessionId,
  });

  // Audit: order created — Story 13.1 (Issue #50)
  await auditLogger.log({
    company_id: order.company_id,
    event_type: "order.created",
    actor_type: "user",
    actor_id: order.recipient_id ?? "unknown",
    object_type: "order",
    object_id: order.id,
    payload: { campaign_id: order.campaign_id, total: order.total },
  }).catch(() => {});

  return {
    url: session.url,
    orderId: order.id,
    sessionId: session.sessionId,
  };
}

// ─── handleWebhook ────────────────────────────────────────────────────────────

/**
 * Handle an incoming Stripe webhook.
 *
 * On `checkout.session.completed` with `payment_status: paid`:
 *  - Finds the order by stripe_checkout_session_id
 *  - Sets status to 'paid'
 *
 * Returns the event type processed or null if not handled.
 */
export async function handleWebhook(
  body: string,
  signature: string
): Promise<{ handled: boolean; eventType: string }> {
  if (!body) {
    throw new Error("Webhook body is required");
  }
  if (!signature) {
    throw new Error("Stripe-Signature header is required");
  }

  const event = await stripe.constructWebhookEvent(body, signature);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
    };

    if (session.payment_status === "paid") {
      // Find the order by Stripe session ID
      const ordersTable = db.table<Order>("orders");
      const result = await ordersTable.query(
        { stripe_checkout_session_id: session.id },
        1,
        1
      );

      const order = result.data?.[0];
      if (order) {
        await ordersTable.update(order.id, { status: "paid" });

        // Emit a ZeroDB event for downstream automation
        const events = db.events();
        await events.emit("order.paid", {
          order_id: order.id,
          company_id: order.company_id,
          total: order.total,
          stripe_session_id: session.id,
        });

      }
    }

    return { handled: true, eventType: event.type };
  }

  return { handled: false, eventType: event.type };
}
